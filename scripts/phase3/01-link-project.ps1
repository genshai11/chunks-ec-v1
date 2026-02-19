param(
  [Parameter(Mandatory=$true)][string]$ProjectRef
)
$ErrorActionPreference = 'Stop'
Write-Host "== Phase 3: Link Project ($ProjectRef) =="

Set-Location (Join-Path $PSScriptRoot '..\..')
$sb = Get-Command supabase -ErrorAction SilentlyContinue
if ($sb) { supabase link --project-ref $ProjectRef } else { npx -y supabase@latest link --project-ref $ProjectRef }

Write-Host 'Linked project successfully.' -ForegroundColor Green
