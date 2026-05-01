[CmdletBinding()]
param(
  [string]$Owner,
  [string]$Repo,
  [string]$ProjectTitle,
  [string]$SpecPath,
  [switch]$DryRun,
  [switch]$SkipViews,
  [switch]$SyncWorkflowStatus
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

function Assert-TextValue {
  param(
    [object]$Value,
    [string]$Message
  )

  if ([string]::IsNullOrWhiteSpace([string]$Value)) {
    throw $Message
  }
}

function Assert-AllowedOption {
  param(
    [hashtable]$OptionsByField,
    [string]$FieldName,
    [string]$Value,
    [string]$IssueKey
  )

  if (-not $OptionsByField.ContainsKey($FieldName)) {
    throw "Project field is missing or is not SINGLE_SELECT: $FieldName"
  }

  if (-not $OptionsByField[$FieldName].ContainsKey($Value)) {
    throw "Issue $IssueKey uses invalid $FieldName option: $Value"
  }
}

function Assert-Spec {
  param([object]$Spec)

  $repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')
  $requiredProjectFields = @(
    'Requirement Status',
    'Area',
    'Requirement Type',
    'Phase',
    'Priority',
    'Source Doc',
    'Acceptance Criteria',
    'Parent Epic',
    'MVP Scenario',
    'Risk',
    'Test Target',
    'Thesis Evidence',
    'Readiness'
  )

  $projectFieldNames = @{}
  $singleSelectOptionsByField = @{}
  foreach ($field in $Spec.project.fields) {
    Assert-TextValue -Value $field.name -Message 'Project field without a name detected.'
    Assert-TextValue -Value $field.dataType -Message "Project field $($field.name) is missing dataType."
    $projectFieldNames[$field.name] = $true

    if ($field.dataType -eq 'SINGLE_SELECT') {
      $options = @{}
      foreach ($option in (Get-Collection $field.options)) {
        Assert-TextValue -Value $option -Message "Project field $($field.name) has an empty option."
        $options[[string]$option] = $true
      }

      if ($options.Count -lt 1) {
        throw "Single-select field $($field.name) has no options."
      }

      $singleSelectOptionsByField[$field.name] = $options
    }
  }

  foreach ($fieldName in $requiredProjectFields) {
    if (-not $projectFieldNames.ContainsKey($fieldName)) {
      throw "Required project field is missing: $fieldName"
    }
  }

  foreach ($view in (Get-Collection $Spec.project.views)) {
    Assert-TextValue -Value $view.name -Message 'Project view without a name detected.'
    Assert-TextValue -Value $view.layout -Message "Project view $($view.name) is missing layout."

    foreach ($fieldName in (Get-Collection (Get-PropertyValue -Object $view -Name 'visibleFields'))) {
      if (-not $projectFieldNames.ContainsKey($fieldName) -and $fieldName -ne 'Status') {
        throw "Project view $($view.name) references unknown visible field: $fieldName"
      }
    }

    foreach ($fieldName in (Get-Collection (Get-PropertyValue -Object $view -Name 'sortBy'))) {
      if (-not $projectFieldNames.ContainsKey($fieldName) -and $fieldName -ne 'Status') {
        throw "Project view $($view.name) references unknown sort field: $fieldName"
      }
    }

    $groupBy = Get-PropertyValue -Object $view -Name 'groupBy'
    if (-not [string]::IsNullOrWhiteSpace([string]$groupBy) -and -not $projectFieldNames.ContainsKey($groupBy) -and $groupBy -ne 'Status') {
      throw "Project view $($view.name) references unknown groupBy field: $groupBy"
    }

    $filter = Get-PropertyValue -Object $view -Name 'filter'
    if (-not [string]::IsNullOrWhiteSpace([string]$filter) -and $filter -match '^(?<field>[^:]+):') {
      $filterField = $Matches.field.Trim()
      if (-not $projectFieldNames.ContainsKey($filterField) -and $filterField -ne 'Status') {
        throw "Project view $($view.name) references unknown filter field: $filterField"
      }
    }
  }

  $definedLabels = @{}
  foreach ($label in $Spec.labels) {
    Assert-TextValue -Value $label.name -Message 'Repository label without a name detected.'
    Assert-TextValue -Value $label.description -Message "Repository label $($label.name) is missing a description."
    Assert-TextValue -Value $label.color -Message "Repository label $($label.name) is missing a color."

    if ($label.color -notmatch '^[0-9A-Fa-f]{6}$') {
      throw "Repository label $($label.name) must use a 6-digit hex color without #: $($label.color)"
    }

    if ($definedLabels.ContainsKey($label.name)) {
      throw "Duplicate repository label detected: $($label.name)"
    }

    $definedLabels[$label.name] = $true
  }

  $seenKeys = @{}
  $seenTitles = @{}
  $epicKeys = @{}

  foreach ($issue in $Spec.issues) {
    foreach ($fieldName in @('key', 'kind', 'title', 'status', 'area', 'requirementType', 'phase', 'priority', 'requirement', 'rationale', 'acceptanceSummary')) {
      $value = Get-PropertyValue -Object $issue -Name $fieldName
      Assert-TextValue -Value $value -Message "Issue is missing required field ${fieldName}: $($issue.key)"
    }

    if ($issue.kind -notin @('epic', 'issue')) {
      throw "Issue $($issue.key) has invalid kind: $($issue.kind)"
    }

    Assert-AllowedOption -OptionsByField $singleSelectOptionsByField -FieldName 'Requirement Status' -Value $issue.status -IssueKey $issue.key
    Assert-AllowedOption -OptionsByField $singleSelectOptionsByField -FieldName 'Area' -Value $issue.area -IssueKey $issue.key
    Assert-AllowedOption -OptionsByField $singleSelectOptionsByField -FieldName 'Requirement Type' -Value $issue.requirementType -IssueKey $issue.key
    Assert-AllowedOption -OptionsByField $singleSelectOptionsByField -FieldName 'Phase' -Value $issue.phase -IssueKey $issue.key
    Assert-AllowedOption -OptionsByField $singleSelectOptionsByField -FieldName 'Priority' -Value $issue.priority -IssueKey $issue.key

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

    foreach ($arrayFieldName in @('labels', 'acceptanceCriteria', 'outOfScope', 'sourceDocuments')) {
      $items = @(Get-Collection (Get-PropertyValue -Object $issue -Name $arrayFieldName))
      if ($items.Count -lt 1) {
        throw "Issue $($issue.key) must define at least one ${arrayFieldName} item."
      }

      foreach ($item in $items) {
        Assert-TextValue -Value $item -Message "Issue $($issue.key) has an empty ${arrayFieldName} item."
      }
    }

    foreach ($labelName in (Get-Collection $issue.labels)) {
      if (-not $definedLabels.ContainsKey($labelName)) {
        throw "Issue $($issue.key) references undefined label: $labelName"
      }
    }

    foreach ($sourceDocument in (Get-Collection $issue.sourceDocuments)) {
      $sourcePath = Join-Path $repoRoot $sourceDocument
      if (-not (Test-Path -LiteralPath $sourcePath)) {
        throw "Issue $($issue.key) references missing source document: $sourceDocument"
      }
    }

    $targetDate = Get-PropertyValue -Object $issue -Name 'targetDate'
    if (-not [string]::IsNullOrWhiteSpace([string]$targetDate)) {
      try {
        $null = [DateTime]::ParseExact([string]$targetDate, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)
      } catch {
        throw "Issue $($issue.key) has invalid targetDate; expected yyyy-MM-dd: $targetDate"
      }
    }
  }

  foreach ($issue in $Spec.issues) {
    if ($issue.kind -eq 'epic' -and -not [string]::IsNullOrWhiteSpace([string](Get-PropertyValue -Object $issue -Name 'parentKey'))) {
      throw "Epic $($issue.key) must not define parentKey."
    }

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

function Set-ProjectLink {
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

function Set-RepositoryLabels {
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

function Set-ProjectFields {
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

function Set-Issue {
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
query($owner: String!, $repo: String!, $issueNumber: Int!) {
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

function Set-IssueInProject {
  param(
    [string]$OwnerLogin,
    [string]$ProjectNumber,
    [string]$RepoOwner,
    [string]$RepoName,
    [object]$Issue
  )

  for ($attempt = 1; $attempt -le 3; $attempt++) {
    $existingItemId = Get-ProjectItemIdForIssue -RepoOwner $RepoOwner -RepoName $RepoName -IssueNumber $Issue.number -ProjectNumber $ProjectNumber
    if ($null -ne $existingItemId) {
      return $existingItemId
    }

    Start-Sleep -Seconds 1
  }

  Write-Detail "Adding issue #$($Issue.number) to project"
  try {
    $null = Invoke-Gh -Arguments @('project', 'item-add', $ProjectNumber, '--owner', $OwnerLogin, '--url', $Issue.url)
  } catch {
    $message = "$($_.Exception.Message)`n$_"
    if ($message -notmatch 'Content already exists in this project') {
      throw
    }

    Write-Detail "Issue #$($Issue.number) is already in the project; resolving item id again."
  }

  $itemId = $null
  for ($attempt = 1; $attempt -le 5; $attempt++) {
    $itemId = Get-ProjectItemIdForIssue -RepoOwner $RepoOwner -RepoName $RepoName -IssueNumber $Issue.number -ProjectNumber $ProjectNumber
    if ($null -ne $itemId) {
      break
    }

    Start-Sleep -Seconds 2
  }

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

function Set-ProjectFieldValueIfPresent {
  param(
    [string]$ProjectId,
    [string]$ItemId,
    [hashtable]$FieldMap,
    [string]$FieldName,
    [string]$Value
  )

  if ($FieldMap.ContainsKey($FieldName)) {
    Set-ProjectFieldValue -ProjectId $ProjectId -ItemId $ItemId -FieldMap $FieldMap -FieldName $FieldName -Value $Value
  }
}

function Get-WorkflowStatus {
  param([object]$IssueDefinition)

  if ($IssueDefinition.status -eq 'Advisor Review') {
    return 'Review'
  }

  if ($IssueDefinition.kind -eq 'epic') {
    return 'Review'
  }

  if ($IssueDefinition.phase -eq 'Faz 1' -and $IssueDefinition.priority -eq 'P0') {
    return 'Ready'
  }

  return 'Backlog'
}

function Get-Readiness {
  param([object]$IssueDefinition)

  if ($IssueDefinition.status -in @('Approved', 'Done')) {
    return 'Validated'
  }

  if ($IssueDefinition.status -eq 'Deferred') {
    return 'Blocked'
  }

  $labels = Get-Collection (Get-PropertyValue -Object $IssueDefinition -Name 'labels')
  if ($labels -contains 'blocked') {
    return 'Blocked'
  }

  if ($IssueDefinition.status -eq 'Advisor Review') {
    return 'Ready'
  }

  if ($IssueDefinition.phase -eq 'Faz 1' -and $IssueDefinition.priority -eq 'P0') {
    return 'Ready'
  }

  return 'Needs Clarification'
}

function Get-MvpScenario {
  param([object]$IssueDefinition)

  switch ($IssueDefinition.area) {
    'Research' { return 'Research scope and thesis success criteria' }
    'Editor' { return 'Editor foundation and workspace onboarding' }
    'Retrieval' { return 'Codebase Q&A and multi-file context retrieval' }
    'Agent' { return 'User-triggered agent task flow' }
    'Safety' { return 'Safety guardrails and protected workspace behavior' }
    'Model' { return 'Cloud/local model selection and fallback' }
    'Testing' { return 'Verification of approval-gated agent flow' }
    'Evaluation' { return 'Benchmark and thesis evaluation' }
    'Thesis' { return 'Thesis roadmap and final deliverables' }
    'UX' {
      if ($IssueDefinition.title -match 'onboarding|konfigurasyon|Ilk acilis') {
        return 'Editor foundation and workspace onboarding'
      }

      if ($IssueDefinition.title -match 'Diff|onay|approval|rollback|kontrol|neden|Reactive') {
        return 'Diff review, approval, rollback, and safety warning flow'
      }

      return 'Controlled user interaction'
    }
    default { return $IssueDefinition.area }
  }
}

function Get-RiskTrace {
  param([object]$IssueDefinition)

  if ($IssueDefinition.requirementType -eq 'Risk') {
    return $IssueDefinition.acceptanceSummary
  }

  switch ($IssueDefinition.area) {
    'Research' { return 'Scope drift or unclear advisor acceptance' }
    'Editor' { return 'Weak editor base can block end-to-end agent evaluation' }
    'Retrieval' { return 'Wrong, missing, or excessive context can reduce accuracy or privacy' }
    'Agent' { return 'Excessive agency or missing approval boundary' }
    'Safety' { return 'Unauthorized write, secret exposure, or boundary bypass' }
    'UX' {
      if ($IssueDefinition.title -match 'onboarding|konfigurasyon|Ilk acilis') {
        return 'Incorrect workspace, model, or privacy setup can weaken safety assumptions'
      }

      return 'Loss of user control, trust, or review clarity'
    }
    'Model' { return 'Cost, latency, provider availability, or quality trade-off' }
    'Testing' { return 'Regression in core safety or agent flows' }
    'Evaluation' { return 'Weak evidence can make thesis claims hard to defend' }
    'Thesis' { return 'Missed roadmap gate or final deliverable risk' }
    default { return 'Tracked in source documents' }
  }
}

function Get-TestTarget {
  param([object]$IssueDefinition)

  if ($IssueDefinition.kind -eq 'epic') {
    return 'Child issue completion and advisor review checklist'
  }

  switch ($IssueDefinition.area) {
    'Research' { return 'Document review and traceability check' }
    'Editor' { return 'UI smoke, workspace, and file-flow tests' }
    'Retrieval' { return 'Retrieval fixtures, privacy filters, and context selection tests' }
    'Agent' { return 'Agent loop and approval-gate integration tests' }
    'Safety' { return 'Boundary, protected-file, secret-scan, and audit regression tests' }
    'UX' {
      if ($IssueDefinition.title -match 'onboarding|konfigurasyon|Ilk acilis') {
        return 'Onboarding, workspace selection, preference, and API-key storage smoke tests'
      }

      return 'Approval, reject, rollback, and warning E2E flows'
    }
    'Model' { return 'Provider adapter, fallback, latency, and cost checks' }
    'Testing' { return 'CI coverage and test-suite execution' }
    'Evaluation' { return 'Benchmark harness, scoring rubric, and metric export validation' }
    'Thesis' { return 'Roadmap checkpoint and final deliverable review' }
    default { return 'Manual verification' }
  }
}

function Get-ThesisEvidence {
  param([object]$IssueDefinition)

  switch ($IssueDefinition.area) {
    'Research' { return 'Advisor-approved scope notes and linked planning documents' }
    'Editor' { return 'Working prototype demo, screenshots, and smoke-test result' }
    'Retrieval' { return 'Context citation samples, retrieval precision notes, and token comparison' }
    'Agent' { return 'Plan-first execution traces and approved diff records' }
    'Safety' { return 'Security test results, audit log entries, and unauthorized-write count' }
    'UX' {
      if ($IssueDefinition.title -match 'onboarding|konfigurasyon|Ilk acilis') {
        return 'Onboarding screenshots, config storage behavior, and privacy trace notes'
      }

      return 'Approval/reject/rollback traces and short user trust observations'
    }
    'Model' { return 'Local/cloud latency, cost, and fallback comparison table' }
    'Testing' { return 'CI artifacts, test reports, and coverage summaries' }
    'Evaluation' { return 'Benchmark tables, anonymized exports, and metric summaries' }
    'Thesis' { return 'Roadmap checkpoint evidence, demo package, thesis text, and defense materials' }
    default { return 'Evidence linked from source documents' }
  }
}

function New-ProjectViews {
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
  Write-Detail "Sync workflow status: $SyncWorkflowStatus"
  return
}

Assert-GhReady

Write-Step 'Ensuring repository labels'
Set-RepositoryLabels -Spec $spec -RepoFullName $repoInfo.FullName

Write-Step 'Ensuring GitHub Project'
$project = Get-OrCreateProject -OwnerLogin $ownerLogin -Title $projectName
$projectNumber = [string](Get-PropertyValue -Object $project -Name 'number')
Set-ProjectLink -OwnerLogin $ownerLogin -ProjectNumber $projectNumber -RepoFullName $repoInfo.FullName

Write-Step 'Ensuring project fields'
Set-ProjectFields -Spec $spec -OwnerLogin $ownerLogin -ProjectNumber $projectNumber
$projectMetadata = Get-ProjectMetadata -OwnerLogin $ownerLogin -ProjectNumber ([int]$projectNumber)
$projectId = Get-PropertyValue -Object $projectMetadata -Name 'id'
$fieldMap = Get-FieldMap -ProjectMetadata $projectMetadata

Write-Step 'Ensuring project views'
New-ProjectViews -Spec $spec -OwnerLogin $ownerLogin -ProjectNumber ([int]$projectNumber)

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
  $issue = Set-Issue -IssueDefinition $issueDefinition -IssueDefinitionsByKey $issueDefinitionsByKey -ExistingIssuesByTitle $existingIssuesByTitle -RepoFullName $repoInfo.FullName
  $itemId = Set-IssueInProject -OwnerLogin $ownerLogin -ProjectNumber $projectNumber -RepoOwner $repoInfo.Owner -RepoName $repoInfo.Name -Issue $issue

  if ($SyncWorkflowStatus) {
    Set-ProjectFieldValueIfPresent -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Status' -Value (Get-WorkflowStatus -IssueDefinition $issueDefinition)
  }

  Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Requirement Status' -Value $issueDefinition.status
  Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Area' -Value $issueDefinition.area
  Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Requirement Type' -Value $issueDefinition.requirementType
  Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Phase' -Value $issueDefinition.phase
  Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Priority' -Value $issueDefinition.priority
  Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Source Doc' -Value ($issueDefinition.sourceDocuments -join ', ')
  Set-ProjectFieldValue -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Acceptance Criteria' -Value $issueDefinition.acceptanceSummary
  Set-ProjectFieldValueIfPresent -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'MVP Scenario' -Value (Get-MvpScenario -IssueDefinition $issueDefinition)
  Set-ProjectFieldValueIfPresent -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Risk' -Value (Get-RiskTrace -IssueDefinition $issueDefinition)
  Set-ProjectFieldValueIfPresent -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Test Target' -Value (Get-TestTarget -IssueDefinition $issueDefinition)
  Set-ProjectFieldValueIfPresent -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Thesis Evidence' -Value (Get-ThesisEvidence -IssueDefinition $issueDefinition)
  Set-ProjectFieldValueIfPresent -ProjectId $projectId -ItemId $itemId -FieldMap $fieldMap -FieldName 'Readiness' -Value (Get-Readiness -IssueDefinition $issueDefinition)

  $parentKey = Get-PropertyValue -Object $issueDefinition -Name 'parentKey'
  if (-not [string]::IsNullOrWhiteSpace($parentKey)) {
    $parentTitle = $issueDefinitionsByKey[$parentKey].title
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
