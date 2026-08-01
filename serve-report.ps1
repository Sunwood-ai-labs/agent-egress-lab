[CmdletBinding()]
param([int]$Port = 4173)

$reportDirectory = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'report'
if (Get-Command uv -ErrorAction SilentlyContinue) {
    uv run python -m http.server $Port --directory $reportDirectory
} else {
    python -m http.server $Port --directory $reportDirectory
}
