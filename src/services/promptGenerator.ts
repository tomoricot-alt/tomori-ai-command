import { AI_SERVICES } from '../constants/aiConfig';
import { AIServiceId } from '../types';

export interface PromptGenParams {
  project: string;
  title: string;
  description: string;
  assignedAI: AIServiceId;
  background?: string;
  decisions?: string;
  progress?: string;
  environment?: string;
  mustNotChange?: string;
  doneCriteria?: string;
  reportItems?: string;
}

export class PromptGeneratorService {
  /**
   * 9つの必須項目を含む正式な引き継ぎ指示書を生成する
   */
  static generateHandoffPrompt(params: PromptGenParams): string {
    const aiConfig = AI_SERVICES[params.assignedAI];
    const env =
      params.environment ||
      `${aiConfig.executionEnv} (${aiConfig.launchCommand ? `起動コマンド: ${aiConfig.launchCommand}` : aiConfig.webUrl})`;

    const background =
      params.background ||
      `${params.project} における ${params.title} の対応。要件の達成および運用の安定化を図る。`;

    const decisions =
      params.decisions ||
      `既存の設計方針・ガイドラインを遵守。追加課金や無断の正本変更は行わない方針。`;

    const progress =
      params.progress ||
      `タスク起票完了。作業内容の引き継ぎ段階。`;

    const tasks =
      params.description ||
      `${params.title} の実装・検証。`;

    const mustNotChange =
      params.mustNotChange ||
      `既存の main ブランチ直接更新、認証情報（APIキー等）のコミット、既存の承認済み仕様・正本。`;

    const doneCriteria =
      params.doneCriteria ||
      `要求機能が正常に動作し、型チェックおよび検証（テスト/ビルド）がエラーなく完了すること。`;

    const reportItems =
      params.reportItems ||
      `1. 変更・作成したファイル一覧\n2. 実施した検証内容と結果\n3. 未完了事項・残作業\n4. 次の担当者への引き継ぎ事項`;

    return `# 【引き継ぎ指示書】${params.title}

1. プロジェクト名
   ${params.project}

2. 背景と目的
   ${background}

3. 現在までの決定事項
   ${decisions}

4. 作業の進捗
   ${progress}

5. 依頼する作業
   ${tasks}

6. 使用すべき環境
   ${env}

7. 変更してはいけないもの
   ${mustNotChange}

8. 完了条件
   ${doneCriteria}

9. 完了後に報告すべき項目
   ${reportItems}
`;
  }
}
