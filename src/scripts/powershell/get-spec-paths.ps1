#!/usr/bin/env pwsh

# This script gets the current spec and returns the paths to the spec files and directories.
#
# Usage: ./get-spec-paths.ps1 [OPTIONS]
#
# OPTIONS:
#   -Json               Output in JSON format
#   -PathsOnly          Only output path variables (no validation)
#   -Help, -h           Show help message

[CmdletBinding()]
param(
    [switch]$Json,
    [switch]$PathsOnly,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

# Show help if requested
if ($Help) {
    Write-Output @"
Usage: get-spec-paths.ps1 [OPTIONS]

This script gets the current spec and returns the paths to the spec files and directories.

OPTIONS:
  -Json               Output in JSON format
  -PathsOnly          Only output path variables (no prerequisite validation)
  -Help, -h           Show this help message

EXAMPLES:
  # Get spec paths
  .\get-spec-paths.ps1 -Json
  
  # Get spec paths only (no validation)
  .\get-spec-paths.ps1 -PathsOnly

"@
    exit 0
}

# Source common functions
. "$PSScriptRoot/common.ps1"

# Get spec paths
$paths = Get-SpecPaths

# If paths-only mode, output paths and exit (support combined -Json -PathsOnly)
if ($PathsOnly) {
    if ($Json) {
        [PSCustomObject]@{
            BUILDFORCE_ROOT = $paths.BUILDFORCE_ROOT
            SPEC_DIR        = $paths.SPEC_DIR
        } | ConvertTo-Json -Compress
    } else {
        Write-Output "BUILDFORCE_ROOT: $($paths.BUILDFORCE_ROOT)"
        Write-Output "SPEC_DIR: $($paths.SPEC_DIR)"
    }
    exit 0
}

# Validate required directories and files
if (-not (Test-Path $paths.SPEC_DIR -PathType Container)) {
    Write-Output "ERROR: Spec directory not found: $($paths.SPEC_DIR)"
    Write-Output "Run /buildforce.plan first to create the feature structure."
    exit 1
}

# Output results
if ($Json) {
    # JSON output
    [PSCustomObject]@{ 
        SPEC_DIR = $paths.SPEC_DIR
    } | ConvertTo-Json -Compress
} else {
    # Text output
    Write-Output "SPEC_DIR:$($paths.SPEC_DIR)"
}