[CmdletBinding()]
param(
  [string]$Owner = 'TurkishKEBAB'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:ErrorCount = 0
$script:WarningCount = 0

function Get-RepoRoot {
  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
}

function Get-RelativePath {
  param(
    [string]$BasePath,
    [string]$TargetPath
  )

  $baseFullPath = (Resolve-Path -LiteralPath $BasePath).Path.TrimEnd('\', '/')
  $targetFullPath = if (Test-Path -LiteralPath $TargetPath) {
    (Resolve-Path -LiteralPath $TargetPath).Path
  } else {
    Join-Path $baseFullPath $TargetPath
  }

  $baseUriPath = ($baseFullPath + [System.IO.Path]::DirectorySeparatorChar).Replace('\', '/')
  $targetUriPath = $targetFullPath.Replace('\', '/')

  if ($baseUriPath -match '^[A-Za-z]:/') {
    $baseUriPath = "/$baseUriPath"
  }

  if ($targetUriPath -match '^[A-Za-z]:/') {
    $targetUriPath = "/$targetUriPath"
  }

  $baseUri = [Uri]("file://$baseUriPath")
  $targetUri = [Uri]("file://$targetUriPath")
  return [Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString()).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
}

function Write-Diagnostic {
  param(
    [string]$File,
    [int]$Line = 1,
    [int]$Column = 1,
    [ValidateSet('error', 'warning', 'info')]
    [string]$Severity = 'error',
    [string]$Code,
    [string]$Message
  )

  if ($Severity -eq 'error') {
    $script:ErrorCount++
  } elseif ($Severity -eq 'warning') {
    $script:WarningCount++
  }

  $safeMessage = $Message -replace "`r?`n", ' '
  Write-Output ("{0}({1},{2}): {3} {4}: {5}" -f $File, $Line, $Column, $Severity, $Code, $safeMessage)
}

function Test-ExternalTarget {
  param([string]$Target)

  return $Target -match '^(https?|mailto|tel|app)://' -or
    $Target -match '^#' -or
    $Target -match '^[A-Za-z][A-Za-z0-9+.-]*:'
}

function Resolve-MarkdownTarget {
  param(
    [string]$Target,
    [string]$SourceDirectory,
    [string]$RepoRoot
  )

  $cleanTarget = $Target.Trim()
  if ($cleanTarget.StartsWith('<') -and $cleanTarget.EndsWith('>')) {
    $cleanTarget = $cleanTarget.Substring(1, $cleanTarget.Length - 2)
  }

  $cleanTarget = $cleanTarget -replace '\s+".*"$', ''
  $cleanTarget = ($cleanTarget -split '#')[0]
  if ([string]::IsNullOrWhiteSpace($cleanTarget)) {
    return $null
  }

  $cleanTarget = [Uri]::UnescapeDataString($cleanTarget)

  if ([System.IO.Path]::IsPathRooted($cleanTarget) -and $cleanTarget -notmatch '^/') {
    return $cleanTarget
  }

  if ($cleanTarget.StartsWith('/')) {
    return Join-Path $RepoRoot $cleanTarget.TrimStart('/')
  }

  return Join-Path $SourceDirectory $cleanTarget
}

function Test-RequiredFiles {
  param([string]$RepoRoot)

  $requiredFiles = @(
    'README.md',
    'CONTRIBUTING.md',
    'SECURITY.md',
    '.editorconfig',
    '.nvmrc',
    '.commitlintrc.json',
    '.vscode/extensions.json',
    '.vscode/settings.json',
    '.vscode/tasks.json',
    '.github/workflows/ci.yml',
    '.github/workflows/governance.yml',
    '.github/workflows/docs.yml',
    '.github/workflows/security.yml',
    '.github/workflows/codeql.yml',
    '.github/workflows/supply-chain.yml',
    '.github/dependabot.yml',
    'github-projects/requirements-analysis.json',
    'docs/QUALITY_GATES.md',
    'docs/GITHUB_PROJECT_OPERATIONS.md',
    'docs/THREAT_MODEL.md',
    'docs/INCIDENT_RESPONSE.md',
    'docs/DATA_RETENTION.md',
    'docs/ACCESSIBILITY_PLAN.md',
    'scripts/vscode-problems.ps1'
  )

  foreach ($relativePath in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot $relativePath))) {
      Write-Diagnostic -File $relativePath -Severity error -Code 'REQ-MISSING' -Message 'Required workspace analysis file is missing.'
    }
  }
}

function Test-JsonFiles {
  param([string]$RepoRoot)

  $jsonFiles = Get-ChildItem -LiteralPath $RepoRoot -Recurse -Filter '*.json' -File |
    Where-Object {
      $_.FullName -notmatch '\\\.git\\' -and
      $_.FullName -notmatch '\\node_modules\\' -and
      $_.FullName -notmatch '\\dist\\' -and
      $_.FullName -notmatch '\\build\\' -and
      $_.FullName -notmatch '\\out\\'
    }

  foreach ($file in $jsonFiles) {
    try {
      Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json | Out-Null
    } catch {
      $relativePath = Get-RelativePath -BasePath $RepoRoot -TargetPath $file.FullName
      Write-Diagnostic -File $relativePath -Severity error -Code 'JSON-PARSE' -Message $_.Exception.Message
    }
  }
}

function Test-MarkdownLinks {
  param([string]$RepoRoot)

  $markdownFiles = Get-ChildItem -LiteralPath $RepoRoot -Recurse -Filter '*.md' -File |
    Where-Object {
      $_.FullName -notmatch '\\\.git\\' -and
      $_.FullName -notmatch '\\node_modules\\' -and
      $_.FullName -notmatch '\\dist\\' -and
      $_.FullName -notmatch '\\build\\' -and
      $_.FullName -notmatch '\\out\\'
    }

  $linkPattern = '!?\[[^\]]*\]\((?<target>[^)]+)\)'
  foreach ($file in $markdownFiles) {
    $lines = Get-Content -LiteralPath $file.FullName
    for ($index = 0; $index -lt $lines.Count; $index++) {
      foreach ($match in [regex]::Matches($lines[$index], $linkPattern)) {
        $target = $match.Groups['target'].Value.Trim()
        if ([string]::IsNullOrWhiteSpace($target) -or (Test-ExternalTarget -Target $target)) {
          continue
        }

        $resolvedTarget = Resolve-MarkdownTarget -Target $target -SourceDirectory $file.DirectoryName -RepoRoot $RepoRoot
        if ($null -eq $resolvedTarget) {
          continue
        }

        if (-not (Test-Path -LiteralPath $resolvedTarget)) {
          $relativePath = Get-RelativePath -BasePath $RepoRoot -TargetPath $file.FullName
          Write-Diagnostic -File $relativePath -Line ($index + 1) -Column ($match.Index + 1) -Severity error -Code 'MD-LINK' -Message "Missing Markdown link target '$target'."
        }
      }
    }
  }
}

function Test-PlantUmlFiles {
  param([string]$RepoRoot)

  $diagramRoot = Join-Path $RepoRoot 'diagrams'
  if (-not (Test-Path -LiteralPath $diagramRoot)) {
    return
  }

  $diagramFiles = Get-ChildItem -LiteralPath $diagramRoot -Recurse -Filter '*.puml' -File
  foreach ($file in $diagramFiles) {
    $lines = Get-Content -LiteralPath $file.FullName
    $content = $lines -join [Environment]::NewLine
    $startCount = ([regex]::Matches($content, '@startuml')).Count
    $endCount = ([regex]::Matches($content, '@enduml')).Count
    $relativePath = Get-RelativePath -BasePath $RepoRoot -TargetPath $file.FullName

    if ($startCount -eq 0) {
      Write-Diagnostic -File $relativePath -Severity error -Code 'PUML-START' -Message 'Missing @startuml.'
    }

    if ($endCount -eq 0) {
      Write-Diagnostic -File $relativePath -Severity error -Code 'PUML-END' -Message 'Missing @enduml.'
    }

    if ($startCount -ne $endCount) {
      Write-Diagnostic -File $relativePath -Severity error -Code 'PUML-BALANCE' -Message "@startuml count ($startCount) does not match @enduml count ($endCount)."
    }

    for ($index = 0; $index -lt $lines.Count; $index++) {
      if ($lines[$index] -match '(?i)^\s*(participant\s+Sandbox\b|actor\s+Sandbox\b|usecase\s+.*Sandbox)') {
        Write-Diagnostic -File $relativePath -Line ($index + 1) -Severity warning -Code 'PUML-TERM' -Message 'Use workspace boundary terminology instead of Sandbox in MVP diagrams.'
      }
    }
  }
}

function Test-WorkflowGuardrails {
  param([string]$RepoRoot)

  $workflowDir = Join-Path $RepoRoot '.github/workflows'
  if (-not (Test-Path -LiteralPath $workflowDir)) {
    return
  }

  $workflowFiles = Get-ChildItem -LiteralPath $workflowDir -Filter '*.yml' -File
  foreach ($workflowFile in $workflowFiles) {
    $relativePath = Get-RelativePath -BasePath $RepoRoot -TargetPath $workflowFile.FullName
    $lines = Get-Content -LiteralPath $workflowFile.FullName
    $content = $lines -join [Environment]::NewLine

    if ($content -notmatch '(?m)^permissions:\s*$') {
      Write-Diagnostic -File $relativePath -Severity error -Code 'GHA-PERM' -Message 'Workflow is missing an explicit permissions block.'
    }

    for ($index = 0; $index -lt $lines.Count; $index++) {
      $line = $lines[$index]
      if ($line -match '^\s*pull_request_target\s*:') {
        Write-Diagnostic -File $relativePath -Line ($index + 1) -Severity error -Code 'GHA-PRTARGET' -Message 'pull_request_target requires a separate security review.'
      }

      if ($line -match '^\s*permissions:\s*write-all\s*$') {
        Write-Diagnostic -File $relativePath -Line ($index + 1) -Severity error -Code 'GHA-WRITEALL' -Message 'permissions: write-all is not allowed.'
      }

      if ($line -match 'uses:\s+[^@\s]+/(?:[^@\s]+)@(main|master|latest)\b') {
        Write-Diagnostic -File $relativePath -Line ($index + 1) -Severity error -Code 'GHA-MUTABLE' -Message 'Use a versioned action reference instead of main/master/latest.'
      }
    }
  }
}

function Test-SecretAndLocalPathPatterns {
  param([string]$RepoRoot)

  $forbiddenPattern = 'workspaceStorage|GitHub\.copilot-chat|gho_[A-Za-z0-9_]+|(^|[^A-Za-z0-9_])sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|PRIVATE) KEY'
  $grepMatches = & git -C $RepoRoot grep -n -E $forbiddenPattern -- . ':!scripts/validate-github-governance.ps1' ':!scripts/vscode-problems.ps1' 2>$null
  $grepExitCode = $LASTEXITCODE

  if ($grepExitCode -eq 0) {
    foreach ($match in $grepMatches) {
      if ($match -match '^(?<file>[^:]+):(?<line>\d+):(?<message>.*)$') {
        Write-Diagnostic -File $Matches.file -Line ([int]$Matches.line) -Severity error -Code 'SECRET-LOCAL' -Message 'Forbidden local path or secret-like pattern found.'
      }
    }
  } elseif ($grepExitCode -ne 1) {
    Write-Diagnostic -File 'scripts/vscode-problems.ps1' -Severity error -Code 'GIT-GREP' -Message "git grep failed with exit code $grepExitCode."
  }
}

function Test-AppScaffoldReadiness {
  param([string]$RepoRoot)

  $packagePath = Join-Path $RepoRoot 'package.json'
  if (-not (Test-Path -LiteralPath $packagePath)) {
    return
  }

  if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'package-lock.json'))) {
    Write-Diagnostic -File 'package.json' -Severity error -Code 'NPM-LOCK' -Message 'package-lock.json is required once package.json exists.'
  }

  try {
    $packageJson = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
    $scripts = @()
    if ($null -ne $packageJson.scripts) {
      $scripts = @($packageJson.scripts.PSObject.Properties.Name)
    }

    foreach ($requiredScript in @('format:check', 'lint', 'typecheck', 'test', 'test:security', 'build')) {
      if ($scripts -notcontains $requiredScript) {
        Write-Diagnostic -File 'package.json' -Severity warning -Code 'NPM-SCRIPT' -Message "Recommended quality script is missing: $requiredScript."
      }
    }
  } catch {
    Write-Diagnostic -File 'package.json' -Severity error -Code 'NPM-PARSE' -Message $_.Exception.Message
  }
}

