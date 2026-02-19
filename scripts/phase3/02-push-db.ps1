param()
$ErrorActionPreference = 'Stop'
Write-Host '== Phase 3: Push Database Migrations =='

Set-Location (Join-Path $PSScriptRoot '..\..')
$sb = Get-Command supabase -ErrorAction SilentlyContinue
if ($sb) { supabase db push } else { npx -y supabase@latest db push }

Write-Host 'Database migrations pushed successfully.' -ForegroundColor Green
