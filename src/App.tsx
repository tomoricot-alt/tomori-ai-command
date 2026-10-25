import React from 'react';
import { ArtifactsView } from './components/artifacts/ArtifactsView';
import { ChatCommandView } from './components/chat/ChatCommandView';
import { AuthModal } from './components/common/AuthModal';
import { BottomNav } from './components/common/BottomNav';
import { Header } from './components/common/Header';
import { RightSidebar } from './components/common/RightSidebar';
import { Sidebar } from './components/common/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { SettingsView } from './components/settings/SettingsView';
import { TaskCreateModal } from './components/tasks/TaskCreateModal';
import { TaskDetailModal } from './components/tasks/TaskDetailModal';
import { TaskListView } from './components/tasks/TaskListView';
import { AIUsageView } from './components/usage/AIUsageView';
import { AppProvider, useApp } from './context/AppContext';

const MainLayout: React.FC = () => {
  const { activeView } = useApp();

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header />

      {/* 3-Pane Workspace for PC, Responsive for Mobile */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Desktop only) */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Center Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6 max-w-6xl mx-auto w-full">
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'chat' && <ChatCommandView />}
          {activeView === 'tasks' && <TaskListView />}
          {activeView === 'usage' && <AIUsageView />}
          {activeView === 'artifacts' && <ArtifactsView />}
          {activeView === 'settings' && <SettingsView />}
        </main>

        {/* Right Sidebar (Desktop only) */}
        <div className="hidden lg:block">
          <RightSidebar />
        </div>
      </div>

      {/* Bottom Nav for Mobile / iPhone */}
      <BottomNav />

      {/* Modals */}
      <AuthModal />
      <TaskDetailModal />
      <TaskCreateModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;
