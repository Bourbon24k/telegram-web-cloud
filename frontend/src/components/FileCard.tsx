
import React from 'react';
import { Folder, File, ImageIcon, Video, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFileStore } from '../store/fileStore';
import { FileContextMenu } from './FileContextMenu';
import { motion } from 'framer-motion';
import { filesApi } from '../api/client';

const getIcon = (mime: string, isFolder: boolean) => {
    if (isFolder) return <Folder className="text-brand w-16 h-16 drop-shadow-sm" fill="#fc0" stroke="#eda000" />;
    if (mime?.startsWith('image')) return <ImageIcon className="text-purple-500 w-12 h-12" />;
    if (mime?.startsWith('video')) return <Video className="text-red-500 w-12 h-12" />;
    return <File className="text-blue-400 w-12 h-12" />;
};

export const FileCard = ({ file, onRefresh }: { file: any, onRefresh: () => void }) => {
    const { selectedFileIds, toggleSelection, setCurrentFolder, openModal } = useFileStore();
    const isSelected = selectedFileIds.includes(file.id);

    const handleAction = async (action: string) => {
        console.log(`Action ${action} on ${file.name}`);
        try {
            if (action === 'delete') {
                if (confirm(`Удалить ${file.name}?`)) {
                    await filesApi.deleteFile(file.id);
                    onRefresh();
                }
            }
            if (action === 'download') {
                window.open(filesApi.getDownloadLink(file.id), '_blank');
            }
            if (action === 'rename') {
                const newName = prompt("Новое имя:", file.name);
                if (newName && newName !== file.name) {
                    await filesApi.renameFile(file.id, newName);
                    onRefresh();
                }
            }
            if (action === 'view' && file.is_folder) {
                setCurrentFolder(file.id);
            }
            if (action === 'share') {
                openModal('share', file);
            }
            if (action === 'move') {
                openModal('move', file);
            }
            if (action === 'info') {
                openModal('properties', file);
            }
        } catch (e) {
            alert("Ошибка при выполнении действия");
            console.error(e);
        }
    };

    return (
        <FileContextMenu onAction={handleAction}>
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ translateY: -2 }}
                onClick={(e) => {
                    if (e.metaKey || e.ctrlKey) {
                        toggleSelection(file.id, true);
                    } else {
                        toggleSelection(file.id, false);
                    }
                }}
                onDoubleClick={() => {
                    if (file.is_folder) setCurrentFolder(file.id);
                }}
                className={cn(
                    "group relative bg-white dark:bg-dark-surface p-4 rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-3 select-none",
                    isSelected ? "ring-2 ring-brand shadow-md bg-yellow-50 dark:bg-white/5" : "shadow-sm hover:shadow-float border border-transparent hover:border-gray-100 dark:hover:border-white/5"
                )}
            >
                {/* Selection Checkbox */}
                <div className={cn(
                    "absolute top-3 left-3 w-5 h-5 rounded-md border-2 border-gray-200 dark:border-gray-600 transition-colors flex items-center justify-center",
                    isSelected ? "bg-brand border-brand opacity-100" : "opacity-0 group-hover:opacity-100 bg-white dark:bg-dark-surface"
                )}>
                    {isSelected && <div className="w-2.5 h-2.5 bg-black rounded-sm" />}
                </div>

                <div className="flex-1 flex items-center justify-center w-full h-24">
                    {getIcon(file.mime_type, file.is_folder)}
                </div>

                <div className="w-full text-center">
                    <p className="text-[14px] font-medium text-gray-800 dark:text-gray-200 truncate px-2">{file.name}</p>
                    <p className="text-[12px] text-gray-400 mt-1">{file.is_folder ? 'Папка' : formatSize(file.size)}</p>
                </div>
            </motion.div>
        </FileContextMenu>
    );
};

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
