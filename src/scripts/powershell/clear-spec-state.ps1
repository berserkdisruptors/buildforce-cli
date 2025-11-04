#!/usr/bin/env pwsh
# Clear the current spec state in buildforce.json

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# Source common functions
. "$PSScriptRoot/common.ps1"

# Get buildforce root using common function
try {
    $buildforceRoot = Get-BuildforceRoot
} catch {
    Write-Error "Error: Could not determine buildforce root. Please run this script from a directory containing .buildforce folder."
    exit 1
}

Set-Location $buildforceRoot

# Clear the current spec state
Clear-CurrentSpec $buildforceRoot

Write-Host "Spec state cleared successfully"
