[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$composePath = Join-Path $projectRoot 'offline-e2e.compose.yaml'
$artifactDirectory = Join-Path $projectRoot 'artifacts\sample-app-e2e'
$resultPath = Join-Path $artifactDirectory 'result.json'
$screenshotNames = @(
    '01-initial-app.png',
    '02-task-created.png',
    '03-task-completed.png',
    '04-external-url-blocked.png'
)

function Get-PngDimensions {
    param([Parameter(Mandatory)][string]$Path)

    $bytes = [System.IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -lt 24 -or $bytes[0] -ne 137 -or $bytes[1] -ne 80 -or $bytes[2] -ne 78 -or $bytes[3] -ne 71) {
        throw "$Path is not a readable PNG file."
    }
    $width = (([int]$bytes[16]) -shl 24) -bor (([int]$bytes[17]) -shl 16) -bor (([int]$bytes[18]) -shl 8) -bor ([int]$bytes[19])
    $height = (([int]$bytes[20]) -shl 24) -bor (([int]$bytes[21]) -shl 16) -bor (([int]$bytes[22]) -shl 8) -bor ([int]$bytes[23])
    return [pscustomobject]@{ Width = $width; Height = $height }
}

New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
foreach ($artifact in @($resultPath) + @($screenshotNames | ForEach-Object { Join-Path $artifactDirectory $_ })) {
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
    throw 'Playwright did not produce result.json.'
}
foreach ($screenshotName in $screenshotNames) {
    $screenshotPath = Join-Path $artifactDirectory $screenshotName
    if (-not (Test-Path -LiteralPath $screenshotPath -PathType Leaf)) {
        throw "Playwright did not produce $screenshotName."
    }
}

$result = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
if (-not $result.local.loaded) { throw 'Sample app was not loaded.' }
if (-not $result.local.taskCreated) { throw 'Task creation flow failed.' }
if (-not $result.local.taskCompleted) { throw 'Task completion flow failed.' }
if (-not $result.local.emptyTaskRejected) { throw 'Whitespace-only task was unexpectedly accepted.' }
if (-not $result.local.viewportFit.shellWithinViewport) { throw 'Sample app shell does not fit the 1200x900 viewport.' }
if (-not $result.local.viewportFit.externalControlVisible) { throw 'External URL control is clipped in the initial viewport.' }
if ($result.local.viewportFit.canScrollX) { throw 'Sample app has unexpected horizontal overflow.' }
if (-not $result.external.triggeredByClick) { throw 'External URL was not attempted through the visible control.' }
if ($result.external.loaded) { throw 'External URL unexpectedly loaded.' }
if ([string]::IsNullOrWhiteSpace($result.external.error)) { throw 'External failure had no error evidence.' }

foreach ($screenshotName in $screenshotNames) {
    $screenshotPath = Join-Path $artifactDirectory $screenshotName
    $dimensions = Get-PngDimensions -Path $screenshotPath
    if ($dimensions.Width -ne 1200 -or $dimensions.Height -ne 900) {
        throw "$screenshotName must be 1200x900; actual is $($dimensions.Width)x$($dimensions.Height)."
    }
}

Write-Host '[PASS] sample app loaded inside the offline network'
Write-Host '[PASS] task created and completed through visible controls'
Write-Host '[PASS] whitespace-only task rejected'
Write-Host "[PASS] external URL blocked after click: $($result.external.error)"
Write-Host '[PASS] four 1200x900 screenshots saved:'
$screenshotNames | ForEach-Object { Write-Host "       $(Join-Path $artifactDirectory $_)" }
