[CmdletBinding()]
param(
    [string]$Endpoint = "https://tomori-ai-command.pages.dev/api/usage",
    [string]$SecretKey = "tomori-cmd-secure-dev-key-2026"
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LatestJsonPath = Join-Path (Split-Path -Parent $ScriptDir) "AI_COMMON\tools\ai_usage_check\latest.json"

if (-not (Test-Path -LiteralPath $LatestJsonPath)) {
    Write-Warning "latest.json が見つかりません: $LatestJsonPath"
    exit 1
}

try {
    $raw = Get-Content -LiteralPath $LatestJsonPath -Raw -Encoding UTF8
    Write-Host "Cloudflare D1 へ最新AI利用枠データを送信中: $Endpoint" -ForegroundColor Cyan

    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $SecretKey"
    }

    $response = Invoke-RestMethod -Uri $Endpoint -Method POST -Headers $headers -Body $raw -TimeoutSec 15
    Write-Host "同期成功: $($response.message)" -ForegroundColor Green
} catch {
    Write-Error "クラウド同期に失敗しました: $($_.Exception.Message)"
}
