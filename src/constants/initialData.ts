import { AIUsageData, Task } from '../types';

// 本番初期状態：機密情報は含めず、未認証・初期ロード時は空配列
export const INITIAL_TASKS: Task[] = [];

export const INITIAL_AI_USAGE: AIUsageData = {
  generated_at_jst: '未取得（サーバー同期待ち）',
  entries: [],
};

// 開発・デモ用サンプルデータ（機密情報は含まない抽象化データ）
export const SAMPLE_TASKS: Task[] = [
  {
    id: 'TSK-1001',
    title: '【サンプル】Webポータルの問い合わせフォーム改善',
    description: '入力バリデーションの強化とエラーメッセージ表示の改善（デモ用サンプル）',
    project: 'Web制作サンプル',
    assignedAI: 'codex',
    modelName: 'OpenAI Codex (GPT-4o)',
    status: '実行中',
    isStatusConfirmed: true,
    lastConfirmedAt: '本日 12:00 JST',
    createdAt: '2026-10-25 10:00 JST',
    updatedAt: '2026-10-25 12:00 JST',
    sourceUrl: 'https://github.com/example/demo-repo',
    instructionPrompt: `# 【引き継ぎ指示書】フォーム改善サンプル
1. プロジェクト名: Web制作サンプル
2. 背景と目的: 問い合わせフォームの入力離脱を防ぐためリアルタイム検証を追加。
3. 現在までの決定事項: Zodスキーマによる検証。
4. 作業の進捗: スキーマ作成完了。
5. 依頼する作業: エラーメッセージUIの実装とテスト。
6. 使用すべき環境: Local CLI
7. 変更してはいけないもの: デザインガイドライン
8. 完了条件: 全入力エラーが正しく表示されること。
9. 完了後に報告すべき項目: 変更ファイル一覧、動作確認結果。`,
    resultSummary: 'バリデーションスキーマの定義完了。',
    nextActions: 'UIコンポーネントへの適用。',
    artifacts: [
      {
        id: 'art-sample-1',
        type: 'pr',
        title: 'Pull Request #1 (Demo)',
        url: 'https://github.com/example/demo/pull/1',
      },
    ],
    history: [
      {
        id: 'h-sample-1',
        timestamp: '2026-10-25 10:00 JST',
        actor: 'User',
        action: 'サンプルタスク作成',
      },
    ],
    createdBy: 'Demo Mode',
    updatedBy: 'Demo Mode',
  },
  {
    id: 'TSK-1002',
    title: '【サンプル】APIレスポンスのキャッシュ最適化',
    description: 'Cloudflare Workersでのキャッシュヘッダー調整（デモ用サンプル）',
    project: '社内インフラサンプル',
    assignedAI: 'claude-code',
    modelName: 'Claude 3.7 Sonnet',
    status: '確認待ち',
    isStatusConfirmed: false,
    lastConfirmedAt: '状態未確認（3時間前）',
    createdAt: '2026-10-25 09:00 JST',
    updatedAt: '2026-10-25 11:00 JST',
    instructionPrompt: `# 【引き継ぎ指示書】キャッシュ最適化サンプル
1. プロジェクト名: 社内インフラサンプル
2. 依頼する作業: Workersキャッシュヘッダーの検証。`,
    resultSummary: 'キャッシュ制御コードの適用完了。',
    nextActions: 'レスポンス速度の計測。',
    artifacts: [],
    history: [],
    createdBy: 'Demo Mode',
    updatedBy: 'Demo Mode',
  },
];

export const SAMPLE_AI_USAGE: AIUsageData = {
  generated_at_jst: '2026-10-25 18:05 JST (サンプル)',
  entries: [
    {
      service: 'ChatGPT',
      scope: '5時間枠（Codex/Work共通）',
      plan: 'Plus',
      used_percent: null,
      remaining_percent: 0,
      measured: 'remaining',
      credit_text: null,
      reset_at_jst: '2026-10-25 20:40 JST',
      note: 'Codex・Work共通枠。通常のChatは別枠',
      source_url: 'https://chatgpt.com/settings/usage?tab=overview',
      status: 'warning',
      stale: false,
      fetched_at_jst: '2026-10-25 18:05 JST',
      last_attempt_jst: '2026-10-25 18:05 JST',
      last_attempt_status: 'ok',
    },
    {
      service: 'ChatGPT',
      scope: '通常のChat会話',
      plan: 'Plus',
      used_percent: null,
      remaining_percent: null,
      measured: 'none',
      credit_text: null,
      reset_at_jst: null,
      note: '公式ページに「Chatは利用上限に含まれない」と明記。専用残量表示なし',
      source_url: 'https://chatgpt.com/settings/usage?tab=overview',
      status: 'not_available',
      stale: false,
      fetched_at_jst: null,
      last_attempt_jst: '2026-10-25 18:05 JST',
      last_attempt_status: 'not_available',
    },
    {
      service: 'Claude',
      scope: '週次枠',
      plan: 'Pro',
      used_percent: 93,
      remaining_percent: null,
      measured: 'used',
      credit_text: null,
      reset_at_jst: '毎週水曜 9:00 JST',
      note: '週次利用枠の消費警告',
      source_url: 'https://claude.ai/settings/usage',
      status: 'warning',
      stale: false,
      fetched_at_jst: '2026-10-25 18:05 JST',
      last_attempt_jst: '2026-10-25 18:05 JST',
      last_attempt_status: 'ok',
    },
    {
      service: 'Google AI Pro(Gemini)',
      scope: '週間枠',
      plan: 'PRO',
      used_percent: 1,
      remaining_percent: null,
      measured: 'used',
      credit_text: null,
      reset_at_jst: '10/27 14:28 JST',
      note: null,
      source_url: 'https://gemini.google.com/usage',
      status: 'ok',
      stale: false,
      fetched_at_jst: '2026-10-25 18:05 JST',
      last_attempt_jst: '2026-10-25 18:05 JST',
      last_attempt_status: 'ok',
    },
  ],
};
