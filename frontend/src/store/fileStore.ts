
import { create } from 'zustand';

interface FileItem {
    id: number;
    name: string;
    is_folder: boolean;
    size: number;
    mime_type?: string;
    created_at: string;
    accessed_at?: string;
    parent_id?: number;
}

interface HistoryItem {
    id: number;
    action: string;
    file_name: string;
    details?: string;
    created_at: string;
}

type ViewType = 'files' | 'recent' | 'history';
type ModalType = 'share' | 'move' | 'properties' | null;

interface FileState {
    files: FileItem[];
    currentFolderId: number | null;
    searchQuery: string;
    currentView: ViewType;
    historyItems: HistoryItem[];
    selectedFileIds: number[];
    activeModal: ModalType;
    modalFile: FileItem | null;
    setFiles: (files: FileItem[]) => void;
    setCurrentFolder: (id: number | null) => void;
    setSearchQuery: (query: string) => void;
    setCurrentView: (view: ViewType) => void;
    setHistoryItems: (items: HistoryItem[]) => void;
    openModal: (modal: ModalType, file: FileItem | null) => void;
    closeModal: () => void;
    toggleSelection: (id: number, multi?: boolean) => void;
    clearSelection: () => void;
    selectAll: () => void;
}

export const useFileStore = create<FileState>((set) => ({
    files: [],
    currentFolderId: null,
    selectedFileIds: [],
    searchQuery: '',
    currentView: 'files',
    historyItems: [],
    activeModal: null,
    modalFile: null,
    setFiles: (files: FileItem[]) => set({ files }),
    setCurrentFolder: (id: number | null) => set({ currentFolderId: id, selectedFileIds: [], searchQuery: '', currentView: 'files' }),
    setSearchQuery: (query: string) => set({ searchQuery: query }),
    setCurrentView: (view: ViewType) => set({ currentView: view, searchQuery: '' }),
    setHistoryItems: (items: HistoryItem[]) => set({ historyItems: items }),
    openModal: (modal: ModalType, file: FileItem | null) => set({ activeModal: modal, modalFile: file }),
    closeModal: () => set({ activeModal: null, modalFile: null }),
    toggleSelection: (id: number, multi = false) => set((state) => {
        if (multi) {
            return {
                selectedFileIds: state.selectedFileIds.includes(id)
                    ? state.selectedFileIds.filter(fid => fid !== id)
                    : [...state.selectedFileIds, id]
            };
        }
        return { selectedFileIds: [id] };
    }),
    clearSelection: () => set({ selectedFileIds: [] }),
    selectAll: () => set((state) => ({ selectedFileIds: state.files.map(f => f.id) })),
}));

