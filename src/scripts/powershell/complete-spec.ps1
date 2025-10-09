#!/usr/bin/env pwsh

# Complete a spec by creating context files and updating the context repository
#
# This script:
# 1. Verifies current spec state using get-spec-paths.ps1
# 2. Collects all artifacts from the spec directory
# 3. Dynamically loads the context schema
# 4. Generates a new context YAML file based on the schema and spec artifacts
# 5. Updates _index.yml with a pointer to the new context file
# 6. Updates related context files based on spec dependencies
# 7. Clears the current spec state
#
# Usage: ./complete-spec.ps1 [OPTIONS]
#
# OPTIONS:
#   -Json               Output in JSON format
#   -Help, -h           Show help message

[CmdletBinding()]
param(
    [switch]$Json,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

# Show help if requested
if ($Help) {
    Write-Output @"
Usage: complete-spec.ps1 [OPTIONS]

Complete the current spec by creating context files and updating the context repository.

OPTIONS:
  -Json               Output in JSON format
  -Help, -h           Show this help message

EXAMPLES:
  # Complete the current spec
  .\complete-spec.ps1

  # Complete with JSON output
  .\complete-spec.ps1 -Json

"@
    exit 0
}

# Source common functions
. "$PSScriptRoot/common.ps1"

# Get repository root
$repoRoot = Get-RepoRoot

# Verify current spec state using get-spec-paths.ps1
try {
    $getSpecPathsScript = Join-Path $PSScriptRoot "get-spec-paths.ps1"
    $specPathsJson = & $getSpecPathsScript -Json 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "ERROR: Failed to get current spec paths. Run /spec first to create a spec."
        Write-Error $specPathsJson
        exit 1
    }

    $specPaths = $specPathsJson | ConvertFrom-Json
    $specDir = $specPaths.SPEC_DIR
} catch {
    Write-Error "ERROR: Failed to execute get-spec-paths.ps1: $_"
    exit 1
}

if (-not $specDir -or -not (Test-Path $specDir -PathType Container)) {
    Write-Error "ERROR: Invalid SPEC_DIR: $specDir"
    exit 1
}

# Extract spec folder name (e.g., "002-build-command")
$specFolderName = Split-Path $specDir -Leaf

# Paths
$contextDir = Join-Path $repoRoot ".buildforce/context"
$schemaFile = Join-Path $contextDir "_schema.yml"
$indexFile = Join-Path $contextDir "_index.yml"

# Verify schema exists
if (-not (Test-Path $schemaFile -PathType Leaf)) {
    Write-Error "ERROR: Schema file not found: $schemaFile"
    exit 1
}

# Verify index exists
if (-not (Test-Path $indexFile -PathType Leaf)) {
    Write-Error "ERROR: Index file not found: $indexFile"
    exit 1
}

# Collect all artifacts from spec directory
$artifacts = Get-ChildItem -Path $specDir -File -Recurse | Select-Object -ExpandProperty FullName

if (-not $artifacts -or $artifacts.Count -eq 0) {
    Write-Error "ERROR: No artifacts found in spec directory: $specDir"
    exit 1
}

# Read spec.yml to extract metadata
$specFile = Join-Path $specDir "spec.yml"
if (-not (Test-Path $specFile -PathType Leaf)) {
    # Try .yaml extension
    $specFile = Join-Path $specDir "spec.yaml"
    if (-not (Test-Path $specFile -PathType Leaf)) {
        Write-Error "ERROR: No spec.yml or spec.yaml found in $specDir"
        exit 1
    }
}

# Extract key fields from spec.yml using regex
$specContent = Get-Content $specFile -Raw

$specId = if ($specContent -match '(?m)^id:\s*(.+)$') { $matches[1].Trim().Trim('"').Trim("'") } else { $specFolderName }
$specName = if ($specContent -match '(?m)^name:\s*"?([^"]+)"?$') { $matches[1].Trim() } else { $specFolderName }
$specType = if ($specContent -match '(?m)^type:\s*(.+)$') { $matches[1].Trim().Trim('"').Trim("'") } else { "feature" }
$specStatus = if ($specContent -match '(?m)^status:\s*(.+)$') { $matches[1].Trim().Trim('"').Trim("'") } else { "completed" }

# Generate context file name from spec ID
$contextFileName = "$specId.yml"
$contextFile = Join-Path $contextDir $contextFileName

# Check if context file already exists
if (Test-Path $contextFile -PathType Leaf) {
    Write-Warning "WARNING: Context file already exists: $contextFile"
    Write-Warning "WARNING: It will be overwritten."
}

