import { useState, useEffect, useRef } from 'react';
import {
    Trash2,
    Download,
    HelpCircle,
    ChevronRight,
    Search
} from 'lucide-react';
import { useModal } from '../context/ModalContext';

interface CLITabProps {
    isConnected: boolean;
    onSendCommand: (cmd: string) => void;
    onClearTerminal: () => void;
    terminalOutput: string[];
}

export const CLITab = ({ isConnected, onSendCommand, onClearTerminal, terminalOutput }: CLITabProps) => {
    const [input, setInput] = useState('');
    const [filter, setFilter] = useState('');
    const outputRef = useRef<HTMLDivElement>(null);
    const { showModal } = useModal();

    const handleSend = () => {
        if (!input.trim()) return;
        if (!isConnected) {
            showModal({
                title: "COMMUNICATION_ERROR",
                message: "No active serial link detected. Please connect to a drone before entering CLI mode.",
                type: 'error'
            });
            return;
        }
        onSendCommand(input);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    const handleExport = () => {
        const blob = new Blob([terminalOutput.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vector_gcs_cli_log_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showModal({
            title: "EXPORT_SUCCESSFUL",
            message: "Terminal buffer has been exported to your downloads folder.",
            type: 'success'
        });
    };

    // Auto-scroll to bottom
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [terminalOutput]);

    const filteredOutput = terminalOutput.filter(line =>
        line.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#0a0a0a',
            fontFamily: 'var(--font-data)',
            padding: '24px',
            overflow: 'hidden'
        }}>
            {/* TERMINAL HEADER */}
            <div style={{
                borderBottom: '1px solid #333',
                paddingBottom: '16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isConnected ? 'var(--status-ok)' : 'var(--status-error)',
                        boxShadow: isConnected ? '0 0 10px var(--status-ok)' : 'none'
                    }} />
                    <span style={{ fontSize: '10px', color: '#888', fontWeight: 600, letterSpacing: '0.1em' }}>
                        CLI_TERMINAL_SUBSYSTEM :: {isConnected ? 'LINK_ACTIVE' : 'READY_DISCONNECTED'}
                    </span>
                    <div className="tooltip-container down">
                        <HelpCircle size={12} color="#444" />
                        <div className="tooltip-text" style={{ width: '250px' }}>
                            Advanced Direct-to-FC communication. Entering CLI mode usually disables other GUI listeners. Use 'help' for command list.
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', marginRight: '10px' }}>
                        <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                        <input
                            type="text"
                            placeholder="FILTER_FEED..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            style={{
                                background: '#111',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                padding: '4px 8px 4px 28px',
                                fontSize: '9px',
                                color: '#fff',
                                width: '120px'
                            }}
                        />
                    </div>
                    <button className="btn-ui" onClick={onClearTerminal} title="Clear Console">
                        <Trash2 size={12} />
                    </button>
                    <button className="btn-ui" onClick={handleExport} title="Export Logs">
                        <Download size={12} />
                    </button>
                </div>
            </div>

            {/* OUTPUT AREA */}
            <div
                ref={outputRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontSize: '11px',
                    color: '#ddd',
                    lineHeight: '1.6',
                    padding: '10px',
                    background: '#050505',
                    border: '1px solid #1a1a1a',
                    borderRadius: '4px'
                }}
            >
                {!isConnected && terminalOutput.length === 0 && (
                    <div style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#333',
                        fontSize: '9px',
                        letterSpacing: '0.2em'
                    }}>
                        AWAITING_CLI_ACCESS_PERMIT...
                    </div>
                )}
                {filteredOutput.map((line, i) => (
                    <div key={i} style={{
                        color: line.includes('Error') ? 'var(--status-error)' :
                            line.startsWith('>') ? 'var(--status-warn)' :
                                line.includes('Success') ? 'var(--status-ok)' : '#ddd',
                        borderBottom: line.startsWith('#') ? '1px solid #111' : 'none',
                        padding: '2px 0',
                        fontFamily: 'monospace'
                    }}>
                        {line}
                    </div>
                ))}
                {terminalOutput.length === 0 && isConnected && (
                    <span style={{ opacity: 0.3, fontSize: '10px' }}># NODE::VECTOR READY. Enter 'help' to see available commands</span>
                )}
            </div>

            {/* INPUT AREA */}
            <div style={{
                marginTop: '16px',
                display: 'flex',
                gap: '12px',
                background: '#111',
                padding: '12px',
                borderRadius: '4px',
                border: '1px solid #222'
            }}>
                <span style={{ color: 'var(--status-warn)', alignSelf: 'center' }}>
                    <ChevronRight size={14} />
                </span>
                <input
                    autoFocus
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isConnected ? "ENTER_MSP_OR_RAW_COMMAND..." : "SUBSYSTEM_OFFLINE..."}
                    disabled={!isConnected}
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        outline: 'none',
                        opacity: isConnected ? 1 : 0.5
                    }}
                />
                <button
                    className={`btn-ui ${isConnected ? 'primary' : ''}`}
                    onClick={handleSend}
                    disabled={!isConnected}
                    style={{ padding: '4px 12px', fontSize: '10px' }}
                >
                    SEND_CMD
                </button>
            </div>
        </div>
    );
};
