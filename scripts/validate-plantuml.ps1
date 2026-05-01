[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message"
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
$diagramFiles = Get-ChildItem -LiteralPath (Join-Path $repoRoot 'diagrams') -Recurse -Filter '*.puml' -File

Write-Step "Checking PlantUML structure in $($diagramFiles.Count) files"

$errors = New-Object System.Collections.Generic.List[string]

foreach ($file in $diagramFiles) {
  $content = Get-Content -LiteralPath $file.FullName -Raw
  $startCount = ([regex]::Matches($content, '@startuml')).Count
  $endCount = ([regex]::Matches($content, '@enduml')).Count
  $relativePath = Get-RelativePath -BasePath $repoRoot -TargetPath $file.FullName

  if ($startCount -eq 0) {
    $errors.Add("${relativePath}: missing @startuml")
  }

  if ($endCount -eq 0) {
    $errors.Add("${relativePath}: missing @enduml")
  }

  if ($startCount -ne $endCount) {
    $errors.Add("${relativePath}: @startuml count ($startCount) does not match @enduml count ($endCount)")
  }

  if ($content -match '(?im)^\s*participant\s+Sandbox\b|^\s*actor\s+Sandbox\b|^\s*usecase\s+.*Sandbox') {
    $errors.Add("${relativePath}: use workspace boundary terminology instead of Sandbox in MVP diagrams")
  }
}

if ($errors.Count -gt 0) {
  throw "PlantUML validation failed:`n$($errors -join [Environment]::NewLine)"
}

Write-Step 'PlantUML validation passed'
