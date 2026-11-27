<#
.SYNOPSIS
  Builds and launches the Agentic IDE Electron app.

.DESCRIPTION
  1. Checks that the active Node.js major version matches .nvmrc.
  2. Runs `npm ci` when node_modules is missing, older than package-lock.json,
     or lacks the Electron binary (or always, with -Reinstall).
  3. Clears environment variables that change how Electron starts, for this run only.
  4. Default: builds the production bundles and runs them from out/ through the
     hardened app://renderer protocol (`npm start`, electron-vite preview).
     -Dev: starts the Vite dev server with hot reload instead (`npm run dev`).

  The script returns when the app window is closed (or Ctrl+C in -Dev mode).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\start-app.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\start-app.ps1 -Dev
#>
[CmdletBinding()]
param(
  # Start the Vite dev server with hot reload instead of the production build.
  [switch]$Dev,
  # Always reinstall the locked dependencies with `npm ci`.
  [switch]$Reinstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Some hosts (for example VS Code extension terminals) export ELECTRON_RUN_AS_NODE=1, which turns
# electron.exe into plain Node so no window opens. A stale ELECTRON_RENDERER_URL would point the
# production build at a dev server that is not running. electron-vite sets the latter itself in -Dev.
$ClearedVariables = @('ELECTRON_RUN_AS_NODE', 'ELECTRON_RENDERER_URL')

$Npm = if ($env:OS -eq 'Windows_NT') { 'npm.cmd' } else { 'npm' }

function Get-RepoRoot {
  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
}

function Get-MajorVersion {
  param([string]$Version)
  return [int]($Version.Trim().TrimStart('v').Split('.')[0])
}

function Assert-NodeVersion {
  param([string]$RepoRoot)

  if ($null -eq (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js was not found on PATH. Install Node.js 24 (see .nvmrc) and try again.'
  }
  $expected = Get-MajorVersion (Get-Content -LiteralPath (Join-Path $RepoRoot '.nvmrc') -TotalCount 1)
  $actual = (& node --version).Trim()
  if ((Get-MajorVersion $actual) -ne $expected) {
    throw "Node.js $actual is active, but this project requires Node.js $expected (.nvmrc). Switch versions (for example with nvm) and try again."
  }
  Write-Host "Node.js $actual"
}

function Test-InstallNeeded {
  param([string]$RepoRoot)

  # npm rewrites node_modules/.package-lock.json on every install, so an older copy means a stale tree.
  $installed = Join-Path $RepoRoot 'node_modules\.package-lock.json'
  if (-not (Test-Path -LiteralPath $installed)) {
    return $true
  }
  # The electron package downloads its binary in a postinstall step; path.txt exists only after it ran.
  if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'node_modules\electron\path.txt'))) {
    return $true
  }
  $lock = Get-Item -LiteralPath (Join-Path $RepoRoot 'package-lock.json')
  return $lock.LastWriteTimeUtc -gt (Get-Item -LiteralPath $installed).LastWriteTimeUtc
}

function Invoke-Npm {
  param([string[]]$Arguments)

  & $Npm @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "npm $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
  }
}

$repoRoot = Get-RepoRoot
$savedVariables = @{}
Push-Location -LiteralPath $repoRoot
try {
  Assert-NodeVersion -RepoRoot $repoRoot

  if ($Reinstall -or (Test-InstallNeeded -RepoRoot $repoRoot)) {
    Write-Host 'Installing the locked dependencies (npm ci)...'
    Invoke-Npm @('ci')
  }

  foreach ($name in $ClearedVariables) {
    $value = [Environment]::GetEnvironmentVariable($name, 'Process')
    if ($null -ne $value) {
      $savedVariables[$name] = $value
      [Environment]::SetEnvironmentVariable($name, $null, 'Process')
      Write-Host "Cleared $name for this run."
    }
  }

  if ($Dev) {
    Write-Host 'Starting the dev server with hot reload. Press Ctrl+C to stop.'
    Invoke-Npm @('run', 'dev')
  } else {
    Write-Host 'Building and launching Agentic IDE. Close the window to exit.'
    Invoke-Npm @('start')
  }
} finally {
  # Restore the caller's environment when the script runs inside an existing PowerShell session.
  foreach ($name in $savedVariables.Keys) {
    [Environment]::SetEnvironmentVariable($name, $savedVariables[$name], 'Process')
  }
  Pop-Location
}
