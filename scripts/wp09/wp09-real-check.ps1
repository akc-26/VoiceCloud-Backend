$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $Root

function Invoke-Native {
    param([Parameter(Mandatory = $true)][string]$Command,[Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Command failed with exit code $LASTEXITCODE`: $Command $($Arguments -join ' ')" }
}
function Get-DotEnvValue {
    param([string]$Name)
    $envPath = Join-Path $Root '.env'
    if (-not (Test-Path $envPath)) { return $null }
    $line = Get-Content $envPath | Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } | Select-Object -Last 1
    if (-not $line) { return $null }
    $value = ($line -split '=',2)[1].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) { $value=$value.Substring(1,$value.Length-2) }
    return $value
}
function Resolve-Setting { param([string]$Name,[string]$DefaultValue)
    $value=[Environment]::GetEnvironmentVariable($Name); if(-not [string]::IsNullOrWhiteSpace($value)){return $value}
    $value=Get-DotEnvValue $Name; if(-not [string]::IsNullOrWhiteSpace($value)){return $value}; return $DefaultValue
}
function Get-FreeTcpPort { $l=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,0); try{$l.Start();return ([System.Net.IPEndPoint]$l.LocalEndpoint).Port}finally{$l.Stop()} }
function Stop-TrackedProcess { param($Process)
    if(-not $Process){return}; try{$Process.Refresh();if(-not $Process.HasExited){Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue;Start-Sleep -Milliseconds 500}}catch{}
}
function Wait-Ready { param($Process,[string]$BaseUrl)
    for($i=1;$i -le 90;$i++){ $Process.Refresh(); if($Process.HasExited){throw 'VoiceCloud exited before readiness.'}; try{$h=Invoke-RestMethod -Uri "$BaseUrl/health" -TimeoutSec 2;if($h.status -eq 'ok' -and $h.database -eq 'connected' -and $h.redis -eq 'connected' -and $h.infrastructure.realInfrastructure -eq $true){return}}catch{};Start-Sleep -Seconds 1 }
    throw 'VoiceCloud did not become ready within 90 seconds.'
}

Write-Host '============================================================'
Write-Host 'VoiceCloud WP09 - Isolated Production Certification'
Write-Host '============================================================'

$env:DATABASE_HOST = Resolve-Setting 'DATABASE_HOST' '127.0.0.1'
if($env:DATABASE_HOST -eq 'localhost'){$env:DATABASE_HOST='127.0.0.1'}
$env:DATABASE_PORT = Resolve-Setting 'DATABASE_PORT' '5432'
$env:DATABASE_USER = Resolve-Setting 'DATABASE_USER' 'postgres'
$env:DATABASE_PASSWORD = Resolve-Setting 'DATABASE_PASSWORD' ''
$env:REDIS_HOST = Resolve-Setting 'REDIS_HOST' '127.0.0.1'
if($env:REDIS_HOST -eq 'localhost'){$env:REDIS_HOST='127.0.0.1'}
$env:REDIS_PORT = Resolve-Setting 'REDIS_PORT' '6379'
$env:WP08_MAINTENANCE_DATABASE = Resolve-Setting 'WP08_MAINTENANCE_DATABASE' 'postgres'
$env:DEV_ADMIN_EMAIL = Resolve-Setting 'DEV_ADMIN_EMAIL' 'admin@voicecloud.com'
$env:DEV_ADMIN_USERNAME = Resolve-Setting 'DEV_ADMIN_USERNAME' 'voicecloud_admin'
$env:DEV_ADMIN_PASSWORD = Resolve-Setting 'DEV_ADMIN_PASSWORD' 'AdminPass123!'
$env:DEV_CREATOR_EMAIL = Resolve-Setting 'DEV_CREATOR_EMAIL' 'creator@voicecloud.com'
$env:DEV_CREATOR_USERNAME = Resolve-Setting 'DEV_CREATOR_USERNAME' 'voicecloud_creator'
$env:DEV_CREATOR_PASSWORD = Resolve-Setting 'DEV_CREATOR_PASSWORD' 'CreatorPass123!'
$env:WP09_ADMIN_EMAIL=$env:DEV_ADMIN_EMAIL; $env:WP09_ADMIN_PASSWORD=$env:DEV_ADMIN_PASSWORD
if([string]::IsNullOrWhiteSpace($env:DATABASE_PASSWORD)){ $sec=Read-Host 'Enter PostgreSQL password' -AsSecureString; $cred=New-Object System.Management.Automation.PSCredential('ignored',$sec);$env:DATABASE_PASSWORD=$cred.GetNetworkCredential().Password }

$timestamp=Get-Date -Format 'yyyyMMddHHmmssfff'
$env:WP08_DATABASE_NAME="voicecloud_wp08_03_04_$timestamp"; $env:WP09_DATABASE_NAME=$env:WP08_DATABASE_NAME; $env:DATABASE_NAME=$env:WP08_DATABASE_NAME
$env:DATABASE_SYNCHRONIZE='false'; $env:INFRASTRUCTURE_MODE='real'; $env:INFRASTRUCTURE_CONNECT_TIMEOUT_MS='5000'
$env:ENABLE_SWAGGER='false'; $env:STORAGE_DRIVER='local'; $env:DEV_SEED_ACCOUNTS='true'
$env:PRIVATE_STORAGE_PATH=Join-Path $Root ".wp09-private-$timestamp"
$env:JWT_SECRET="wp09-jwt-$timestamp-7be2a62dc3f04f88b4e57e63831bb93c"
$env:ENCRYPTION_KEY="wp09-encryption-$timestamp-8d57690ccbe54acaaef62dbe8e3ca24b"
$env:BACKUP_UPLOAD_MAX_SIZE='268435456'; $env:RATE_LIMIT_WINDOW_SECONDS='60'; $env:RATE_LIMIT_MAX_REQUESTS='300'; $env:AUTH_RATE_LIMIT_MAX_REQUESTS='20'
$env:PORT=[string](Get-FreeTcpPort); $env:WP08_BASE_URL="http://127.0.0.1:$($env:PORT)"; $env:WP09_BASE_URL=$env:WP08_BASE_URL
$env:CORS_ALLOWED_ORIGINS=$env:WP09_BASE_URL

$dbCreated=$false; $server=$null; $seedServer=$null
$serverOut=Join-Path $Root ".wp09-server-$timestamp.out.log"; $serverErr=Join-Path $Root ".wp09-server-$timestamp.err.log"
try {
    Write-Host "`n[WP09 REAL 1/8] Create isolated PostgreSQL database"
    $env:NODE_ENV='development'; Invoke-Native node 'scripts/wp08/wp08-01-database.mjs' create; $dbCreated=$true

    Write-Host "`n[WP09 REAL 2/8] Bootstrap schema and apply migrations"
    Invoke-Native node 'scripts/wp08/wp08-03-04-schema-bootstrap.mjs'; Invoke-Native npm.cmd run 'migration:run:prod'; Invoke-Native npm.cmd run 'migration:status:prod'

    Write-Host "`n[WP09 REAL 3/8] Verify latest migration rollback/reapply"
    Invoke-Native npm.cmd run 'migration:revert:prod'; Invoke-Native npm.cmd run 'migration:run:prod'; Invoke-Native npm.cmd run 'migration:status:prod'

    Write-Host "`n[WP09 REAL 4/8] Seed disposable Admin/Creator outside production"
    $seedServer=Start-Process -FilePath 'node' -ArgumentList 'dist/src/main.js' -WorkingDirectory $Root -RedirectStandardOutput $serverOut -RedirectStandardError $serverErr -PassThru
    Wait-Ready $seedServer $env:WP09_BASE_URL; Stop-TrackedProcess $seedServer; $seedServer=$null

    Write-Host "`n[WP09 REAL 5/8] Start same compiled build under strict production validation"
    $env:NODE_ENV='production'; $env:DEV_SEED_ACCOUNTS='false'
    $server=Start-Process -FilePath 'node' -ArgumentList 'dist/src/main.js' -WorkingDirectory $Root -RedirectStandardOutput $serverOut -RedirectStandardError $serverErr -PassThru
    Wait-Ready $server $env:WP09_BASE_URL

    Write-Host "`n[WP09 REAL 6/8] Re-run accepted real PostgreSQL/Redis/BullMQ/Socket.IO workflows"
    Invoke-Native node 'scripts/wp08/wp08-03-04-real-infrastructure.mjs'

    Write-Host "`n[WP09 REAL 7/8] Run WP09 production security/backup/load/runtime acceptance"
    Invoke-Native node 'scripts/wp09/wp09-runtime-acceptance.mjs'

    Write-Host "`n[WP09 REAL 8/8] Isolated production certification passed"
}
finally {
    Stop-TrackedProcess $server; Stop-TrackedProcess $seedServer
    if($dbCreated){ try{$env:NODE_ENV='development';Invoke-Native node 'scripts/wp08/wp08-01-database.mjs' drop}catch{Write-Warning $_.Exception.Message} }
    if(Test-Path $env:PRIVATE_STORAGE_PATH){Remove-Item $env:PRIVATE_STORAGE_PATH -Recurse -Force -ErrorAction SilentlyContinue}
    if(Test-Path $serverOut){Remove-Item $serverOut -Force -ErrorAction SilentlyContinue}; if(Test-Path $serverErr){Remove-Item $serverErr -Force -ErrorAction SilentlyContinue}
}
Write-Host 'WP09 ISOLATED PRODUCTION CERTIFICATION PASSED'
