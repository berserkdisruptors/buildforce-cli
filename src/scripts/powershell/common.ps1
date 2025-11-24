#!/usr/bin/env pwsh
# Common PowerShell functions analogous to common.sh

# Get buildforce root by checking for .buildforce directory in current working directory
# This enables monorepo support and prevents path confusion
function Get-BuildforceRoot {
    $currentDir = $PWD.Path

    # Check if .buildforce exists in current working directory
    if (Test-Path (Join-Path $currentDir '.buildforce') -PathType Container) {
        return $currentDir
    }

    # Not found - provide clear error message
    Write-Error @"
ERROR: .buildforce directory not found in current directory.

This command must be run from the directory where you initialized buildforce.

Solutions:
  1. Change to your buildforce root directory:
     cd /path/to/your/buildforce/project

  2. Or initialize a new buildforce project here:
     buildforce init .

Tip: Look for the directory containing .buildforce/ folder.
"@
    throw "Buildforce root not found"
}

# Find repository root by searching for project markers (.git or .buildforce)
function Find-RepositoryRoot {
    param(
        [string]$StartDir,
        [string[]]$Markers = @('.git', '.buildforce')
    )
    $current = Resolve-Path $StartDir
    while ($true) {
        foreach ($marker in $Markers) {
            if (Test-Path (Join-Path $current $marker)) {
                return $current
            }
        }
        $parent = Split-Path $current -Parent
        if ($parent -eq $current) {
            # Reached filesystem root without finding markers
            return $null
        }
        $current = $parent
    }
}

function Get-RepoRoot {
    try {
        $result = git rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $result
        }
    } catch {
        # Git command failed
    }

    # Fall back to searching for project markers
    $fallbackRoot = Find-RepositoryRoot -StartDir $PSScriptRoot
    if (-not $fallbackRoot) {
        Write-Error "Error: Could not determine repository root. Please run this script from within the repository."
        throw
    }

    return $fallbackRoot
}

# Get current spec from buildforce.json
function Get-CurrentSpec {
    param([string]$BuildforceRoot)
    $jsonFile = Join-Path $BuildforceRoot '.buildforce/buildforce.json'

    # Return empty if file doesn't exist
    if (-not (Test-Path $jsonFile)) {
        return $null
    }

    try {
        # Parse JSON and extract currentSpec field
        $content = Get-Content $jsonFile -Raw | ConvertFrom-Json

        # Return currentSpec value (null if not set)
        if ($null -ne $content.currentSpec -and $content.currentSpec -ne "") {
            return $content.currentSpec
        }
    } catch {
        # JSON parsing failed, return null
    }

    return $null
}

# Set current spec in buildforce.json
function Set-CurrentSpec {
    param([string]$BuildforceRoot, [string]$SpecFolder)
    $jsonFile = Join-Path $BuildforceRoot '.buildforce/buildforce.json'
    $tempFile = "$jsonFile.tmp"

    # Read existing JSON if file exists
    if (Test-Path $jsonFile) {
        try {
            $existingContent = Get-Content $jsonFile -Raw | ConvertFrom-Json

            # Update currentSpec field, preserving all other fields
            $existingContent | Add-Member -MemberType NoteProperty -Name "currentSpec" -Value $SpecFolder -Force
            $jsonContent = $existingContent
        } catch {
            # JSON parsing failed, create minimal structure
            $jsonContent = @{ currentSpec = $SpecFolder }
        }
    } else {
        # Create new JSON with currentSpec only
        $jsonContent = @{ currentSpec = $SpecFolder }
    }

    # Atomic write: write to temp file first, then move
    $jsonContent | ConvertTo-Json -Depth 10 | Set-Content -Path $tempFile -NoNewline
    Move-Item -Path $tempFile -Destination $jsonFile -Force
}

# Clear current spec in buildforce.json (set to null)
function Clear-CurrentSpec {
    param([string]$BuildforceRoot)
    $jsonFile = Join-Path $BuildforceRoot '.buildforce/buildforce.json'
    $tempFile = "$jsonFile.tmp"

    # Read existing JSON if file exists
    if (Test-Path $jsonFile) {
        try {
            $existingContent = Get-Content $jsonFile -Raw | ConvertFrom-Json

            # Set currentSpec field to null, preserving all other fields
            $existingContent | Add-Member -MemberType NoteProperty -Name "currentSpec" -Value $null -Force
            $jsonContent = $existingContent
        } catch {
            # JSON parsing failed, create minimal structure with null
            $jsonContent = @{ currentSpec = $null }
        }
    } else {
        # Create new JSON with currentSpec null
        $jsonContent = @{ currentSpec = $null }
    }

    # Atomic write: write to temp file first, then move
    $jsonContent | ConvertTo-Json -Depth 10 | Set-Content -Path $tempFile -NoNewline
    Move-Item -Path $tempFile -Destination $jsonFile -Force
}

