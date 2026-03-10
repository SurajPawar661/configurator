import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
    Settings,
    Battery,
    Volume2,
    Save,
    RotateCcw,
    HelpCircle,
} from 'lucide-react';
import { useModal } from '../context/ModalContext';

interface SystemConfigTabProps {
    onSave: () => void;
}

export const SystemConfigTab: React.FC<SystemConfigTabProps> = ({ onSave }) => {
    const { showModal, hideModal, updateProgress } = useModal();
    const [droneName, setDroneName] = useState('VECTOR_GCS_V1');
    const [voltageScale, setVoltageScale] = useState(110);
    const [currentOffset, setCurrentOffset] = useState(0);
    const [warningCellV, setWarningCellV] = useState(3.5);
    const [criticalCellV, setCriticalCellV] = useState(3.3);
    const [maxArmAngle, setMaxArmAngle] = useState(25);
    const [beepers, setBeepers] = useState([true, true, true, true]); // ARMING, DISARMING, BATT_LOW, GPS_LOCK

    const handleSave = async () => {
        showModal({
            title: "COMMITTING_SYSTEM_CONFIG",
            message: "Writing configuration parameters to non-volatile memory (EEPROM).",
            type: 'progress',
            progress: 10
        });

        try {
            updateProgress(30);
            await invoke("save_drone_config", {
                config: {
                    name: droneName,
                    max_arm_angle: maxArmAngle,
                    voltage_scale: voltageScale,
                    current_offset: currentOffset,
                    warning_cell_v: warningCellV,
                    critical_cell_v: criticalCellV,
                    beepers: beepers
                }
            });
            updateProgress(70);
            await new Promise(r => setTimeout(r, 800));
            updateProgress(100);

            showModal({
                title: "COMMIT_SUCCESS",
                message: "Configuration successfully committed. A system reboot is required to apply identity and logistics patches.",
                type: 'success',
                confirmText: "REBOOT_NOW",
                onConfirm: () => {
                    hideModal();
                    onSave();
                }
            });
        } catch (e) {
            showModal({
                title: "COMMIT_FAILURE",
                message: `The system was unable to commit settings to the FC: ${e}`,
                type: 'error',
                confirmText: "RETRY",
                onConfirm: handleSave,
                showCancel: true,
                cancelText: "ABORT"
            });
        }
    };

    const toggleBeeper = (index: number) => {
        const newBeepers = [...beepers];
        newBeepers[index] = !newBeepers[index];
        setBeepers(newBeepers);
    };

    return (
        <div style={{ padding: '24px', height: '100%', display: 'flex', gap: '24px', overflowY: 'auto', overflowX: 'hidden' }}>

            {/* 1. POWER & BATTERY */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '20px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888' }}>
                            <Battery size={18} />
                            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em' }}>POWER_LOGISTICS</span>
                        </div>
                        <div className="tooltip-container left down">
                            <HelpCircle size={10} color="#666" />
                            <div className="tooltip-text">
                                Configuration for power monitoring. Voltage Scale calibrates the analog sensor (typically 110). Cell Voltages define the safety limits for your LiPo battery.
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <label style={{ fontSize: '8px', color: '#666' }}>VOLTAGE_SCALE (V/10)</label>
                                <div className="tooltip-container">
                                    <HelpCircle size={8} color="#444" />
                                    <div className="tooltip-text">Scale factor for voltage reading. Increment this if the GCS shows lower voltage than your multimeter.</div>
                                </div>
                            </div>
                            <input
                                type="number"
                                className="input-ui"
                                style={{ width: '100%' }}
                                value={voltageScale}
                                onChange={(e) => setVoltageScale(parseInt(e.target.value))}
                            />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <label style={{ fontSize: '8px', color: '#666' }}>CURRENT_METER_OFFSET</label>
                                <div className="tooltip-container">
                                    <HelpCircle size={8} color="#444" />
                                    <div className="tooltip-text">Offset to zero out current sensing when the drone is idle.</div>
                                </div>
                            </div>
                            <input
                                type="number"
                                className="input-ui"
                                style={{ width: '100%' }}
                                value={currentOffset}
                                onChange={(e) => setCurrentOffset(parseInt(e.target.value))}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '8px', color: '#666', marginBottom: '4px', display: 'block' }}>WARNING_CELL_V</label>
                            <input
                                type="number"
                                className="input-ui"
                                style={{ width: '100%' }}
                                step="0.1"
                                value={warningCellV}
                                onChange={(e) => setWarningCellV(parseFloat(e.target.value))}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '8px', color: '#666', marginBottom: '4px', display: 'block' }}>CRITICAL_CELL_V</label>
                            <input
                                type="number"
                                className="input-ui"
                                style={{ width: '100%' }}
                                step="0.1"
                                value={criticalCellV}
                                onChange={(e) => setCriticalCellV(parseFloat(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. GENERAL SETUP & OSD */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '20px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888' }}>
                            <Settings size={18} />
                            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em' }}>GLOBAL_IDENTITY</span>
                        </div>
                        <div className="tooltip-container left down">
                            <HelpCircle size={10} color="#666" />
                            <div className="tooltip-text">
                                Meta-configuration and safety limits. Max Arm Angle prevents arming on uneven terrain.
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ fontSize: '8px', color: '#666', marginBottom: '4px', display: 'block' }}>CRAFT_NAME (OSD)</label>
                            <input
                                type="text"
                                className="input-ui"
                                style={{ width: '100%', fontStyle: 'italic' }}
                                value={droneName}
                                onChange={(e) => setDroneName(e.target.value)}
                            />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <label style={{ fontSize: '8px', color: '#666' }}>MAX_ARM_ANGLE (DEG)</label>
                                <div className="tooltip-container">
                                    <HelpCircle size={8} color="#444" />
                                    <div className="tooltip-text">Limits how much the drone can be tilted while arming. Safety feature to prevent accidental throttle-up while the drone is on its side.</div>
                                </div>
                            </div>
                            <input
                                type="number"
                                className="input-ui"
                                style={{ width: '100%' }}
                                value={maxArmAngle}
                                onChange={(e) => setMaxArmAngle(parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                {/* SYSTEM BEEPER */}
                <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '20px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888' }}>
                            <Volume2 size={18} />
                            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em' }}>AUDIO_TELEMETRY</span>
                        </div>
                        <div className="tooltip-container left">
                            <HelpCircle size={10} color="#666" />
                            <div className="tooltip-text">
                                Toggle acoustic feedback for system events.
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {['ARMING', 'DISARMING', 'BATTERY_LOW', 'GPS_LOCK'].map((b, i) => (
                            <div key={b} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '9px', color: '#888' }}>{b}</span>
                                <input
                                    type="checkbox"
                                    checked={beepers[i]}
                                    onChange={() => toggleBeeper(i)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: '10px', justifyContent: 'flex-start' }}>
                    <button className="btn-ui" style={{ width: '160px' }} onClick={() => {
                        setDroneName('VECTOR_GCS_V1');
                        setMaxArmAngle(25);
                        setVoltageScale(110);
                        setCurrentOffset(0);
                        setWarningCellV(3.5);
                        setCriticalCellV(3.3);
                        setBeepers([true, true, true, true]);
                    }}>
                        <RotateCcw size={14} /> RESET_GLOBAL
                    </button>
                    <button className="btn-ui primary" style={{ width: '180px' }} onClick={handleSave}>
                        <Save size={14} /> SAVE_AND_REBOOT
                    </button>
                </div>
            </div>
        </div>
    );
};
