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
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "Command failed with exit code $exitCode`: $Command $($Arguments -join ' ')"
    }
}

function Get-DotEnvValue {
    param([string]$Name)

    $envPath = Join-Path $Root '.env'
    if (-not (Test-Path $envPath)) {
        return $null
    }

    $line = Get-Content $envPath | Where-Object {
        $_ -match "^\s*$([regex]::Escape($Name))\s*="
    } | Select-Object -Last 1

    if (-not $line) {
        return $null
    }

    $value = ($line -split '=', 2)[1].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    return $value
}

function Resolve-Setting {
    param(
        [string]$Name,
        [string]$DefaultValue
    )

    $environmentValue = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($environmentValue)) {
        return $environmentValue
    }

    $fileValue = Get-DotEnvValue $Name
    if (-not [string]::IsNullOrWhiteSpace($fileValue)) {
        return $fileValue
    }

    return $DefaultValue
}

function Get-FreeTcpPort {
    $listener = [System.Net.Sockets.TcpListener]::new(
        [System.Net.IPAddress]::Loopback,
        0
    )
    try {
        $listener.Start()
        return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    }
    finally {
        $listener.Stop()
    }
}

function Show-LogTail {
    param(
        [string]$Title,
        [string]$Path,
        [int]$Lines = 160
    )

    if (Test-Path $Path) {
        Write-Host "---------------- $Title ----------------"
        Get-Content $Path -Tail $Lines
    }
}

function Show-DiagnosticLogs {
    param(
        [string]$ServerOut,
        [string]$ServerError,
        [string]$AcceptanceOut,
        [string]$AcceptanceError
    )

    Show-LogTail 'acceptance output' $AcceptanceOut 220
    Show-LogTail 'acceptance errors' $AcceptanceError 220
    Show-LogTail 'server output' $ServerOut 180
    Show-LogTail 'server errors' $ServerError 180
}

