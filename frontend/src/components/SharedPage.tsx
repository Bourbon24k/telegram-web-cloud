import { useEffect, useState } from 'react';
import { filesApi } from '../api/client';
import { File, Folder, Download, AlertCircle, Loader2, ImageIcon, Video } from 'lucide-react';
import { cn } from '../lib/utils';
import { useUIStore } from '../store/uiStore';
import { Toaster } from 'react-hot-toast';

interface SharedFileMeta {
    id: number;
    name: string;
    size: number;
    mime_type?: string;
    is_folder: boolean;
    created_at?: string;
    download_url: string;
}

export const SharedPage = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<SharedFileMeta | null>(null);
    const { isDarkMode } = useUIStore();

    useEffect(() => {
        // Extract token from URL: /s/{token}
        const path = window.location.pathname;
        const parts = path.split('/');
        const tokenIndex = parts.indexOf('s');
        if (tokenIndex !== -1 && parts[tokenIndex + 1]) {
            const token = parts[tokenIndex + 1];
            loadInfo(token);
        } else {
            setError('Неверная ссылка');
            setLoading(false);
        }
    }, []);

    const loadInfo = async (token: string) => {
        try {
            const { data } = await filesApi.getSharedInfo(token);
            setFile(data);
        } catch (e: any) {
            console.error(e);
            setError(e.response?.status === 404 ? 'Файл не найден или ссылка устарела' : 'Ошибка загрузки информации');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!file) return;
        // Extract token again or store it?
        // Actually we can reconstruct or simple use the logic from loadInfo
        const path = window.location.pathname;
        const parts = path.split('/');
        const token = parts[parts.indexOf('s') + 1];

        window.location.href = filesApi.getSharedDownloadLink(token);
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getIcon = (mime?: string, isFolder?: boolean) => {
        if (isFolder) return <Folder className="text-brand w-24 h-24 drop-shadow-lg" fill="#8b5cf6" stroke="#7c3aed" />;
        if (mime?.startsWith('image')) return <ImageIcon className="text-purple-500 w-20 h-20" />;
        if (mime?.startsWith('video')) return <Video className="text-red-500 w-20 h-20" />;
        return <File className="text-blue-400 w-20 h-20" />;
    };

    if (loading) {
        return (
            <div className={cn("min-h-screen flex items-center justify-center bg-[#f7f7f7] dark:bg-dark-bg", isDarkMode ? "dark" : "")}>
                <Loader2 className="animate-spin text-brand" size={40} />
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("min-h-screen flex items-center justify-center bg-[#f7f7f7] dark:bg-dark-bg p-4", isDarkMode ? "dark" : "")}>
                <div className="bg-white dark:bg-dark-surface p-8 rounded-3xl shadow-modal max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-red-500" size={32} />
                    </div>
                    <h2 className="text-xl font-bold dark:text-white mb-2">Ошибка доступа</h2>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <a href="/" className="inline-block bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                        На главную
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("min-h-screen flex flex-col items-center justify-center bg-[#f7f7f7] dark:bg-dark-bg p-4 transition-colors font-sans", isDarkMode ? "dark" : "")}>
            <Toaster />

            <div className="bg-white dark:bg-dark-surface p-8 md:p-12 rounded-[2rem] shadow-modal max-w-lg w-full text-center border border-gray-100 dark:border-dark-border relative overflow-hidden group">
                {/* Decorative background blur */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="transform group-hover:scale-105 transition-transform duration-300">
                        {getIcon(file?.mime_type, file?.is_folder)}
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 break-words">{file?.name}</h1>
                        <p className="text-gray-500 text-lg font-medium">
                            {file?.is_folder ? 'Папка' : formatSize(file?.size || 0)}
                        </p>
                    </div>

                    <div className="w-full pt-4 flex flex-col gap-3">
                        <button
                            onClick={handleDownload}
                            className="w-full bg-brand hover:bg-brand-hover text-black font-bold text-lg py-4 rounded-xl shadow-float hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            <Download size={24} />
                            Скачать
                        </button>

                        {!file?.is_folder && (
                            <p className="text-xs text-center text-gray-400 mt-2">
                                Файл проверен антивирусом
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-8 text-gray-400 text-sm font-medium">
                Yuku Cloud
            </div>
        </div>
    );
};
