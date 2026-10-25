import React, { createContext, useContext, useEffect, useState } from 'react';
import { PromptGeneratorService } from '../services/promptGenerator';
import { AppSettings, StorageService } from '../services/storage';
import { ActiveView, AIServiceId, AIUsageData, ProjectInfo, Task, TaskStatus } from '../types';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  tasks: Task[];
  projects: ProjectInfo[];
  aiUsage: AIUsageData;
  settings: AppSettings;
  activeView: ActiveView;
  selectedProject: string; // 'all' or project name
  selectedTask: Task | null;
  isCreateModalOpen: boolean;
  isDetailModalOpen: boolean;
  isAuthenticated: boolean;
  toasts: Toast[];
  staleTasksCount: number;

  // Actions
  setActiveView: (view: ActiveView) => void;
  setSelectedProject: (project: string) => void;
  setSelectedTask: (task: Task | null) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsDetailModalOpen: (open: boolean) => void;
  login: (pin: string) => boolean;
  logout: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;

  createTask: (params: {
    title: string;
    description: string;
    project: string;
    assignedAI: AIServiceId;
    modelName?: string;
    sourceUrl?: string;
    instructionPrompt?: string;
  }) => Task;
  updateTask: (task: Task) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus, confirmed?: boolean) => void;
  deleteTask: (taskId: string) => void;
  copyPromptToClipboard: (text: string) => Promise<boolean>;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  refreshUsage: () => void;
  exportData: () => void;
  importData: (json: string) => boolean;
  isTaskStale: (task: Task) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(() => StorageService.getTasks());
  const [projects, setProjects] = useState<ProjectInfo[]>(() => StorageService.getProjects());
  const [aiUsage, setAiUsage] = useState<AIUsageData>(() => StorageService.getAIUsage());
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => StorageService.isAuthenticated());
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 変更時に保存
  useEffect(() => {
    StorageService.saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    StorageService.saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    StorageService.saveAIUsage(aiUsage);
  }, [aiUsage]);

  useEffect(() => {
    StorageService.saveSettings(settings);
  }, [settings]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const login = (pin: string): boolean => {
    // 開発用デフォルトPIN: 2026 または tomori
    if (pin === '2026' || pin === 'tomori' || pin === 'admin') {
      StorageService.setAuthenticated(true);
      setIsAuthenticated(true);
      showToast('認証に成功しました', 'success');
      return true;
    }
    showToast('認証コードが正しくありません', 'error');
    return false;
  };

  const logout = () => {
    StorageService.setAuthenticated(false);
    setIsAuthenticated(false);
    showToast('ログアウトしました', 'info');
  };

  const isTaskStale = (task: Task): boolean => {
    if (task.status === '完了' || task.status === '保留') return false;
    // updated_at または lastConfirmedAt を基準に判定
    // 簡易パース
    try {
      // 2時間以上の経過または「3時間前」等の記載
      if (task.lastConfirmedAt.includes('時間前')) return true;
      if (task.updatedAt) {
        // "2026-10-25 17:30 JST" 形式の簡易パース
        const match = task.updatedAt.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
        if (match) {
          const taskDate = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00+09:00`);
          const now = new Date();
          const diffHours = (now.getTime() - taskDate.getTime()) / (1000 * 60 * 60);
          return diffHours >= settings.alertStaleHours;
        }
      }
    } catch {
      return false;
    }
    return false;
  };

  const staleTasksCount = tasks.filter(isTaskStale).length;

  const createTask = (params: {
    title: string;
    description: string;
    project: string;
    assignedAI: AIServiceId;
    modelName?: string;
    sourceUrl?: string;
    instructionPrompt?: string;
  }): Task => {
    const newId = `TSK-${1000 + tasks.length + 1}`;
    const now = new Date();
    const jstString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} JST`;

    const instruction =
      params.instructionPrompt ||
      PromptGeneratorService.generateHandoffPrompt({
        project: params.project,
        title: params.title,
        description: params.description,
        assignedAI: params.assignedAI,
      });

    const newTask: Task = {
      id: newId,
      title: params.title,
      description: params.description,
      project: params.project,
      assignedAI: params.assignedAI,
      modelName: params.modelName || '標準モデル',
      status: '未着手',
      isStatusConfirmed: true,
      lastConfirmedAt: jstString,
      createdAt: jstString,
      updatedAt: jstString,
      sourceUrl: params.sourceUrl,
      instructionPrompt: instruction,
      resultSummary: '',
      nextActions: '担当AIへ指示書を引き継いで作業を開始してください。',
      artifacts: [],
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: jstString,
          actor: 'User',
          action: '新規タスク起票',
          detail: 'Web UIより登録',
        },
      ],
      createdBy: 'Web UI',
      updatedBy: 'ユーザー手動',
    };

    setTasks((prev) => [newTask, ...prev]);
    showToast(`タスク [${newId}] を作成しました`, 'success');
    return newTask;
  };

  const updateTask = (updated: Task) => {
    const now = new Date();
    const jstString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} JST`;

    const taskWithTimestamp = {
      ...updated,
      updatedAt: jstString,
      lastConfirmedAt: updated.isStatusConfirmed ? jstString : updated.lastConfirmedAt,
    };

    setTasks((prev) => prev.map((t) => (t.id === updated.id ? taskWithTimestamp : t)));
    if (selectedTask?.id === updated.id) {
      setSelectedTask(taskWithTimestamp);
    }
    showToast(`タスク [${updated.id}] を更新しました`, 'info');
  };

  const updateTaskStatus = (taskId: string, status: TaskStatus, confirmed = true) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const now = new Date();
    const jstString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} JST`;

    const updated: Task = {
      ...target,
      status,
      isStatusConfirmed: confirmed,
      lastConfirmedAt: jstString,
      updatedAt: jstString,
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: jstString,
          actor: 'User',
          action: `ステータス変更: ${status}`,
          detail: confirmed ? 'ステータス確認済み' : '状態未確認として設定',
        },
        ...target.history,
      ],
    };
    updateTask(updated);
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
      setIsDetailModalOpen(false);
    }
    showToast(`タスク [${taskId}] を削除しました`, 'warning');
  };

  const copyPromptToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('引き継ぎ指示書をクリップボードにコピーしました！', 'success');
      return true;
    } catch (e) {
      console.error('Failed to copy', e);
      showToast('コピーに失敗しました。手動で選択してコピーしてください', 'error');
      return false;
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    showToast('設定を保存しました', 'success');
  };

  const refreshUsage = () => {
    // 枠再読込（初期値または最新データ）
    const usage = StorageService.getAIUsage();
    setAiUsage(usage);
    showToast('AI利用状況を再読み込みしました', 'info');
  };

  const exportData = () => {
    const dataStr = StorageService.exportBackup();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tomori-ai-command-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('バックアップデータを書き出しました', 'success');
  };

  const importData = (json: string): boolean => {
    const ok = StorageService.importBackup(json);
    if (ok) {
      setTasks(StorageService.getTasks());
      setProjects(StorageService.getProjects());
      setAiUsage(StorageService.getAIUsage());
      setSettings(StorageService.getSettings());
      showToast('バックアップデータを正常に復元しました', 'success');
      return true;
    } else {
      showToast('バックアップの読み込みに失敗しました（JSON構文エラー）', 'error');
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        tasks,
        projects,
        aiUsage,
        settings,
        activeView,
        selectedProject,
        selectedTask,
        isCreateModalOpen,
        isDetailModalOpen,
        isAuthenticated,
        toasts,
        staleTasksCount,
        setActiveView,
        setSelectedProject,
        setSelectedTask,
        setIsCreateModalOpen,
        setIsDetailModalOpen,
        login,
        logout,
        showToast,
        createTask,
        updateTask,
        updateTaskStatus,
        deleteTask,
        copyPromptToClipboard,
        updateSettings,
        refreshUsage,
        exportData,
        importData,
        isTaskStale,
      }}
    >
      {children}
      {/* Toast container */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none md:bottom-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all transform duration-200 border ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/60'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 text-amber-200 border-amber-700/60'
                : toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-700/60'
                : 'bg-slate-900/90 text-slate-200 border-slate-700/60'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
