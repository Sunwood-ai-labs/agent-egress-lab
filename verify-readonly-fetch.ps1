[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$composePath = Join-Path $projectRoot 'readonly-fetch.compose.yaml'
$artifactDirectory = Join-Path $projectRoot 'artifacts\readonly-fetch'
$resultPath = Join-Path $artifactDirectory 'result.json'
$screenshotNames = @(
    '01-console-ready.png',
    '02-get-allowed.png',
    '03-post-blocked.png',
    '04-host-blocked.png',
    '05-direct-external-blocked.png'
)

function Get-PngDimensions {
    param([Parameter(Mandatory)][string]$Path)
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -lt 24 -or $bytes[0] -ne 137 -or $bytes[1] -ne 80 -or $bytes[2] -ne 78 -or $bytes[3] -ne 71) {
        throw "$Path is not a readable PNG file."
    }
    $width = (([int]$bytes[16]) -shl 24) -bor (([int]$bytes[17]) -shl 16) -bor (([int]$bytes[18]) -shl 8) -bor ([int]$bytes[19])
    $height = (([int]$bytes[20]) -shl 24) -bor (([int]$bytes[21]) -shl 16) -bor (([int]$bytes[22]) -shl 8) -bor ([int]$bytes[23])
    [pscustomobject]@{ Width = $width; Height = $height }
}

New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
foreach ($artifact in @($resultPath) + @($screenshotNames | ForEach-Object { Join-Path $artifactDirectory $_ })) {
    if (Test-Path -LiteralPath $artifact -PathType Leaf) { Remove-Item -LiteralPath $artifact -Force }
}

Push-Location $projectRoot
try {
    docker compose -f $composePath up -d --build --force-recreate fetch-gateway research-worker research-console | Out-Host
    docker compose -f $composePath build e2e-runner | Out-Host
    $runnerOutput = docker compose -f $composePath run --rm --no-deps e2e-runner
    if ($LASTEXITCODE -ne 0) { throw "Playwright runner failed with exit code $LASTEXITCODE." }
    $runnerOutput | Out-Host
} finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath $resultPath -PathType Leaf)) { throw 'Playwright did not produce result.json.' }
$result = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
if (-not $result.console.loaded) { throw 'Research Console did not load.' }
if (-not $result.allowedGet.passed) { throw 'Allowlisted GET failed.' }
if (-not $result.blockedPost.passed) { throw 'POST was not blocked with 405.' }
if (-not $result.blockedHost.passed) { throw 'Non-allowlisted host was not blocked with 403.' }
if (-not $result.policyEdges.httpRejected) { throw 'Plain HTTP was not rejected.' }
if ($result.directExternal.loaded -or [string]::IsNullOrWhiteSpace($result.directExternal.error)) { throw 'Direct external navigation was not proven blocked.' }

foreach ($screenshotName in $screenshotNames) {
    $path = Join-Path $artifactDirectory $screenshotName
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing $screenshotName." }
    $dimensions = Get-PngDimensions -Path $path
    if ($dimensions.Width -ne 1200 -or $dimensions.Height -ne 900) {
        throw "$screenshotName must be 1200x900; actual is $($dimensions.Width)x$($dimensions.Height)."
    }
}

Write-Host '[PASS] allowlisted HTTPS GET returned Example Domain'
Write-Host '[PASS] POST blocked with 405 and other host blocked with 403'
Write-Host '[PASS] direct external browser navigation failed without an egress route'
Write-Host '[PASS] five 1200x900 screenshots saved:'
$screenshotNames | ForEach-Object { Write-Host "       $(Join-Path $artifactDirectory $_)" }
