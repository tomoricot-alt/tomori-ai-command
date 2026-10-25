[CmdletBinding()]
param(
    [string]$BaseUrl = "https://tomori-ai-command.pages.dev",
    [Parameter(Mandatory = $false)]
    [string]$SecretKey = $env:TOMORI_SYNC_KEY
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LatestJsonPath = Join-Path (Split-Path -Parent $ScriptDir) "AI_COMMON\tools\ai_usage_check\latest.json"

# --- 1. Endpoint Protocol Verification (Remote endpoint must use HTTPS) ---
$CleanBaseUrl = $BaseUrl.Trim().TrimEnd('/')
$IsLocal = ($CleanBaseUrl -like "http://localhost*") -or ($CleanBaseUrl -like "http://127.0.0.1*")

if ((-not $IsLocal) -and (-not ($CleanBaseUrl -like "https://*"))) {
    Write-Error "Security Error: Remote endpoint must use HTTPS."
    exit 1
}

# --- 2. Secret Key Validation (Do not log or persist secret keys) ---
if ([string]::IsNullOrWhiteSpace($SecretKey)) {
    Write-Error "SecretKey is missing. Please set env:TOMORI_SYNC_KEY or pass -SecretKey."
    exit 1
}

$ForbiddenSecrets = @(
    "tomori-cmd-secure-dev-key-2026",
    "2026",
    "tomori",
    "admin",
    "password",
    "secret"
)

if ($ForbiddenSecrets -contains $SecretKey.Trim().ToLower()) {
    Write-Error "The specified key is known insecure or forbidden. Please use a unique secure API_SECRET_KEY (min 16 chars)."
    exit 1
}

if ($SecretKey.Trim().Length -lt 16) {
    Write-Error "SecretKey must be at least 16 characters for security."
    exit 1
}

# --- 3. Local Data File Verification ---
if (-not (Test-Path -LiteralPath $LatestJsonPath)) {
    Write-Error "latest.json not found: $LatestJsonPath"
    exit 1
}

try {
    $raw = Get-Content -LiteralPath $LatestJsonPath -Raw -Encoding UTF8
    $jsonObj = $raw | ConvertFrom-Json
    $entriesCount = $jsonObj.entries.Count
    $generatedAt = $jsonObj.generated_at_jst

    # Step 1: Exchange secret key for short-lived HMAC session token via /api/auth/login
    Write-Host "[TOMORI AI COMMAND] Step 1/2: Authenticating with Cloudflare Pages Functions..." -ForegroundColor Cyan
    $loginUrl = "$CleanBaseUrl/api/auth/login"
    $loginBody = @{ secretKey = $SecretKey } | ConvertTo-Json -Compress

    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -ContentType "application/json; charset=utf-8" -Body $loginBody -TimeoutSec 15

    if (-not $loginResponse.success -or [string]::IsNullOrWhiteSpace($loginResponse.token)) {
        Write-Error "Authentication rejected by server: $($loginResponse.message)"
        exit 1
    }

    $sessionToken = $loginResponse.token
    $expiresInSec = $loginResponse.expiresIn
    Write-Host "  Authentication successful. Ephemeral HMAC session token acquired (expires in ${expiresInSec}s)." -ForegroundColor Green

    # Step 2: Push usage payload to /api/usage using Bearer session token
    Write-Host "[TOMORI AI COMMAND] Step 2/2: Syncing AI usage to Cloudflare D1..." -ForegroundColor Cyan
    Write-Host "  Endpoint: $CleanBaseUrl/api/usage"
    Write-Host "  Data timestamp: $generatedAt (Entries: $entriesCount)"

    $headers = @{
        "Content-Type" = "application/json; charset=utf-8"
        "Authorization" = "Bearer $sessionToken"
    }

    $usageUrl = "$CleanBaseUrl/api/usage"
    $response = Invoke-RestMethod -Uri $usageUrl -Method POST -Headers $headers -Body $raw -TimeoutSec 15
    Write-Host "Sync successful: $($response.message)" -ForegroundColor Green

} catch {
    Write-Error "Sync failed: $($_.Exception.Message)"
    exit 1
}
