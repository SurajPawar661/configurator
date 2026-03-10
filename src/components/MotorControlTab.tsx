import { useState } from 'react';
import { Shield, ShieldAlert, Zap, HelpCircle } from 'lucide-react';

interface MotorControlTabProps {
    motorOutputs: number[]; // 1000 - 2000 range
    onSetMotor: (index: number, value: number) => void;
    onSetAll: (value: number) => void;
}

export const MotorControlTab = ({ motorOutputs, onSetMotor, onSetAll }: MotorControlTabProps) => {
    const [isSafetyEnabled, setIsSafetyEnabled] = useState(false);
    const [hasConfirmedPropsOff, setHasConfirmedPropsOff] = useState(false);
    const [masterValue, setMasterValue] = useState(1000);

    const handleMasterChange = (val: number) => {
        if (!isSafetyEnabled) return;
        setMasterValue(val);
        onSetAll(val);
    };

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>

            {/* 1. SAFETY OVERRIDE PANEL */}
            <div style={{
                background: isSafetyEnabled ? 'rgba(229, 57, 53, 0.1)' : '#1a1a1a',
                border: `1px solid ${isSafetyEnabled ? 'var(--status-err)' : '#333'}`,
                padding: '24px',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {isSafetyEnabled && <div className="hazard-stripe" />}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '50%',
                            background: isSafetyEnabled ? 'var(--status-err)' : '#333',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', boxShadow: isSafetyEnabled ? '0 0 30px rgba(229, 57, 53, 0.4)' : 'none',
                            zIndex: 1
                        }}>
                            {isSafetyEnabled ? <ShieldAlert size={24} /> : <Shield size={24} />}
                        </div>
                        <div style={{ zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h3 style={{ margin: 0, fontSize: '14px', color: isSafetyEnabled ? '#fff' : '#aaa', letterSpacing: '0.1em' }}>
                                    MOTOR_TEST_MODE :: {isSafetyEnabled ? 'OVERRIDE_ACTIVE' : 'LOCKED'}
                                </h3>
                                <div className="tooltip-container down">
                                    <HelpCircle size={10} color="#666" />
                                    <div className="tooltip-text">
                                        MOTOR_TEST_MODE allows direct control over motor PWM outputs. This bypasses the flight controller's PID loop and safety limits. ALWAYS remove propellers before enabling this mode. Use it to check motor direction and detect bearing noise or excessive vibration.
                                    </div>
                                </div>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: isSafetyEnabled ? '#f8bbd0' : '#666', maxWidth: '500px' }}>
                                <b>DANGER:</b> Direct hardware control bypasses software limits. Motor rotation can cause severe injury.
                                Ensure propellers are removed and the environment is clear before proceeding.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', zIndex: 1 }}>
                        {!isSafetyEnabled && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px', cursor: 'pointer', color: hasConfirmedPropsOff ? '#eee' : '#888' }}>
                                <input
                                    type="checkbox"
                                    checked={hasConfirmedPropsOff}
                                    onChange={(e) => setHasConfirmedPropsOff(e.target.checked)}
                                />
                                I CONFIRM THAT PROPELLERS ARE REMOVED
                            </label>
                        )}
                        <button
                            onClick={() => {
                                if (!isSafetyEnabled && !hasConfirmedPropsOff) return;
                                setIsSafetyEnabled(!isSafetyEnabled);
                                if (isSafetyEnabled) {
                                    setHasConfirmedPropsOff(false); // Reset on lock
                                    onSetAll(1000); // Safety: zero motors on lock
                                }
                            }}
                            disabled={!isSafetyEnabled && !hasConfirmedPropsOff}
                            className={`btn-ui ${isSafetyEnabled ? 'err' : 'primary'}`}
                            style={{
                                padding: '10px 24px', fontSize: '11px', fontWeight: 800,
                                opacity: (!isSafetyEnabled && !hasConfirmedPropsOff) ? 0.5 : 1,
                                width: '220px'
                            }}
                        >
                            {isSafetyEnabled ? 'ENGAGE_SAFETY_LOCK' : 'ENABLE_TEST_MODE'}
                        </button>
                    </div>
                </div>
            </div>

            {!isSafetyEnabled && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#444', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                        <Shield size={64} opacity={0.2} />
                        <Zap size={24} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.1 }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', letterSpacing: '0.3em', fontWeight: 700, color: '#333' }}>HARDWARE_INTERLOCK_ACTIVE</div>
                        <div style={{ fontSize: '9px', marginTop: '8px', color: '#555' }}>Complete safety checklist above to unlock motor control suite</div>
                    </div>
                </div>
            )}

            {isSafetyEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px', animation: 'fadeIn 0.4s ease' }}>

                    {/* 2. INDIVIDUAL CONTROLS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            {[0, 1, 2, 3].map(i => (
                                <MotorSlider
                                    key={i}
                                    index={i + 1}
                                    value={motorOutputs[i] || 1000}
                                    onChange={(v) => onSetMotor(i, v)}
                                />
                            ))}
                        </div>

                        <div style={{ padding: '20px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '10px', color: '#888', fontWeight: 800 }}>MASTER_THROTTLE_LOCK</span>
                                    <div className="tooltip-container">
                                        <HelpCircle size={10} color="#666" />
                                        <div className="tooltip-text">
                                            Synchronized control of all motors. Useful for checking the collective thrust response or verifying ESC sync across the entire drivetrain. Use with caution.
                                        </div>
                                    </div>
                                </div>
                                <span style={{ fontFamily: 'var(--font-data)', color: 'var(--status-warn)', fontSize: '12px' }}>{masterValue}</span>
                            </div>
                            <input
                                type="range"
                                min="1000"
                                max="2000"
                                step="5"
                                value={masterValue}
                                onChange={(e) => handleMasterChange(parseInt(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer', height: '4px', accentColor: 'var(--status-warn)' }}
                            />
                        </div>
                    </div>

                    {/* 3. VISUALIZER */}
                    <div style={{ background: '#0a0a0a', border: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '10px', color: '#666' }}>THRUST_OUTPUT_MATRIX</h4>
                            <div className="tooltip-container">
                                <HelpCircle size={10} color="#666" />
                                <div className="tooltip-text">
                                    Visual representation of motor numbering and rotation. In "X" geometry, M1 is usually Rear-Right, M2 is Front-Right, M3 is Rear-Left, and M4 is Front-Left. Verify this mapping against your hardware.
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1, padding: '20px' }}>
                            {[0, 1, 2, 3].map(i => (
                                <MotorDisk key={i} index={i + 1} value={motorOutputs[i] || 1000} />
                            ))}
                        </div>
                        <div style={{ fontSize: '9px', color: '#444', textAlign: 'center' }}>:: X-GEOMETRY_QUADCOPTER_MAPPING ::</div>
                    </div>

                </div>
            )}
        </div>
    );
};

