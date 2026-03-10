import { useState, useRef, useEffect } from 'react';
import { Shield, MousePointer2, HelpCircle, Activity, Save } from 'lucide-react';
import { useModal } from '../context/ModalContext';

interface ModeState {
    name: string;
    desc: string;
    ch: number;
    range: [number, number];
}

const ModeRow = ({ name, desc, ch, range, active, currentVal, onRangeChange, onChannelChange }: any) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState<'start' | 'end' | 'both' | null>(null);

    const getValFromPos = (clientX: number) => {
        if (!containerRef.current) return 1500;
        const rect = containerRef.current.getBoundingClientRect();
        const pct = (clientX - rect.left) / rect.width;
        return Math.round(1000 + (pct * 1000));
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const val = Math.max(1000, Math.min(2000, getValFromPos(e.clientX)));

        if (isDragging === 'start') {
            onRangeChange([Math.min(val, range[1] - 10), range[1]]);
        } else if (isDragging === 'end') {
            onRangeChange([range[0], Math.max(val, range[0] + 10)]);
        } else if (isDragging === 'both') {
            const width = range[1] - range[0];
            const newStart = Math.max(1000, Math.min(2000 - width, val - width / 2));
            onRangeChange([newStart, newStart + width]);
        }
    };

    const handleMouseUp = () => setIsDragging(null);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, range]);

    const startPct = ((range[0] - 1000) / 1000) * 100;
    const endPct = ((range[1] - 1000) / 1000) * 100;
    const barWidth = endPct - startPct;
    const cursorPct = ((currentVal - 1000) / 1000) * 100;

    const getTooltipContent = (mode: string) => {
        switch (mode) {
            case 'ARM': return "The primary safety mechanism. When active, motors are live and the drone is capable of flight. Ensure this is mapped to a switch you can reach quickly.";
            case 'ANGLE': return "Self-leveling mode. Limits the maximum tilt angle of the drone. When you release the sticks, the drone automatically returns to level.";
            case 'HORIZON': return "Accelerated leveling. Combines self-leveling with the ability to perform flips and rolls at full stick deflection.";
            case 'BEEPER': return "Acoustic locator. Triggers the on-board buzzer to help locate the drone after a crash in tall grass or brush.";
            case 'AIRMODE': return "Maintains PID control and motor rotation even at zero throttle. Essential for maintaining control during high-altitude dives or flips.";
            case 'FLIP_OVER': return "Crash recovery mode (Turtle Mode). Allows you to spin motors in reverse to flip the drone over after an upside-down crash.";
            default: return "";
        }
    };

    return (
        <div style={{
            background: active ? 'rgba(0, 230, 118, 0.05)' : '#111',
            border: `1px solid ${active ? 'var(--status-ok)' : '#222'}`,
            padding: '16px',
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, 150px) 40px 100px 1fr 100px',
            alignItems: 'center',
            gap: '20px',
            borderRadius: '4px',
            transition: 'background 0.2s ease'
        }}>
            <div>
                <div style={{ fontSize: '11px', fontWeight: 900, color: active ? 'var(--status-ok)' : '#fff' }}>{name}</div>
                <div style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>{desc}</div>
            </div>

            <div className="tooltip-container">
                <HelpCircle size={10} color="#666" />
                <div className="tooltip-text">{getTooltipContent(name)}</div>
            </div>

            <select
                className="input-ui"
                style={{ fontSize: '10px' }}
                value={ch}
                onChange={(e) => onChannelChange(parseInt(e.target.value))}
            >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <option key={i} value={i}>AUX {i}</option>)}
            </select>

            <div
                ref={containerRef}
                style={{
                    position: 'relative',
                    height: '28px',
                    background: '#0a0a0a',
                    border: '1px solid #333',
                    borderRadius: '14px',
                    cursor: 'crosshair',
                    userSelect: 'none',
                    overflow: 'hidden' // FIX: Mask the green bar at the rounds
                }}
            >
                {/* Scale Markers */}
                {[1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000].map(v => (
                    <div key={v} style={{ position: 'absolute', left: `${(v - 1000) / 10}%`, top: '15px', height: '4px', width: '1px', background: '#222' }} />
                ))}

                {/* Active Range Bar */}
                <div
                    onMouseDown={(e) => { e.stopPropagation(); setIsDragging('both'); }}
                    style={{
                        position: 'absolute',
                        left: `${startPct}%`,
                        width: `${barWidth}%`,
                        height: '100%',
                        background: active ? 'var(--status-ok)' : '#333',
                        opacity: isDragging ? 0.5 : 0.3,
                        cursor: 'grab'
                    }}
                />

                {/* Range Handles */}
                <div
                    onMouseDown={(e) => { e.stopPropagation(); setIsDragging('start'); }}
                    style={{
                        position: 'absolute',
                        left: `${startPct}%`,
                        top: '10%',
                        height: '80%',
                        width: '4px',
                        background: 'var(--status-ok)',
                        cursor: 'ew-resize',
                        borderRadius: '2px',
                        zIndex: 3,
                        transform: 'translateX(-50%)' // Center handle on the value
                    }}
                />
                <div
                    onMouseDown={(e) => { e.stopPropagation(); setIsDragging('end'); }}
                    style={{
                        position: 'absolute',
                        left: `${endPct}%`,
                        top: '10%',
                        height: '80%',
                        width: '4px',
                        background: 'var(--status-ok)',
                        cursor: 'ew-resize',
                        borderRadius: '2px',
                        zIndex: 3,
                        transform: 'translateX(-50%)' // Center handle on the value
                    }}
                />

                {/* Current Value Cursor */}
                <div style={{
                    position: 'absolute',
                    left: `${cursorPct}%`,
                    top: '0',
                    width: '2px',
                    height: '100%',
                    background: '#fff',
                    boxShadow: '0 0 10px #fff',
                    transition: 'left 0.1s ease',
                    zIndex: 4,
                    pointerEvents: 'none'
                }} />

                <div style={{
                    position: 'absolute',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0 12px',
                    fontSize: '8px',
                    color: '#444',
                    lineHeight: '28px',
                    pointerEvents: 'none'
                }}>
                    <span>1000</span>
                    <span style={{ color: '#222' }}>1500</span>
                    <span>2000</span>
                </div>
            </div>

            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: active ? 'var(--status-ok)' : '#444', fontWeight: 800 }}>
                    {active ? ':: ACTIVE ::' : ':: IDLE ::'}
                </div>
                <div style={{ fontSize: '9px', color: '#666', fontFamily: 'var(--font-data)' }}>{currentVal > 0 ? `${currentVal}ms` : "OFFLINE"}</div>
            </div>
        </div>
    );
};