function Test-ProjectSeedDryRun {
  param(
    [string]$RepoRoot,
    [string]$Owner
  )

  $setupScript = Join-Path $RepoRoot 'scripts/setup-requirements-github-project.ps1'
  if (-not (Test-Path -LiteralPath $setupScript)) {
    return
  }

  try {
    & $setupScript -Owner $Owner -DryRun *> $null
  } catch {
    Write-Diagnostic -File 'github-projects/requirements-analysis.json' -Severity error -Code 'PROJECT-SEED' -Message $_.Exception.Message
  }
}

$repoRoot = Get-RepoRoot

Test-RequiredFiles -RepoRoot $repoRoot
Test-JsonFiles -RepoRoot $repoRoot
Test-MarkdownLinks -RepoRoot $repoRoot
Test-PlantUmlFiles -RepoRoot $repoRoot
Test-WorkflowGuardrails -RepoRoot $repoRoot
Test-SecretAndLocalPathPatterns -RepoRoot $repoRoot
Test-AppScaffoldReadiness -RepoRoot $repoRoot
Test-ProjectSeedDryRun -RepoRoot $repoRoot -Owner $Owner

Write-Output ("workspace(1,1): info WORKSPACE-SCAN: Completed with {0} error(s), {1} warning(s)." -f $script:ErrorCount, $script:WarningCount)

if ($script:ErrorCount -gt 0) {
  exit 1
}

exit 0
