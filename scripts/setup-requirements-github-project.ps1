[CmdletBinding()]
param(
  [string]$Owner,
  [string]$Repo,
  [string]$ProjectTitle,
  [string]$SpecPath,
  [switch]$DryRun,
  [switch]$SkipViews
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Detail {
  param([string]$Message)
  Write-Host "  - $Message"
}

function Get-PropertyValue {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Object,
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  if ($null -eq $Object) {
    return $null
  }

  $property = $Object.PSObject.Properties[$Name]
  if ($null -ne $property) {
    return $property.Value
  }

  return $null
}

function Get-Collection {
  param([object]$Value)

  if ($null -eq $Value) {
    return @()
  }

  if ($Value -is [System.Array]) {
    return @($Value)
  }

  foreach ($candidate in @('items', 'nodes', 'projects', 'fields', 'views')) {
    $propertyValue = Get-PropertyValue -Object $Value -Name $candidate
    if ($null -ne $propertyValue) {
      return Get-Collection -Value $propertyValue
    }
  }

  return @($Value)
}

function Invoke-Gh {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [switch]$AsJson
  )

  if ($DryRun) {
    Write-Host ("[dry-run] gh " + ($Arguments -join ' ')) -ForegroundColor DarkGray
    return $null
  }

  $output = & gh @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $text = ($output -join [Environment]::NewLine).Trim()

  if ($exitCode -ne 0) {
    throw "gh $($Arguments -join ' ') failed.`n$text"
  }

  if (-not $AsJson) {
    return $text
  }

  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }

  return $text | ConvertFrom-Json
}

function Invoke-GhGraphQL {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Query,
    [hashtable]$Variables = @{}
  )

  $arguments = @('api', 'graphql', '-f', "query=$Query")
  foreach ($key in $Variables.Keys) {
    $arguments += @('-F', "$key=$($Variables[$key])")
  }

  return Invoke-Gh -Arguments $arguments -AsJson
}

function Get-RepoInfo {
  param([string]$RepoOverride)

  if (-not [string]::IsNullOrWhiteSpace($RepoOverride)) {
    if ($RepoOverride -notmatch '^(?<owner>[^/]+)/(?<name>[^/]+)$') {
      throw "Repo must use the OWNER/REPO format."
    }

    return [pscustomobject]@{
      Owner = $Matches.owner
      Name = $Matches.name
      FullName = "$($Matches.owner)/$($Matches.name)"
    }
  }

  $remote = (& git remote get-url origin 2>$null).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($remote)) {
    throw "Could not infer the repository from git remote origin. Pass -Repo OWNER/REPO."
  }

  if ($remote -notmatch 'github\.com[:/](?<owner>[^/]+)/(?<name>[^/.]+?)(?:\.git)?$') {
    throw "Unsupported GitHub remote format: $remote"
  }

  return [pscustomobject]@{
    Owner = $Matches.owner
    Name = $Matches.name
    FullName = "$($Matches.owner)/$($Matches.name)"
  }
}

function Resolve-SpecPath {
  param([string]$RequestedPath)

  if (-not [string]::IsNullOrWhiteSpace($RequestedPath)) {
    return (Resolve-Path -LiteralPath $RequestedPath).Path
  }

  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\github-projects\requirements-analysis.json')).Path
}

function Assert-GhReady {
  if ($DryRun) {
    return
  }

  $null = Invoke-Gh -Arguments @('--version')
  $statusOutput = cmd /c "gh auth status 2>&1"
  $statusExitCode = $LASTEXITCODE
  $statusText = ($statusOutput -join [Environment]::NewLine).Trim()

  if ($statusExitCode -ne 0 -or $statusText -match 'Failed to log in' -or $statusText -match 'invalid') {
    throw "GitHub auth is not ready. Run `gh auth login -h github.com` and `gh auth refresh -h github.com -s project`, then rerun the script."
  }

  if ($statusText -notmatch '\bproject\b') {
    Write-Warning "The current token may be missing the `project` scope. If project commands fail, run: gh auth refresh -h github.com -s project"
  }
}

