[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$outputDirectory = Join-Path $projectRoot 'output'
$logPath = Join-Path $outputDirectory 'verification.log'
$reportDataPath = Join-Path $projectRoot 'report\results.json'

New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

$lines = [System.Collections.Generic.List[string]]::new()
function Add-ResultLine {
    param([string]$Text)
    $lines.Add($Text)
    Write-Host $Text
}

Push-Location $projectRoot
try {
    docker compose up -d --build egress-proxy | Out-Host

    Add-ResultLine 'AGENT EGRESS LAB / verification'
    Add-ResultLine '--------------------------------'

    $directOutput = docker compose run --rm --no-deps agent-runner sh -c "if curl --noproxy '*' -fsS --connect-timeout 5 https://api.github.com/zen >/dev/null 2>&1; then echo DIRECT_CONNECTED; else echo DIRECT_BLOCKED; fi"
    if (($directOutput | Out-String).Trim() -ne 'DIRECT_BLOCKED') {
        throw "Direct egress test failed: $directOutput"
    }
    Add-ResultLine '[PASS] direct internet       BLOCKED'

    $allowedOutput = docker compose run --rm --no-deps agent-runner sh -c "curl -fsS --connect-timeout 10 https://api.github.com/zen"
    if ([string]::IsNullOrWhiteSpace(($allowedOutput | Out-String))) {
        throw 'Allowlisted proxy test returned no response.'
    }
    Add-ResultLine '[PASS] api.github.com:443    ALLOWED via proxy'

    $deniedOutput = docker compose run --rm --no-deps agent-runner sh -c "if curl -fsS --connect-timeout 10 https://example.com >/dev/null 2>&1; then echo DENIED_TARGET_CONNECTED; else echo DENIED_TARGET_BLOCKED; fi"
    $proxyLogs = docker compose logs --no-color egress-proxy
    if (($deniedOutput | Out-String).Trim() -ne 'DENIED_TARGET_BLOCKED' -or ($proxyLogs | Out-String) -notmatch 'DENY example\.com:443') {
        throw "Denied proxy test was not confirmed by both client result and proxy log."
    }
    Add-ResultLine '[PASS] example.com:443       DENIED by allowlist'

    Add-ResultLine '--------------------------------'
    Add-ResultLine 'RESULT: 3/3 controls verified'
    Add-ResultLine 'LIMIT: data can still leave through an allowed destination'

    [System.IO.File]::WriteAllLines($logPath, $lines, [System.Text.UTF8Encoding]::new($false))
    $reportData = [ordered]@{
        verifiedAt = [DateTimeOffset]::Now.ToString('o')
        result = '3/3 controls verified'
        tests = @(
            [ordered]@{ path = 'Direct internet'; target = 'api.github.com:443'; outcome = 'BLOCKED'; status = 'pass' }
            [ordered]@{ path = 'Allowlisted proxy'; target = 'api.github.com:443'; outcome = 'ALLOWED'; status = 'pass' }
            [ordered]@{ path = 'Unlisted proxy'; target = 'example.com:443'; outcome = 'DENIED'; status = 'pass' }
        )
        limitation = 'Data can still leave through an allowed destination.'
    } | ConvertTo-Json -Depth 6
    [System.IO.File]::WriteAllText($reportDataPath, $reportData, [System.Text.UTF8Encoding]::new($false))
} finally {
    Pop-Location
}

Write-Host "Saved: $logPath"
Write-Host "Saved: $reportDataPath"
