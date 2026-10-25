import { describe, expect, it } from 'vitest';
import { AI_SERVICES } from '../constants/aiConfig';
import { INITIAL_AI_USAGE, INITIAL_TASKS } from '../constants/initialData';
import { PromptGeneratorService } from '../services/promptGenerator';
import { RouterService } from '../services/router';
import { StorageService } from '../services/storage';

describe('TOMORI AI COMMAND 網羅的機能テスト', () => {
  // 1. 新しいタスクの登録・初期データ
  it('1. 初期タスクとデータ構造の整合性検証', () => {
    expect(INITIAL_TASKS.length).toBeGreaterThan(0);
    const firstTask = INITIAL_TASKS[0];
    expect(firstTask.id).toBeDefined();
    expect(firstTask.title).toBeDefined();
    expect(firstTask.project).toBeDefined();
    expect(firstTask.assignedAI).toBeDefined();
    expect(firstTask.status).toBe('実行中');
  });

  // 2. 担当AIの変更と設定検証
  it('2. 担当AI設定（ChatGPT, Work, Codex, Claude Code, Gemini, Antigravity）の整合性', () => {
    const aiList = Object.keys(AI_SERVICES);
    expect(aiList).toContain('chatgpt');
    expect(aiList).toContain('chatgpt-work');
    expect(aiList).toContain('codex');
    expect(aiList).toContain('claude-code');
    expect(aiList).toContain('gemini');
    expect(aiList).toContain('antigravity');

    expect(AI_SERVICES['claude-code'].webUrl).toBe('https://claude.ai');
    expect(AI_SERVICES['codex'].executionEnv).toBe('Local CLI');
  });

  // 3. AI担当者推薦エンジン（RouterService）の検証
  it('3. 自然言語からのAI担当自動推薦とプロジェクト判別', () => {
    // Web修正・フォーム・バグ
    const rec1 = RouterService.analyzeRequest('スターターズコネクトのフォームでエラーが出るので修正して');
    expect(rec1.detectedProject).toBe('スターターズコネクト');
    expect(rec1.recommendedAI).toBe('codex');
    expect(rec1.reason).toContain('コードの直接編集');

    // 明示的Claude指定
    const rec2 = RouterService.analyzeRequest('この内容をClaude Codeへ渡して新名爪八幡宮の特設ページを作成');
    expect(rec2.recommendedAI).toBe('claude-code');
    expect(rec2.reason).toContain('明示的なClaude Code指定');

    // ブラウザ・スプレッドシート・Work
    const rec3 = RouterService.analyzeRequest('スプレッドシートの巡回とブラウザ収集を実行して');
    expect(rec3.recommendedAI).toBe('chatgpt-work');

    // 長文資料・PDF分析
    const rec4 = RouterService.analyzeRequest('補助金の公募要領PDF資料を分析して比較要約して');
    expect(rec4.recommendedAI).toBe('gemini');
  });

  // 4. 9大項目引き継ぎ指示書の自動生成
  it('4. 9大項目を含む正式引き継ぎ指示書の生成検証', () => {
    const prompt = PromptGeneratorService.generateHandoffPrompt({
      project: 'スターターズコネクト',
      title: 'お問い合わせフォームのバリデーション強化',
      description: 'Zodによるスキーマ検証を追加',
      assignedAI: 'codex',
    });

    expect(prompt).toContain('1. プロジェクト名');
    expect(prompt).toContain('2. 背景と目的');
    expect(prompt).toContain('3. 現在までの決定事項');
    expect(prompt).toContain('4. 作業の進捗');
    expect(prompt).toContain('5. 依頼する作業');
    expect(prompt).toContain('6. 使用すべき環境');
    expect(prompt).toContain('7. 変更してはいけないもの');
    expect(prompt).toContain('8. 完了条件');
    expect(prompt).toContain('9. 完了後に報告すべき項目');
  });

  // 5. AI利用状況データと確定不可データの区別検証
  it('5. 実測利用状況データと推測不可項目の明示検証', () => {
    const entries = INITIAL_AI_USAGE.entries;
    expect(entries.length).toBeGreaterThan(0);

    // ChatGPT通常Chat会話は「専用残量表示なし (not_available)」であることを確認
    const chatEntry = entries.find((e) => e.scope.includes('通常のChat会話'));
    expect(chatEntry).toBeDefined();
    expect(chatEntry?.measured).toBe('none');
    expect(chatEntry?.status).toBe('not_available');
    expect(chatEntry?.used_percent).toBeNull();
    expect(chatEntry?.remaining_percent).toBeNull();

    // Claude週次枠の警告ステータス確認
    const claudeWeekly = entries.find((e) => e.service === 'Claude' && e.scope.includes('週次枠'));
    expect(claudeWeekly).toBeDefined();
    expect(claudeWeekly?.used_percent).toBe(93);
    expect(claudeWeekly?.status).toBe('warning');
  });

  // 6. バックアップ・エクスポート・インポートの検証
  it('6. バックアップJSONのエクスポートとインポートの往復整合性', () => {
    // Node環境モック
    const mockStorage: Record<string, string> = {};
    global.localStorage = {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
      clear: () => {},
      length: 0,
      key: () => null,
    };

    StorageService.saveTasks(INITIAL_TASKS);
    const exportedJson = StorageService.exportBackup();
    expect(exportedJson).toBeDefined();

    const parsed = JSON.parse(exportedJson);
    expect(parsed.version).toBe('1.0');
    expect(parsed.tasks.length).toBe(INITIAL_TASKS.length);

    const ok = StorageService.importBackup(exportedJson);
    expect(ok).toBe(true);
  });
});