function Assert-Spec {
  param([object]$Spec)

  $seenKeys = @{}
  $seenTitles = @{}
  $epicKeys = @{}

  foreach ($issue in $Spec.issues) {
    if ($seenKeys.ContainsKey($issue.key)) {
      throw "Duplicate issue key detected: $($issue.key)"
    }

    if ($seenTitles.ContainsKey($issue.title)) {
      throw "Duplicate issue title detected: $($issue.title)"
    }

    $seenKeys[$issue.key] = $true
    $seenTitles[$issue.title] = $true

    if ($issue.kind -eq 'epic') {
      $epicKeys[$issue.key] = $true
    }
  }

  foreach ($issue in $Spec.issues) {
    if ($issue.kind -eq 'issue' -and [string]::IsNullOrWhiteSpace($issue.parentKey)) {
      throw "Child issue $($issue.key) is missing parentKey."
    }

    if ($issue.kind -eq 'issue' -and -not $epicKeys.ContainsKey($issue.parentKey)) {
      throw "Child issue $($issue.key) points to unknown epic key $($issue.parentKey)."
    }
  }
}

function Get-ProjectByTitle {
  param(
    [string]$OwnerLogin,
    [string]$Title
  )

  $projects = Get-Collection (Invoke-Gh -Arguments @('project', 'list', '--owner', $OwnerLogin, '--limit', '100', '--format', 'json') -AsJson)
  foreach ($project in $projects) {
    if ((Get-PropertyValue -Object $project -Name 'title') -eq $Title) {
      return $project
    }
  }

  return $null
}

function Get-OwnerNodeId {
  param([string]$OwnerLogin)

  $query = @'
query($login: String!) {
  repositoryOwner(login: $login) {
    __typename
    id
    login
  }
}
'@

  $response = Invoke-GhGraphQL -Query $query -Variables @{ login = $OwnerLogin }
  $owner = Get-PropertyValue -Object $response.data -Name 'repositoryOwner'
  if ($null -ne $owner) {
    return Get-PropertyValue -Object $owner -Name 'id'
  }

  throw "Could not resolve a GitHub user or organization id for owner $OwnerLogin."
}

function New-ProjectViaGraphQL {
  param(
    [string]$OwnerLogin,
    [string]$Title
  )

  $ownerId = Get-OwnerNodeId -OwnerLogin $OwnerLogin
  $mutation = @'
mutation($ownerId: ID!, $title: String!) {
  createProjectV2(input: { ownerId: $ownerId, title: $title }) {
    projectV2 {
      id
      number
      title
      url
    }
  }
}
'@

  $response = Invoke-GhGraphQL -Query $mutation -Variables @{
    ownerId = $ownerId
    title = $Title
  }

  $project = Get-PropertyValue -Object (Get-PropertyValue -Object $response.data -Name 'createProjectV2') -Name 'projectV2'
  if ($null -eq $project) {
    throw "GraphQL project creation returned no project payload."
  }

  return $project
}

function Get-OrCreateProject {
  param(
    [string]$OwnerLogin,
    [string]$Title
  )

  $existing = Get-ProjectByTitle -OwnerLogin $OwnerLogin -Title $Title
  if ($null -ne $existing) {
    $number = Get-PropertyValue -Object $existing -Name 'number'
    Write-Detail "Using existing project #${number}: $Title"
    return $existing
  }

  Write-Detail "Creating project: $Title"
  try {
    return Invoke-Gh -Arguments @('project', 'create', '--owner', $OwnerLogin, '--title', $Title, '--format', 'json') -AsJson
  } catch {
    Write-Warning "gh project create failed, falling back to GraphQL createProjectV2: $($_.Exception.Message)"
    return New-ProjectViaGraphQL -OwnerLogin $OwnerLogin -Title $Title
  }
}

function Ensure-ProjectLink {
  param(
    [string]$OwnerLogin,
    [string]$ProjectNumber,
    [string]$RepoFullName
  )

  try {
    $null = Invoke-Gh -Arguments @('project', 'link', $ProjectNumber, '--owner', $OwnerLogin, '--repo', $RepoFullName)
  } catch {
    Write-Warning "Project link step failed or was already applied: $($_.Exception.Message)"
  }
}

function Ensure-Labels {
  param(
    [object]$Spec,
    [string]$RepoFullName
  )

  foreach ($label in $Spec.labels) {
    Write-Detail "Ensuring label: $($label.name)"
    $null = Invoke-Gh -Arguments @(
      'label', 'create', $label.name,
      '-R', $RepoFullName,
      '--description', $label.description,
      '--color', $label.color,
      '--force'
    )
  }
}

