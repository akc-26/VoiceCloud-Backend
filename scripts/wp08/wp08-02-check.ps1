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
    $environmentValue = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($environmentValue)) { return $environmentValue }
    $fileValue = Get-DotEnvValue $Name
    if (-not [string]::IsNullOrWhiteSpace($fileValue)) { return $fileValue }
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
    param([string]$Title, [string]$Path, [int]$Lines = 180)
    if (Test-Path $Path) {
        Write-Host "---------------- $Title ----------------"
        Get-Content $Path -Tail $Lines
    }
}

function Stop-TrackedProcess {
    param($Process, [string]$Name, [System.Collections.Generic.List[string]]$CleanupErrors)
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
            $CleanupErrors.Add("$Name process $($Process.Id) is still running after cleanup.")
        }
    }
    catch {
        $CleanupErrors.Add("Could not stop $Name process $($Process.Id): $($_.Exception.Message)")
    }
}

function Get-ProcessExitCodeSafely {
    param($Process)

    if (-not $Process) {
        return $null
    }

    try {
        $Process.Refresh()
        if (-not $Process.HasExited) {
            return $null
        }

        $exitCode = $Process.ExitCode
        if ($null -eq $exitCode) {
            return $null
        }

        return [int]$exitCode
    }
    catch {
        return $null
    }
}

function Get-ProcessExitCodeDisplay {
    param($Process)

    $exitCode = Get-ProcessExitCodeSafely $Process
    if ($null -eq $exitCode) {
        return 'unknown'
    }

    return [string]$exitCode
}

function Assert-AcceptanceProcessResult {
    param(
        [Parameter(Mandatory = $true)]$Process,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$OutputPath,
        [Parameter(Mandatory = $true)][string]$SuccessMarker
    )

    $exitCode = Get-ProcessExitCodeSafely $Process
    $outputText = ''
    if (Test-Path $OutputPath) {
        $outputText = [System.IO.File]::ReadAllText($OutputPath)
    }

    $hasSuccessMarker = $outputText.IndexOf(
        $SuccessMarker,
        [System.StringComparison]::Ordinal
    ) -ge 0

    if ($null -ne $exitCode -and $exitCode -ne 0) {
        throw "$Name failed with exit code $exitCode."
    }

    if (-not $hasSuccessMarker) {
        if ($null -eq $exitCode) {
            throw "$Name completed, but Windows PowerShell did not expose its exit code and the required success marker was not found."
        }

        throw "$Name exited with code 0 but did not emit the required success marker: $SuccessMarker"
    }

    if ($null -eq $exitCode) {
        Write-Host "$Name emitted the required success marker. Windows PowerShell did not expose the child-process exit code, so marker verification was used." -ForegroundColor Yellow
    }
}