function Stop-TrackedProcess {
    param(
        $Process,
        [string]$Name,
        [System.Collections.Generic.List[string]]$CleanupErrors
    )

    if (-not $Process) {
        return
    }

    try {
        $Process.Refresh()
        if (-not $Process.HasExited) {
            Stop-Process -Id $Process.Id -Force -ErrorAction Stop
            for ($attempt = 1; $attempt -le 40; $attempt++) {
                Start-Sleep -Milliseconds 250
                $Process.Refresh()
                if ($Process.HasExited) {
                    break
                }
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

function Assert-BuildArtifacts {
    $requiredFiles = @(
        'dist\src\main.js',
        'dist\website\index.html',
        'dist\admin\index.html',
        'dist\creator\index.html'
    )

    foreach ($relativePath in $requiredFiles) {
        $absolutePath = Join-Path $Root $relativePath
        if (-not (Test-Path $absolutePath -PathType Leaf)) {
            throw "Required build artifact is missing: $relativePath"
        }
    }
}

Write-Host '============================================================'
Write-Host 'VoiceCloud WP08-01 Revision 05 - Automated Build and Real HTTP Acceptance'
Write-Host '============================================================'
Write-Host "Repository root: $Root"

Write-Host "`n[1/9] Installing locked dependencies, including development tooling..."
$env:NODE_ENV = 'development'
Remove-Item Env:npm_config_production -ErrorAction SilentlyContinue
Remove-Item Env:npm_config_omit -ErrorAction SilentlyContinue
Remove-Item Env:npm_config_only -ErrorAction SilentlyContinue
Invoke-Native npm.cmd ci --include=dev

Write-Host "`n[2/9] Verifying formatting without modifying source files..."
Invoke-Native npm.cmd run format:check

Write-Host "`n[3/9] Running non-mutating ESLint..."
Invoke-Native npx.cmd eslint 'src/**/*.ts' --no-cache

Write-Host "`n[4/9] Running WP08 acceptance self-check and focused regressions..."
Invoke-Native node 'scripts/wp08/wp08-01-acceptance.mjs' --self-check
Invoke-Native npx.cmd jest --runInBand --config jest.config.js --runTestsByPath `
    'src/config/infrastructure-mode.spec.ts' `
    'src/config/env-validator.spec.ts' `
    'src/modules/health/health.service.spec.ts' `
    'src/app.controller.spec.ts' `
    'src/hosting-routing.spec.ts' `
    'src/redis/redis-response.util.spec.ts' `
    'src/wp08/wp08-01-acceptance-contract.spec.ts' `
    'src/modules/auth/authentication-security.spec.ts' `
    'src/modules/hosts/hosts.security.spec.ts' `
    'src/modules/hosts/hosts.spec.ts'

Write-Host "`n[5/9] Building backend, Landing, Admin and Creator portals..."
Invoke-Native npm.cmd run build
Assert-BuildArtifacts

Write-Host "`n[6/9] Running complete Jest suite..."
Invoke-Native npx.cmd jest --runInBand --config jest.config.js

Write-Host "`n[7/9] Preparing isolated real PostgreSQL and Redis acceptance runtime..."
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
$env:WP08_DATABASE_NAME = "voicecloud_wp08_$timestamp"
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
$env:WP08_ACCEPTANCE_TIMEOUT_SECONDS = Resolve-Setting 'WP08_ACCEPTANCE_TIMEOUT_SECONDS' '300'
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
        $resolvedWp08Port -lt 1 -or
        $resolvedWp08Port -gt 65535) {
        throw 'WP08_PORT must be an integer between 1 and 65535.'
    }
}
$env:PORT = [string]$resolvedWp08Port
$env:WP08_BASE_URL = "http://127.0.0.1:$($env:PORT)"
$env:WP08_REQUIRE_REAL_INFRASTRUCTURE = 'true'
$env:PRIVATE_STORAGE_PATH = Join-Path $Root ".wp08-private-$timestamp"

Write-Host "Acceptance URL: $($env:WP08_BASE_URL)"
Write-Host "Temporary database: $($env:WP08_DATABASE_NAME)"
Write-Host "Infrastructure mode: $($env:INFRASTRUCTURE_MODE)"
Write-Host "PostgreSQL: $($env:DATABASE_HOST):$($env:DATABASE_PORT)"
Write-Host "Redis/Memurai: $($env:REDIS_HOST):$($env:REDIS_PORT)"
Write-Host "HTTP acceptance timeout: $acceptanceTimeoutSeconds seconds"

$dbCreated = $false
$server = $null
$acceptance = $null
$serverOut = Join-Path $Root ".wp08-server-$timestamp.out.log"
$serverErr = Join-Path $Root ".wp08-server-$timestamp.err.log"
$acceptanceOut = Join-Path $Root ".wp08-acceptance-$timestamp.out.log"
$acceptanceErr = Join-Path $Root ".wp08-acceptance-$timestamp.err.log"
$acceptancePassed = $false
$primaryError = $null
$cleanupErrors = New-Object System.Collections.Generic.List[string]

try {
    Invoke-Native node 'scripts/wp08/wp08-01-database.mjs' create
    $dbCreated = $true

    Write-Host "`n[8/9] Starting the unified application against real infrastructure..."
    $server = Start-Process -FilePath 'node' `
        -ArgumentList 'dist/src/main.js' `
        -WorkingDirectory $Root `
        -RedirectStandardOutput $serverOut `
        -RedirectStandardError $serverErr `
        -PassThru

    $ready = $false
    $lastReadinessMessage = 'No response received yet.'
    for ($attempt = 1; $attempt -le 90; $attempt++) {
        if ($server.HasExited) {
            throw "VoiceCloud exited before becoming ready (exit code $(Get-ProcessExitCodeDisplay $server))."
        }
        try {
            $health = Invoke-RestMethod -Uri "$($env:WP08_BASE_URL)/health" -TimeoutSec 2
            $apiInfo = Invoke-RestMethod -Uri "$($env:WP08_BASE_URL)/api" -TimeoutSec 2
            $isVoiceCloud = $apiInfo.name -eq 'VoiceCloud Monolith API' -and
                $apiInfo.status -eq 'online' -and
                $apiInfo.health -eq '/health'
            $isRealAndHealthy = $health.status -eq 'ok' -and
                $health.database -eq 'connected' -and
                $health.redis -eq 'connected' -and
                $health.infrastructure.realInfrastructure -eq $true

            if ($isVoiceCloud -and $isRealAndHealthy) {
                $ready = $true
                break
            }

            $lastReadinessMessage = "VoiceCloud identity=$isVoiceCloud; health=$($health.status); database=$($health.database); redis=$($health.redis); realInfrastructure=$($health.infrastructure.realInfrastructure)"
        }
        catch {
            $lastReadinessMessage = $_.Exception.Message
        }
        Start-Sleep -Seconds 1
    }

    if (-not $ready) {
        throw "VoiceCloud did not report confirmed application identity and real PostgreSQL/Redis readiness within 90 seconds. Last result: $lastReadinessMessage"
    }

    Write-Host "VoiceCloud readiness confirmed at $($env:WP08_BASE_URL)."

    Write-Host "`n[9/9] Running real registration, authentication, profile, private-document and Host lifecycle workflows..."
    $acceptance = Start-Process -FilePath 'node' `
        -ArgumentList 'scripts/wp08/wp08-01-acceptance.mjs' `
        -WorkingDirectory $Root `
        -RedirectStandardOutput $acceptanceOut `
        -RedirectStandardError $acceptanceErr `
        -PassThru

    $acceptanceDeadline = [DateTime]::UtcNow.AddSeconds($acceptanceTimeoutSeconds)
    while (-not $acceptance.HasExited -and [DateTime]::UtcNow -lt $acceptanceDeadline) {
        Start-Sleep -Milliseconds 250
        $acceptance.Refresh()
    }

    if (-not $acceptance.HasExited) {
        throw "Real HTTP acceptance exceeded the configured timeout of $acceptanceTimeoutSeconds seconds."
    }
    $acceptance.WaitForExit()
    $acceptance.Refresh()

    Show-LogTail 'acceptance output' $acceptanceOut 260
    Show-LogTail 'acceptance errors' $acceptanceErr 260

    Assert-AcceptanceProcessResult `
        -Process $acceptance `
        -Name 'WP08-01 real HTTP acceptance' `
        -OutputPath $acceptanceOut `
        -SuccessMarker 'WP08-01 REAL HTTP ACCEPTANCE PASSED'

    $acceptanceOutputText = [System.IO.File]::ReadAllText($acceptanceOut)
    $expectedHostMarker = "WP08_ACCEPTANCE_HOST_READY=$($env:WP08_ACCEPTANCE_HOST_EMAIL)"
    if ($acceptanceOutputText.IndexOf(
        $expectedHostMarker,
        [System.StringComparison]::Ordinal
    ) -lt 0) {
        throw "WP08-01 passed, but it did not confirm the expected acceptance Host: $($env:WP08_ACCEPTANCE_HOST_EMAIL)"
    }

    $acceptancePassed = $true
}
catch {
    $primaryError = $_.Exception
    Write-Host ''
    Write-Host 'WP08-01 runtime acceptance encountered an error:'
    Write-Host $primaryError.Message
}
finally {
    Stop-TrackedProcess $acceptance 'acceptance' $cleanupErrors
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
        try {
            Remove-Item $env:PRIVATE_STORAGE_PATH -Recurse -Force -ErrorAction Stop
        }
        catch {
            $cleanupErrors.Add("Could not remove private acceptance storage '$($env:PRIVATE_STORAGE_PATH)': $($_.Exception.Message)")
        }
    }

    if (Test-Path $env:PRIVATE_STORAGE_PATH) {
        $cleanupErrors.Add("Private acceptance storage still exists: $($env:PRIVATE_STORAGE_PATH)")
    }

    if ($primaryError -or $cleanupErrors.Count -gt 0) {
        Show-DiagnosticLogs $serverOut $serverErr $acceptanceOut $acceptanceErr
    }
    else {
        Remove-Item $serverOut, $serverErr, $acceptanceOut, $acceptanceErr -Force -ErrorAction SilentlyContinue
    }
}

if ($primaryError) {
    throw $primaryError
}

if ($cleanupErrors.Count -gt 0) {
    throw "WP08-01 acceptance completed, but cleanup failed: $($cleanupErrors -join ' | ')"
}

if (-not $acceptancePassed) {
    throw 'WP08-01 acceptance did not complete successfully.'
}

Write-Host ''
Write-Host '============================================================'
Write-Host 'WP08-01 ALL AUTOMATED AND REAL HTTP ACCEPTANCE CHECKS PASSED'
Write-Host '============================================================'
