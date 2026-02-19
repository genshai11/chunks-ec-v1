param()
$ErrorActionPreference = 'Stop'
Write-Host '== Phase 3: Generate Supabase Types =='

Set-Location (Join-Path $PSScriptRoot '..\..')
$sb = Get-Command supabase -ErrorAction SilentlyContinue
if ($sb) {
  supabase gen types typescript --linked | Out-File -FilePath 'src/integrations/supabase/types.ts' -Encoding utf8
} else {
  npx -y supabase@latest gen types typescript --linked | Out-File -FilePath 'src/integrations/supabase/types.ts' -Encoding utf8
}

Write-Host 'Types generated at src/integrations/supabase/types.ts' -ForegroundColor Green
