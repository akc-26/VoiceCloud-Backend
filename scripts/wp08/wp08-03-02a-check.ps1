$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $Root
node scripts/wp08/wp08-03-02a-check.mjs
exit $LASTEXITCODE
