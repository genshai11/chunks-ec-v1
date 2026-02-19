param(
  [Parameter(Mandatory=$true)][string]$DeepgramApiKey
)
$ErrorActionPreference = 'Stop'
Write-Host '== Phase 3: Set Edge Function Secrets =='

Set-Location (Join-Path $PSScriptRoot '..\..')
$sb = Get-Command supabase -ErrorAction SilentlyContinue
if ($sb) { supabase secrets set DEEPGRAM_API_KEY=$DeepgramApiKey } else { npx -y supabase@latest secrets set DEEPGRAM_API_KEY=$DeepgramApiKey }

Write-Host 'Secrets set successfully.' -ForegroundColor Green
