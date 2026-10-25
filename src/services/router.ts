import { AI_SERVICES } from '../constants/aiConfig';
import { INITIAL_PROJECTS } from '../constants/projects';
import { AIServiceId } from '../types';

export interface RouteRecommendation {
  recommendedAI: AIServiceId;
  reason: string;
  detectedProject: string;
  category: string;
  alternativeAI?: AIServiceId;
  canAutoExecute: boolean;
  notes: string;
}

export class RouterService {
  /**
   * 自然言語の指示文からプロジェクト、担当AI、作業種別を推論・推薦する
   */
  static analyzeRequest(prompt: string): RouteRecommendation {
    const text = prompt.toLowerCase();

    // 1. プロジェクトの検出
    let detectedProject = 'TOMORI社内業務・インフラ';
    for (const p of INITIAL_PROJECTS) {
      if (
        text.includes(p.name.toLowerCase()) ||
        (p.id === 'prj-starters' && (text.includes('スターターズ') || text.includes('starters'))) ||
        (p.id === 'prj-hachimangu' && (text.includes('新名爪') || text.includes('八幡宮') || text.includes('神社'))) ||
        (p.id === 'prj-app-lab' && (text.includes('app lab') || text.includes('50アプリ') || text.includes('manabu'))) ||
        (p.id === 'prj-pass-support' && (text.includes('パスサポート') || text.includes('福祉'))) ||
        (p.id === 'prj-hojokin-portal' && (text.includes('補助金') || text.includes('顧客面談') || text.includes('kintone'))) ||
        (p.id === 'prj-ai-command' && (text.includes('ai command') || text.includes('コマンド')))
      ) {
        detectedProject = p.name;
        break;
      }
    }

    // 2. ユーザーの明示的指定の検出
    if (text.includes('claude') || text.includes('クロード')) {
      return {
        recommendedAI: 'claude-code',
        reason: 'ユーザーによる明示的なClaude Code指定を検出',
        detectedProject,
        category: 'ユーザー指定',
        alternativeAI: 'codex',
        canAutoExecute: false,
        notes: '指示書をクリップボードにコピーし、ターミナルで `claude` を起動してください。',
      };
    }
    if (text.includes('codex') || text.includes('コーデックス')) {
      return {
        recommendedAI: 'codex',
        reason: 'ユーザーによる明示的なCodex指定を検出',
        detectedProject,
        category: 'ユーザー指定',
        alternativeAI: 'claude-code',
        canAutoExecute: false,
        notes: '指示書をコピーし、Cursor等のCodexプロンプトに貼り付けて実行してください。',
      };
    }
    if (text.includes('work') || text.includes('ワーク') || text.includes('chatgpt work')) {
      return {
        recommendedAI: 'chatgpt-work',
        reason: 'ユーザーによる明示的なChatGPT Work指定を検出',
        detectedProject,
        category: 'ユーザー指定',
        alternativeAI: 'chatgpt',
        canAutoExecute: false,
        notes: 'ChatGPTを開き、Work / Actionsモードで指示を実行してください。',
      };
    }
    if (text.includes('gemini') || text.includes('ジェミニ')) {
      return {
        recommendedAI: 'gemini',
        reason: 'ユーザーによる明示的なGemini指定を検出',
        detectedProject,
        category: 'ユーザー指定',
        alternativeAI: 'chatgpt',
        canAutoExecute: false,
        notes: 'Gemini Webを開いてプロンプトを貼り付けてください。',
      };
    }
    if (text.includes('antigravity') || text.includes('アンチグラビティ')) {
      return {
        recommendedAI: 'antigravity',
        reason: 'ユーザーによる明示的なAntigravity指定を検出',
        detectedProject,
        category: 'ユーザー指定',
        alternativeAI: 'claude-code',
        canAutoExecute: false,
        notes: 'Antigravity IDEでタスクを実行してください。',
      };
    }

    // 3. ルールベースの得意分野マッチング (AI_COMMON/TASK_ROUTING.md 準拠)
    // ブラウザ自動化・クラウド実務・Web収集
    if (
      text.includes('ブラウザ') ||
      text.includes('スクレイピング') ||
      text.includes('スプレッドシート') ||
      text.includes('収集') ||
      text.includes('巡回')
    ) {
      return {
        recommendedAI: 'chatgpt-work',
        reason: 'ブラウザ操作・クラウド環境での自律作業に適しています。',
        detectedProject,
        category: 'クラウド実務・ブラウザ操作',
        alternativeAI: 'chatgpt',
        canAutoExecute: false,
        notes: 'ChatGPT Workモードで実行。5時間枠を消費します。',
      };
    }

    // コード修正、バグ修正、小規模スクリプト、Git操作
    if (
      text.includes('バグ') ||
      text.includes('エラー') ||
      text.includes('修正') ||
      text.includes('スクリプト') ||
      text.includes('git') ||
      text.includes('pr') ||
      text.includes('コミット')
    ) {
      return {
        recommendedAI: 'codex',
        reason: 'コードの直接編集・バグ修正・小〜中規模実装に最適です（TASK_ROUTING基準）。',
        detectedProject,
        category: 'プログラム修正・バグ対応',
        alternativeAI: 'claude-code',
        canAutoExecute: false,
        notes: 'Cursor / CLIの `codex` に引き継ぎます。',
      };
    }

    // Webサイト新規制作、大規模リファクタ、複数ファイル横断分析
    if (
      text.includes('新規制作') ||
      text.includes('ホームページ') ||
      text.includes('大規模') ||
      text.includes('リファクタ') ||
      text.includes('設計') ||
      text.includes('構造')
    ) {
      return {
        recommendedAI: 'claude-code',
        reason: '大規模コードベースの理解と横断的な実装能力に長けています。',
        detectedProject,
        category: 'Web制作・大規模開発',
        alternativeAI: 'antigravity',
        canAutoExecute: false,
        notes: 'Claude Code利用枠（週次枠）に注意しながら実行してください。',
      };
    }

    // 長文資料、PDF、分析、セカンドオピニオン
    if (
      text.includes('分析') ||
      text.includes('要約') ||
      text.includes('pdf') ||
      text.includes('資料') ||
      text.includes('調査') ||
      text.includes('比較')
    ) {
      return {
        recommendedAI: 'gemini',
        reason: '長大なコンテキスト窓を持ち、利用枠も潤沢（週間枠1%消費）です。',
        detectedProject,
        category: '資料分析・調査',
        alternativeAI: 'chatgpt',
        canAutoExecute: false,
        notes: 'Gemini Proで長文ドキュメントを解析します。',
      };
    }

    // 自律エージェント開発、アプリフルスタック
    if (text.includes('アプリ') || text.includes('pwa') || text.includes('自動化')) {
      return {
        recommendedAI: 'antigravity',
        reason: '自律的なツール実行・テスト・検証を含む統合開発環境に適しています。',
        detectedProject,
        category: '自律アプリ開発',
        alternativeAI: 'codex',
        canAutoExecute: false,
        notes: 'Antigravity IDE上でサブエージェント協働開発。',
      };
    }

    // デフォルト（企画・壁打ち・相談・指示書作成）
    return {
      recommendedAI: 'chatgpt',
      reason: '企画、要件整理、初期ドラフト作成は通常枠の消費なく迅速に行えます。',
      detectedProject,
      category: '企画・相談・指示書作成',
      alternativeAI: 'gemini',
      canAutoExecute: false,
      notes: 'ChatGPTで構想を固め、確定後に実装担当AIへ引き継ぐことを推奨します。',
    };
  }
}
