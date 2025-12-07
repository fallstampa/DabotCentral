# Test the new URL parameter authentication method
$apiUrl = "https://dabot-central.vercel.app/api/daily-todo"
$apiKey = "sk_dabotcentral_ebdf8bdd0e299fc35251dcc3651d9cf80a0745642a637ed6f907501e31a01876"

# Test with URL parameter (for mobile Claude)
$urlWithKey = "$apiUrl?key=$apiKey"

Write-Host "Testing URL parameter method..." -ForegroundColor Cyan
Write-Host "URL: $urlWithKey" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $urlWithKey -Method Get
    Write-Host "✅ URL Parameter Method Success!" -ForegroundColor Green
    Write-Host "Your Daily Todo:" -ForegroundColor Cyan
    Write-Host "================`n" -ForegroundColor Cyan
    Write-Host $response.content
    Write-Host "`n================" -ForegroundColor Cyan
    Write-Host "Last modified: $($response.last_modified)" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Error with URL parameter method:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host $_.ErrorDetails.Message
}

Write-Host "`n" -ForegroundColor White
Write-Host "For Claude Mobile, use this URL:" -ForegroundColor Yellow
Write-Host $urlWithKey -ForegroundColor Green