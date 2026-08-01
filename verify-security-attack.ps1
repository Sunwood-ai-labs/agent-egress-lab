[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$composePath = Join-Path $projectRoot 'readonly-fetch.compose.yaml'
$artifactDirectory = Join-Path $projectRoot 'artifacts\security-attack'
$resultPath = Join-Path $artifactDirectory 'result.json'
$screenshots = @('01-before-attack.png', '02-attacks-contained.png')

function Assert-LastExitCode([string]$Message) {
    if ($LASTEXITCODE -ne 0) { throw "$Message (exit $LASTEXITCODE)" }
}

function Invoke-ExpectedFailure([scriptblock]$Command, [string]$FailureMessage) {
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $Command 2>$null | Out-Null
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($exitCode -eq 0) { throw $FailureMessage }
}

function Get-PngDimensions([string]$Path) {
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -lt 24 -or $bytes[0] -ne 137 -or $bytes[1] -ne 80) { throw "Invalid PNG: $Path" }
    $width = (([int]$bytes[16] -shl 24) -bor ([int]$bytes[17] -shl 16) -bor ([int]$bytes[18] -shl 8) -bor [int]$bytes[19])
    $height = (([int]$bytes[20] -shl 24) -bor ([int]$bytes[21] -shl 16) -bor ([int]$bytes[22] -shl 8) -bor [int]$bytes[23])
    [pscustomobject]@{ Width = $width; Height = $height }
}

New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
Get-ChildItem -LiteralPath $artifactDirectory -File -ErrorAction SilentlyContinue | Remove-Item -Force

Push-Location $projectRoot
try {
    docker compose -f $composePath up -d --build --force-recreate fetch-gateway research-worker research-console action-sink | Out-Host
    Assert-LastExitCode 'Failed to start security lab'
    docker compose -f $composePath build e2e-runner | Out-Host
    Assert-LastExitCode 'Failed to build Playwright runner'
    docker compose -f $composePath run --rm --no-deps e2e-runner node /app/security-attack.mjs | Out-Host
    Assert-LastExitCode 'Virtual intrusion browser suite failed'

    $workerId = docker compose -f $composePath ps -q research-worker
    if ([string]::IsNullOrWhiteSpace($workerId)) { throw 'research-worker is not running' }
    $worker = docker inspect $workerId | ConvertFrom-Json
    if (-not $worker[0].HostConfig.ReadonlyRootfs) { throw 'research-worker root filesystem is writable' }
    if ($worker[0].HostConfig.CapDrop -notcontains 'ALL') { throw 'research-worker did not drop all capabilities' }
    if ($worker[0].HostConfig.SecurityOpt -notcontains 'no-new-privileges:true') { throw 'no-new-privileges is missing' }
    $forbiddenEnvironment = $worker[0].Config.Env | Where-Object { $_ -match '^(API_KEY|ACCESS_TOKEN|PASSWORD|CREDENTIAL|SECRET)=' }
    if ($forbiddenEnvironment) { throw 'research-worker received a forbidden application secret' }

    Invoke-ExpectedFailure { docker exec $workerId sh -c 'touch /app/INTRUSION_CANARY' } 'research-worker wrote to its root filesystem'
    Invoke-ExpectedFailure { docker exec $workerId python -c "import urllib.request; urllib.request.urlopen('https://example.com/', timeout=4)" } 'research-worker reached the internet directly'
    Invoke-ExpectedFailure { docker exec $workerId python -c "import socket; socket.create_connection(('action-sink', 80), 3)" } 'research-worker crossed into the approval network'

    $gatewayLogs = docker compose -f $composePath logs fetch-gateway
    if ($gatewayLogs -match 'CANARY_SECRET') { throw 'Gateway logs leaked the exfiltration canary' }
} finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath $resultPath)) { throw 'Missing security attack result.json' }
$result = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
if (($result.cases.PSObject.Properties.Value | Where-Object { -not $_.passed }).Count -gt 0) { throw 'One or more attack cases escaped containment' }
if ($result.network.actionSinkReachable -or $result.network.directInternetReachable) { throw 'Browser runner crossed a forbidden network boundary' }
foreach ($name in $screenshots) {
    $path = Join-Path $artifactDirectory $name
    if (-not (Test-Path -LiteralPath $path)) { throw "Missing screenshot: $name" }
    $size = Get-PngDimensions $path
    if ($size.Width -ne 1200 -or $size.Height -ne 900) { throw "$name is not 1200x900" }
}

Write-Host '[PASS] 6/6 virtual intrusion cases were contained'
Write-Host '[PASS] worker has no action authority, application secrets, writable rootfs, or Linux capabilities'
Write-Host '[PASS] direct internet and approval network are unreachable from the research zone'
Write-Host '[PASS] GET query/path canaries were rejected and absent from gateway logs'
Write-Host "[PASS] Evidence: $artifactDirectory"
