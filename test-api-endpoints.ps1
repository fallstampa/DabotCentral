$apiKey = "sk_dabotcentral_ebdf8bdd0e299fc35251dcc3651d9cf80a0745642a637ed6f907501e31a01876"

$headers = @{
    "Authorization" = "Bearer $apiKey"
}

Write-Host "Testing API endpoints..." -ForegroundColor Cyan

# Test health endpoint
Write-Host "`n1. Testing /api/health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://dabot-central.vercel.app/api/health" -Method Get
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test daily-todo GET
Write-Host "`n2. Testing /api/daily-todo GET..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://dabot-central.vercel.app/api/daily-todo" -Method Get -Headers $headers
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Response.StatusCode.value__) - $($_.Exception.Message)" -ForegroundColor Red
}

# Test daily-todo POST
Write-Host "`n3. Testing /api/daily-todo POST..." -ForegroundColor Yellow
$body = @{ content = "Test todo content" } | ConvertTo-Json
$headers["Content-Type"] = "application/json"
try {
    $response = Invoke-WebRequest -Uri "https://dabot-central.vercel.app/api/daily-todo" -Method Post -Headers $headers -Body $body
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Response.StatusCode.value__) - $($_.Exception.Message)" -ForegroundColor Red
}
