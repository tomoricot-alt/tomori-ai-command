import { ProjectInfo } from '../types';

export const INITIAL_PROJECTS: ProjectInfo[] = [
  {
    id: 'prj-ai-command',
    name: 'TOMORI AI COMMAND',
    business: 'TOMORI',
    description: '複数AI統合指揮・タスク管理Webアプリ（PWA対応）',
    repoUrl: 'https://github.com/tomoricot-alt/tomori-ai-command',
  },
  {
    id: 'prj-starters',
    name: 'スターターズコネクト',
    business: 'TOMORI',
    description: '起業家・フリーランス向けマッチングポータルWeb制作・移行',
    repoUrl: 'https://github.com/tomoricot-alt/starters-connect',
    previewUrl: 'https://starters-connect.pages.dev',
  },
  {
    id: 'prj-app-lab',
    name: 'TOMORI APP LAB (50 Apps)',
    business: 'TOMORI',
    description: '50個のWebツール＆アプリ連続開発プロジェクト',
    repoUrl: 'https://github.com/tomoricot-alt/tomori-app-lab',
  },
  {
    id: 'prj-hachimangu',
    name: '新名爪八幡宮',
    business: 'TOMORI',
    description: '神社公式サイトのリニューアル・レスポンシブWeb制作',
    previewUrl: 'https://niinazume.pages.dev',
  },
  {
    id: 'prj-pass-support',
    name: 'パスサポート',
    business: 'TOMORI',
    description: '福祉就労支援事業所LP・ブランディングサイト構築',
  },
  {
    id: 'prj-hojokin-portal',
    name: '補助金ポータル業務改善',
    business: '補助金ポータル',
    description: '顧客申請管理・議事録生成・メール下書き自動化',
  },
  {
    id: 'prj-internal-tomori',
    name: 'TOMORI社内業務・インフラ',
    business: 'TOMORI',
    description: 'Obsidian 2nd-brain連携、進行管理シート、GitHub自動同期',
  },
];
