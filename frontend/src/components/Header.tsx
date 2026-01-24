
import { Search, Moon, Sun, LayoutGrid, List as ListIcon, User, ArrowLeft, Menu } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useFileStore } from '../store/fileStore';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../lib/utils';

export const Header = () => {
    const { isDarkMode, toggleDarkMode, setViewMode, viewMode, toggleSidebar } = useUIStore();
    const { logout, user } = useAuthStore();
    const { searchQuery, setSearchQuery, currentFolderId, setCurrentFolder, currentView } = useFileStore();

    return (
        <header className="h-[72px] px-6 flex items-center justify-between sticky top-0 bg-[#f7f7f7] dark:bg-dark-bg z-40">
            <div className="flex items-center gap-4 flex-1 max-w-2xl">
                {/* Mobile Menu Button */}
                <button
                    onClick={toggleSidebar}
                    className="md:hidden w-10 h-10 bg-white dark:bg-dark-surface rounded-xl shadow-soft flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-brand transition-colors"
                >
                    <Menu size={20} />
                </button>
                {/* Back button when inside folder */}
                {currentFolderId !== null && currentView === 'files' && (
                    <button
                        onClick={() => setCurrentFolder(null)}
                        className="w-10 h-10 bg-white dark:bg-dark-surface rounded-xl shadow-soft flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-brand transition-colors"
                        title="Назад в корневую папку"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}

                <div className="relative group flex-1">
                    <input
                        type="text"
                        placeholder="Поиск в Диске"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-dark-surface border-none rounded-2xl py-2.5 pl-11 pr-4 shadow-soft text-[14px] focus:ring-2 focus:ring-brand focus:outline-none transition-all dark:text-white dark:placeholder-gray-500"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
            </div>

            <div className="flex items-center gap-4 pl-8">
                {/* View Toggle */}
                <div className="flex bg-white dark:bg-dark-surface p-1 rounded-xl shadow-soft gap-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            viewMode === 'grid'
                                ? "bg-gray-100 dark:bg-white/10 text-black dark:text-white"
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        )}
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            viewMode === 'list'
                                ? "bg-gray-100 dark:bg-white/10 text-black dark:text-white"
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        )}
                    >
                        <ListIcon size={18} />
                    </button>
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleDarkMode}
                    className="w-10 h-10 bg-white dark:bg-dark-surface rounded-xl shadow-soft flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-brand transition-colors"
                >
                    {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                </button>

                {/* User Profile */}
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button className="w-10 h-10 rounded-full bg-brand text-black flex items-center justify-center font-bold text-sm shadow-soft cursor-pointer">
                            {user?.name?.[0] || <User size={20} />}
                        </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                        <DropdownMenu.Content className="w-48 bg-white dark:bg-dark-surface rounded-xl shadow-modal p-2 mr-4 border border-gray-100 dark:border-dark-border" align="end">
                            <DropdownMenu.Item onClick={logout} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg cursor-pointer text-sm text-red-500 font-medium outline-none">
                                Выйти
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </div>
        </header>
    );
};
