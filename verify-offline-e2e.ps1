[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$composePath = Join-Path $projectRoot 'offline-e2e.compose.yaml'
$artifactDirectory = Join-Path $projectRoot 'artifacts'
$resultPath = Join-Path $artifactDirectory 'offline-e2e-result.json'
$externalScreenshot = Join-Path $artifactDirectory 'external-page-error.png'
$localScreenshot = Join-Path $artifactDirectory 'local-page.png'

New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
foreach ($artifact in @($resultPath, $externalScreenshot, $localScreenshot)) {
    if (Test-Path -LiteralPath $artifact -PathType Leaf) {
        Remove-Item -LiteralPath $artifact -Force
    }
}

Push-Location $projectRoot
try {
    docker compose -f $composePath up -d local-app | Out-Host
    docker compose -f $composePath build e2e-runner | Out-Host
    $runnerOutput = docker compose -f $composePath run --rm e2e-runner
    if ($LASTEXITCODE -ne 0) {
        throw "Playwright runner failed with exit code $LASTEXITCODE."
    }
    $runnerOutput | Out-Host
} finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath $resultPath -PathType Leaf)) {
    throw 'Playwright did not produce offline-e2e-result.json.'
}
if (-not (Test-Path -LiteralPath $externalScreenshot -PathType Leaf)) {
    throw 'Playwright did not produce external-page-error.png.'
}

$result = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
if (-not $result.local.loaded) { throw 'Local page was not loaded.' }
if ($result.external.loaded) { throw 'External page unexpectedly loaded.' }
if ([string]::IsNullOrWhiteSpace($result.external.error)) { throw 'External failure had no error evidence.' }

Write-Host '[PASS] local page loaded inside the offline network'
Write-Host "[PASS] external page blocked: $($result.external.error)"
Write-Host "[PASS] screenshot: $externalScreenshot"
