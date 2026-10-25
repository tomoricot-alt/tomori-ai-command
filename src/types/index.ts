export type AIServiceId =
  | 'chatgpt'
  | 'chatgpt-work'
  | 'codex'
  | 'claude-code'
  | 'gemini'
  | 'antigravity';

export interface AIServiceConfig {
  id: AIServiceId;
  name: string;
  badgeName: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  category: 'web-chat' | 'cloud-work' | 'cli-agent' | 'cloud-ide';
  bestFor: string[];
  executionEnv: 'Web / Browser' | 'Local CLI' | 'IDE / Cloud Workspace' | 'Cloud Remote';
  webUrl: string;
  launchCommand?: string;
  supportsApiDirectSend: boolean;
  notes: string;
}

export type TaskStatus =
  | '未着手'
  | '指示準備中'
  | '実行待ち'
  | '実行中'
  | '確認待ち'
  | '完了'
  | '保留'
  | 'エラー';

export interface TaskArtifact {
  id: string;
  type: 'pr' | 'preview' | 'doc' | 'code' | 'figma' | 'other';
  title: string;
  url: string;
  note?: string;
}

export interface TaskHistoryEntry {
  id: string;
  timestamp: string; // ISO or JST formatted
  actor: string; // 'User' | 'Claude Code' | 'Codex' | 'System' etc.
  action: string;
  detail?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  project: string;
  assignedAI: AIServiceId;
  modelName: string;
  status: TaskStatus;
  isStatusConfirmed: boolean; // falseの場合は「状態未確認」表示
  lastConfirmedAt: string;
  createdAt: string;
  updatedAt: string;
  sourceUrl?: string; // 元の会話やGitHubへのURL
  instructionPrompt: string; // 9項目構造化引き継ぎプロンプト
  resultSummary?: string; // 作業結果・成果
  nextActions?: string; // 次のアクション
  artifacts: TaskArtifact[];
  history: TaskHistoryEntry[];
  createdBy: string; // 'Web UI' | 'Chat指令' | 'CLI'
  updatedBy: string; // 'ユーザー手動' | '自動取得' | 'スクリプト'
}

export interface AIUsageEntry {
  service: string;
  scope: string;
  plan: string;
  used_percent: number | null;
  remaining_percent: number | null;
  measured: 'remaining' | 'used' | 'credit' | 'share' | 'none';
  credit_text: string | null;
  reset_at_jst: string | null;
  note: string | null;
  source_url: string;
  status: 'ok' | 'not_available' | 'warning' | 'error';
  stale: boolean;
  fetched_at_jst: string | null;
  last_attempt_jst: string;
  last_attempt_status: string;
}

export interface AIUsageData {
  generated_at_jst: string;
  entries: AIUsageEntry[];
}

export interface ProjectInfo {
  id: string;
  name: string;
  business: 'TOMORI' | '補助金ポータル' | '共通';
  description: string;
  repoUrl?: string;
  previewUrl?: string;
}

export type ActiveView =
  | 'dashboard'
  | 'chat'
  | 'tasks'
  | 'usage'
  | 'artifacts'
  | 'settings';
