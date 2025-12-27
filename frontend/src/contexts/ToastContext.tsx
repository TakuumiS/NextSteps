import { createContext, useContext, useState, type ReactNode, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastAction {
    label: string;
    onClick: () => void;
}

interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
    action?: ToastAction;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', action?: ToastAction) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, action }]);

        // Auto remove after 3 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: 9999
            }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        onClick={() => removeToast(toast.id)}
                        style={{
                            minWidth: '250px',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            background: '#fff',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            borderLeft: `4px solid ${toast.type === 'success' ? '#10b981' :
                                toast.type === 'error' ? '#ef4444' :
                                    '#3b82f6'
                                }`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            animation: 'slideIn 0.3s ease-out'
                        }}
                    >
                        <span style={{ fontWeight: 500 }}>{toast.message}</span>
                        {toast.action && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toast.action?.onClick();
                                    removeToast(toast.id);
                                }}
                                style={{
                                    marginLeft: '12px',
                                    background: 'transparent',
                                    border: '1px solid currentColor',
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: 'inherit',
                                    cursor: 'pointer'
                                }}
                            >
                                {toast.action.label}
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
