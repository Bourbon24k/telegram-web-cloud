
import { useState, useEffect } from 'react';
import { X, Copy, Check, Link, ExternalLink } from 'lucide-react';
import { filesApi } from '../api/client';
import { useFileStore } from '../store/fileStore';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export const ShareModal = () => {
    const { activeModal, modalFile, closeModal } = useFileStore();
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeModal === 'share' && modalFile) {
            setLoading(true);
            filesApi.shareFile(modalFile.id)
                .then(({ data }) => {
                    setShareUrl(filesApi.getShareLink(data.share_token));
                })
                .catch(() => toast.error('Ошибка создания ссылки'))
                .finally(() => setLoading(false));
        }
    }, [activeModal, modalFile]);

    if (activeModal !== 'share' || !modalFile) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success('Ссылка скопирована!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-modal w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold dark:text-white">Поделиться файлом</h2>
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">Файл: <span className="font-medium text-gray-800 dark:text-gray-200">{modalFile.name}</span></p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <div className="flex-1 bg-gray-100 dark:bg-[#333] rounded-xl p-3 flex items-center gap-2 overflow-hidden">
                                <Link size={16} className="text-gray-400 flex-shrink-0" />
                                <span className="text-sm truncate text-gray-600 dark:text-gray-300">{shareUrl}</span>
                            </div>
                            <button
                                onClick={handleCopy}
                                className={cn(
                                    "px-4 rounded-xl font-medium transition-all flex items-center gap-2",
                                    copied ? "bg-green-500 text-white" : "bg-brand hover:bg-brand-hover text-black"
                                )}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>

                        <a
                            href={shareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-brand hover:underline"
                        >
                            <ExternalLink size={14} />
                            Открыть в новой вкладке
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};
