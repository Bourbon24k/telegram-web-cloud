
import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { UploadManager, triggerUpload } from './components/UploadManager';
import { FileCard } from './components/FileCard';
import { ShareModal } from './components/ShareModal';
import { MoveModal } from './components/MoveModal';
import { PropertiesModal } from './components/PropertiesModal';
import { HistoryView } from './components/HistoryView';
import { SelectionBar } from './components/SelectionBar';
import { PreviewModal } from './components/PreviewModal';
import { useFileStore } from './store/fileStore';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import { filesApi, authApi } from './api/client';
import { Cloud, Loader2 } from 'lucide-react';
import { cn } from './lib/utils';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { SharedPage } from './components/SharedPage';

function App() {
  if (window.location.pathname.startsWith('/s/')) {
    return <SharedPage />;
  }

  const { isAuthenticated, login } = useAuthStore();
  const { files, setFiles, currentFolderId, searchQuery, currentView } = useFileStore();
  const { isDarkMode, isSidebarOpen, closeSidebar, viewMode } = useUIStore();

  const [tgId, setTgId] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // We use the files directly from store, as backend now handles filtering
  const filteredFiles = files;

  useEffect(() => {
    if (isAuthenticated && currentView === 'files') {
      const timeoutId = setTimeout(() => {
        loadFiles();
      }, 300); // Debounce search
      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, currentFolderId, currentView, searchQuery]);

  useEffect(() => {
    // @ts-ignore
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initData && !isAuthenticated) {
        authApi.loginWebApp(tg.initData)
          .then(({ data }) => {
            login(data.token, { id: 'webapp', name: 'TG User' });
            // Refresh me
            filesApi.listFiles(); // Just to start
            toast.success("Автоматический вход через Telegram");
          })
          .catch(e => {
            console.error("WebApp login failed", e);
            // toast.error("Не удалось войти через Telegram App");
          });
      }
    }
  }, []);

  const loadFiles = async () => {
    try {
      const { data } = await filesApi.listFiles(currentFolderId, searchQuery);
      setFiles(data);
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        // handle logout?
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      console.log("Attempting login with", { tgId, code });
      const { data } = await authApi.login(tgId, code);
      console.log("Login success, token:", data.token);

      login(data.token, { id: tgId, name: `User ${tgId}` });
      toast.success("Успешный вход!");
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.response) {
        console.error("Server response:", err.response.data);
        if (err.response.status === 400 || err.response.status === 401) {
          toast.error(err.response.data.detail || "Неверный код или ID");
        } else {
          toast.error(`Ошибка сервера: ${err.response.status}`);
        }
      } else {
        toast.error("Ошибка сети. Проверьте backend.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center p-4 transition-colors", isDarkMode ? "bg-dark-bg" : "bg-[#f5f5f5]")}>
        <div className="bg-white dark:bg-dark-surface p-10 rounded-3xl shadow-modal w-full max-w-md border border-gray-100 dark:border-dark-border">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="p-4 bg-brand rounded-2xl shadow-float">
              <Cloud size={40} strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Вход в Yuku Cloud</h1>
              <p className="text-gray-500 mt-2 text-sm">Безопасное облако в Telegram</p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm mb-6 flex gap-3">
            <div className="min-w-[4px] bg-blue-500 rounded-full" />
            <div>
              <p>1. Напишите <span className="font-mono bg-blue-100 dark:bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-900 dark:text-blue-200 font-semibold">/start</span> боту</p>
              <p className="mt-1">2. Введите полученный код ниже</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Telegram ID</label>
              <input
                type="text"
                value={tgId}
                onChange={e => setTgId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#333] border border-gray-200 dark:border-[#444] rounded-xl p-3.5 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all dark:text-white"
                placeholder="Например: 123456789"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Код подтверждения</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#333] border border-gray-200 dark:border-[#444] rounded-xl p-3.5 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all dark:text-white"
                placeholder="00000"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand hover:bg-brand-hover text-black font-bold py-4 rounded-xl shadow-float hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4 flex justify-center"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Войти"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (currentView === 'history') {
      return <HistoryView />;
    }

    if (filteredFiles.length === 0) {
      return <EmptyState />;
    }

    return (
      <div className={cn(
        "gap-3 md:gap-4 pb-20",
        viewMode === 'list' ? "flex flex-col" : "grid grid-cols-auto-fit-150"
      )}>
        {filteredFiles.map((f: any) => (
          <FileCard key={f.id} file={f} onRefresh={loadFiles} viewMode={viewMode} />
        ))}
      </div>
    );
  };

  return (
    <div className={cn("min-h-screen flex text-gray-900 dark:text-gray-100 font-sans", isDarkMode ? "dark" : "")}>
      <Toaster position="bottom-right" toastOptions={{ style: { background: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000' } }} />
      <Sidebar onRefresh={loadFiles} />
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in"
          onClick={closeSidebar}
        />
      )}
      <div className="flex-1 flex flex-col bg-[#f7f7f7] dark:bg-dark-bg transition-colors duration-200">
        <Header />
        <main
          className="flex-1 p-6 overflow-y-auto"
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={e => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files) triggerUpload(Array.from(e.dataTransfer.files));
          }}
        >
          {renderContent()}
        </main>
      </div>
      <SelectionBar onRefresh={loadFiles} />
      <UploadManager />

      {/* Modals */}
      <ShareModal />
      <MoveModal onRefresh={loadFiles} />
      <PropertiesModal />
      <PreviewModal />
    </div>
  );
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-[70vh] text-center">
    <div className="w-48 h-48 bg-gray-100 dark:bg-[#333] rounded-full flex items-center justify-center mb-6 animate-in fade-in zoom-in duration-500">
      <Cloud size={80} className="text-gray-300 dark:text-gray-500" />
    </div>
    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Папка пуста</h3>
    <p className="text-gray-500 max-w-xs">Загрузите файлы, перетащив их сюда, или нажмите кнопку "Создать"</p>
    <button
      onClick={() => document.getElementById('file-upload')?.click()}
      className="mt-6 text-brand font-medium hover:underline"
    >
      Загрузить файлы
    </button>
  </div>
);

export default App;