const MotorSlider = ({ index, value, onChange }: { index: number, value: number, onChange: (v: number) => void }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#1a1a1a', padding: '16px', border: '1px solid #333', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#666', fontWeight: 800 }}>M{index}</span>
                    <div className="tooltip-container left down">
                        <HelpCircle size={10} color="#666" />
                        <div className="tooltip-text">
                            Mapping of motors M1-M4 to physical arm positions (X geometry). Use this to verify that the spin direction matches your ESC signal wiring.
                        </div>
                    </div>
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '12px', color: value > 1050 ? 'var(--status-ok)' : '#888' }}>{value}</span>
            </div>
            <div style={{ height: '200px', display: 'flex', justifyContent: 'center' }}>
                <input
                    type="range"
                    min="1000"
                    max="2000"
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    style={{
                        writingMode: 'bt-lr' as any, // Vertical slider support
                        appearance: 'slider-vertical' as any,
                        width: '8px',
                        height: '100%',
                        cursor: 'ns-resize'
                    }}
                />
            </div>
        </div>
    );
};

const MotorDisk = ({ index, value }: { index: number, value: number }) => {
    const speed = (value - 1000) / 1000;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                border: '1px dashed #333',
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{
                    width: '100%', height: '100%', borderRadius: '50%',
                    borderTop: `2px solid ${value > 1050 ? 'var(--status-ok)' : '#333'}`,
                    animation: value > 1050 ? `spin ${0.5 / (speed + 0.1)}s linear infinite` : 'none',
                    opacity: 0.5 + (speed * 0.5)
                }} />
                <div style={{ position: 'absolute', fontSize: '10px', fontWeight: 700, color: '#333' }}>{index}</div>
                {value > 1050 && (
                    <Zap size={10} style={{ position: 'absolute', color: 'var(--status-ok)', filter: 'drop-shadow(0 0 5px var(--status-ok))' }} />
                )}
            </div>
        </div>
    );
};
