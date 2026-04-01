$body = @{ name='judge-denied-stream'; url='https://example.com/judge.m3u8'; type='hls'; enabled=$true } | ConvertTo-Json
try {
  $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/api/admin/streams' -Method POST -ContentType 'application/json' -Headers @{ 'X-User-Role'='judge' } -Body $body -UseBasicParsing -TimeoutSec 8
  Write-Output $resp.StatusCode
  Write-Output $resp.Content
} catch {
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Output $_.Exception.Response.StatusCode.value__
    Write-Output $reader.ReadToEnd()
  } else {
    Write-Output $_.Exception.Message
  }
}
