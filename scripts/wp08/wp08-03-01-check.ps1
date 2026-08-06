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
Write-Host 'VoiceCloud WP08-03-01 R02 - Economy Audit and Contract Lock'
Write-Host '============================================================'
Write-Host "Repository root: $Root"

Write-Host "`n[1/10] Installing locked dependencies including development tooling..."
Remove-Item Env:npm_config_production -ErrorAction SilentlyContinue
Remove-Item Env:npm_config_omit -ErrorAction SilentlyContinue
Remove-Item Env:npm_config_only -ErrorAction SilentlyContinue
Invoke-Native npm.cmd ci --include=dev

Write-Host "`n[2/10] Normalizing formatting only for WP08-03-01 package-owned files..."
Invoke-Native npm.cmd run format:wp08:03:01

Write-Host "`n[3/10] Verifying package-owned formatting after normalization..."
Invoke-Native npm.cmd run format:check:wp08:03:01

Write-Host "`n[4/10] Running package-scoped non-mutating ESLint..."
Invoke-Native npm.cmd run lint:wp08:03:01

Write-Host "`n[5/10] Running WP08-03-01 manifest and source self-check..."
Invoke-Native npm.cmd run wp08:03:01:self-check

Write-Host "`n[6/10] Running WP08-01 focused regressions..."
Invoke-Native npm.cmd run test:wp08:01

Write-Host "`n[7/10] Running WP08-02 focused regressions..."
Invoke-Native npm.cmd run test:wp08:02

Write-Host "`n[8/10] Running WP08-03-01 contract tests..."
Invoke-Native npm.cmd run test:wp08:03:01

Write-Host "`n[9/10] Running the complete Jest suite..."
Invoke-Native npx.cmd jest --runInBand --config jest.config.js

Write-Host "`n[10/10] Building Backend, Website, Admin and Creator..."
Invoke-Native npm.cmd run build
Assert-BuildArtifacts

Write-Host ''
Write-Host '============================================================'
Write-Host 'WP08-03-01 R02 AUDIT, REGRESSION AND BUILD CHECKS PASSED'
Write-Host '============================================================'
