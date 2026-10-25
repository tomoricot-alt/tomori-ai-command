import { AIUsageData, Task } from '../types';

export interface SyncStatus {
  online: boolean;
  synced: boolean;
  lastSyncedAt?: string;
  authError: boolean;
  d1Error?: boolean;
  message?: string;
}

const SESSION_TOKEN_KEY = 'tomori_cmd_session_token_v3';

export class ApiService {
  private static baseUrl = '';

  /**
   * セッショントークン取得（localStorage長期保存は完全廃止し、sessionStorageのみ使用）
   */
  static getToken(): string | null {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(SESSION_TOKEN_KEY);
    }
    return null;
  }

  static setToken(token: string): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    }
    // 旧キーやlocalStorageの残骸を完全にクリーンアップ
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('tomori_cmd_auth_token_v2');
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  }

  static clearToken(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('tomori_cmd_auth_token_v2');
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  }

  private static getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * サーバーサイド認証チェック
   */
  static async checkAuth(): Promise<{ authenticated: boolean; userEmail?: string; authMethod?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/auth/me`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json() as any;
        return {
          authenticated: true,
          userEmail: data.userEmail,
          authMethod: data.authMethod,
        };
      }
      return { authenticated: false };
    } catch {
      return { authenticated: false };
    }
  }

  /**
   * ログインAPI（共通シークレットを検証し、短命セッショントークンを受領）
   */
  static async login(secretKey: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey }),
      });

      const data = await res.json() as any;

      if (res.ok && data.token) {
        // 短期セッショントークンのみをsessionStorageに保持
        this.setToken(data.token);
        return { success: true };
      }

      return {
        success: false,
        message: data.message || '認証に失敗しました。',
      };
    } catch (e: any) {
      return {
        success: false,
        message: `通信エラー: ${e.message}`,
      };
    }
  }

  /**
   * タスク一覧取得（D1）
   */
  static async getTasks(): Promise<{ tasks: Task[]; fromServer: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tasks`, {
        headers: this.getHeaders(),
      });

      if (res.status === 401) {
        throw new Error('AUTH_REQUIRED');
      }

      if (res.status === 503) {
        const errData = await res.json() as any;
        throw new Error(errData.code || 'D1_NOT_CONNECTED');
      }

      if (res.ok) {
        const data = await res.json() as any;
        return { tasks: data.tasks || [], fromServer: true };
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (e: any) {
      if (e.message === 'AUTH_REQUIRED') {
        throw e;
      }
      return { tasks: [], fromServer: false, error: e.message };
    }
  }

  /**
   * タスク保存（D1へ永続化、競合時は409 Conflict検知）
   */
  static async saveTask(task: Task): Promise<{ success: boolean; conflict?: boolean; task?: Task; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tasks`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(task),
      });

      if (res.status === 409) {
        const conflictData = await res.json() as any;
        return {
          success: false,
          conflict: true,
          error: conflictData.message || '別の端末で既に更新されています。最新データを再読み込みしてください。',
        };
      }

      if (res.status === 503) {
        return { success: false, error: 'D1データベースが未接続です。' };
      }

      if (res.ok) {
        const data = await res.json() as any;
        return { success: true, task: data.task };
      }

      return { success: false, error: `HTTP ${res.status}` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * タスク削除（D1）
   */
  static async deleteTask(taskId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * AI利用状況取得
   */
  static async getUsage(): Promise<AIUsageData | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/usage`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return (await res.json()) as AIUsageData;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * PCローカルのAI利用状況をD1へプッシュ同期
   */
  static async pushUsage(data: AIUsageData): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/usage`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