function Invoke-AcceptanceProcess {
    param(
        [Parameter(Mandatory = $true)][string]$Script,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$OutputPath,
        [Parameter(Mandatory = $true)][string]$ErrorPath,
        [Parameter(Mandatory = $true)][string]$SuccessMarker,
        [Parameter(Mandatory = $true)][int]$TimeoutSeconds
    )

    $process = Start-Process -FilePath 'node' `
        -ArgumentList $Script `
        -WorkingDirectory $Root `
        -RedirectStandardOutput $OutputPath `
        -RedirectStandardError $ErrorPath `
        -PassThru

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    while (-not $process.HasExited -and [DateTime]::UtcNow -lt $deadline) {
        Start-Sleep -Milliseconds 250
        $process.Refresh()
    }

    if (-not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        throw "$Name exceeded the configured timeout of $TimeoutSeconds seconds."
    }

    $process.WaitForExit()
    $process.Refresh()

    Show-LogTail "$Name output" $OutputPath 300
    Show-LogTail "$Name errors" $ErrorPath 220

    Assert-AcceptanceProcessResult `
        -Process $process `
        -Name $Name `
        -OutputPath $OutputPath `
        -SuccessMarker $SuccessMarker
}

function Assert-BuildArtifacts {
    foreach ($relativePath in @(
        'dist\src\main.js',
        'dist\website\index.html',
        'dist\admin\index.html',
        'dist\creator\index.html'
    )) {
        if (-not (Test-Path (Join-Path $Root $relativePath) -PathType Leaf)) {
            throw "Required build artifact is missing: $relativePath"
        }
    }
}

Write-Host '============================================================'
Write-Host 'VoiceCloud WP08-02 - Room, Socket.IO and Moderation Acceptance'
Write-Host '============================================================'
Write-Host "Repository root: $Root"

Write-Host "`n[1/10] Installing locked npm dependencies, including development tooling..."
$env:NODE_ENV = 'development'
Remove-Item Env:npm_config_production -ErrorAction SilentlyContinue
Remove-Item Env:npm_config_omit -ErrorAction SilentlyContinue
Remove-Item Env:npm_config_only -ErrorAction SilentlyContinue
Invoke-Native npm.cmd ci --include=dev

Write-Host "`n[2/10] Verifying formatting without modifying source files..."
Invoke-Native npm.cmd run format:check

Write-Host "`n[3/10] Running non-mutating ESLint..."
Invoke-Native npx.cmd eslint 'src/**/*.ts' --no-cache

Write-Host "`n[4/10] Running WP08-01/WP08-02 self-checks and focused regressions..."
Invoke-Native node 'scripts/wp08/wp08-01-acceptance.mjs' --self-check
Invoke-Native node 'scripts/wp08/wp08-02-acceptance.mjs' --self-check
Invoke-Native npm.cmd run 'test:wp08:01'
Invoke-Native npm.cmd run 'test:wp08:02'

Write-Host "`n[5/10] Verifying Jest discovery and running the complete Jest suite..."
Invoke-Native npx.cmd jest --listTests --config jest.config.js
Invoke-Native npx.cmd jest --runInBand --config jest.config.js

Write-Host "`n[6/10] Building Backend, Website, Admin and Creator..."
Invoke-Native npm.cmd run build
Assert-BuildArtifacts

Write-Host "`n[7/10] Preparing isolated PostgreSQL, Redis and private storage..."
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
$env:WP08_ACCEPTANCE_HOST_EMAIL = "wp08_host_$timestamp@voicecloud.test"
$env:WP08_ACCEPTANCE_HOST_USERNAME = "wp08_host_$timestamp"
$env:WP08_ACCEPTANCE_HOST_PASSWORD = 'Wp08Acceptance123!'
$env:WP08_HOST_EMAIL = $env:WP08_ACCEPTANCE_HOST_EMAIL
$env:WP08_HOST_PASSWORD = $env:WP08_ACCEPTANCE_HOST_PASSWORD
$env:WP08_HOST_ACCESS_TOKEN = ''
$env:WP08_DATABASE_NAME = "voicecloud_wp08_02_$timestamp"
$env:DATABASE_NAME = $env:WP08_DATABASE_NAME
$env:DATABASE_SYNCHRONIZE = 'true'
$env:INFRASTRUCTURE_MODE = 'real'
$env:INFRASTRUCTURE_CONNECT_TIMEOUT_MS = '5000'
$env:NODE_ENV = 'development'
$env:ENABLE_SWAGGER = 'true'
$env:STORAGE_DRIVER = 'local'
$env:JWT_SECRET = Resolve-Setting 'JWT_SECRET' 'wp08-local-acceptance-jwt-secret-2026'
$env:DEV_SEED_ACCOUNTS = 'true'
$env:WP08_REQUEST_TIMEOUT_MS = Resolve-Setting 'WP08_REQUEST_TIMEOUT_MS' '15000'
$env:WP08_SOCKET_TIMEOUT_MS = Resolve-Setting 'WP08_SOCKET_TIMEOUT_MS' '10000'
$env:WP08_ACCEPTANCE_TIMEOUT_SECONDS = Resolve-Setting 'WP08_ACCEPTANCE_TIMEOUT_SECONDS' '420'
$acceptanceTimeoutSeconds = 0
if (-not [int]::TryParse($env:WP08_ACCEPTANCE_TIMEOUT_SECONDS, [ref]$acceptanceTimeoutSeconds) -or
    $acceptanceTimeoutSeconds -le 0) {
    throw 'WP08_ACCEPTANCE_TIMEOUT_SECONDS must be a positive integer.'
}
$configuredWp08Port = Resolve-Setting 'WP08_PORT' ''
if ([string]::IsNullOrWhiteSpace($configuredWp08Port)) {
    $resolvedWp08Port = Get-FreeTcpPort
}
else {
    $resolvedWp08Port = 0
    if (-not [int]::TryParse($configuredWp08Port, [ref]$resolvedWp08Port) -or
        $resolvedWp08Port -lt 1 -or $resolvedWp08Port -gt 65535) {
        throw 'WP08_PORT must be an integer between 1 and 65535.'
    }
}
$env:PORT = [string]$resolvedWp08Port
$env:WP08_BASE_URL = "http://127.0.0.1:$($env:PORT)"
$env:WP08_REQUIRE_REAL_INFRASTRUCTURE = 'true'
$env:PRIVATE_STORAGE_PATH = Join-Path $Root ".wp08-02-private-$timestamp"

Write-Host "Acceptance URL: $($env:WP08_BASE_URL)"
Write-Host "Temporary database: $($env:WP08_DATABASE_NAME)"
Write-Host "PostgreSQL: $($env:DATABASE_HOST):$($env:DATABASE_PORT)"
Write-Host "Redis: $($env:REDIS_HOST):$($env:REDIS_PORT)"

$dbCreated = $false
$server = $null
$serverOut = Join-Path $Root ".wp08-02-server-$timestamp.out.log"
$serverErr = Join-Path $Root ".wp08-02-server-$timestamp.err.log"
$wp0801Out = Join-Path $Root ".wp08-01-acceptance-$timestamp.out.log"
$wp0801Err = Join-Path $Root ".wp08-01-acceptance-$timestamp.err.log"
$wp0802Out = Join-Path $Root ".wp08-02-acceptance-$timestamp.out.log"
$wp0802Err = Join-Path $Root ".wp08-02-acceptance-$timestamp.err.log"
$primaryError = $null
$cleanupErrors = New-Object System.Collections.Generic.List[string]
$acceptancePassed = $false

try {
    Invoke-Native node 'scripts/wp08/wp08-01-database.mjs' create
    $dbCreated = $true

    Write-Host "`n[8/10] Starting unified VoiceCloud against real infrastructure..."
    $server = Start-Process -FilePath 'node' `
        -ArgumentList 'dist/src/main.js' `
        -WorkingDirectory $Root `
        -RedirectStandardOutput $serverOut `
        -RedirectStandardError $serverErr `
        -PassThru

    $ready = $false
    $lastReadinessMessage = 'No response received yet.'
    for ($attempt = 1; $attempt -le 90; $attempt++) {
        $server.Refresh()
        if ($server.HasExited) {
            throw "VoiceCloud exited before readiness (exit code $(Get-ProcessExitCodeDisplay $server))."
        }
        try {
            $health = Invoke-RestMethod -Uri "$($env:WP08_BASE_URL)/health" -TimeoutSec 2
            $apiInfo = Invoke-RestMethod -Uri "$($env:WP08_BASE_URL)/api" -TimeoutSec 2
            $identityOk = $apiInfo.name -eq 'VoiceCloud Monolith API' -and $apiInfo.status -eq 'online'
            $infraOk = $health.status -eq 'ok' -and
                $health.database -eq 'connected' -and
                $health.redis -eq 'connected' -and
                $health.infrastructure.realInfrastructure -eq $true
            if ($identityOk -and $infraOk) { $ready = $true; break }
            $lastReadinessMessage = "identity=$identityOk; status=$($health.status); database=$($health.database); redis=$($health.redis); real=$($health.infrastructure.realInfrastructure)"
        }
        catch { $lastReadinessMessage = $_.Exception.Message }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) {
        throw "VoiceCloud did not become ready within 90 seconds. Last result: $lastReadinessMessage"
    }

    Write-Host "`n[9/10] Running WP08-01 prerequisite business-flow acceptance..."
    Invoke-AcceptanceProcess `
        -Script 'scripts/wp08/wp08-01-acceptance.mjs' `
        -Name 'WP08-01 real HTTP acceptance' `
        -OutputPath $wp0801Out `
        -ErrorPath $wp0801Err `
        -SuccessMarker 'WP08-01 REAL HTTP ACCEPTANCE PASSED' `
        -TimeoutSeconds $acceptanceTimeoutSeconds

    $wp0801OutputText = [System.IO.File]::ReadAllText($wp0801Out)
    $expectedHostMarker = "WP08_ACCEPTANCE_HOST_READY=$($env:WP08_ACCEPTANCE_HOST_EMAIL)"
    if ($wp0801OutputText.IndexOf(
        $expectedHostMarker,
        [System.StringComparison]::Ordinal
    ) -lt 0) {
        throw "WP08-01 passed, but it did not produce the approved Host required by WP08-02: $($env:WP08_ACCEPTANCE_HOST_EMAIL)"
    }

    Write-Host "`n[10/10] Running WP08-02 real HTTP + Socket.IO room/moderation acceptance..."
    Invoke-AcceptanceProcess `
        -Script 'scripts/wp08/wp08-02-acceptance.mjs' `
        -Name 'WP08-02 room and realtime acceptance' `
        -OutputPath $wp0802Out `
        -ErrorPath $wp0802Err `
        -SuccessMarker 'WP08-02 REAL ACCEPTANCE PASSED' `
        -TimeoutSeconds $acceptanceTimeoutSeconds

    $acceptancePassed = $true
}
catch {
    $primaryError = $_.Exception
    Write-Host ''
    Write-Host 'WP08-02 acceptance encountered an error:'
    Write-Host $primaryError.Message
}
finally {
    Stop-TrackedProcess $server 'VoiceCloud' $cleanupErrors

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
        catch { $cleanupErrors.Add("Could not remove private acceptance storage '$($env:PRIVATE_STORAGE_PATH)': $($_.Exception.Message)") }
    }

    if ($primaryError -or $cleanupErrors.Count -gt 0) {
        Show-LogTail 'WP08-01 output' $wp0801Out 260
        Show-LogTail 'WP08-01 errors' $wp0801Err 220
        Show-LogTail 'WP08-02 output' $wp0802Out 300
        Show-LogTail 'WP08-02 errors' $wp0802Err 240
        Show-LogTail 'server output' $serverOut 220
        Show-LogTail 'server errors' $serverErr 220
    }
    else {
        Remove-Item $serverOut, $serverErr, $wp0801Out, $wp0801Err, $wp0802Out, $wp0802Err -Force -ErrorAction SilentlyContinue
    }
}

if ($primaryError) { throw $primaryError }
if ($cleanupErrors.Count -gt 0) {
    throw "WP08-02 acceptance completed, but cleanup failed: $($cleanupErrors -join ' | ')"
}
if (-not $acceptancePassed) { throw 'WP08-02 acceptance did not complete successfully.' }

Write-Host ''
Write-Host '============================================================'
Write-Host 'WP08-01 + WP08-02 AUTOMATED AND REAL ACCEPTANCE PASSED'
Write-Host '============================================================'
