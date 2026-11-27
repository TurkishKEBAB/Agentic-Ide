[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'setup-requirements-github-project.ps1') -Owner TurkishKEBAB -DryRun

$caseCount = 0
function Assert-Equal($Actual, $Expected, [string]$Name) {
  if ($Actual -ne $Expected) { throw "$Name expected '$Expected', got '$Actual'" }
  $script:caseCount++
}
$draft = [pscustomobject]@{ status='Draft'; phase='Faz 1'; priority='P0'; labels=@(); blockedByKeys=@() }
Assert-Equal (Get-WorkflowStatus $draft) 'Backlog' 'Priority cannot grant Ready'
Assert-Equal (Get-Readiness $draft) 'Needs Clarification' 'Priority cannot validate readiness'
$review = [pscustomobject]@{ status='Advisor Review'; phase='Faz 1'; priority='P0'; labels=@(); blockedByKeys=@() }
Assert-Equal (Get-WorkflowStatus $review) 'Review' 'Advisor queue workflow'
Assert-Equal (Get-Readiness $review) 'Needs Clarification' 'Advisor queue is not implementation Ready'
$explicit = [pscustomobject]@{ status='Planned'; workflowStatus='Ready'; readiness='Ready'; testTarget='tests/policy'; thesisEvidence='planned acceptance artifact'; risk='boundary bypass' }
Assert-Equal (Get-WorkflowStatus $explicit) 'Ready' 'Explicit reviewed workflow'
Assert-Equal (Get-Readiness $explicit) 'Ready' 'Explicit reviewed readiness'
Assert-Equal (Get-TestTarget $explicit) 'tests/policy' 'Issue-specific test target'
Assert-Equal (Get-ThesisEvidence $explicit) 'planned acceptance artifact' 'Issue-specific evidence'

# The identity regression uses a fake reader and cannot create an issue.
$script:calledArguments = @()
function Invoke-Gh {
  param([string[]]$Arguments, [switch]$AsJson)
  $script:calledArguments = $Arguments
  if (($Arguments -join ' ') -notmatch '^issue view 123 -R TurkishKEBAB/Agentic-Ide --json number,title,url$') {
    throw 'Unexpected network/mutation attempt in identity test'
  }
  return [pscustomobject]@{ number=123; title='Previous title'; url='https://github.com/TurkishKEBAB/Agentic-Ide/issues/123' }
}
$renamed = [pscustomobject]@{ githubIssueNumber=123; title='New title' }
$result = Set-Issue -IssueDefinition $renamed -IssueDefinitionsByKey @{} -ExistingIssuesByTitle @{} -RepoFullName 'TurkishKEBAB/Agentic-Ide'
Assert-Equal $result.number 123 'Renamed issue stable identity'
Assert-Equal ($script:calledArguments[1]) 'view' 'Renamed issue cannot create a duplicate'
Write-Host "Planning sync regression checks passed: $caseCount; no live mutation performed."
