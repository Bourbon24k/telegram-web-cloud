
import React, { useRef } from 'react';
import { Plus, Cloud, Folder, File, Clock, Upload } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { filesApi } from '../api/client';
import { useFileStore } from '../store/fileStore';
import { triggerUpload } from './UploadManager';

export const Sidebar = ({ onRefresh }: { onRefresh: () => void }) => {
    const { currentFolderId, currentView, setCurrentView, setCurrentFolder, setFiles, setHistoryItems } = useFileStore();
    const folderInputRef = useRef<HTMLInputElement>(null);

    const handleCreateFolder = async () => {
        const name = prompt("Название папки:");
        if (name) {
            try {
                await filesApi.createFolder(name, currentFolderId);
                onRefresh();
            } catch (e) {
                alert("Ошибка создания папки");
            }
        }
    };

    const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            triggerUpload(Array.from(e.target.files));
            e.target.value = '';
        }
    };

    const handleNavClick = async (view: 'files' | 'recent' | 'history') => {
        setCurrentView(view);

        if (view === 'files') {
            setCurrentFolder(null);
            onRefresh();
        } else if (view === 'recent') {
            try {
                const { data } = await filesApi.getRecentFiles();
                setFiles(data);
            } catch (e) {
                console.error(e);
            }
        } else if (view === 'history') {
            try {
                const { data } = await filesApi.getHistory();
                setHistoryItems(data);
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <aside className="w-64 bg-[#f0f0f0] dark:bg-dark-bg p-4 flex flex-col gap-6 select-none h-screen sticky top-0">
            {/* Hidden folder input */}
            <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore - webkitdirectory is a non-standard attribute
                webkitdirectory=""
                multiple
                onChange={handleFolderUpload}
                className="hidden"
            />

            {/* Brand */}
            <div className="flex items-center gap-2.5 px-2">
                <div className="bg-brand text-black p-1.5 rounded-xl">
                    <Cloud size={24} strokeWidth={2.5} />
                </div>
                <span className="text-xl font-bold tracking-tight dark:text-gray-100">
                    TG <span className="font-normal text-gray-600 dark:text-gray-400">Disk</span>
                </span>
            </div>

            {/* Create Button */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-brand hover:bg-brand-hover text-black px-4 py-3.5 rounded-2xl font-semibold shadow-float flex items-center justify-center gap-2 transition-all outline-none"
                    >
                        <Plus size={20} strokeWidth={3} />
                        <span className="text-[15px]">Создать</span>
                    </motion.button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        className="min-w-[220px] bg-white dark:bg-dark-surface rounded-2xl p-2 shadow-modal border border-gray-100 dark:border-dark-border animate-in fade-in zoom-in-95 duration-200 z-50"
                        sideOffset={8}
                        align="start"
                    >
                        <DropdownItem icon={<Folder size={18} />} label="Папку" onClick={handleCreateFolder} />
                        <DropdownMenu.Separator className="h-px bg-gray-100 dark:bg-dark-border my-1.5" />
                        <DropdownItem icon={<Upload size={18} />} label="Загрузить файл" onClick={() => document.getElementById('file-upload')?.click()} />
                        <DropdownItem icon={<Folder size={18} />} label="Загрузить папку" onClick={() => folderInputRef.current?.click()} />
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Navigation */}
            <nav className="flex flex-col gap-1">
                <NavItem
                    icon={<File size={20} />}
                    label="Файлы"
                    active={currentView === 'files'}
                    onClick={() => handleNavClick('files')}
                />
                <NavItem
                    icon={<Clock size={20} />}
                    label="Последние"
                    active={currentView === 'recent'}
                    onClick={() => handleNavClick('recent')}
                />
                <NavItem
                    icon={<Clock size={20} />}
                    label="История"
                    active={currentView === 'history'}
                    onClick={() => handleNavClick('history')}
                />
            </nav>

            <div className="mt-auto px-2">
                {/* Memory usage removed */}
            </div>
        </aside>
    );
};

const NavItem = ({ icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
    <button
        onClick={onClick}
        className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-xl text-[15px] font-medium transition-colors w-full text-left",
            active
                ? "bg-white dark:bg-dark-surface shadow-soft text-black dark:text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5"
        )}
    >
        {React.cloneElement(icon, { size: 20, className: active ? "text-brand-hover" : "" })}
        {label}
    </button>
);

const DropdownItem = ({ icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) => (
    <DropdownMenu.Item
        onClick={onClick}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 outline-none cursor-pointer transition-colors"
    >
        <div className="text-gray-400">{icon}</div>
        {label}
    </DropdownMenu.Item>
);