function Get-ProjectFields {
  param(
    [string]$OwnerLogin,
    [string]$ProjectNumber
  )

  return Get-Collection (Invoke-Gh -Arguments @('project', 'field-list', $ProjectNumber, '--owner', $OwnerLogin, '--limit', '100', '--format', 'json') -AsJson)
}

function Ensure-ProjectFields {
  param(
    [object]$Spec,
    [string]$OwnerLogin,
    [string]$ProjectNumber
  )

  $fields = Get-ProjectFields -OwnerLogin $OwnerLogin -ProjectNumber $ProjectNumber

  foreach ($field in $Spec.project.fields) {
    $match = $fields | Where-Object { (Get-PropertyValue -Object $_ -Name 'name') -eq $field.name } | Select-Object -First 1
    if ($null -ne $match) {
      continue
    }

    Write-Detail "Creating project field: $($field.name)"
    $arguments = @(
      'project', 'field-create', $ProjectNumber,
      '--owner', $OwnerLogin,
      '--name', $field.name,
      '--data-type', $field.dataType
    )

    if ($field.dataType -eq 'SINGLE_SELECT') {
      $arguments += @('--single-select-options', ($field.options -join ','))
    }

    $null = Invoke-Gh -Arguments $arguments
    $fields = Get-ProjectFields -OwnerLogin $OwnerLogin -ProjectNumber $ProjectNumber
  }
}

function Get-ProjectMetadata {
  param(
    [string]$OwnerLogin,
    [int]$ProjectNumber
  )

  $query = @'
query($owner: String!, $number: Int!) {
  repositoryOwner(login: $owner) {
    ... on User {
      projectV2(number: $number) {
        id
        title
        fields(first: 100) {
          nodes {
            __typename
            ... on ProjectV2FieldCommon {
              id
              name
              dataType
            }
            ... on ProjectV2SingleSelectField {
              options {
                id
                name
              }
            }
          }
        }
      }
    }
    ... on Organization {
      projectV2(number: $number) {
        id
        title
        fields(first: 100) {
          nodes {
            __typename
            ... on ProjectV2FieldCommon {
              id
              name
              dataType
            }
            ... on ProjectV2SingleSelectField {
              options {
                id
                name
              }
            }
          }
        }
      }
    }
  }
}
'@

  $response = Invoke-GhGraphQL -Query $query -Variables @{
    owner = $OwnerLogin
    number = $ProjectNumber
  }

  $owner = Get-PropertyValue -Object $response.data -Name 'repositoryOwner'
  $project = Get-PropertyValue -Object $owner -Name 'projectV2'
  if ($null -ne $project) {
    return $project
  }

  throw "Could not resolve project metadata for owner $OwnerLogin and project #$ProjectNumber."
}

function Get-FieldMap {
  param([object]$ProjectMetadata)

  $fieldMap = @{}
  $fieldNodes = Get-Collection (Get-PropertyValue -Object (Get-PropertyValue -Object $ProjectMetadata -Name 'fields') -Name 'nodes')

  foreach ($field in $fieldNodes) {
    $options = @{}
    foreach ($option in Get-Collection (Get-PropertyValue -Object $field -Name 'options')) {
      $options[(Get-PropertyValue -Object $option -Name 'name')] = Get-PropertyValue -Object $option -Name 'id'
    }

    $fieldMap[(Get-PropertyValue -Object $field -Name 'name')] = [pscustomobject]@{
      Id = Get-PropertyValue -Object $field -Name 'id'
      DataType = Get-PropertyValue -Object $field -Name 'dataType'
      Options = $options
    }
  }

  return $fieldMap
}

function Get-ExistingIssuesByTitle {
  param([string]$RepoFullName)

  $issues = Get-Collection (Invoke-Gh -Arguments @('issue', 'list', '-R', $RepoFullName, '--state', 'all', '--limit', '500', '--json', 'number,title,url') -AsJson)
  $map = @{}

  foreach ($issue in $issues) {
    $map[$issue.title] = $issue
  }

  return $map
}

function Get-IssueNumberFromUrl {
  param([string]$IssueUrl)

  if ($IssueUrl -notmatch '/issues/(?<number>\d+)$') {
    throw "Could not parse issue number from URL: $IssueUrl"
  }

  return [int]$Matches.number
}

