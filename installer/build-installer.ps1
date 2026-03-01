# build-installer.ps1
# Builds the Cardboard installer using Inno Setup
# Prerequisites: Inno Setup 6.2+ installed
#
# Usage:
#   .\build-installer.ps1                    # Build with version from assembly
#   .\build-installer.ps1 -Preview           # Build as preview release
#   .\build-installer.ps1 -SkipPublish       # Skip dotnet publish step

param(
    [string]$Configuration = "Release",
    [switch]$SkipPublish,
    [switch]$Preview
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SolutionDir = Split-Path -Parent $ScriptDir
$ControllerProject = Join-Path $SolutionDir "Cardboard.Controller\Cardboard.Controller.csproj"
$IssFile = Join-Path $ScriptDir "Cardboard.iss"

Write-Host "=== Cardboard Installer Build ===" -ForegroundColor Cyan
Write-Host "Configuration: $Configuration"
Write-Host "Preview: $Preview"
Write-Host ""

# Find Inno Setup Compiler
$IsccPaths = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe",
    "C:\Users\Jared\AppData\Local\Programs\Inno Setup 6\ISCC.exe"
)

$IsccExe = $IsccPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $IsccExe) {
    Write-Error @"
Inno Setup Compiler (ISCC.exe) not found.

Please install Inno Setup 6.2+ from:
  https://jrsoftware.org/isdl.php

Or install via winget:
  winget install JRSoftware.InnoSetup
"@
    exit 1
}

Write-Host "Using Inno Setup: $IsccExe" -ForegroundColor Gray

# Step 1: Build and Publish .NET Application
if (-not $SkipPublish) {
    Write-Host ""
    Write-Host "=== Publishing .NET Application ===" -ForegroundColor Green

    dotnet publish $ControllerProject -c $Configuration
    if ($LASTEXITCODE -ne 0) {
        Write-Error "dotnet publish failed"
        exit $LASTEXITCODE
    }
}

# Step 2: Verify publish output exists
$PublishDir = Join-Path $SolutionDir "Cardboard.Controller\bin\$Configuration\net10.0-windows\publish"
if (-not (Test-Path $PublishDir)) {
    Write-Error "Publish directory not found: $PublishDir"
    exit 1
}

$ExePath = Join-Path $PublishDir "Cardboard.Controller.exe"
if (-not (Test-Path $ExePath)) {
    Write-Error "Main executable not found: $ExePath"
    exit 1
}

Write-Host "Publish directory verified: $PublishDir" -ForegroundColor Gray

# Step 3: Extract version from the published assembly
Write-Host ""
Write-Host "=== Extracting Version ===" -ForegroundColor Green

$FileVersionInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($ExePath)
$Version = $FileVersionInfo.ProductVersion

# Strip any +commit suffix (e.g., "1.0.0+abc123" -> "1.0.0")
if ($Version -match '^\d+\.\d+\.\d+') {
    $Version = $Matches[0]
} else {
    Write-Error "Could not parse version from assembly: $Version"
    exit 1
}

Write-Host "Assembly version: $Version" -ForegroundColor Gray

# Determine output filename based on preview flag
$PreviewSuffix = if ($Preview) { ".p" } else { "" }
$OutputFileName = "$Version$PreviewSuffix"
Write-Host "Output filename: $OutputFileName.exe" -ForegroundColor Gray

# Step 4: Compile Inno Setup Script
Write-Host ""
Write-Host "=== Compiling Installer ===" -ForegroundColor Green

& $IsccExe "/DMyAppVersion=$Version" "/DMyOutputFilename=$OutputFileName" $IssFile
if ($LASTEXITCODE -ne 0) {
    Write-Error "Inno Setup compilation failed"
    exit $LASTEXITCODE
}

# Step 5: Report success
$OutputFile = Join-Path $ScriptDir "bin\$OutputFileName.exe"
if (Test-Path $OutputFile) {
    $FileInfo = Get-Item $OutputFile
    $SizeMB = [math]::Round($FileInfo.Length / 1MB, 2)

    Write-Host ""
    Write-Host "=== Build Complete ===" -ForegroundColor Green
    Write-Host "Output: $OutputFile"
    Write-Host "Size: $SizeMB MB"
} else {
    Write-Warning "Build completed but output file not found at expected location"
}
