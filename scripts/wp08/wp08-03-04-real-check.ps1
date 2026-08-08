$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $Root

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
    )
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE`: $Command $($Arguments -join ' ')"
    }
}

function Get-DotEnvValue {
    param([string]$Name)
    $envPath = Join-Path $Root '.env'
    if (-not (Test-Path $envPath)) { return $null }
    $line = Get-Content $envPath | Where-Object {
        $_ -match "^\s*$([regex]::Escape($Name))\s*="
    } | Select-Object -Last 1
    if (-not $line) { return $null }
    $value = ($line -split '=', 2)[1].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    return $value
}

function Resolve-Setting {
    param([string]$Name, [string]$DefaultValue)
    $value = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($value)) { return $value }
    $value = Get-DotEnvValue $Name
    if (-not [string]::IsNullOrWhiteSpace($value)) { return $value }
    return $DefaultValue
}

function Get-FreeTcpPort {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    try {
        $listener.Start()
        return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    }
    finally { $listener.Stop() }
}

function Show-LogTail {
    param([string]$Title, [string]$Path, [int]$Lines = 220)
    if (Test-Path $Path) {
        Write-Host "---------------- $Title ----------------"
        Get-Content $Path -Tail $Lines
    }
}

function Stop-TrackedProcess {
    param($Process, [System.Collections.Generic.List[string]]$Errors)
    if (-not $Process) { return }
    try {
        $Process.Refresh()
        if (-not $Process.HasExited) {
            Stop-Process -Id $Process.Id -Force -ErrorAction Stop
            for ($attempt = 1; $attempt -le 40; $attempt++) {
                Start-Sleep -Milliseconds 250
                $Process.Refresh()
                if ($Process.HasExited) { break }
            }
        }
        $Process.Refresh()
        if (-not $Process.HasExited) {
            $Errors.Add("VoiceCloud process $($Process.Id) is still running after cleanup.")
        }
    }
    catch {
        $Errors.Add("Could not stop VoiceCloud process: $($_.Exception.Message)")
    }
}

Write-Host '============================================================'
Write-Host 'VoiceCloud WP08-03-04 - Isolated Real Infrastructure Acceptance'
Write-Host '============================================================'
Write-Host "Repository root: $Root"

$env:DATABASE_HOST = Resolve-Setting 'DATABASE_HOST' 'localhost'
$env:DATABASE_PORT = Resolve-Setting 'DATABASE_PORT' '5432'
$env:DATABASE_USER = Resolve-Setting 'DATABASE_USER' 'postgres'
$env:DATABASE_PASSWORD = Resolve-Setting 'DATABASE_PASSWORD' ''
$env:REDIS_HOST = Resolve-Setting 'REDIS_HOST' 'localhost'
$env:REDIS_PORT = Resolve-Setting 'REDIS_PORT' '6379'
$env:WP08_MAINTENANCE_DATABASE = Resolve-Setting 'WP08_MAINTENANCE_DATABASE' 'postgres'
$env:DEV_ADMIN_EMAIL = Resolve-Setting 'DEV_ADMIN_EMAIL' 'admin@voicecloud.com'
$env:DEV_ADMIN_USERNAME = Resolve-Setting 'DEV_ADMIN_USERNAME' 'voicecloud_admin'
$env:DEV_ADMIN_PASSWORD = Resolve-Setting 'DEV_ADMIN_PASSWORD' 'AdminPass123!'
$env:DEV_CREATOR_EMAIL = Resolve-Setting 'DEV_CREATOR_EMAIL' 'creator@voicecloud.com'
$env:DEV_CREATOR_USERNAME = Resolve-Setting 'DEV_CREATOR_USERNAME' 'voicecloud_creator'
$env:DEV_CREATOR_PASSWORD = Resolve-Setting 'DEV_CREATOR_PASSWORD' 'CreatorPass123!'

if ([string]::IsNullOrWhiteSpace($env:DATABASE_PASSWORD)) {
    $securePassword = Read-Host 'Enter the PostgreSQL password for the configured user' -AsSecureString
    $credential = New-Object System.Management.Automation.PSCredential('ignored', $securePassword)
    $env:DATABASE_PASSWORD = $credential.GetNetworkCredential().Password
}

$timestamp = Get-Date -Format 'yyyyMMddHHmmssfff'
$env:WP08_DATABASE_NAME = "voicecloud_wp08_03_04_$timestamp"
$env:DATABASE_NAME = $env:WP08_DATABASE_NAME
$env:DATABASE_SYNCHRONIZE = 'false'
$env:INFRASTRUCTURE_MODE = 'real'
$env:INFRASTRUCTURE_CONNECT_TIMEOUT_MS = '5000'
$env:NODE_ENV = 'development'
$env:ENABLE_SWAGGER = 'false'
$env:STORAGE_DRIVER = 'local'
$env:JWT_SECRET = Resolve-Setting 'JWT_SECRET' 'wp08-local-acceptance-jwt-secret-2026'
$env:DEV_SEED_ACCOUNTS = 'true'
$env:WP08_REQUEST_TIMEOUT_MS = Resolve-Setting 'WP08_REQUEST_TIMEOUT_MS' '15000'
$env:WP08_SOCKET_TIMEOUT_MS = Resolve-Setting 'WP08_SOCKET_TIMEOUT_MS' '10000'
$env:PRIVATE_STORAGE_PATH = Join-Path $Root ".wp08-03-04-private-$timestamp"
$configuredPort = Resolve-Setting 'WP08_PORT' ''
if ([string]::IsNullOrWhiteSpace($configuredPort)) {
    $env:PORT = [string](Get-FreeTcpPort)
}
else {
    $parsedPort = 0
    if (-not [int]::TryParse($configuredPort, [ref]$parsedPort) -or $parsedPort -lt 1 -or $parsedPort -gt 65535) {
        throw 'WP08_PORT must be an integer between 1 and 65535.'
    }
    $env:PORT = [string]$parsedPort
}
$env:WP08_BASE_URL = "http://127.0.0.1:$($env:PORT)"

Write-Host "Acceptance URL: $($env:WP08_BASE_URL)"
Write-Host "Temporary PostgreSQL database: $($env:WP08_DATABASE_NAME)"
Write-Host "Redis: $($env:REDIS_HOST):$($env:REDIS_PORT)"
Write-Host 'DATABASE_SYNCHRONIZE=false for runtime; the isolated test database is bootstrapped from current TypeORM metadata, rewound to the pre-authority boundary, then WP08 authority migrations are applied.'

$dbCreated = $false
$server = $null
$serverOut = Join-Path $Root ".wp08-03-04-server-$timestamp.out.log"
$serverErr = Join-Path $Root ".wp08-03-04-server-$timestamp.err.log"
$cleanupErrors = New-Object System.Collections.Generic.List[string]
$primaryError = $null
$passed = $false

try {
    Write-Host "`n[REAL 1/5] Creating isolated PostgreSQL database..."
    Invoke-Native node 'scripts/wp08/wp08-01-database.mjs' create
    $dbCreated = $true

    Write-Host "`n[REAL 2/5] Bootstrapping isolated legacy baseline and applying compiled WP08 authority migrations..."
    Invoke-Native node 'scripts/wp08/wp08-03-04-schema-bootstrap.mjs'
    Invoke-Native npm.cmd run 'migration:run:prod'
    Invoke-Native npm.cmd run 'migration:status:prod'

    Write-Host "`n[REAL 3/5] Starting compiled VoiceCloud against PostgreSQL + Redis + BullMQ + Socket.IO..."
    $server = Start-Process -FilePath 'node' `
        -ArgumentList 'dist/src/main.js' `
        -WorkingDirectory $Root `
        -RedirectStandardOutput $serverOut `
        -RedirectStandardError $serverErr `
        -PassThru

    $ready = $false
    $lastReadiness = 'No response yet.'
    for ($attempt = 1; $attempt -le 90; $attempt++) {
        $server.Refresh()
        if ($server.HasExited) {
            throw "VoiceCloud exited before readiness."
        }
        try {
            $health = Invoke-RestMethod -Uri "$($env:WP08_BASE_URL)/health" -TimeoutSec 2
            if ($health.status -eq 'ok' -and
                $health.database -eq 'connected' -and
                $health.redis -eq 'connected' -and
                $health.infrastructure.realInfrastructure -eq $true) {
                $ready = $true
                break
            }
            $lastReadiness = "status=$($health.status); database=$($health.database); redis=$($health.redis); real=$($health.infrastructure.realInfrastructure)"
        }
        catch { $lastReadiness = $_.Exception.Message }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) {
        throw "VoiceCloud did not become ready within 90 seconds. Last result: $lastReadiness"
    }

    Write-Host "`n[REAL 4/5] Exercising reconciled UI APIs plus real Socket.IO/BullMQ recovery..."
    Invoke-Native node 'scripts/wp08/wp08-03-04-real-infrastructure.mjs'

    Write-Host "`n[REAL 5/5] Real-infrastructure acceptance completed; cleanup will verify isolation..."
    $passed = $true
}
catch {
    $primaryError = $_.Exception
    Write-Host ''
    Write-Host "WP08-03-04 real acceptance error: $($primaryError.Message)"
}
finally {
    Stop-TrackedProcess $server $cleanupErrors

    if ($dbCreated) {
        try {
            Invoke-Native node 'scripts/wp08/wp08-01-database.mjs' drop
            $dbCreated = $false
        }
        catch {
            $cleanupErrors.Add("Could not remove isolated database '$($env:WP08_DATABASE_NAME)': $($_.Exception.Message)")
        }
    }

    if (Test-Path $env:PRIVATE_STORAGE_PATH) {
        try { Remove-Item $env:PRIVATE_STORAGE_PATH -Recurse -Force -ErrorAction Stop }
        catch { $cleanupErrors.Add("Could not remove acceptance private storage: $($_.Exception.Message)") }
    }

    if ($primaryError -or $cleanupErrors.Count -gt 0) {
        Show-LogTail 'VoiceCloud server output' $serverOut 260
        Show-LogTail 'VoiceCloud server errors' $serverErr 260
    }
    else {
        Remove-Item $serverOut, $serverErr -Force -ErrorAction SilentlyContinue
    }
}

if ($primaryError) { throw $primaryError }
if ($cleanupErrors.Count -gt 0) {
    throw "WP08-03-04 real acceptance cleanup failed: $($cleanupErrors -join ' | ')"
}
if (-not $passed) { throw 'WP08-03-04 real acceptance did not complete successfully.' }

Write-Host ''
Write-Host 'WP08-03-04 REAL INFRASTRUCTURE CHECK PASSED'
