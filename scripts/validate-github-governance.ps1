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
  '.editorconfig',
  '.nvmrc',
  '.commitlintrc.json',
  '.markdownlint.json',
  '.gitignore',
  '.gitattributes',
  '.vscode/extensions.json',
  '.vscode/settings.json',
  '.vscode/tasks.json',
  '.github/workflows/ci.yml',
  '.github/workflows/governance.yml',
  '.github/workflows/docs.yml',
  '.github/workflows/security.yml',
  '.github/workflows/codeql.yml',
  '.github/workflows/supply-chain.yml',
  '.github/pull_request_template.md',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/ISSUE_TEMPLATE/requirements-analysis.md',
  '.github/ISSUE_TEMPLATE/adr.md',
  '.github/ISSUE_TEMPLATE/spike.md',
  '.github/ISSUE_TEMPLATE/research-question.md',
  '.github/ISSUE_TEMPLATE/quality-gate-gap.md',
  '.github/ISSUE_TEMPLATE/security-hardening.md',
  '.github/dependabot.yml',
  'github-projects/requirements-analysis.json',
  'docs/IMPLEMENTATION_READINESS.md',
  'docs/PRE_IMPLEMENTATION_AUDIT.md',
  'docs/QUALITY_GATES.md',
  'docs/VSCODE_WORKSPACE_ANALYSIS.md',
  'docs/GITHUB_PROJECT_OPERATIONS.md',
  'docs/GLOSSARY.md',
  'docs/THREAT_MODEL.md',
  'docs/INCIDENT_RESPONSE.md',
  'docs/ACCESSIBILITY_PLAN.md',
  'docs/DATA_RETENTION.md',
  'docs/adr/README.md',
  'docs/adr/ADR-009-prompt-model-versioning.md',
  'docs/schemas/README.md',
  'docs/schemas/requirements-project.schema.json',
  'docs/benchmark/README.md',
  'scripts/setup-requirements-github-project.ps1',
  'scripts/vscode-problems.ps1',
  'scripts/validate-doc-links.ps1',
  'scripts/validate-plantuml.ps1'
)

foreach ($relativePath in $requiredFiles) {
  $path = Join-Path $repoRoot $relativePath
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Required file is missing: $relativePath"
  }
}

Write-Step 'Validating GitHub workflow guardrails'
$workflowDir = Join-Path $repoRoot '.github/workflows'
$workflowFiles = Get-ChildItem -LiteralPath $workflowDir -Filter '*.yml'
foreach ($workflowFile in $workflowFiles) {
  $relativePath = Resolve-Path -LiteralPath $workflowFile.FullName -Relative
  $content = Get-Content -LiteralPath $workflowFile.FullName -Raw

  if ($content -notmatch '(?m)^permissions:\s*$') {
    throw "Workflow is missing an explicit permissions block: $relativePath"
  }

  if ($content -match '(?m)^\s*pull_request_target\s*:') {
    throw "Workflow uses pull_request_target, which is not allowed without a separate security review: $relativePath"
  }

  if ($content -match '(?m)^\s*permissions:\s*write-all\s*$') {
    throw "Workflow uses permissions: write-all, which is not allowed: $relativePath"
  }

  $mutableActionRefs = Select-String -Path $workflowFile.FullName -Pattern 'uses:\s+[^@\s]+/(?:[^@\s]+)@(main|master|latest)\b'
  if ($mutableActionRefs) {
    $mutableActionMessages = ($mutableActionRefs | ForEach-Object { "$($_.LineNumber):$($_.Line.Trim())" }) -join [Environment]::NewLine
    throw "Workflow uses mutable action refs in ${relativePath}:`n$mutableActionMessages"
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
$grepOutput = & git -C $repoRoot grep -n -E $forbiddenPattern -- . ':!scripts/validate-github-governance.ps1' ':!scripts/vscode-problems.ps1' 2>$null
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

Write-Step 'Validating documentation links'
$docLinkScript = Join-Path $repoRoot 'scripts/validate-doc-links.ps1'
& $docLinkScript

Write-Step 'Validating PlantUML diagrams'
$plantUmlScript = Join-Path $repoRoot 'scripts/validate-plantuml.ps1'
& $plantUmlScript

Write-Step 'Repository governance validation passed'
