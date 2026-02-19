param()
$ErrorActionPreference = 'Stop'
Write-Host '== Phase 3: Deploy Edge Functions =='

Set-Location (Join-Path $PSScriptRoot '..\..')
$functions = @('analyze-speech','deepgram-transcribe','practice-ingest')
$sb = Get-Command supabase -ErrorAction SilentlyContinue
foreach ($fn in $functions) {
  Write-Host "Deploying $fn ..."
  if ($sb) { supabase functions deploy $fn } else { npx -y supabase@latest functions deploy $fn }
}

Write-Host 'All edge functions deployed successfully.' -ForegroundColor Green