export const ModesTab = ({ channels = [], isConnected }: { channels?: number[], isConnected: boolean }) => {
    const { showModal } = useModal();
    const [isLoaded, setIsLoaded] = useState(false);
    const [modes, setModes] = useState<ModeState[]>([
        { name: 'ARM', desc: 'Enable motor output', ch: 1, range: [1300, 2100] },
        { name: 'ANGLE', desc: 'Self-leveling mode', ch: 2, range: [1300, 1700] },
        { name: 'HORIZON', desc: 'Accelerated leveling', ch: 2, range: [1701, 2100] },
        { name: 'BEEPER', desc: 'Acoustic locator', ch: 3, range: [1500, 2100] },
        { name: 'AIRMODE', desc: 'Mixer active at idle', ch: 4, range: [1000, 2100] },
        { name: 'FLIP_OVER', desc: 'Crash recovery mode', ch: 5, range: [1800, 2100] }
    ]);

    const [simStick, setSimStick] = useState(1500);

    useEffect(() => {
        if (isConnected && !isLoaded) {
            fetchModes();
        } else if (!isConnected) {
            setIsLoaded(false);
        }
    }, [isConnected]);

    const fetchModes = async () => {
        try {
            const { invoke } = await import("@tauri-apps/api/core");
            // MSP_MODE_RANGES (34)
            const response: any = await invoke("send_msp_command", {
                cmd: 34,
                payload: [],
                version: "v1"
            });

            if (response && response.payload) {
                const data = new Uint8Array(response.payload);
                const newModes = [...modes];
                // MSP V1 Mode Range format: [id, auxCh, start/25, end/25] (Betaflight style)
                for (let i = 0; i < data.length / 4 && i < newModes.length; i++) {
                    const offset = i * 4;
                    newModes[i] = {
                        ...newModes[i],
                        ch: data[offset + 1] + 1, // Convert 0-indexed to 1-indexed AUX
                        range: [data[offset + 2] * 25 + 900, data[offset + 3] * 25 + 900]
                    };
                }
                setModes(newModes);
                setIsLoaded(true);
            } else {
                setIsLoaded(true);
            }
        } catch (e) {
            console.error("FAILED_TO_FETCH_MODES", e);
            setIsLoaded(true);
        }
    };

    const updateMode = (name: string, updates: Partial<ModeState>) => {
        setModes(prev => prev.map(m => m.name === name ? { ...m, ...updates } : m));
    };

    const handleSave = async () => {
        try {
            const { invoke } = await import("@tauri-apps/api/core");
            showModal({ title: "COMMITTING_MODES", message: "Updating flight controller mode matrix...", type: 'progress', progress: 10 });

            for (let i = 0; i < modes.length; i++) {
                const mode = modes[i];
                const payload = [
                    i, // index
                    mode.ch - 1, // auxChannel (0-indexed)
                    Math.floor((mode.range[0] - 900) / 25),
                    Math.floor((mode.range[1] - 900) / 25)
                ];

                await invoke("send_msp_command", {
                    cmd: 35, // MSP_SET_MODE_RANGE
                    payload,
                    version: "v1"
                });

                showModal({
                    title: "COMMITTING_MODES",
                    message: `Saving ${mode.name}...`,
                    type: 'progress',
                    progress: 10 + ((i + 1) / modes.length) * 80
                });
            }

            // Save to EEPROM
            await invoke("send_msp_command", { cmd: 250, payload: [], version: "v1" });

            showModal({ title: "SAVE_SUCCESS", message: "Flight modes successfully committed to flash.", type: 'success' });
        } catch (e) {
            console.error("MODE_SAVE_FAILED", e);
            showModal({ title: "SAVE_FAILURE", message: `The system was unable to commit modes: ${e}`, type: 'error' });
        }
    };

    return (
        <div style={{ padding: '24px', height: '100%', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {isConnected && !isLoaded && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(2px)'
                }}>
                    <Activity size={32} color="var(--accent)" style={{ animation: 'spin 2s linear infinite', marginBottom: '12px' }} />
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>SYNCHRONIZING_MODE_MATRIX...</div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ background: 'rgba(255, 193, 7, 0.05)', border: '1px solid rgba(255, 193, 7, 0.2)', padding: '12px 16px', borderRadius: '4px', display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                    <Shield size={20} color="var(--status-warn)" />
                    <div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--status-warn)' }}>FLIGHT_MODE_SAFETY_ADVISORY</div>
                        <div style={{ fontSize: '9px', color: '#888', marginTop: '2px' }}>Mode ranges must be carefully validated before armed flight. Ensure AUX channels are correctly mapped in your radio.</div>
                    </div>
                </div>

                {!isConnected && (
                    <div style={{ marginLeft: '20px', background: '#111', border: '1px solid #333', padding: '12px', borderRadius: '4px', width: '250px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '9px', color: '#666', fontWeight: 800 }}>STICK_SIMULATOR (VIRTUAL)</span>
                            <MousePointer2 size={12} color="var(--accent)" />
                        </div>
                        <input
                            type="range"
                            min="1000"
                            max="2000"
                            value={simStick}
                            onChange={(e) => setSimStick(parseInt(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent)' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#444' }}>
                            <span>1000</span>
                            <span style={{ color: 'var(--accent)' }}>{simStick}ms</span>
                            <span>2000</span>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', opacity: isConnected && !isLoaded ? 0.3 : 1 }}>
                {modes.map((mode: ModeState) => {
                    const currentVal = isConnected ? (channels[mode.ch + 3] || 0) : simStick;
                    const isActive = currentVal >= mode.range[0] && currentVal <= mode.range[1];
                    return (
                        <ModeRow
                            key={mode.name}
                            name={mode.name}
                            desc={mode.desc}
                            ch={mode.ch}
                            range={mode.range}
                            active={isActive}
                            currentVal={currentVal}
                            onRangeChange={(range: [number, number]) => updateMode(mode.name, { range })}
                            onChannelChange={(ch: number) => updateMode(mode.name, { ch })}
                        />
                    );
                })}
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-start' }}>
                <button
                    className="btn-ui primary"
                    style={{ padding: '10px 30px' }}
                    disabled={isConnected && !isLoaded}
                    onClick={handleSave}
                >
                    <Save size={14} style={{ marginRight: '8px' }} />
                    SAVE_MODES_TO_FC
                </button>
            </div>
        </div>
    );
};
