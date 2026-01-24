
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    isAuthenticated: boolean;
    token: string | null;
    user: { id: string; name: string } | null;
    login: (token: string, user: any) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            token: null,
            user: null,
            login: (token, user) => set({ isAuthenticated: true, token, user }),
            logout: () => set({ isAuthenticated: false, token: null, user: null }),
        }),
        {
            name: 'tg-cloud-auth',
        }
    )
);
