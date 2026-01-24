
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: BASE_URL,
});

// Add interceptor to inject token
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    login: (tg_id: string, code: string) => api.post('/auth/login', { tg_id, code }),
    loginWebApp: (initData: string) => api.post('/auth/login/webapp', { initData }),
};

export const filesApi = {
    listFiles: (parent_id?: number | null, query?: string) => api.get('/files/', { params: { parent_id, q: query } }),
    createFolder: (name: string, parent_id?: number | null) => api.post('/files/create_folder', { name, parent_id }),
    createFolderStructure: (paths: string[], parent_id?: number | null) => api.post('/files/structure', { paths, parent_id }),
    initUpload: (name: string, size: number, total_chunks: number, parent_id?: number | null) => api.postForm('/files/init_upload', { name, size, total_chunks, parent_id }),
    uploadChunk: (file_id: number, chunkIndex: number, chunk: Blob) => {
        const formData = new FormData();
        formData.append('chunk_index', chunkIndex.toString());
        formData.append('file', chunk);
        return api.post(`/files/${file_id}/chunk`, formData);
    },
    deleteFile: (file_id: number) => api.delete(`/files/${file_id}`),
    renameFile: (file_id: number, name: string) => api.put(`/files/${file_id}/rename`, { name }),
    getDownloadLink: (file_id: number) => {
        const token = useAuthStore.getState().token;
        return `${BASE_URL}/files/${file_id}/download?token=${token}`;
    },
    // New endpoints
    getRecentFiles: () => api.get('/files/recent/list'),
    getHistory: () => api.get('/files/history/list'),
    getFolders: () => api.get('/files/folders/list'),
    shareFile: (file_id: number) => api.post(`/files/${file_id}/share`),
    getShareLink: (token: string) => `${window.location.origin}/s/${token}`,
    getSharedInfo: (token: string) => api.get(`/files/shared/${token}/info`),
    getSharedDownloadLink: (token: string) => `${BASE_URL}/files/shared/${token}`,
    moveFile: (file_id: number, new_parent_id: number | null) => api.put(`/files/${file_id}/move`, { new_parent_id }),
    getFileInfo: (file_id: number) => api.get(`/files/${file_id}/info`),
    getUploadStatus: (file_id: number) => api.get(`/files/${file_id}/upload-status`),
    getFolderDownloadLink: (folder_id: number) => {
        const token = useAuthStore.getState().token;
        return `${BASE_URL}/files/${folder_id}/download_folder?token=${token}`;
    },
};
