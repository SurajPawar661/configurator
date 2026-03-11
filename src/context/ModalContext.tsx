import React, { createContext, useContext, useState, ReactNode } from 'react';

type ModalType = 'info' | 'error' | 'success' | 'warning' | 'progress' | 'update';

interface ModalOptions {
    title: string;
    message: ReactNode;
    type?: ModalType;
    confirmText?: string;
    onConfirm?: () => void;
    showCancel?: boolean;
    cancelText?: string;
    progress?: number; // 0 to 100
    updateInfo?: ReactNode;
    fullScreen?: boolean;
    onNext?: () => void;
    currentStep?: number;
    totalSteps?: number;
}

interface ModalContextType {
    showModal: (options: ModalOptions) => void;
    hideModal: () => void;
    updateProgress: (progress: number) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [modalOptions, setModalOptions] = useState<ModalOptions | null>(null);

    const showModal = (options: ModalOptions) => {
        setModalOptions({ ...options, type: options.type || 'info' });
    };

    const hideModal = () => {
        setModalOptions(null);
    };

    const updateProgress = (progress: number) => {
        setModalOptions(prev => prev ? { ...prev, progress } : null);
    };

    return (
        <ModalContext.Provider value={{ showModal, hideModal, updateProgress }}>
            {children}
            {modalOptions && <ModalView options={modalOptions} onHide={hideModal} />}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};

// Internal Modal View Component
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X, Sparkles } from 'lucide-react';

const ModalView: React.FC<{ options: ModalOptions; onHide: () => void }> = ({ options, onHide }) => {
    const {
        title, message, type = 'info', confirmText = 'OK', onConfirm,
        showCancel, cancelText = 'CANCEL', progress, fullScreen,
        onNext, currentStep, totalSteps
    } = options;

    const Icon = {
        info: Info,
        error: AlertCircle,
        success: CheckCircle2,
        warning: AlertTriangle,
        progress: Info,
        update: Sparkles,
    }[type];

    const IconColor = {
        info: 'var(--status-info)',
        error: 'var(--status-err)',
        success: 'var(--status-ok)',
        warning: 'var(--status-warn)',
        progress: 'var(--accent)',
        update: '#FF9933',
    }[type];

    if (fullScreen) {
        return (
            <div className="fullscreen-overlay">
                <div className="fullscreen-content-col">
                    <div className="fullscreen-header">
                        <div className="brand-badge">VECTOR_SYSTEMS_v0.2.0</div>
                        <div className="step-indicator">STEP_{currentStep}_OF_{totalSteps}</div>
                    </div>

                    <div className="fullscreen-body">
                        <h1 className="hero-title">{title}</h1>
                        <div className="hero-description">{message}</div>
                        {options.updateInfo}
                    </div>

                    <div className="fullscreen-footer">
                        {showCancel && (
                            <button className="btn-ui" onClick={onHide}>
                                {cancelText}
                            </button>
                        )}
                        <button
                            className="btn-ui primary large"
                            onClick={onNext || onConfirm || onHide}
                        >
                            {currentStep === totalSteps ? (confirmText || "COMMENCE_MISSION") : "PROCEED_TO_NEXT_STEP"}
                        </button>
                    </div>
                </div>
                <div className="fullscreen-visual-col">
                    <div className="visual-atmosphere">
                        <div className="tricolor-bloom-saffron" />
                        <div className="tricolor-bloom-white" />
                        <div className="tricolor-bloom-green" />
                    </div>
                    <div className="hero-v-logo">V</div>
                    <div className="origin-label">ENGINEERED_IN_INDIA</div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={(type !== 'progress' && type !== 'update') ? onHide : undefined}>
            <div className={`modal-content ${type}`} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <Icon size={20} color={IconColor} />
                    <div className="modal-title">{title}</div>
                    {(type !== 'progress' && type !== 'update') && (
                        <button className="btn-ui" style={{ marginLeft: 'auto', padding: '4px' }} onClick={onHide}>
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div className="modal-body">
                    {type === 'update' && (
                        <div className="proudly-indian-container">
                            <div className="proudly-indian-text">PROUDLY INDIAN</div>
                        </div>
                    )}
                    {message}
                    {(type === 'progress' || type === 'update') && progress !== undefined && (
                        <div className="progress-container">
                            <div className="progress-bar" style={{ width: `${progress}%` }} />
                            {type === 'update' && <span className="download-status-text">DOWNLOADING_SYSTEM_RESOURCES... {progress}%</span>}
                        </div>
                    )}
                    {type === 'update' && options.updateInfo && (
                        <div className="update-info-card">
                            {options.updateInfo}
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    {showCancel && (
                        <button className="btn-ui" onClick={onHide}>
                            {cancelText}
                        </button>
                    )}
                    {type !== 'progress' && type !== 'update' && (
                        <button
                            className={`btn-ui ${type === 'error' ? 'err' : 'primary'}`}
                            onClick={() => {
                                if (onConfirm) onConfirm();
                                onHide();
                            }}
                        >
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
