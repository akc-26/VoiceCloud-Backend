$ErrorActionPreference = 'Continue'
Set-StrictMode -Version 2.0

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $Root

$Failures = [System.Collections.Generic.List[string]]::new()
$Skipped = [System.Collections.Generic.List[string]]::new()
$Passed = [System.Collections.Generic.List[string]]::new()

function Invoke-Check {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
    )

    Write-Host "`n$Label"
    $global:LASTEXITCODE = 0

    try {
        & $Command @Arguments 2>&1 | ForEach-Object { Write-Host $_ }
        $exitCode = $LASTEXITCODE
    } catch {
        $null = $Failures.Add("$Label (execution error): $($_.Exception.Message)")
        return $false
    }

    if ($exitCode -eq 0) {
        $null = $Passed.Add($Label)
        return $true
    }

    $null = $Failures.Add("$Label (exit code $exitCode): $Command $($Arguments -join ' ')")
    return $false
}

function Test-BuildArtifacts {
    $requiredFiles = @(
        'dist\src\main.js',
        'dist\website\index.html',
        'dist\admin\index.html',
        'dist\creator\index.html'
    )

    $missingFiles = @()
    foreach ($relativePath in $requiredFiles) {
        $absolutePath = Join-Path $Root $relativePath
        if (-not (Test-Path $absolutePath -PathType Leaf)) {
            $missingFiles += $relativePath
        }
    }

    if ($missingFiles.Count -gt 0) {
        $null = $Failures.Add("[10/11] Build artifact verification failed. Missing: $($missingFiles -join ', ')")
        return $false
    }

    $null = $Passed.Add('[10/11] Build artifact verification passed.')
    return $true
}

function Write-ResultSummary {
    Write-Host ''
    Write-Host '============================================================'
    Write-Host 'WP08-03-01 R05 CONSOLIDATED VERIFICATION SUMMARY'
    Write-Host '============================================================'
    Write-Host "Passed stages: $($Passed.Count)"
    Write-Host "Failed stages: $($Failures.Count)"
    Write-Host "Skipped stages: $($Skipped.Count)"

    if ($Failures.Count -gt 0) {
        Write-Host ''
        Write-Host 'COLLECTED FAILURES:'
        foreach ($failure in $Failures) {
            Write-Host " - $failure"
        }
    }

    if ($Skipped.Count -gt 0) {
        Write-Host ''
        Write-Host 'SKIPPED STAGES:'
        foreach ($item in $Skipped) {
            Write-Host " - $item"
        }
    }
}

Write-Host '============================================================'
Write-Host 'VoiceCloud WP08-03-01 R05 - Consolidated Build Verification'
Write-Host '============================================================'
Write-Host "Repository root: $Root"

# The dependency-free contract check runs first so package drift is reported even
# when dependency installation itself is unavailable.
$null = Invoke-Check '[1/11] Running dependency-free manifest and source self-check...' node scripts/wp08/wp08-03-01-self-check.mjs

Write-Host "`n[2/11] Installing locked dependencies including development tooling..."
Remove-Item Env:npm_config_production -ErrorAction SilentlyContinue
Remove-Item Env:npm_config_omit -ErrorAction SilentlyContinue
Remove-Item Env:npm_config_only -ErrorAction SilentlyContinue
$dependenciesInstalled = Invoke-Check '[2/11] Locked dependency installation...' npm.cmd ci --include=dev

if (-not $dependenciesInstalled) {
    $null = $Skipped.Add('[3/11] Package-owned formatting verification (dependencies unavailable).')
    $null = $Skipped.Add('[4/11] Package-scoped ESLint (dependencies unavailable).')
    $null = $Skipped.Add('[5/11] WP08-01 focused regressions (dependencies unavailable).')
    $null = $Skipped.Add('[6/11] WP08-02 focused regressions (dependencies unavailable).')
    $null = $Skipped.Add('[7/11] WP08-03-01 contract and hosting tests (dependencies unavailable).')
    $null = $Skipped.Add('[8/11] Complete Jest suite (dependencies unavailable).')
    $null = $Skipped.Add('[9/11] Unified Backend, Website, Admin and Creator build (dependencies unavailable).')
    $null = $Skipped.Add('[10/11] Build artifact verification (build unavailable).')
    $null = $Skipped.Add('[11/11] Compiled frontend runtime smoke test (build unavailable).')
    Write-ResultSummary
    exit 1
}

# Normalize only the explicitly package-owned files, then immediately verify the
# normalized result. This prevents formatting drift from also surfacing as ESLint
# prettier/prettier failures while leaving all business source outside this scope untouched.
Write-Host "`n[3/11] Normalizing package-owned formatting before verification..."
$global:LASTEXITCODE = 0
& npm.cmd run format:wp08:03:01 2>&1 | ForEach-Object { Write-Host $_ }
$formatExitCode = $LASTEXITCODE
if ($formatExitCode -ne 0) {
    $null = $Failures.Add("[3/11] Package-owned formatting normalization failed (exit code $formatExitCode): npm.cmd run format:wp08:03:01")
} else {
    $null = Invoke-Check '[3/11] Verifying normalized package-owned formatting...' npm.cmd run format:check:wp08:03:01
}

Write-Host "`n[4/11] Normalizing package-owned ESLint fixes before verification..."
$global:LASTEXITCODE = 0
& npm.cmd run lint:fix:wp08:03:01 2>&1 | ForEach-Object { Write-Host $_ }
$lintFixExitCode = $LASTEXITCODE
if ($lintFixExitCode -ne 0) {
    $null = $Failures.Add("[4/11] Package-scoped ESLint normalization failed (exit code $lintFixExitCode): npm.cmd run lint:fix:wp08:03:01")
} else {
    $null = Invoke-Check '[4/11] Verifying package-scoped ESLint after normalization...' npm.cmd run lint:wp08:03:01
}
$null = Invoke-Check '[5/11] Running WP08-01 focused regressions...' npm.cmd run test:wp08:01
$null = Invoke-Check '[6/11] Running WP08-02 focused regressions...' npm.cmd run test:wp08:02
$null = Invoke-Check '[7/11] Running WP08-03-01 contract and hosting tests...' npm.cmd run test:wp08:03:01
$null = Invoke-Check '[8/11] Running the complete Jest suite...' npx.cmd jest --runInBand --config jest.config.js
$buildPassed = Invoke-Check '[9/11] Building Backend, Website, Admin and Creator...' npm.cmd run build

$artifactsPassed = $false
if ($buildPassed) {
    $artifactsPassed = Test-BuildArtifacts
} else {
    $null = $Skipped.Add('[10/11] Build artifact verification (unified build failed).')
}

if ($buildPassed -and $artifactsPassed) {
    $null = Invoke-Check '[11/11] Starting the compiled application and loading all three frontend applications...' npm.cmd run wp08:03:01:frontend-smoke
} else {
    $null = $Skipped.Add('[11/11] Compiled frontend runtime smoke test (valid build artifacts unavailable).')
}

Write-ResultSummary

if ($Failures.Count -gt 0) {
    exit 1
}

Write-Host ''
Write-Host '============================================================'
Write-Host 'WP08-03-01 R05 FULL BUILD AND FRONTEND RUNTIME CHECKS PASSED'
Write-Host '============================================================'
exit 0
