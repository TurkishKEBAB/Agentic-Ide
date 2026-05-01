[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message"
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

function Get-RelativePath {
  param(
    [string]$BasePath,
    [string]$TargetPath
  )

  $baseFullPath = (Resolve-Path -LiteralPath $BasePath).Path.TrimEnd('\', '/')
  $targetFullPath = (Resolve-Path -LiteralPath $TargetPath).Path
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

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$markdownFiles = Get-ChildItem -LiteralPath $repoRoot -Recurse -Filter '*.md' -File |
  Where-Object {
    $_.FullName -notmatch '\\\.git\\' -and
    $_.FullName -notmatch '\\node_modules\\' -and
    $_.FullName -notmatch '\\dist\\' -and
    $_.FullName -notmatch '\\build\\'
  }

Write-Step "Checking Markdown links in $($markdownFiles.Count) files"

$errors = New-Object System.Collections.Generic.List[string]
$linkPattern = '!?\[[^\]]*\]\((?<target>[^)]+)\)'

foreach ($file in $markdownFiles) {
  $lines = Get-Content -LiteralPath $file.FullName
  for ($index = 0; $index -lt $lines.Count; $index++) {
    foreach ($match in [regex]::Matches($lines[$index], $linkPattern)) {
      $target = $match.Groups['target'].Value.Trim()
      if ([string]::IsNullOrWhiteSpace($target) -or (Test-ExternalTarget -Target $target)) {
        continue
      }

      $resolvedTarget = Resolve-MarkdownTarget -Target $target -SourceDirectory $file.DirectoryName -RepoRoot $repoRoot
      if ($null -eq $resolvedTarget) {
        continue
      }

      if (-not (Test-Path -LiteralPath $resolvedTarget)) {
        $relativeFile = Get-RelativePath -BasePath $repoRoot -TargetPath $file.FullName
        $errors.Add("${relativeFile}:$($index + 1) -> missing link target '$target'")
      }
    }
  }
}

if ($errors.Count -gt 0) {
  throw "Broken Markdown links found:`n$($errors -join [Environment]::NewLine)"
}

Write-Step 'Markdown link validation passed'