# Create context file with dynamic schema-based structure
$currentDate = Get-Date -Format "yyyy-MM-dd"

# Build context file content
$contextContent = @"
id: $specId
name: "$specName"
type: $specType
status: $specStatus
created: $currentDate
last_updated: $currentDate

summary: |
  [Agent will populate from spec and conversation context]

responsibilities:
  - [Agent will extract from spec requirements]

dependencies:
  internal: {}
  external: {}

files:
  primary: []
  secondary: []

evolution:
  - version: "1.0"
    date: "$currentDate"
    changes: "Initial implementation"

related_specs:
  - "$specFolderName"

notes: |
  [Agent will add additional context from conversation]
"@

Set-Content -Path $contextFile -Value $contextContent -NoNewline

# Update _index.yml with new context entry
$indexContent = Get-Content $indexFile -Raw

if ($indexContent -match "id: $specId") {
    Write-Host "INFO: Context entry already exists in index for id: $specId" -ForegroundColor Yellow
} else {
    # Extract tags from spec if available
    $tags = if ($specContent -match '(?ms)^tags:\s*\[(.*?)\]') {
        $matches[1].Trim()
    } elseif ($specContent -match '(?ms)^tags:\s*\[?(.*?)(?:\]|^[a-z_])') {
        $matches[1].Trim()
    } else {
        $specType
    }

    # Append new entry to index
    $newEntry = @"

  - id: $specId
    file: $contextFileName
    type: $specType
    tags: [$tags]
"@

    Add-Content -Path $indexFile -Value $newEntry -NoNewline
}

# Identify related context files based on dependencies in spec
$relatedContexts = @()
if ($specContent -match '(?ms)^dependencies:.*?internal:(.+?)(?:external:|^[a-z_]+:)') {
    $depsSection = $matches[1]

    # Extract dependency names (simplified parsing)
    $depMatches = [regex]::Matches($depsSection, '^\s+([a-z-]+):', [System.Text.RegularExpressions.RegexOptions]::Multiline)

    foreach ($match in $depMatches) {
        $depName = $match.Groups[1].Value

        # Search for matching context files
        $matchingContexts = Get-ChildItem -Path $contextDir -Filter "*.yml" | Where-Object {
            $content = Get-Content $_.FullName -Raw
            $content -match "(?m)^id:\s*$depName\s*$"
        }

        if ($matchingContexts) {
            $relatedContexts += $matchingContexts.FullName
        }
    }
}

# Clear current spec state
$stateFile = Join-Path $repoRoot ".buildforce/.current-spec"
if (Test-Path $stateFile -PathType Leaf) {
    Remove-Item $stateFile -Force
}

# Output results
if ($Json) {
    # Build artifacts JSON array
    $artifactsRelative = $artifacts | ForEach-Object {
        $_.Replace("$repoRoot/", "").Replace("$repoRoot\", "").Replace('\', '/')
    }

    # Build related contexts JSON array
    $relatedContextsRelative = $relatedContexts | ForEach-Object {
        $_.Replace("$repoRoot/", "").Replace("$repoRoot\", "").Replace('\', '/')
    }

    [PSCustomObject]@{
        SPEC_DIR         = $specDir
        SPEC_ID          = $specId
        CONTEXT_FILE     = $contextFile
        ARTIFACTS        = $artifactsRelative
        RELATED_CONTEXTS = $relatedContextsRelative
        STATUS           = "success"
    } | ConvertTo-Json -Compress
} else {
    Write-Output "Spec completion successful!"
    Write-Output ""
    Write-Output "SPEC_DIR: $specDir"
    Write-Output "SPEC_ID: $specId"
    Write-Output "CONTEXT_FILE: $contextFile"
    Write-Output ""
    Write-Output "Artifacts collected ($($artifacts.Count)):"
    foreach ($artifact in $artifacts) {
        $relPath = $artifact.Replace("$repoRoot/", "").Replace("$repoRoot\", "").Replace('\', '/')
        Write-Output "  - $relPath"
    }
    Write-Output ""
    if ($relatedContexts.Count -gt 0) {
        Write-Output "Related context files ($($relatedContexts.Count)):"
        foreach ($ctx in $relatedContexts) {
            $relPath = $ctx.Replace("$repoRoot/", "").Replace("$repoRoot\", "").Replace('\', '/')
            Write-Output "  - $relPath"
        }
    } else {
        Write-Output "No related context files found."
    }
    Write-Output ""
    Write-Output "Current spec state cleared."
}
