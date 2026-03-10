import { useState, useEffect } from "react";
import { RotateCcw, Save, HelpCircle, Activity } from "lucide-react";
import { useModal } from "../context/ModalContext";

interface PIDSettings {
    roll: { p: number, i: number, d: number };
    pitch: { p: number, i: number, d: number };
    yaw: { p: number, i: number, d: number };
}

export const PIDTuning = ({ isConnected, onSave }: { isConnected: boolean, onSave?: () => void }) => {
    const { showModal } = useModal();
    const [isLoaded, setIsLoaded] = useState(false);
    const [pids, setPids] = useState<PIDSettings>({
        roll: { p: 0, i: 0, d: 0 },
        pitch: { p: 0, i: 0, d: 0 },
        yaw: { p: 0, i: 0, d: 0 },
    });

    useEffect(() => {
        if (isConnected && !isLoaded) {
            fetchPids();
        } else if (!isConnected) {
            setIsLoaded(false);
            setPids({
                roll: { p: 0, i: 0, d: 0 },
                pitch: { p: 0, i: 0, d: 0 },
                yaw: { p: 0, i: 0, d: 0 },
            });
        }
    }, [isConnected]);

    const fetchPids = async () => {
        try {
            const { invoke } = await import("@tauri-apps/api/core");
            // MSP_PID (112)
            const response = await invoke<number[]>("send_msp_command", {
                cmd: 112,
                payload: [],
                version: "v1"
            });

            if (response && response.length >= 9) {
                setPids({
                    roll: { p: response[0], i: response[1], d: response[2] },
                    pitch: { p: response[3], i: response[4], d: response[5] },
                    yaw: { p: response[6], i: response[7], d: response[8] },
                });
                setIsLoaded(true);
            }
        } catch (e) {
            console.error("FAILED_TO_FETCH_PIDS", e);
        }
    };

    const renderParam = (axis: keyof PIDSettings, param: 'p' | 'i' | 'd', color: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #252525' }}>
            <span style={{ fontSize: '10px', color: '#666', width: '20px', fontWeight: 700 }}>{param.toUpperCase()}</span>
            <input
                type="number"
                disabled={!isLoaded}
                className="input-ui"
                style={{ width: '60px', textAlign: 'center', fontSize: '11px', borderLeft: `2px solid ${color}`, opacity: isLoaded ? 1 : 0.5 }}
                value={(pids as any)[axis][param]}
                onChange={(e) => {
                    const val = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                    setPids(prev => ({ ...prev, [axis]: { ...prev[axis], [param]: val } }));
                }}
            />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                    type="range"
                    disabled={!isLoaded}
                    min="0"
                    max="255"
                    style={{ flex: 1, accentColor: color, height: '4px', opacity: isLoaded ? 1 : 0.3 }}
                    value={(pids as any)[axis][param]}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setPids(prev => ({ ...prev, [axis]: { ...prev[axis], [param]: val } }));
                    }}
                />
                <span style={{ fontSize: '8px', color: '#444', width: '30px', textAlign: 'right' }}>{((pids as any)[axis][param] / 2.55).toFixed(0)}%</span>
            </div>
        </div>
    );

    return (
        <div className="pro-card" style={{ width: '100%', maxWidth: '100%', margin: '0 auto', padding: '20px', position: 'relative', overflowX: 'hidden' }}>
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
                    backdropFilter: 'blur(2px)',
                    borderRadius: '4px'
                }}>
                    <Activity size={32} color="var(--accent)" style={{ animation: 'spin 2s linear infinite', marginBottom: '12px' }} />
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>SYNCHRONIZING_PID_MATRIX...</div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#eee', letterSpacing: '0.2em' }}>PID_DYNAMICS_MATRIX</div>
                    <div style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>CORE_LOOP_FREQUENCY: 8.0kHz // PROTOCOL: MULTISHOT_PRO</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-ui" disabled={!isLoaded} onClick={fetchPids}><RotateCcw size={14} /> RELOAD_FROM_FC</button>
                    <button
                        className="btn-ui primary"
                        disabled={!isLoaded || !isConnected}
                        onClick={async () => {
                            const payload = new Uint8Array(9);
                            payload[0] = pids.roll.p; payload[1] = pids.roll.i; payload[2] = pids.roll.d;
                            payload[3] = pids.pitch.p; payload[4] = pids.pitch.i; payload[5] = pids.pitch.d;
                            payload[6] = pids.yaw.p; payload[7] = pids.yaw.i; payload[8] = pids.yaw.d;

                            try {
                                const { invoke } = await import("@tauri-apps/api/core");
                                showModal({ title: "SAVING_PIDS", message: "Writing controller dynamics to EEPROM...", type: 'progress', progress: 50 });
                                await invoke("send_msp_command", {
                                    cmd: 202,
                                    payload: Array.from(payload),
                                    version: "v1"
                                });
                                showModal({ title: "SAVE_SUCCESS", message: "PID parameters committed to flash permanently.", type: 'success' });
                                if (onSave) onSave();
                            } catch (e) {
                                console.error("MSP_PID_COMMIT_FAILED", e);
                                showModal({
                                    title: "COMMIT_FAILURE",
                                    message: "FAILED_TO_COMMIT_PIDS: Check connection to flight controller.",
                                    type: 'error'
                                });
                            }
                        }}
                    >
                        <Save size={14} /> COMMIT_TO_FLASH
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', opacity: isLoaded ? 1 : 0.4 }}>
                {[
                    { axis: 'roll', color: 'var(--status-info)' },
                    { axis: 'pitch', color: 'var(--status-ok)' },
                    { axis: 'yaw', color: 'var(--status-warn)' }
                ].map(({ axis, color }) => (
                    <div key={axis} style={{ background: '#111', padding: '16px', border: '1px solid #333', borderRadius: '4px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    AXIS::{axis}
                                </div>
                                <div className="tooltip-container">
                                    <HelpCircle size={10} color="#666" />
                                    <div className="tooltip-text">
                                        {axis === 'roll' && "Controls rotation around the front-to-back axis. P handles immediate response, I corrects for long-term drift or off-center weight, and D dampens oscillations to smooth out the movement."}
                                        {axis === 'pitch' && "Controls rotation around the side-to-side axis (nose up/down). Tuning is similar to Roll; helps maintain a stable angle during forward flight or rapid altitude changes."}
                                        {axis === 'yaw' && "Controls rotation around the vertical axis (nose left/right). Higher P is often needed for snappy turns. Use I to prevent the nose from wandering during hard punch-outs."}
                                    </div>
                                </div>
                            </div>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}44` }} />
                        </div>
                        {renderParam(axis as any, 'p', color)}
                        {renderParam(axis as any, 'i', color)}
                        {renderParam(axis as any, 'd', color)}

                        <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #222' }}>
                            <div style={{ fontSize: '8px', color: '#444', marginBottom: '8px' }}>DYNAMIC_SCALING</div>
                            <div style={{ height: '4px', background: '#050505', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: '65%', height: '100%', background: color, opacity: 0.3 }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '20px', padding: '8px', borderLeft: '2px solid var(--status-warn)', background: '#1a1a1a', fontSize: '9px', color: '#999' }}>
                NOTICE: High D-term values can cause excessive motor heat. Monitor temperature during testing.
            </div>
        </div>
    );
};
