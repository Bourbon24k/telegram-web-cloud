
import React, { useState } from 'react';
import { X, Trash2, Move, Loader2, CheckSquare } from 'lucide-react';
import { useFileStore } from '../store/fileStore';
import { filesApi } from '../api/client';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils'; // Assuming cn exists

export const SelectionBar = ({ onRefresh }: { onRefresh: () => void }) => {
    const { selectedFileIds, clearSelection, openModal } = useFileStore();
    const [loading, setLoading] = useState(false);

    if (selectedFileIds.length === 0) return null;

    const handleDelete = async () => {
        if (confirm(`Удалить ${selectedFileIds.length} файлов?`)) {
            setLoading(true);
            try {
                // Batch delete sequentially or parallel
                await Promise.all(selectedFileIds.map(id => filesApi.deleteFile(id)));
                toast.success('Файлы удалены');
                clearSelection();
                onRefresh();
            } catch (e) {
                toast.error('Ошибка удаления');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleMove = () => {
        // We need to modify MoveModal to handle multiple files or create a new BatchMoveModal
        // For now, let's just show a toast that it's coming or handle it if easy.
        // Actually MoveModal uses activeModal='move' and modalFile.
        // We need to update store to support batch move.
        // Let's defer batch move or Hack it: open modal with null file, and Modify MoveModal to check selectedFileIds if modalFile is null.

        // Let's set the first file as "modalFile" just to trigger the modal, 
        // but MoveModal needs to know it's a batch op.
        // Better: Update store to have 'batch-move' modal type or similar.
        alert("Групповое перемещение скоро будет доступно");
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-dark-surface shadow-modal rounded-2xl flex items-center gap-2 p-2 px-4 border border-gray-100 dark:border-dark-border z-50 animate-in slide-in-from-bottom-5">
            <div className="flex items-center gap-3 border-r border-gray-200 dark:border-gray-700 pr-4 mr-2">
                <div className="bg-brand w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs">
                    {selectedFileIds.length}
                </div>
                <span className="font-medium text-sm dark:text-gray-200">Выбрано</span>
            </div>

            <button
                onClick={handleDelete}
                disabled={loading}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors text-red-500"
                title="Удалить выбранные"
            >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
            </button>

            {/*
            <button
                onClick={handleMove}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-700 dark:text-gray-200"
                title="Переместить"
            >
                <Move size={20} />
            </button>
            */}

            <button
                onClick={clearSelection}
                className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-400"
                title="Снять выделение"
            >
                <X size={20} />
            </button>
        </div>
    );
};
