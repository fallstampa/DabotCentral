$apiUrl = "https://dabot-central.vercel.app/api/daily-todo"
$apiKey = "sk_dabotcentral_ebdf8bdd0e299fc35251dcc3651d9cf80a0745642a637ed6f907501e31a01876"

# Send the request
$headers = @{
    "Authorization" = "Bearer $apiKey"
}

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get -Headers $headers
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Your Daily Todo:" -ForegroundColor Cyan
    Write-Host "================`n" -ForegroundColor Cyan
    Write-Host $response.content
    Write-Host "`n================" -ForegroundColor Cyan
    Write-Host "Last modified: $($response.last_modified)" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host $_.ErrorDetails.Message
}
