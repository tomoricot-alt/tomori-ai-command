import { INITIAL_AI_USAGE, INITIAL_TASKS } from '../constants/initialData';
import { INITIAL_PROJECTS } from '../constants/projects';
import { AIUsageData, ProjectInfo, Task } from '../types';

const STORAGE_KEYS = {
  TASKS: 'tomori_ai_command_tasks_v1',
  PROJECTS: 'tomori_ai_command_projects_v1',
  USAGE: 'tomori_ai_command_usage_v1',
  AUTH: 'tomori_ai_command_auth_v1',
  SETTINGS: 'tomori_ai_command_settings_v1',
};

export interface AppSettings {
  autoHandoffCopy: boolean;
  alertStaleHours: number; // 更新なしアラート基準時間（デフォルト2時間）
  d1ApiEndpoint?: string;
  d1ApiToken?: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoHandoffCopy: true,
  alertStaleHours: 2,
};

export class StorageService {
  static getTasks(): Task[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load tasks from localStorage', e);
    }
    return INITIAL_TASKS;
  }

  static saveTasks(tasks: Task[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks to localStorage', e);
    }
  }

  static getProjects(): ProjectInfo[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load projects from localStorage', e);
    }
    return INITIAL_PROJECTS;
  }

  static saveProjects(projects: ProjectInfo[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to localStorage', e);
    }
  }

  static getAIUsage(): AIUsageData {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USAGE);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load usage data from localStorage', e);
    }
    return INITIAL_AI_USAGE;
  }

  static saveAIUsage(usage: AIUsageData): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify(usage));
    } catch (e) {
      console.error('Failed to save usage data to localStorage', e);
    }
  }

  static getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
    return DEFAULT_SETTINGS;
  }

  static saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  static exportBackup(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tasks: this.getTasks(),
      projects: this.getProjects(),
      usage: this.getAIUsage(),
      settings: this.getSettings(),
    };
    return JSON.stringify(backup, null, 2);
  }

  static importBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.tasks) this.saveTasks(data.tasks);
      if (data.projects) this.saveProjects(data.projects);
      if (data.usage) this.saveAIUsage(data.usage);
      if (data.settings) this.saveSettings(data.settings);
      return true;
    } catch (e) {
      console.error('Failed to import backup', e);
      return false;
    }
  }

  static isAuthenticated(): boolean {
    return sessionStorage.getItem(STORAGE_KEYS.AUTH) === 'authenticated';
  }

  static setAuthenticated(status: boolean): void {
    if (status) {
      sessionStorage.setItem(STORAGE_KEYS.AUTH, 'authenticated');
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.AUTH);
    }
  }
}
