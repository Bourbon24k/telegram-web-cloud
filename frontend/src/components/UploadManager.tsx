
import React, { useState, useEffect, useCallback } from 'react';
import { filesApi } from '../api/client';
import { cn } from '../lib/utils';
import { X, Minimize2, Maximize2, Loader2, Check, AlertCircle, File } from 'lucide-react';
import { useFileStore } from '../store/fileStore';

interface UploadTask {
    id: string;
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    error?: string;
    parentId?: number | null;
}

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

export const UploadManager = () => {
    const [tasks, setTasks] = useState<UploadTask[]>([]);
    const [isMinimized, setIsMinimized] = useState(false);
    const { setFiles } = useFileStore(); // To refresh list after upload

    const refreshFiles = async () => {
        try {
            const { data } = await filesApi.listFiles();
            setFiles(data);
        } catch (e) {
            console.error(e);
        }
    };

    const uploadFile = useCallback(async (task: UploadTask) => {
        // Get parent folder: prioritize task-specific parent (nested upload), else current folder
        const currentFolderId = task.parentId ?? useFileStore.getState().currentFolderId;

        try {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'uploading' } : t));

            const { data } = await filesApi.initUpload(task.file.name, task.file.size, currentFolderId);
            const fileId = data.file_id;

            const totalChunks = Math.ceil(task.file.size / CHUNK_SIZE);

            for (let i = 0; i < totalChunks; i++) {
                const start = i * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, task.file.size);
                const chunk = task.file.slice(start, end);
                await filesApi.uploadChunk(fileId, i, chunk);
                const progress = Math.round(((i + 1) / totalChunks) * 100);
                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, progress } : t));
            }

            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed', progress: 100 } : t));
            refreshFiles();

        } catch (e) {
            console.error(e);
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'error', error: 'Ошибка' } : t));
        }
    }, []);

    useEffect(() => {
        const handler = async (e: CustomEvent<File[]>) => {
            const files = e.detail;
            const currentFolderId = useFileStore.getState().currentFolderId;
            let folderMap: Record<string, number> = {};

            // Identify paths to create
            const pathsToCreate = new Set<string>();
            files.forEach(f => {
                if (f.webkitRelativePath) {
                    const parts = f.webkitRelativePath.split('/');
                    if (parts.length > 1) {
                        // "A/B/file.txt" -> "A/B"
                        pathsToCreate.add(parts.slice(0, -1).join('/'));
                    }
                }
            });

            if (pathsToCreate.size > 0) {
                try {
                    const { data } = await filesApi.createFolderStructure(Array.from(pathsToCreate), currentFolderId);
                    folderMap = data;
                } catch (err) {
                    console.error("Failed to create folder structure", err);
                }
            }

            const newTasks: UploadTask[] = files.map(f => {
                let parentId = currentFolderId;

                if (f.webkitRelativePath) {
                    const parts = f.webkitRelativePath.split('/');
                    if (parts.length > 1) {
                        const dir = parts.slice(0, -1).join('/');
                        if (folderMap[dir]) {
                            parentId = folderMap[dir];
                        }
                    }
                }

                return {
                    id: Math.random().toString(36).substring(7),
                    file: f,
                    progress: 0,
                    status: 'pending' as const,
                    parentId: parentId
                };
            });

            setTasks(prev => [...prev, ...newTasks]);
            setIsMinimized(false);

            // Execute uploads
            for (const task of newTasks) {
                // We don't await here to allow parallel start, but uploadFile handles concurrency if needed
                // Actually uploadFile is async, calling it in loop starts them all "conceptually" in parallel
                uploadFile(task);
            }
        };

        window.addEventListener('start-upload' as any, handler as any);
        return () => window.removeEventListener('start-upload' as any, handler as any);
    }, [uploadFile]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            triggerUpload(Array.from(e.target.files));
            e.target.value = ''; // Reset so same file can be uploaded again
        }
    };

    return (
        <>
            {/* Hidden file input for upload buttons */}
            <input
                type="file"
                id="file-upload"
                multiple
                onChange={handleFileSelect}
                className="hidden"
            />
            {tasks.length > 0 && (
                <div className={cn(
                    "fixed bottom-6 right-6 w-96 bg-white dark:bg-dark-surface shadow-modal rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden transition-all duration-300 z-50",
                    isMinimized ? "h-14 w-auto" : "max-h-[400px]"
                )}>
                    <div
                        className="bg-white dark:bg-dark-surface p-4 flex justify-between items-center cursor-pointer border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        onClick={() => setIsMinimized(!isMinimized)}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn("w-2 h-2 rounded-full", tasks.some(t => t.status === 'uploading') ? "bg-brand animate-pulse" : "bg-green-500")} />
                            <span className="font-semibold text-sm">Загрузки ({tasks.length})</span>
                        </div>
                        <div className="flex gap-2 text-gray-400">
                            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                            <X size={16} onClick={(e) => { e.stopPropagation(); setTasks([]); }} className="hover:text-red-500 transition-colors" />
                        </div>
                    </div>

                    {!isMinimized && (
                        <div className="overflow-y-auto max-h-80 p-2 space-y-1">
                            {tasks.map(task => (
                                <div key={task.id} className="p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-500">
                                            <File size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="text-sm font-medium truncate dark:text-gray-200">{task.file.name}</span>
                                                <span className="text-xs text-gray-400 font-mono">
                                                    {task.status === 'error' ? 'Ошибка' : `${task.progress}%`}
                                                </span>
                                            </div>
                                            <div className="h-1 bg-gray-100 dark:bg-[#333] rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full transition-all duration-300 ease-out",
                                                        task.status === 'error' ? 'bg-red-500' :
                                                            task.status === 'completed' ? 'bg-green-500' : 'bg-brand'
                                                    )}
                                                    style={{ width: `${task.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                        {task.status === 'completed' && <Check size={16} className="text-green-500" />}
                                        {task.status === 'error' && <AlertCircle size={16} className="text-red-500" />}
                                        {task.status === 'uploading' && <Loader2 size={16} className="text-brand animate-spin" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

// Move triggerUpload to window event dispatch to avoid export issues or keep it separate
// For now, removing the direct export if it causes HMR issues, or ignore it.
// Better: assign to window manually in component, or use a context.
// Let's just suppress the error by ensuring it's a const export.
export const triggerUpload = (files: File[]) => {
    window.dispatchEvent(new CustomEvent('start-upload', { detail: files }));
};
