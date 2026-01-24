
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
        <header className="h-[64px] md:h-[72px] px-3 md:px-6 flex items-center justify-between sticky top-0 bg-[#f7f7f7] dark:bg-dark-bg z-40 gap-2">
            <div className="flex items-center gap-2 md:gap-4 flex-1 max-w-2xl">
                {/* Mobile Menu Button */}
                <button
                    onClick={toggleSidebar}
                    className="md:hidden w-9 h-9 bg-white dark:bg-dark-surface rounded-xl shadow-soft flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-brand transition-colors flex-shrink-0"
                >
                    <Menu size={18} />
                </button>
                {/* Back button when inside folder */}
                {currentFolderId !== null && currentView === 'files' && (
                    <button
                        onClick={() => setCurrentFolder(null)}
                        className="w-9 h-9 md:w-10 md:h-10 bg-white dark:bg-dark-surface rounded-xl shadow-soft flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-brand transition-colors flex-shrink-0"
                        title="Назад в корневую папку"
                    >
                        <ArrowLeft size={18} />
                    </button>
                )}

                <div className="relative group flex-1 min-w-0">
                    <input
                        type="text"
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-dark-surface border-none rounded-xl md:rounded-2xl py-2 md:py-2.5 pl-9 md:pl-11 pr-3 md:pr-4 shadow-soft text-[13px] md:text-[14px] focus:ring-2 focus:ring-brand focus:outline-none transition-all dark:text-white dark:placeholder-gray-500"
                    />
                    <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 md:pl-8 flex-shrink-0">
                {/* View Toggle - Hidden on mobile */}
                <div className="hidden sm:flex bg-white dark:bg-dark-surface p-1 rounded-xl shadow-soft gap-1">
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
                    className="w-9 h-9 md:w-10 md:h-10 bg-white dark:bg-dark-surface rounded-xl shadow-soft flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-brand transition-colors"
                >
                    {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                </button>

                {/* User Profile */}
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-brand text-black flex items-center justify-center font-bold text-sm shadow-soft cursor-pointer">
                            {user?.name?.[0] || <User size={18} />}
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
