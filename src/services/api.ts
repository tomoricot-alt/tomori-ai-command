import { AIUsageData, Task } from '../types';

export interface SyncStatus {
  online: boolean;
  synced: boolean;
  lastSyncedAt?: string;
  authError: boolean;
  message?: string;
}

const TOKEN_KEY = 'tomori_cmd_auth_token_v2';

export class ApiService {
  private static baseUrl = '';

  static getToken(): string | null {
    if (typeof sessionStorage !== 'undefined') {
      const s = sessionStorage.getItem(TOKEN_KEY);
      if (s) return s;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  }

  static setToken(token: string, persist = false): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
    if (persist && typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  static clearToken(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TOKEN_KEY);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
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
  static async checkAuth(): Promise<{ authenticated: boolean; userEmail?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/auth/me`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json() as any;
        return { authenticated: true, userEmail: data.userEmail };
      }
      return { authenticated: false };
    } catch {
      // ネットワーク不達またはローカルスタンドアロン時
      return { authenticated: false };
    }
  }

  /**
   * ログインAPI
   */
  static async login(secretKey: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey }),
      });
      if (res.ok) {
        const data = await res.json() as any;
        if (data.token) {
          this.setToken(data.token, true);
          return true;
        }
      }
      return false;
    } catch (e) {
      console.warn('Login request failed', e);
      return false;
    }
  }

  /**
   * タスク一覧取得（認証必須・D1）
   */
  static async getTasks(): Promise<{ tasks: Task[]; fromServer: boolean }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tasks`, {
        headers: this.getHeaders(),
      });

      if (res.status === 401) {
        throw new Error('AUTH_REQUIRED');
      }

      if (res.ok) {
        const data = await res.json() as any;
        return { tasks: data.tasks || [], fromServer: true };
      }
      throw new Error(`Server returned ${res.status}`);
    } catch (e: any) {
      if (e.message === 'AUTH_REQUIRED') {
        throw e;
      }
      // オフライン・接続エラー時は呼び出し元でローカルキャッシュへフォールバック
      return { tasks: [], fromServer: false };
    }
  }

  /**
   * タスク保存（D1へ永続化）
   */
  static async saveTask(task: Task): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tasks`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(task),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * タスク削除（D1から削除）
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
