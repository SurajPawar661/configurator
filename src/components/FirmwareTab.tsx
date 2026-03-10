import React, { useState, useRef } from 'react';
import {
    Cpu,
    Upload,
    Activity,
    CheckCircle2,
    AlertTriangle,
    FileCode,
    ShieldAlert,
    HelpCircle
} from 'lucide-react';
import { useModal } from '../context/ModalContext';

interface FirmwareTabProps {
    isConnected: boolean;
}

export const FirmwareTab: React.FC<FirmwareTabProps> = ({ isConnected }) => {
    const [selectedBoard, setSelectedBoard] = useState('STM32F405');
    const [file, setFile] = useState<File | null>(null);
    const [hasConfirmedPropsOff, setHasConfirmedPropsOff] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);
    const { showModal, hideModal, updateProgress } = useModal();
    const [progress, setProgress] = useState(0);
    const [log, setLog] = useState<{ msg: string, type: 'info' | 'warn' | 'success' }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addLog = (msg: string, type: 'info' | 'warn' | 'success' = 'info') => {
        setLog(prev => [...prev, { msg: `[${new Date().toLocaleTimeString()}] ${msg}`, type }]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            addLog(`LOADED_FILE: ${f.name} (${(f.size / 1024).toFixed(1)} KB)`, 'success');
        }
    };

    const startFlash = () => {
        if (isConnected) {
            addLog("SAFETY_LOCK_ACTIVE: CANNOT_FLASH_WHILE_SERIAL_LINK_ESTABLISHED", "warn");
            return;
        }
        if (!hasConfirmedPropsOff) {
            addLog("SAFETY_ERROR: PROPELLERS_NOT_CONFIRMED_REMOVED", "warn");
            return;
        }
        if (!file) {
            addLog("ERROR: NO_FIRMWARE_FILE_SELECTED", "warn");
            return;
        }

        setIsFlashing(true);
        setProgress(0);
        setLog([]);

        showModal({
            title: "FIRMWARE_FLASH_ACTIVE",
            message: "INITIATING_FLASH_SEQUENCE: Do not disconnect power or USB cable.",
            type: 'progress',
            progress: 0
        });

        addLog("INITIATING_FLASH_SEQUENCE...", "info");
        addLog(`TARGET_BOARD: ${selectedBoard}`, "info");

        // Simulated Flashing Sequence
        let stage = 0;
        const interval = setInterval(() => {
            stage += 2;
            setProgress(stage);
            updateProgress(stage);

            if (stage === 10) addLog("DETECTING_DFU_DEVICE...", "info");
            if (stage === 20) addLog("ERASING_CHIP_FLASH...", "warn");
            if (stage === 40) addLog("UPLOADING_BINARY_BLOCKS...", "info");
            if (stage === 80) addLog("VERIFYING_CHECKSUM...", "info");

            if (stage >= 100) {
                clearInterval(interval);
                setIsFlashing(false);
                hideModal();

                showModal({
                    title: "FLASH_SUCCESSFUL",
                    message: "Firmware has been written successfully. The device is now rebooting into Application Mode.",
                    type: 'success'
                });

                addLog("FLASH_COMPLETE_SUCCESSFULLY", "success");
                addLog("SYSTEM_REBOOTING_INTO_APP_MODE...", "success");
            }
        }, 100);
    };

    return (
        <div style={{ padding: '24px', height: '100%', display: 'flex', gap: '24px', overflowX: 'hidden' }}>
            {/* Configuration Sidebar */}
            <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    padding: '20px',
                    borderRadius: '4px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888' }}>
                            <Cpu size={18} />
                            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em' }}>MAINTENANCE_HUB</span>
                        </div>
                        <div className="tooltip-container right down">
                            <HelpCircle size={12} color="#444" />
                            <div className="tooltip-text">
                                Central maintenance interface for firmware flashing and hardware recovery. Ensure the drone is powered and propellers are removed.
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ fontSize: '9px', color: '#666', display: 'block' }}>TARGET_HARDWARE</label>
                                <div className="tooltip-container right down">
                                    <HelpCircle size={10} color="#444" />
                                    <div className="tooltip-text">
                                        Select the processor architecture of your Flight Controller. Selecting the wrong target can brick the device.
                                    </div>
                                </div>
                            </div>
                            <select
                                className="input-ui"
                                style={{ width: '100%' }}
                                value={selectedBoard}
                                onChange={(e) => setSelectedBoard(e.target.value)}
                                disabled={isFlashing}
                            >
                                <option value="STM32F405">STM32F405 (MATEKF405)</option>
                                <option value="STM32F7X2">STM32F7X2 (FURYF7)</option>
                                <option value="STM32G474">STM32G474 (G4_CORE)</option>
                            </select>
                        </div>

                        <div style={{ marginTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ fontSize: '9px', color: '#666' }}>LOAD_SOURCE</label>
                                <div className="tooltip-container right down">
                                    <HelpCircle size={10} color="#444" />
                                    <div className="tooltip-text">
                                        Select a compiled binary (.bin) or hex file (.hex). Ensure the version matches your hardware target exactly.
                                    </div>
                                </div>
                            </div>
                            <button
                                className="btn-ui"
                                style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isFlashing}
                            >
                                <Upload size={14} /> LOAD_LOCAL_FIRMWARE
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                                accept=".bin,.hex"
                            />
                            {file && (
                                <div style={{ marginTop: '8px', fontSize: '9px', color: 'var(--status-ok)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <FileCode size={12} /> {file.name.slice(0, 20)}...
                                </div>
                            )}
                        </div>


                        <div style={{ padding: '10px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', cursor: 'pointer', color: hasConfirmedPropsOff ? '#eee' : '#666' }}>
                                    <input
                                        type="checkbox"
                                        checked={hasConfirmedPropsOff}
                                        onChange={(e) => setHasConfirmedPropsOff(e.target.checked)}
                                        disabled={isFlashing}
                                    />
                                    CONFIRM PROPELLERS ARE REMOVED
                                </label>
                                <div className="tooltip-container right down">
                                    <HelpCircle size={10} color="#444" />
                                    <div className="tooltip-text">
                                        SAFETY_CRITICAL: Flashing triggers a reboot which can cause erratic motor behavior. NEVER flash with propellers attached.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            className={`btn-ui ${!file || isConnected || !hasConfirmedPropsOff ? '' : 'primary'}`}
                            style={{
                                marginTop: '10px',
                                width: '100%',
                                padding: '12px',
                                opacity: (!file || isConnected || !hasConfirmedPropsOff) && !isFlashing ? 0.5 : 1
                            }}
                            onClick={startFlash}
                            disabled={isFlashing || !file || isConnected || !hasConfirmedPropsOff}
                        >
                            {isFlashing ? 'FLASHING_IN_PROGRESS...' : 'FLASH_FIRMWARE'}
                        </button>

                        {isConnected && (
                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                padding: '10px',
                                background: 'rgba(229, 57, 53, 0.1)',
                                border: '1px solid rgba(229, 57, 53, 0.3)',
                                borderRadius: '4px',
                                marginTop: '10px'
                            }}>
                                <ShieldAlert size={14} color="var(--status-err)" />
                                <span style={{ fontSize: '8px', color: 'var(--status-err)', lineHeight: '1.2' }}>
                                    SERIAL_LINK_ACTIVE: DISCONNECT_TO_ENABLE_DFU_MODE
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Safety Warnings */}
                <div style={{
                    padding: '15px',
                    background: '#111',
                    border: '1px solid #222',
                    borderRadius: '4px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-warn)', marginBottom: '8px' }}>
                        <AlertTriangle size={14} />
                        <span style={{ fontSize: '9px', fontWeight: 700 }}>SAFETY_ADVISORY</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '8px', color: '#666', lineHeight: '1.6' }}>
                        <li>Remove propellers before flashing.</li>
                        <li>Ensure stable power supply (Vbatt {'>'} 14V).</li>
                        <li>Do not disconnect USB during write sequence.</li>
                    </ul>
                </div>
            </div>

            {/* Flashing Status & Console */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                    flex: 1,
                    background: '#0a0a0a',
                    border: '1px solid #333',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {isFlashing ? (
                        <div style={{ textAlign: 'center', zIndex: 2 }}>
                            <div style={{
                                fontSize: '24px',
                                fontFamily: 'var(--font-data)',
                                color: 'var(--status-warn)',
                                marginBottom: '10px'
                            }}>
                                {progress}%
                            </div>
                            <div style={{
                                width: '300px',
                                height: '4px',
                                background: '#222',
                                borderRadius: '2px',
                                overflow: 'hidden',
                                margin: '0 auto 20px'
                            }}>
                                <div style={{
                                    width: `${progress}%`,
                                    height: '100%',
                                    background: 'var(--status-warn)',
                                    transition: 'width 0.1s linear'
                                }} />
                            </div>
                            <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: '#888' }}>
                                {progress < 20 ? 'DETECTING_DFU' : progress < 40 ? 'ERASING_DEVICE' : 'WRITING_FIRMWARE'}
                            </div>
                        </div>
                    ) : progress === 100 ? (
                        <div style={{ textAlign: 'center' }}>
                            <CheckCircle2 size={48} color="var(--status-ok)" style={{ marginBottom: '16px' }} />
                            <div style={{ fontSize: '14px', letterSpacing: '0.1em', color: 'var(--status-ok)', fontWeight: 600 }}>FLASH_SUCCESSFUL</div>
                            <div style={{ fontSize: '9px', color: '#666', marginTop: '8px' }}>TARGET_DEVICE_IS_REBOOTING...</div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', opacity: 0.3 }}>
                            <Activity size={48} color="#888" style={{ marginBottom: '16px' }} />
                            <div style={{ fontSize: '10px', letterSpacing: '0.2em' }}>WAITING_FOR_UPLINK_COMMAND</div>
                        </div>
                    )}

                    {/* Background Grid Pattern */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: 'radial-gradient(#333 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                        opacity: 0.1,
                        pointerEvents: 'none'
                    }} />
                </div>

                {/* Maintenance Console */}
                <div style={{
                    height: '200px',
                    background: '#050505',
                    border: '1px solid #333',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ background: '#1a1a1a', padding: '6px 12px', fontSize: '8px', color: '#666' }}>
                        MAINTENANCE_SERIAL_OUTPUT
                    </div>
                    <div style={{ flex: 1, padding: '10px', overflowY: 'auto', fontFamily: 'var(--font-data)', fontSize: '10px' }}>
                        {log.length === 0 && <span style={{ color: '#333' }}>// Empty log history</span>}
                        {log.map((l, i) => (
                            <div key={i} style={{
                                color: l.type === 'success' ? 'var(--status-ok)' :
                                    l.type === 'warn' ? 'var(--status-warn)' : '#888',
                                marginBottom: '4px'
                            }}>
                                {l.msg}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
