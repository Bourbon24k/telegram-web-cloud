
import React from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { Eye, Share2, Download, Edit2, Move, Trash2, Info } from 'lucide-react';

export const FileContextMenu = ({ children, onAction }: { children: React.ReactNode, onAction: (action: string) => void }) => {
    return (
        <ContextMenuPrimitive.Root>
            <ContextMenuPrimitive.Trigger>{children}</ContextMenuPrimitive.Trigger>
            <ContextMenuPrimitive.Portal>
                <ContextMenuPrimitive.Content className="min-w-[180px] bg-white dark:bg-dark-surface rounded-xl shadow-modal p-1.5 border border-gray-100 dark:border-dark-border z-50 animate-in fade-in zoom-in-95 duration-150">
                    <MenuItem icon={<Eye size={16} />} label="Просмотреть" onClick={() => onAction('view')} />
                    <MenuItem icon={<Share2 size={16} />} label="Поделиться" onClick={() => onAction('share')} />
                    <MenuItem icon={<Download size={16} />} label="Скачать" onClick={() => onAction('download')} />
                    <ContextMenuPrimitive.Separator className="h-px bg-gray-100 dark:bg-white/10 my-1" />
                    <MenuItem icon={<Edit2 size={16} />} label="Переименовать" onClick={() => onAction('rename')} />
                    <MenuItem icon={<Move size={16} />} label="Переместить" onClick={() => onAction('move')} />
                    <ContextMenuPrimitive.Separator className="h-px bg-gray-100 dark:bg-white/10 my-1" />
                    <MenuItem icon={<Trash2 size={16} />} label="В корзину" onClick={() => onAction('delete')} className="text-red-500 hover:text-red-600" />
                    <MenuItem icon={<Info size={16} />} label="Свойства" onClick={() => onAction('info')} />
                </ContextMenuPrimitive.Content>
            </ContextMenuPrimitive.Portal>
        </ContextMenuPrimitive.Root>
    );
};

const MenuItem = ({ icon, label, onClick, className }: any) => (
    <ContextMenuPrimitive.Item
        onClick={onClick}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${className}`}
    >
        {icon}
        <span>{label}</span>
    </ContextMenuPrimitive.Item>
);
