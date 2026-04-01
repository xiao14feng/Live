try {
  $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/api/v1/admin/streams' -Method GET -UseBasicParsing -TimeoutSec 8
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
