[CmdletBinding()]
param(
    [string]$Endpoint = "https://tomori-ai-command.pages.dev/api/usage",
    [Parameter(Mandatory = $false)]
    [string]$SecretKey = $env:TOMORI_SYNC_KEY
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LatestJsonPath = Join-Path (Split-Path -Parent $ScriptDir) "AI_COMMON\tools\ai_usage_check\latest.json"

# 1. 認証シークレットキーの検証
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
    Write-Error "The specified key is known insecure or leaked. Please use a unique secure API_SECRET_KEY."
    exit 1
}

# 2. ローカルデータファイルの存在確認
if (-not (Test-Path -LiteralPath $LatestJsonPath)) {
    Write-Error "latest.json not found: $LatestJsonPath"
    exit 1
}

try {
    $raw = Get-Content -LiteralPath $LatestJsonPath -Raw -Encoding UTF8
    $jsonObj = $raw | ConvertFrom-Json
    $entriesCount = $jsonObj.entries.Count
    $generatedAt = $jsonObj.generated_at_jst

    Write-Host "[TOMORI AI COMMAND] Syncing usage to Cloudflare D1..." -ForegroundColor Cyan
    Write-Host "  Endpoint: $Endpoint"
    Write-Host "  Generated: $generatedAt (Entries: $entriesCount)"

    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $SecretKey"
    }

    $response = Invoke-RestMethod -Uri $Endpoint -Method POST -Headers $headers -Body $raw -TimeoutSec 15
    Write-Host "Sync successful: $($response.message)" -ForegroundColor Green
} catch {
    Write-Error "Sync failed: $($_.Exception.Message)"
    exit 1
}