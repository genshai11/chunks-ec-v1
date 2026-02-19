param()
$ErrorActionPreference = 'Stop'
Write-Host '== Phase 3: Prerequisite Check =='

$node = (node -v) 2>$null
if (-not $node) { throw 'Node.js is not installed or not in PATH.' }
Write-Host "Node: $node"

$npm = (npm -v) 2>$null
if (-not $npm) { throw 'npm is not installed or not in PATH.' }
Write-Host "npm: $npm"

$sb = Get-Command supabase -ErrorAction SilentlyContinue
if ($sb) {
  $supabase = (supabase --version) 2>$null
  Write-Host "Supabase CLI (global): $supabase"
} else {
  Write-Host 'Supabase CLI global install not found. Will use npx supabase@latest in scripts.' -ForegroundColor Yellow
}

Write-Host 'OK: prerequisites are available.' -ForegroundColor Green