function Get-CurrentBranch {
    # Check git if available
    try {
        $result = git rev-parse --abbrev-ref HEAD 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $result
        }
    } catch {
        # Git command failed
    }
    
    # For non-git repos, try to find the latest feature directory
    $buildforceRoot = Get-BuildforceRoot
    $sessionsDir = Join-Path $buildforceRoot ".buildforce/sessions"
    
    if (Test-Path $sessionsDir) {
        $latestFeature = ""
        $highest = 0
        
        Get-ChildItem -Path $sessionsDir -Directory | ForEach-Object {
            if ($_.Name -match '^(\d{3})-') {
                $num = [int]$matches[1]
                if ($num -gt $highest) {
                    $highest = $num
                    $latestFeature = $_.Name
                }
            }
        }
        
        if ($latestFeature) {
            return $latestFeature
        }
    }
    
    # Final fallback
    return "main"
}

function Test-HasGit {
    try {
        git rev-parse --show-toplevel 2>$null | Out-Null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Test-FeatureBranch {
    param(
        [string]$Branch,
        [bool]$HasGit = $true
    )
    
    # For non-git repos, we can't enforce branch naming but still provide output
    if (-not $HasGit) {
        Write-Warning "[spec] Warning: Git repository not detected; skipped branch validation"
        return $true
    }
    
    if ($Branch -notmatch '^[0-9]{3}-') {
        Write-Output "ERROR: Not on a feature branch. Current branch: $Branch"
        Write-Output "Feature branches should be named like: 001-feature-name"
        return $false
    }
    return $true
}

function Get-FeatureDir {
    param([string]$BuildforceRoot, [string]$Branch)
    Join-Path $BuildforceRoot ".buildforce/sessions/$Branch"
}

function Get-SpecPaths {
    $buildforceRoot = Get-BuildforceRoot
    $specFolder = Get-CurrentSpec -BuildforceRoot $buildforceRoot
    $specDir = ""

    if ($specFolder) {
        $specDir = Join-Path $buildforceRoot ".buildforce/sessions/$specFolder"
    }

    [PSCustomObject]@{
        BUILDFORCE_ROOT = $buildforceRoot
        SPEC_DIR        = $specDir
    }
}

function Get-FeaturePathsEnv {
    $buildforceRoot = Get-BuildforceRoot
    $currentBranch = Get-CurrentBranch
    $hasGit = Test-HasGit
    $featureDir = Get-FeatureDir -BuildforceRoot $buildforceRoot -Branch $currentBranch

    [PSCustomObject]@{
        BUILDFORCE_ROOT = $buildforceRoot
        CURRENT_BRANCH  = $currentBranch
        HAS_GIT         = $hasGit
        FEATURE_DIR     = $featureDir
        SPEC_DIR        = $featureDir
        FEATURE_SPEC    = Join-Path $featureDir 'spec.md'
        IMPL_PLAN       = Join-Path $featureDir 'plan.md'
        TASKS           = Join-Path $featureDir 'tasks.md'
        RESEARCH        = Join-Path $featureDir 'research.md'
        DATA_MODEL      = Join-Path $featureDir 'data-model.md'
        QUICKSTART      = Join-Path $featureDir 'quickstart.md'
        CONTRACTS_DIR   = Join-Path $featureDir 'contracts'
    }
}

function Test-FileExists {
    param([string]$Path, [string]$Description)
    if (Test-Path -Path $Path -PathType Leaf) {
        Write-Output "  ✓ $Description"
        return $true
    } else {
        Write-Output "  ✗ $Description"
        return $false
    }
}

function Test-DirHasFiles {
    param([string]$Path, [string]$Description)
    if ((Test-Path -Path $Path -PathType Container) -and (Get-ChildItem -Path $Path -ErrorAction SilentlyContinue | Where-Object { -not $_.PSIsContainer } | Select-Object -First 1)) {
        Write-Output "  ✓ $Description"
        return $true
    } else {
        Write-Output "  ✗ $Description"
        return $false
    }
}
