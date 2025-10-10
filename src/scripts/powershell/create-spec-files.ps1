#!/usr/bin/env pwsh
# Create a new spec folder with spec.yaml and plan.yaml files, or return existing spec if matched
[CmdletBinding()]
param(
    [switch]$Json,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$FeatureDescription
)
$ErrorActionPreference = 'Stop'

# Source common functions
. "$PSScriptRoot/common.ps1"

if (-not $FeatureDescription -or $FeatureDescription.Count -eq 0) {
    Write-Error "Usage: ./create-spec-files.ps1 [-Json] <feature description>"
    exit 1
}
$featureDesc = ($FeatureDescription -join ' ').Trim()

# Normalize text for fuzzy matching
function Normalize-Text {
    param([string]$Text)
    $normalized = $Text.ToLower() -replace '[^a-z0-9]', ' ' -replace '\s+', ' '
    return $normalized.Trim()
}

# Check if two descriptions match closely (fuzzy match)
function Test-FuzzyMatch {
    param(
        [string]$Description1,
        [string]$Description2
    )

    $desc1 = Normalize-Text $Description1
    $desc2 = Normalize-Text $Description2

    # Extract significant words (3+ characters)
    $words1 = ($desc1 -split ' ') | Where-Object { $_.Length -ge 3 }
    $words2 = ($desc2 -split ' ') | Where-Object { $_.Length -ge 3 }

    if ($words2.Count -eq 0) { return $false }

    # Count matching words
    $matches = 0
    foreach ($word in $words2) {
        if ($words1 -contains $word) {
            $matches++
        }
    }

    # If at least 60% of significant words match (minimum 2 words)
    $threshold = [Math]::Floor($words2.Count * 0.6)
    return ($matches -ge $threshold -and $matches -ge 2)
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
New-Item -ItemType Directory -Path $specsDir -Force | Out-Null

# Check for session-tracked current spec from state file (Priority 1)
$currentSpec = Get-CurrentSpec $repoRoot

# Check for existing spec folders that match the feature description
$existingFolder = $null
$highest = 0

if ($currentSpec -and (Test-Path (Join-Path $specsDir $currentSpec))) {
    # Found active spec from state file - use it (highest priority)
    $existingFolder = $currentSpec
} elseif (Test-Path $specsDir) {
    # No active spec in state file, do fuzzy matching (Priority 2)
    Get-ChildItem -Path $specsDir -Directory | ForEach-Object {
        $dirName = $_.Name

        # Track highest number for potential new spec
        if ($dirName -match '^(\d{3})') {
            $num = [int]$matches[1]
            if ($num -gt $highest) { $highest = $num }
        }

        # Extract feature name from folder (remove number prefix)
        $featureName = $dirName -replace '^(\d{3})-', ''

        # Fuzzy match against feature description
        if (-not $existingFolder -and (Test-FuzzyMatch $featureName $featureDesc)) {
            $existingFolder = $dirName
        }
    }
}

# Determine if this is an update or create operation
$isUpdate = $false
if ($existingFolder) {
    # Existing spec found - return it
    $isUpdate = $true
    $folderName = $existingFolder
    $featureNum = ($folderName -match '^(\d{3})') ? $matches[1] : '000'
    $featureDir = Join-Path $specsDir $folderName
    $specFile = Join-Path $featureDir 'spec.yaml'
} else {
    # No existing spec - create new
    $next = $highest + 1
    $featureNum = ('{0:000}' -f $next)

    $folderName = $featureDesc.ToLower() -replace '[^a-z0-9]', '-' -replace '-{2,}', '-' -replace '^-', '' -replace '-$', ''
    $words = ($folderName -split '-') | Where-Object { $_ } | Select-Object -First 3
    $folderName = "$featureNum-$([string]::Join('-', $words))"

    $featureDir = Join-Path $specsDir $folderName
    New-Item -ItemType Directory -Path $featureDir -Force | Out-Null

    $specTemplate = Join-Path $repoRoot 'src/templates/spec-template.yaml'
    $specFile = Join-Path $featureDir 'spec.yaml'
    if (Test-Path $specTemplate) {
        Copy-Item $specTemplate $specFile
    } else {
        New-Item -ItemType File -Path $specFile -Force | Out-Null
    }
}

# Create or locate plan.yaml file
$planFile = Join-Path $featureDir 'plan.yaml'
if (-not (Test-Path $planFile)) {
    $planTemplate = Join-Path $repoRoot 'src/templates/plan-template.yaml'
    if (Test-Path $planTemplate) {
        Copy-Item $planTemplate $planFile
    } else {
        New-Item -ItemType File -Path $planFile -Force | Out-Null
    }
}

# Update state file to track current spec across sessions
Set-CurrentSpec $repoRoot $folderName

# Set CURRENT_SPEC environment variable for session tracking
$env:CURRENT_SPEC = $folderName

if ($Json) {
    @{
        FOLDER_NAME = $folderName
        SPEC_FILE = $specFile
        PLAN_FILE = $planFile
        SPEC_DIR = $featureDir
        FEATURE_NUM = $featureNum
        IS_UPDATE = $isUpdate
    } | ConvertTo-Json -Compress
} else {
    Write-Host "FOLDER_NAME: $folderName"
    Write-Host "SPEC_FILE: $specFile"
    Write-Host "PLAN_FILE: $planFile"
    Write-Host "SPEC_DIR: $featureDir"
    Write-Host "FEATURE_NUM: $featureNum"
    Write-Host "IS_UPDATE: $isUpdate"
    Write-Host "CURRENT_SPEC environment variable set to: $folderName"
}
