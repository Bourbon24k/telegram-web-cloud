
import React from 'react';
import { Upload, Download, Trash2, Edit2, Move, Share2, Clock } from 'lucide-react';
import { useFileStore } from '../store/fileStore';

const actionIcons: Record<string, any> = {
    upload: Upload,
    download: Download,
    delete: Trash2,
    rename: Edit2,
    move: Move,
    share: Share2,
};

const actionLabels: Record<string, string> = {
    upload: 'Загружен',
    download: 'Скачан',
    delete: 'Удалён',
    rename: 'Переименован',
    move: 'Перемещён',
    share: 'Поделились',
};

export const HistoryView = () => {
    const { historyItems } = useFileStore();

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Только что';
        if (minutes < 60) return `${minutes} мин. назад`;
        if (hours < 24) return `${hours} ч. назад`;
        if (days < 7) return `${days} дн. назад`;

        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    if (historyItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center">
                <div className="w-32 h-32 bg-gray-100 dark:bg-[#333] rounded-full flex items-center justify-center mb-6">
                    <Clock size={48} className="text-gray-300 dark:text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">История пуста</h3>
                <p className="text-gray-500 max-w-xs">
                    Здесь будут отображаться ваши последние действия с файлами
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {historyItems.map((item) => {
                const Icon = actionIcons[item.action] || Clock;
                return (
                    <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 bg-white dark:bg-dark-surface rounded-xl shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#333] flex items-center justify-center">
                            <Icon size={20} className="text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                {item.file_name}
                            </p>
                            <p className="text-sm text-gray-500">
                                {actionLabels[item.action] || item.action}
                                {item.details && <span className="ml-1 text-gray-400">• {item.details}</span>}
                            </p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                            {formatDate(item.created_at)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
