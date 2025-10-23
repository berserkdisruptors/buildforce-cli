#!/usr/bin/env pwsh
# Create a new spec folder with spec.yaml and plan.yaml files
[CmdletBinding()]
param(
    [switch]$Json,
    [Parameter(Mandatory=$true)]
    [string]$FolderName
)
$ErrorActionPreference = 'Stop'

# Source common functions
. "$PSScriptRoot/common.ps1"

# Validate folder name is provided
if (-not $FolderName) {
    Write-Error "Error: -FolderName parameter is required"
    Write-Host "Usage: ./create-spec-files.ps1 [-Json] -FolderName <timestamp-slug>" -ForegroundColor Red
    Write-Host "Example: ./create-spec-files.ps1 -FolderName 20250122143052-add-auth-jwt" -ForegroundColor Yellow
    exit 1
}

# Validate folder name format: must start with 14-digit timestamp followed by hyphen
if ($FolderName -notmatch '^[0-9]{14}-') {
    Write-Error "Error: Folder name must start with 14-digit timestamp followed by hyphen (YYYYMMDDHHmmss-)`nProvided: $FolderName"
    exit 1
}

# Validate folder name contains only alphanumeric and hyphens
if ($FolderName -notmatch '^[0-9a-z-]+$') {
    Write-Error "Error: Folder name must contain only lowercase alphanumeric characters and hyphens`nProvided: $FolderName"
    exit 1
}

# Validate total length (≤50 characters)
if ($FolderName.Length -gt 50) {
    Write-Error "Error: Folder name must not exceed 50 characters (current: $($FolderName.Length))`nProvided: $FolderName"
    exit 1
}

# Get repository root using common function
try {
    $repoRoot = Get-RepoRoot
} catch {
    Write-Error "Error: Could not determine repository root. Please run this script from within the repository."
    exit 1
}

Set-Location $repoRoot

$specsDir = Join-Path $repoRoot '.buildforce/specs'
$templatesDir = Join-Path $repoRoot '.buildforce/templates'
New-Item -ItemType Directory -Path $specsDir -Force | Out-Null

# Create new spec folder
$featureDir = Join-Path $specsDir $FolderName

# Check if folder already exists
if (Test-Path $featureDir) {
    Write-Error "Error: Spec folder already exists: $FolderName`nThis timestamp may have been used already. Please retry to generate a new timestamp."
    exit 1
}

New-Item -ItemType Directory -Path $featureDir -Force | Out-Null

# Copy spec template
$specTemplate = Join-Path $templatesDir 'spec-template.yaml'
$specFile = Join-Path $featureDir 'spec.yaml'
if (Test-Path $specTemplate) {
    Copy-Item $specTemplate $specFile
} else {
    New-Item -ItemType File -Path $specFile -Force | Out-Null
}

# Copy plan template
$planFile = Join-Path $featureDir 'plan.yaml'
$planTemplate = Join-Path $templatesDir 'plan-template.yaml'
if (Test-Path $planTemplate) {
    Copy-Item $planTemplate $planFile
} else {
    New-Item -ItemType File -Path $planFile -Force | Out-Null
}

# Update state file to track current spec across sessions
Set-CurrentSpec $repoRoot $FolderName

# Set CURRENT_SPEC environment variable for session tracking
$env:CURRENT_SPEC = $FolderName

if ($Json) {
    @{
        FOLDER_NAME = $FolderName
        SPEC_FILE = $specFile
        PLAN_FILE = $planFile
        SPEC_DIR = $featureDir
    } | ConvertTo-Json -Compress
} else {
    Write-Host "FOLDER_NAME: $FolderName"
    Write-Host "SPEC_FILE: $specFile"
    Write-Host "PLAN_FILE: $planFile"
    Write-Host "SPEC_DIR: $featureDir"
    Write-Host "CURRENT_SPEC environment variable set to: $FolderName"
}
