
import { useState, useEffect } from 'react';
import { X, File, Folder, Calendar, HardDrive, MapPin, Link } from 'lucide-react';
import { filesApi } from '../api/client';
import { useFileStore } from '../store/fileStore';
import toast from 'react-hot-toast';

interface FileInfo {
    id: number;
    name: string;
    size: number;
    mime_type: string;
    is_folder: boolean;
    created_at: string;
    accessed_at: string;
    path: string;
    share_token: string | null;
}

export const PropertiesModal = () => {
    const { activeModal, modalFile, closeModal } = useFileStore();
    const [info, setInfo] = useState<FileInfo | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeModal === 'properties' && modalFile) {
            setLoading(true);
            filesApi.getFileInfo(modalFile.id)
                .then(({ data }) => setInfo(data))
                .catch(() => toast.error('Ошибка загрузки информации'))
                .finally(() => setLoading(false));
        }
    }, [activeModal, modalFile]);

    if (activeModal !== 'properties' || !modalFile) return null;

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-modal w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold dark:text-white">Свойства</h2>
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : info ? (
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[#333] rounded-xl">
                            {info.is_folder ? (
                                <Folder size={40} className="text-brand" />
                            ) : (
                                <File size={40} className="text-blue-500" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-lg truncate dark:text-white">{info.name}</p>
                                <p className="text-sm text-gray-500">{info.is_folder ? 'Папка' : info.mime_type}</p>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-3">
                            {!info.is_folder && (
                                <div className="flex items-center gap-3 px-2">
                                    <HardDrive size={18} className="text-gray-400" />
                                    <span className="text-sm text-gray-500">Размер:</span>
                                    <span className="text-sm font-medium dark:text-white ml-auto">{formatSize(info.size)}</span>
                                </div>
                            )}

                            <div className="flex items-center gap-3 px-2">
                                <MapPin size={18} className="text-gray-400" />
                                <span className="text-sm text-gray-500">Расположение:</span>
                                <span className="text-sm font-medium dark:text-white ml-auto truncate max-w-[150px]">{info.path}</span>
                            </div>

                            <div className="flex items-center gap-3 px-2">
                                <Calendar size={18} className="text-gray-400" />
                                <span className="text-sm text-gray-500">Создан:</span>
                                <span className="text-sm font-medium dark:text-white ml-auto">{formatDate(info.created_at)}</span>
                            </div>

                            <div className="flex items-center gap-3 px-2">
                                <Calendar size={18} className="text-gray-400" />
                                <span className="text-sm text-gray-500">Открыт:</span>
                                <span className="text-sm font-medium dark:text-white ml-auto">{formatDate(info.accessed_at)}</span>
                            </div>

                            {info.share_token && (
                                <div className="flex items-center gap-3 px-2">
                                    <Link size={18} className="text-gray-400" />
                                    <span className="text-sm text-gray-500">Доступ:</span>
                                    <span className="text-sm font-medium text-green-500 ml-auto">По ссылке</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}

                <button
                    onClick={closeModal}
                    className="w-full mt-6 py-3 rounded-xl font-medium bg-gray-100 dark:bg-[#333] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#444] transition-colors"
                >
                    Закрыть
                </button>
            </div>
        </div>
    );
};
