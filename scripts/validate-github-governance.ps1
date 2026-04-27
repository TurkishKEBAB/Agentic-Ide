[CmdletBinding()]
param(
  [string]$Owner = 'TurkishKEBAB'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message"
}

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')

Write-Step 'Checking required repository files'
$requiredFiles = @(
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  '.gitignore',
  '.gitattributes',
  '.github/workflows/ci.yml',
  '.github/pull_request_template.md',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/ISSUE_TEMPLATE/requirements-analysis.md',
  '.github/dependabot.yml',
  'github-projects/requirements-analysis.json',
  'scripts/setup-requirements-github-project.ps1'
)

foreach ($relativePath in $requiredFiles) {
  $path = Join-Path $repoRoot $relativePath
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Required file is missing: $relativePath"
  }
}

Write-Step 'Validating requirements seed JSON'
$specPath = Join-Path $repoRoot 'github-projects/requirements-analysis.json'
$spec = Get-Content -LiteralPath $specPath -Raw | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($spec.project.title)) {
  throw 'Project title is missing from requirements-analysis.json.'
}

if ($spec.project.fields.Count -lt 1) {
  throw 'No project fields were defined in requirements-analysis.json.'
}

if ($spec.issues.Count -lt 1) {
  throw 'No issues were defined in requirements-analysis.json.'
}

Write-Step 'Scanning tracked files for accidental local paths or secrets'
$forbiddenPattern = 'workspaceStorage|GitHub\.copilot-chat|gho_[A-Za-z0-9_]+|(^|[^A-Za-z0-9_])sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|PRIVATE) KEY'
$grepOutput = & git -C $repoRoot grep -n -E $forbiddenPattern -- . ':!scripts/validate-github-governance.ps1' 2>$null
$grepExitCode = $LASTEXITCODE

if ($grepExitCode -eq 0) {
  $text = ($grepOutput -join [Environment]::NewLine)
  throw "Forbidden local path or secret-like pattern found:`n$text"
}

if ($grepExitCode -ne 1) {
  throw "git grep failed with exit code $grepExitCode."
}

Write-Step 'Running GitHub Project setup dry run'
$setupScript = Join-Path $repoRoot 'scripts/setup-requirements-github-project.ps1'
& $setupScript -Owner $Owner -DryRun

Write-Step 'Repository governance validation passed'