function New-IssueBody {
  param(
    [object]$IssueDefinition,
    [hashtable]$IssueDefinitionsByKey
  )

  $acceptanceLines = @()
  foreach ($item in $IssueDefinition.acceptanceCriteria) {
    $acceptanceLines += "- $item"
  }

  $outOfScopeLines = @()
  foreach ($item in $IssueDefinition.outOfScope) {
    $outOfScopeLines += "- $item"
  }

  $sourceDocLines = @()
  foreach ($item in $IssueDefinition.sourceDocuments) {
    $sourceDocLines += "- ``$item``"
  }

  $phaseLines = @(
    "- Phase: $($IssueDefinition.phase)",
    "- Priority: $($IssueDefinition.priority)",
    "- Area: $($IssueDefinition.area)",
    "- Requirement Type: $($IssueDefinition.requirementType)"
  )

  $parentKey = Get-PropertyValue -Object $IssueDefinition -Name 'parentKey'
  if (-not [string]::IsNullOrWhiteSpace($parentKey)) {
    $parentDefinition = $IssueDefinitionsByKey[$parentKey]
    $phaseLines += "- Parent Epic: $($parentDefinition.title)"
  }

  @"
## Requirement
$($IssueDefinition.requirement)

## Rationale
$($IssueDefinition.rationale)

## Acceptance Criteria
$(($acceptanceLines -join [Environment]::NewLine))

## Out of Scope
$(($outOfScopeLines -join [Environment]::NewLine))

## Source Documents
$(($sourceDocLines -join [Environment]::NewLine))

## Phase / Priority
$(($phaseLines -join [Environment]::NewLine))
"@
}

function Ensure-Issue {
  param(
    [object]$IssueDefinition,
    [hashtable]$IssueDefinitionsByKey,
    [hashtable]$ExistingIssuesByTitle,
    [string]$RepoFullName
  )

  if ($ExistingIssuesByTitle.ContainsKey($IssueDefinition.title)) {
    return $ExistingIssuesByTitle[$IssueDefinition.title]
  }

  Write-Detail "Creating issue: $($IssueDefinition.title)"
  $body = New-IssueBody -IssueDefinition $IssueDefinition -IssueDefinitionsByKey $IssueDefinitionsByKey
  $tempFile = New-TemporaryFile

  try {
    Set-Content -LiteralPath $tempFile.FullName -Value $body -Encoding UTF8
    $arguments = @('issue', 'create', '-R', $RepoFullName, '--title', $IssueDefinition.title, '--body-file', $tempFile.FullName)
    foreach ($label in $IssueDefinition.labels) {
      $arguments += @('--label', $label)
    }

    $issueUrl = Invoke-Gh -Arguments $arguments
    $issueUrl = ($issueUrl -split '\r?\n' | Select-Object -Last 1).Trim()
    $issueNumber = Get-IssueNumberFromUrl -IssueUrl $issueUrl
    $issue = [pscustomobject]@{
      number = $issueNumber
      title = $IssueDefinition.title
      url = $issueUrl
    }
    $ExistingIssuesByTitle[$IssueDefinition.title] = $issue
    return $issue
  } finally {
    Remove-Item -LiteralPath $tempFile.FullName -ErrorAction SilentlyContinue
  }
}

function Get-ProjectItemIdForIssue {
  param(
    [string]$RepoOwner,
    [string]$RepoName,
    [int]$IssueNumber,
    [int]$ProjectNumber
  )

  $query = @'
query($owner: String!, $repo: String!, $issueNumber: Int!, $projectNumber: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $issueNumber) {
      projectItems(first: 50) {
        nodes {
          id
          project {
            number
          }
        }
      }
    }
  }
}
'@

  $response = Invoke-GhGraphQL -Query $query -Variables @{
    owner = $RepoOwner
    repo = $RepoName
    issueNumber = $IssueNumber
    projectNumber = $ProjectNumber
  }

  $issue = Get-PropertyValue -Object (Get-PropertyValue -Object $response.data -Name 'repository') -Name 'issue'
  $nodes = Get-Collection (Get-PropertyValue -Object (Get-PropertyValue -Object $issue -Name 'projectItems') -Name 'nodes')
  foreach ($node in $nodes) {
    $project = Get-PropertyValue -Object $node -Name 'project'
    if ((Get-PropertyValue -Object $project -Name 'number') -eq $ProjectNumber) {
      return Get-PropertyValue -Object $node -Name 'id'
    }
  }

  return $null
}

