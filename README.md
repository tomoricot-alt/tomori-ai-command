# TOMORI AI COMMAND

> **TOMORI -CREATIVE OFFICE- 複数AI統合指揮・タスク管理システム**
> iPhone & PC対応 PWA / React + TypeScript + Vite + Tailwind CSS + Cloudflare Pages/Functions + D1

---

## 1. 概要

TOMORI AI COMMANDは、ChatGPT・ChatGPT Work・Codex・Claude Code・Gemini・AntigravityなどのAIエージェントを横断的に一元管理し、仕事の依頼・引き継ぎ・進捗確認をひとつの画面で行えるWebアプリケーションです。

### 解決する課題

1. どのAIに何を依頼したか忘れてしまう問題を解消。
2. 複数AIの作業進捗とステータス（実行中・確認待ち・完了等）を一目で把握。
3. 9大項目を網羅した正式な引き継ぎ指示書をワンクリックで生成・コピー。
4. AIごとの利用枠（ChatGPT 5時間枠/週間枠、Claude週次枠/クレジット、Gemini枠）を正確に表示。
5. 推測値と実測値、確認済みと状態未確認を厳格に区別。
6. iPhone Safari (PWA) および PC (3ペイン) 双方に最適化されたモダンUI。
7. **Cloudflare D1（無料枠）によるPC・iPhone間のセキュアな双方向同期**。

---

## 2. セキュリティ & 認証アーキテクチャ

- **固定PINの撤廃 & サーバー側認証**:
  ブラウザ単独の簡易判定を完全廃止。Cloudflare Pages Functions（`functions/api/_middleware.ts`）により、未認証リクエストは **401 Unauthorized** で即時遮断し、タスクや業務データを一切返却しません。
- **Cloudflare Access (Zero Trust) 対応**:
  Cloudflare Access経由でアクセスした場合、認証ヘッダー（`Cf-Access-Authenticated-User-Email`）を自動検知して安全に利用可能。
- **機密情報のフロントエンド排除**:
  本番の初期バンドルには実際の顧客名や機密指示を含めず空配列で初期化。独立した「サンプル/デモモード」を用意。

---

## 3. PC・iPhone同期（Cloudflare D1）

- **スキーマ定義**: `schema.sql`
- **APIエンドポイント**:
  - `GET /api/tasks`: タスク一覧取得（D1）
  - `POST /api/tasks`: タスク作成・更新（D1永続化）
  - `DELETE /api/tasks/:id`: タスク削除
  - `GET /api/usage`: 最新AI利用状況取得
  - `POST /api/usage`: PCからの利用状況プッシュ同期（`sync_to_cloud.ps1`）
- **オフライン・同期制御**:
  通信切断時でもローカルキャッシュで操作継続可能。再接続時に自動再同期。

---

## 4. AI利用枠モニタとPC電源OFF時の制約

- 既存の `AI_COMMON/tools/ai_usage_check/latest.json` の更新仕様に準拠。
- **PC電源OFF時の制約**:
  AI各社の利用枠データは、PCローカルの定期監視スクリプトがブラウザ経由で実測取得しています。そのため、**PC電源OFFの間は最新枠の自動更新が停止し、「未更新（前回取得データ維持）」の表示となります**。PC起動後に自動で最新値がCloudflareへ再同期されます。
- ChatGPT通常会話など「専用残量表示なし」の項目は推測確定表示を行いません。

---

## 5. ローカル起動・開発手順

```bash
cd tomori-ai-command
npm install
npm run dev
```

### ビルドとテスト

```bash
npm run build
npx vitest run
```

### Cloudflare D1 初期設定（初回のみ）

```bash
# 1. D1データベースの作成
npx wrangler d1 create tomori-ai-command-db

# 2. スキーマの適用
npx wrangler d1 execute tomori-ai-command-db --file=./schema.sql

# 3. APIシークレットキーの設定
npx wrangler secret put API_SECRET_KEY
```
