
import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { UploadManager } from './UploadManager';
import { cn } from '../lib/utils';
import { useUIStore } from '../store/uiStore';

export const Layout = ({ children }: { children: React.ReactNode }) => {
    const isDarkMode = useUIStore(state => state.isDarkMode);

    return (
        <div className={cn("min-h-screen flex text-gray-900 dark:text-gray-100 font-sans", isDarkMode ? "dark" : "")}>
            <Sidebar onRefresh={() => { }} />
            <div className="flex-1 flex flex-col bg-[#f7f7f7] dark:bg-dark-bg transition-colors duration-200">
                <Header />
                <main className="flex-1 p-6 overflow-y-auto">
                    {children}
                </main>
            </div>
            <UploadManager />
        </div>
    );
};
