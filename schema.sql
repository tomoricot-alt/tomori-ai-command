-- TOMORI AI COMMAND - Cloudflare D1 Database Schema (Optimistic Concurrency Control Ready)

-- 1. タスク管理テーブル
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  project TEXT NOT NULL,
  assigned_ai TEXT NOT NULL,
  model_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT '未着手',
  is_status_confirmed INTEGER DEFAULT 1,
  last_confirmed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  source_url TEXT,
  instruction_prompt TEXT DEFAULT '',
  result_summary TEXT DEFAULT '',
  next_actions TEXT DEFAULT '',
  artifacts_json TEXT DEFAULT '[]',
  history_json TEXT DEFAULT '[]',
  created_by TEXT DEFAULT 'Web UI',
  updated_by TEXT DEFAULT 'User'
);

-- 2. AI利用状況キャッシュテーブル
CREATE TABLE IF NOT EXISTS ai_usage (
  service_key TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  scope TEXT NOT NULL,
  plan TEXT DEFAULT '',
  used_percent REAL,
  remaining_percent REAL,
  measured TEXT DEFAULT 'remaining',
  credit_text TEXT,
  reset_at_jst TEXT,
  note TEXT,
  source_url TEXT,
  status TEXT DEFAULT 'ok',
  stale INTEGER DEFAULT 0,
  fetched_at_jst TEXT,
  last_attempt_jst TEXT,
  last_attempt_status TEXT DEFAULT 'ok',
  updated_at TEXT NOT NULL
);

-- 3. インデックス
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);