function Ensure-IssueInProject {
  param(
    [string]$OwnerLogin,
    [string]$ProjectNumber,
    [string]$RepoOwner,
    [string]$RepoName,
    [object]$Issue
  )

  $existingItemId = Get-ProjectItemIdForIssue -RepoOwner $RepoOwner -RepoName $RepoName -IssueNumber $Issue.number -ProjectNumber $ProjectNumber
  if ($null -ne $existingItemId) {
    return $existingItemId
  }

  Write-Detail "Adding issue #$($Issue.number) to project"
  $null = Invoke-Gh -Arguments @('project', 'item-add', $ProjectNumber, '--owner', $OwnerLogin, '--url', $Issue.url)
  $itemId = Get-ProjectItemIdForIssue -RepoOwner $RepoOwner -RepoName $RepoName -IssueNumber $Issue.number -ProjectNumber $ProjectNumber

  if ($null -eq $itemId) {
    throw "Issue #$($Issue.number) could not be resolved as a project item after adding it."
  }

  return $itemId
}

function Set-ProjectFieldValue {
  param(
    [string]$ProjectId,
    [string]$ItemId,
    [hashtable]$FieldMap,
    [string]$FieldName,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return
  }

  if (-not $FieldMap.ContainsKey($FieldName)) {
    throw "Field '$FieldName' does not exist in the target project."
  }

  $field = $FieldMap[$FieldName]
  $arguments = @(
    'project', 'item-edit',
    '--id', $ItemId,
    '--project-id', $ProjectId,
    '--field-id', $field.Id
  )

  switch ($field.DataType) {
    'SINGLE_SELECT' {
      if (-not $field.Options.ContainsKey($Value)) {
        throw "Field '$FieldName' does not contain option '$Value'."
      }

      $arguments += @('--single-select-option-id', $field.Options[$Value])
    }
    'DATE' {
      $arguments += @('--date', $Value)
    }
    default {
      $arguments += @('--text', $Value)
    }
  }

  $null = Invoke-Gh -Arguments $arguments
}

function Create-ProjectViews {
  param(
    [object]$Spec,
    [string]$OwnerLogin,
    [int]$ProjectNumber
  )

  if ($SkipViews) {
    Write-Detail 'Skipping view creation by request.'
    return
  }

  if ($DryRun) {
    foreach ($view in $Spec.project.views) {
      Write-Host ("[dry-run] would ensure view: {0} ({1})" -f $view.name, $view.layout) -ForegroundColor DarkGray
    }
    return
  }

  try {
    $ownerData = Invoke-Gh -Arguments @('api', "users/$OwnerLogin") -AsJson
    $ownerId = Get-PropertyValue -Object $ownerData -Name 'id'
    if ($null -eq $ownerId) {
      throw "Could not resolve numeric GitHub user id for $OwnerLogin."
    }

    $existingViews = Get-Collection (Invoke-Gh -Arguments @('api', "/users/$ownerId/projects/$ProjectNumber/views") -AsJson)
    $existingViewNames = @{}
    foreach ($view in $existingViews) {
      $existingViewNames[(Get-PropertyValue -Object $view -Name 'name')] = $true
    }

    foreach ($view in $Spec.project.views) {
      if ($existingViewNames.ContainsKey($view.name)) {
        continue
      }

      Write-Detail "Creating project view: $($view.name)"
      $payloadFile = New-TemporaryFile
      try {
        $payload = @{
          name = $view.name
          layout = $view.layout
        } | ConvertTo-Json
        Set-Content -LiteralPath $payloadFile.FullName -Value $payload -Encoding UTF8
        $null = Invoke-Gh -Arguments @('api', '-X', 'POST', "/users/$ownerId/projects/$ProjectNumber/views", '--input', $payloadFile.FullName)
      } finally {
        Remove-Item -LiteralPath $payloadFile.FullName -ErrorAction SilentlyContinue
      }
    }
  } catch {
    Write-Warning "Project view creation was skipped because the GitHub API call failed: $($_.Exception.Message)"
  }
}

