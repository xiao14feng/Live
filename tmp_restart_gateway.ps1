$conn = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  $pids = $conn | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($p in $pids) {
    try { Stop-Process -Id $p -Force -ErrorAction Stop } catch {}
  }
}
Start-Process node -WorkingDirectory 'd:\Desktop\project\live-gateway-main' -ArgumentList 'gateway.js'
Start-Sleep -Seconds 3
try {
  $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/admin' -UseBasicParsing -TimeoutSec 8
  Write-Output $resp.StatusCode
} catch {
  Write-Output $_.Exception.Message
}
