[CmdletBinding()]
param([int]$Port = 4173)

$reportDirectory = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'report'
python -m http.server $Port --directory $reportDirectory
