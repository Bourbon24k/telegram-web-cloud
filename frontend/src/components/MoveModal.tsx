
import { useState, useEffect } from 'react';
import { X, Folder, Home, Loader2 } from 'lucide-react';
import { filesApi } from '../api/client';
import { useFileStore } from '../store/fileStore';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface FolderItem {
    id: number;
    name: string;
    parent_id: number | null;
}

export const MoveModal = ({ onRefresh }: { onRefresh: () => void }) => {
    const { activeModal, modalFile, closeModal } = useFileStore();
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [moving, setMoving] = useState(false);

    useEffect(() => {
        if (activeModal === 'move' && modalFile) {
            setLoading(true);
            filesApi.getFolders()
                .then(({ data }) => {
                    // Filter out the file itself if it's a folder
                    setFolders(data.filter((f: FolderItem) => f.id !== modalFile.id));
                })
                .catch(() => toast.error('Ошибка загрузки папок'))
                .finally(() => setLoading(false));
        }
    }, [activeModal, modalFile]);

    if (activeModal !== 'move' || !modalFile) return null;

    const handleMove = async () => {
        setMoving(true);
        try {
            await filesApi.moveFile(modalFile.id, selectedId);
            toast.success('Файл перемещён!');
            onRefresh();
            closeModal();
        } catch {
            toast.error('Ошибка перемещения');
        } finally {
            setMoving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-modal w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold dark:text-white">Переместить "{modalFile.name}"</h2>
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
                        {/* Root folder option */}
                        <button
                            onClick={() => setSelectedId(null)}
                            className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left",
                                selectedId === null
                                    ? "bg-brand/10 border-2 border-brand"
                                    : "bg-gray-50 dark:bg-[#333] hover:bg-gray-100 dark:hover:bg-[#444] border-2 border-transparent"
                            )}
                        >
                            <Home size={20} className="text-gray-500" />
                            <span className="font-medium dark:text-white">Корневая папка</span>
                        </button>

                        {folders.map(folder => (
                            <button
                                key={folder.id}
                                onClick={() => setSelectedId(folder.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left",
                                    selectedId === folder.id
                                        ? "bg-brand/10 border-2 border-brand"
                                        : "bg-gray-50 dark:bg-[#333] hover:bg-gray-100 dark:hover:bg-[#444] border-2 border-transparent"
                                )}
                            >
                                <Folder size={20} className="text-brand" />
                                <span className="font-medium dark:text-white">{folder.name}</span>
                            </button>
                        ))}

                        {folders.length === 0 && (
                            <p className="text-center text-gray-400 py-4">Нет папок для перемещения</p>
                        )}
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={closeModal}
                        className="flex-1 py-3 rounded-xl font-medium bg-gray-100 dark:bg-[#333] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#444] transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleMove}
                        disabled={moving}
                        className="flex-1 py-3 rounded-xl font-medium bg-brand hover:bg-brand-hover text-black transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {moving ? <Loader2 size={16} className="animate-spin" /> : null}
                        Переместить
                    </button>
                </div>
            </div>
        </div>
    );
};
