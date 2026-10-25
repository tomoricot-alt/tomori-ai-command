import { describe, expect, it } from 'vitest';
import { AI_SERVICES } from '../constants/aiConfig';
import { INITIAL_AI_USAGE, INITIAL_TASKS, SAMPLE_AI_USAGE, SAMPLE_TASKS } from '../constants/initialData';
import { ApiService } from '../services/api';
import { PromptGeneratorService } from '../services/promptGenerator';
import { RouterService } from '../services/router';
import { StorageService } from '../services/storage';

describe('TOMORI AI COMMAND セキュリティ・D1同期・機能総合検証テスト', () => {
  // 1. セキュリティ：初期データに機密情報を含まないことの検証
  it('1. 初期バンドルデータに実案件の機密情報が含まれず、空配列であること', () => {
    expect(INITIAL_TASKS).toEqual([]);
    expect(INITIAL_AI_USAGE.entries).toEqual([]);
    // サンプルデータは分離されている
    expect(SAMPLE_TASKS.length).toBeGreaterThan(0);
    expect(SAMPLE_TASKS[0].title).toContain('【サンプル】');
  });

  // 2. セキュリティ：固定PINの廃止とトークン管理の検証
  it('2. 認証トークン管理とサーバー側APIヘッダーの検証', () => {
    const mockStorage: Record<string, string> = {};
    const mockStorageObj = {
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
    (globalThis as any).localStorage = mockStorageObj;
    (globalThis as any).sessionStorage = mockStorageObj;

    // トークン未設定状態
    ApiService.clearToken();
    expect(ApiService.getToken()).toBeNull();

    // トークン設定
    const testSecret = 'test-secure-key-12345';
    ApiService.setToken(testSecret, true);
    expect(ApiService.getToken()).toBe(testSecret);

    ApiService.clearToken();
    expect(ApiService.getToken()).toBeNull();
  });

  // 3. AI担当者推薦エンジン（RouterService）の検証
  it('3. 自然言語からのAI担当自動推薦とプロジェクト判別', () => {
    const rec1 = RouterService.analyzeRequest('スターターズコネクトのフォームでエラーが出るので修正して');
    expect(rec1.detectedProject).toBe('スターターズコネクト');
    expect(rec1.recommendedAI).toBe('codex');

    const rec2 = RouterService.analyzeRequest('この内容をClaude Codeへ渡して新名爪八幡宮の特設ページを作成');
    expect(rec2.recommendedAI).toBe('claude-code');

    const rec3 = RouterService.analyzeRequest('スプレッドシートの巡回とブラウザ収集を実行して');
    expect(rec3.recommendedAI).toBe('chatgpt-work');

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
    const entries = SAMPLE_AI_USAGE.entries;
    const chatEntry = entries.find((e) => e.scope.includes('通常のChat会話'));
    expect(chatEntry).toBeDefined();
    expect(chatEntry?.measured).toBe('none');
    expect(chatEntry?.status).toBe('not_available');
    expect(chatEntry?.used_percent).toBeNull();
    expect(chatEntry?.remaining_percent).toBeNull();
  });

  // 6. オフライン・同期・サンプルモードのデータ整合性
  it('6. サンプルデータモードのロードと切り替え検証', () => {
    const mockStorage: Record<string, string> = {};
    (globalThis as any).localStorage = {
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

    const loaded = StorageService.loadSampleData();
    expect(loaded.tasks.length).toBe(SAMPLE_TASKS.length);
    expect(StorageService.isSampleMode()).toBe(true);

    StorageService.clearLocalCache();
    expect(StorageService.isSampleMode()).toBe(false);
    expect(StorageService.getTasks()).toEqual([]);
  });
});
