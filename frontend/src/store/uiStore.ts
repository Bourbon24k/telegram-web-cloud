
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'grid' | 'list';
export type SortOption = 'date' | 'name' | 'size';

interface UIState {
    viewMode: ViewMode;
    sortOption: SortOption;
    isDarkMode: boolean;
    setViewMode: (mode: ViewMode) => void;
    setSortOption: (option: SortOption) => void;
    toggleDarkMode: () => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            viewMode: 'grid',
            sortOption: 'date',
            isDarkMode: false,
            setViewMode: (mode) => set({ viewMode: mode }),
            setSortOption: (option) => set({ sortOption: option }),
            toggleDarkMode: () => set((state) => {
                const newMode = !state.isDarkMode;
                if (newMode) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
                return { isDarkMode: newMode };
            }),
        }),
        {
            name: 'tg-cloud-ui',
            onRehydrateStorage: () => (state) => {
                if (state?.isDarkMode) document.documentElement.classList.add('dark');
            }
        }
    )
);
