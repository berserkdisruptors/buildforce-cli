#!/usr/bin/env pwsh
# Create a new spec folder with spec.yaml and plan.yaml files for /buildforce.plan command
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
    Write-Host "Usage: ./create-session-files.ps1 [-Json] -FolderName <semantic-slug-timestamp>" -ForegroundColor Red
    Write-Host "Example: ./create-session-files.ps1 -FolderName add-auth-jwt-20250122143052" -ForegroundColor Yellow
    exit 1
}

# Validate folder name format: semantic slug (starting with letter) followed by timestamp
# Pattern: ^[a-z][a-z0-9-]*-[0-9]{14}$
if ($FolderName -notmatch '^[a-z][a-z0-9-]*-[0-9]{14}$') {
    Write-Error @"
Error: Folder name must follow format: {semantic-slug}-{timestamp}
  - Semantic slug must start with a lowercase letter
  - Slug can contain lowercase letters, numbers, and hyphens
  - Timestamp must be 14 digits (YYYYMMDDHHmmss)
  - Example: add-auth-jwt-20250122143052
Provided: $FolderName
"@
    exit 1
}

# Validate total length (≤50 characters)
if ($FolderName.Length -gt 50) {
    Write-Error "Error: Folder name must not exceed 50 characters (current: $($FolderName.Length))`nProvided: $FolderName"
    exit 1
}

# Get buildforce root using common function
try {
    $buildforceRoot = Get-BuildforceRoot
} catch {
    Write-Error "Error: Could not determine buildforce root. Please run this script from a directory containing .buildforce folder."
    exit 1
}

Set-Location $buildforceRoot

$sessionsDir = Join-Path $buildforceRoot '.buildforce/sessions'
$templatesDir = Join-Path $buildforceRoot '.buildforce/templates'
New-Item -ItemType Directory -Path $sessionsDir -Force | Out-Null

# Create new spec folder
$featureDir = Join-Path $sessionsDir $FolderName

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

# Update state file to track current session across sessions
Set-CurrentSession $buildforceRoot $FolderName

# Set CURRENT_SESSION environment variable for session tracking
$env:CURRENT_SESSION = $FolderName

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
    Write-Host "CURRENT_SESSION environment variable set to: $FolderName"
}