$specFile = Resolve-SpecPath -RequestedPath $SpecPath
$spec = Get-Content -LiteralPath $specFile -Raw | ConvertFrom-Json
Assert-Spec -Spec $spec

$repoInfo = Get-RepoInfo -RepoOverride $Repo
$ownerLogin = if ([string]::IsNullOrWhiteSpace($Owner)) { $repoInfo.Owner } else { $Owner }
$projectName = if ([string]::IsNullOrWhiteSpace($ProjectTitle)) { $spec.project.title } else { $ProjectTitle }

if ($DryRun) {
  Write-Step 'Dry run summary'
  Write-Detail "Spec path: $specFile"
  Write-Detail "Repository: $($repoInfo.FullName)"
  Write-Detail "Project title: $projectName"
  Write-Detail "Project owner: $ownerLogin"
  Write-Detail "Fields: $($spec.project.fields.Count)"
  Write-Detail "Labels: $($spec.labels.Count)"
  Write-Detail "Issues: $($spec.issues.Count)"
  return
}

Assert-GhReady

Write-Step 'Ensuring repository labels'
Ensure-Labels -Spec $spec -RepoFullName $repoInfo.FullName

Write-Step 'Ensuring GitHub Project'
$project = Get-OrCreateProject -OwnerLogin $ownerLogin -Title $projectName
$projectNumber = [string](Get-PropertyValue -Object $project -Name 'number')
Ensure-ProjectLink -OwnerLogin $ownerLogin -ProjectNumber $projectNumber -RepoFullName $repoInfo.FullName

Write-Step 'Ensuring project fields'
Ensure-ProjectFields -Spec $spec -OwnerLogin $ownerLogin -ProjectNumber $projectNumber
$projectMetadata = Get-ProjectMetadata -OwnerLogin $ownerLogin -ProjectNumber ([int]$projectNumber)
$projectId = Get-PropertyValue -Object $projectMetadata -Name 'id'
$fieldMap = Get-FieldMap -ProjectMetadata $projectMetadata

Write-Step 'Ensuring project views'
Create-ProjectViews -Spec $spec -OwnerLogin $ownerLogin -ProjectNumber ([int]$projectNumber)

Write-Step 'Ensuring issues and project items'
$existingIssuesByTitle = Get-ExistingIssuesByTitle -RepoFullName $repoInfo.FullName
$issueDefinitionsByKey = @{}
foreach ($issueDefinition in $spec.issues) {
  $issueDefinitionsByKey[$issueDefinition.key] = $issueDefinition
}

$orderedIssues = @(
  $spec.issues |
    Sort-Object @{ Expression = { if ($_.kind -eq 'epic') { 0 } else { 1 } } }, title
)

foreach ($issueDefinition in $orderedIssues) {
  $issue = Ensure-Issue -IssueDefinition $issueDefinition -IssueDefinitionsByKey $issueDefinitionsByKey -ExistingIssuesByTitle $existingIssuesByTitle -RepoFullName $repoInfo.FullName
  $itemId = Ensure-IssueInProject -OwnerLogin $ownerLogin -ProjectNumber $projectNumber -RepoOwner $repoInfo.Owner -RepoName $repoInfo.Name -Issue $issue

  Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Requirement Status' -Value $issueDefinition.status
  Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Area' -Value $issueDefinition.area
  Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Requirement Type' -Value $issueDefinition.requirementType
  Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Phase' -Value $issueDefinition.phase
  Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Priority' -Value $issueDefinition.priority
  Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Source Doc' -Value ($issueDefinition.sourceDocuments -join ', ')
  Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Acceptance Criteria' -Value $issueDefinition.acceptanceSummary

  if (-not [string]::IsNullOrWhiteSpace($issueDefinition.parentKey)) {
    $parentTitle = $issueDefinitionsByKey[$issueDefinition.parentKey].title
    Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Parent Epic' -Value $parentTitle
  }

  $targetDate = Get-PropertyValue -Object $issueDefinition -Name 'targetDate'
  if (-not [string]::IsNullOrWhiteSpace($targetDate)) {
    Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Target Date' -Value $targetDate
  }
}

Write-Step 'Done'
Write-Detail "Project number: $projectNumber"
Write-Detail "Project title: $projectName"
