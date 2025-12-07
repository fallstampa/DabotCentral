$apiUrl = "https://dabot-central.vercel.app/api/daily-todo"
$apiKey = "sk_dabotcentral_ebdf8bdd0e299fc35251dcc3651d9cf80a0745642a637ed6f907501e31a01876"

# Read the daily todo file
$todoContent = Get-Content "D:\JK\Projects\research\daily_todo.md" -Raw

# Create the request body
$body = @{
    content = $todoContent
} | ConvertTo-Json

# Send the request
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $body
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host $_.ErrorDetails.Message
}
