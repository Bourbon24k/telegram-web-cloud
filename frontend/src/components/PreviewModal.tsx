import { useState, useEffect } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { filesApi } from '../api/client';
import { useFileStore } from '../store/fileStore';
import axios from 'axios';

export const PreviewModal = () => {
    const { activeModal, modalFile, closeModal } = useFileStore();
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (activeModal === 'preview' && modalFile) {
            setContent(null);
            setError(false);
            setLoading(true);

            if (modalFile.mime_type?.startsWith('text/') || modalFile.name.endsWith('.txt') || modalFile.name.endsWith('.md') || modalFile.name.endsWith('.json')) {
                // Fetch text content
                const downloadLink = filesApi.getDownloadLink(modalFile.id);
                axios.get(downloadLink, { responseType: 'text' })
                    .then(res => setContent(res.data))
                    .catch(() => setError(true))
                    .finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        }
    }, [activeModal, modalFile]);

    if (activeModal !== 'preview' || !modalFile) return null;

    const downloadLink = filesApi.getDownloadLink(modalFile.id);

    const isImage = modalFile.mime_type?.startsWith('image/');
    const isVideo = modalFile.mime_type?.startsWith('video/');
    const isText = modalFile.mime_type?.startsWith('text/') || modalFile.name.endsWith('.txt') || modalFile.name.endsWith('.md') || modalFile.name.endsWith('.json') || modalFile.name.endsWith('.js') || modalFile.name.endsWith('.ts');

    const renderContent = () => {
        if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-brand" size={32} /></div>;
        if (error) return <div className="p-10 text-center text-red-500">Ошибка загрузки предпросмотра</div>;

        if (isImage) {
            return (
                <div className="flex justify-center bg-black/5 rounded-xl overflow-hidden">
                    <img src={downloadLink} alt={modalFile.name} className="max-h-[70vh] max-w-full object-contain" />
                </div>
            );
        }

        if (isVideo) {
            return (
                <div className="flex justify-center bg-black rounded-xl overflow-hidden aspect-video">
                    <video src={downloadLink} controls className="max-h-[70vh] max-w-full" />
                </div>
            );
        }

        if (isText && content !== null) {
            return (
                <div className="bg-gray-50 dark:bg-[#222] p-4 rounded-xl overflow-auto max-h-[60vh]">
                    <pre className="text-xs md:text-sm font-mono text-gray-800 dark:text-gray-300 whitespace-pre-wrap break-words">
                        {content.slice(0, 10000)}
                        {content.length > 10000 && <span className="text-gray-400 block mt-2">... (файл обрезан)</span>}
                    </pre>
                </div>
            );
        }

        return (
            <div className="p-10 text-center text-gray-500">
                <p>Предпросмотр недоступен для этого типа файла.</p>
                <a href={downloadLink} target="_blank" rel="noreferrer" className="text-brand hover:underline mt-2 inline-block">
                    Скачать файл
                </a>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4" onClick={closeModal}>
            <div
                className="bg-white dark:bg-dark-surface rounded-2xl shadow-modal w-full max-w-4xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-dark-border">
                    <h2 className="text-lg font-bold dark:text-white truncate pr-4">{modalFile.name}</h2>
                    <div className="flex gap-2">
                        <a
                            href={downloadLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-gray-400 hover:text-brand transition-colors"
                            title="Открыть в новом окне"
                        >
                            <ExternalLink size={20} />
                        </a>
                        <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-4 overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
