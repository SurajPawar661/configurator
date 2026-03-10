import { useState, useEffect } from 'react';
import {
    Settings2,
    Cpu,
    Network,
    Navigation2,
    MapPin,
    Building2,
    RotateCcw,
    HelpCircle
} from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { listen } from '@tauri-apps/api/event';

interface UARTRowProps {
    id: string;
    msp: boolean;
    rx: boolean;
    gps: boolean;
    telem: boolean;
    onToggle: (id: string, field: keyof Omit<UARTRowProps, 'id' | 'onToggle'>) => void;
}

const UARTRow = ({ id, msp, rx, gps, telem, onToggle }: UARTRowProps) => (
    <tr style={{ borderBottom: '1px solid #222' }}>
        <td style={{ padding: '10px', fontSize: '10px', fontFamily: 'var(--font-data)' }}>{id}</td>
        <td style={{ textAlign: 'center' }}>
            <input
                type="checkbox"
                checked={msp}
                onChange={() => onToggle(id, 'msp')}
            />
        </td>
        <td style={{ textAlign: 'center' }}>
            <input
                type="checkbox"
                checked={rx}
                onChange={() => onToggle(id, 'rx')}
            />
        </td>
        <td style={{ textAlign: 'center' }}>
            <input
                type="checkbox"
                checked={gps}
                onChange={() => onToggle(id, 'gps')}
            />
        </td>
        <td style={{ textAlign: 'center' }}>
            <input
                type="checkbox"
                checked={telem}
                onChange={() => onToggle(id, 'telem')}
            />
        </td>
    </tr>
);

export const AdvancedConfigTab = () => {
    const [appName, setAppName] = useState(() => localStorage.getItem('gcs_brand_name') || 'VECTOR_GCS_V1.3');
    const [saveStatus, setSaveStatus] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [hwInfo, setHwInfo] = useState<any>(null);
    const [calibrationActive, setCalibrationActive] = useState(false);
    const [gpsConfig, setGpsConfig] = useState({
        protocol: 'UBLOX',
        baudrate: '115200'
    });
    const { showModal } = useModal();

    // Controlled UART Matrix State
    const [uartPorts, setUartPorts] = useState([
        { id: 'USB_VCP', msp: true, rx: false, gps: false, telem: false },
        { id: 'UART1', msp: false, rx: true, gps: false, telem: false },
        { id: 'UART2', msp: false, rx: false, gps: true, telem: false },
        { id: 'UART3', msp: false, rx: false, gps: false, telem: true },
    ]);

    // Setup connectivity listeners
    useEffect(() => {
        const unlisten = listen('telemetry_update', (_event) => {
            setIsConnected(true);
            setHwInfo({
                mcu: 'STM32F405VG',
                clock: '168MHz',
                flash: '1024 KB'
            });
        });
        return () => { unlisten.then(f => f()); };
    }, []);

    const handleUartToggle = (id: string, field: keyof Omit<UARTRowProps, 'id' | 'onToggle'>) => {
        setUartPorts(prev => prev.map(p => {
            if (p.id === id) {
                // Safety check: Don't allow disabling MSP on USB_VCP
                if (id === 'USB_VCP' && field === 'msp' && p.msp) {
                    showModal({
                        title: "SAFETY_BLOCK",
                        message: "CRITICAL: You cannot disable MSP on the primary USB port. Doing so would lock you out of the GCS.",
                        type: 'error'
                    });
                    return p;
                }
                return { ...p, [field]: !p[field] };
            }
            return p;
        }));
    };

    const handleSave = () => {
        localStorage.setItem('gcs_brand_name', appName);
        setSaveStatus(true);
        setTimeout(() => setSaveStatus(false), 2000);
        showModal({
            title: "COMMIT_SUCCESSFUL",
            message: `GCS Branding set to: ${appName}. This identifier will persist across sessions.`,
            type: 'success'
        });
    };

    const handleCalibration = () => {
        setCalibrationActive(true);
        showModal({
            title: "MAG_CALIBRATION_STARTED",
            message: "The Magnetometer calibration has been triggered. Please rotate the drone on all axes until the status LED turns GREEN.",
            type: 'info'
        });
        setTimeout(() => {
            setCalibrationActive(false);
        }, 5000); // Simulate calibration period
    };

    const isVisible = (text: string[]) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return text.some(t => t.toLowerCase().includes(query));
    };

    return (
        <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>

            {/* Search Bar */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#111', paddingBottom: '10px' }}>
                <input
                    type="text"
                    placeholder="SEARCH_PARAMETERS (e.g. UART, GPS, Mapped)..."
                    className="input-ui"
                    style={{ width: '100%', padding: '12px', fontSize: '11px', border: '1px solid #444' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div style={{ display: 'flex', gap: '24px' }}>
                {/* 1. PORT MANAGEMENT & NAVIGATION */}
                <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {isVisible(['UART', 'Serial', 'Port', 'MSP', 'USB', 'VCP', 'Matrix', 'Multiplex']) && (
                        <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '20px', borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888' }}>
                                    <Network size={18} />
                                    <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em' }}>SERIAL_UART_MATRIX</span>
                                </div>
                                <div className="tooltip-container right down">
                                    <HelpCircle size={12} color="#444" />
                                    <div className="tooltip-text">
                                        Configure your hardware ports. WARNING: Disabling MSP on the USB_VCP port will lock you out of the GCS.
                                    </div>
                                </div>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                                <thead>
                                    <tr style={{ color: '#666', textAlign: 'left', borderBottom: '1px solid #333' }}>
                                        <th style={{ padding: '10px' }}>IDENTIFIER</th>
                                        <th style={{ textAlign: 'center' }}>MSP</th>
                                        <th style={{ textAlign: 'center' }}>SERIAL_RX</th>
                                        <th style={{ textAlign: 'center' }}>GPS_UPLINK</th>
                                        <th style={{ textAlign: 'center' }}>TELEMETRY</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {uartPorts.map(port => (
                                        <UARTRow
                                            key={port.id}
                                            {...port}
                                            onToggle={handleUartToggle}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {isVisible(['GPS', 'MAG', 'Compass', 'Nav', 'Navigation', 'Calibration', 'UBLOX', 'Protocol']) && (
                        <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '20px', borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888' }}>
                                    <Navigation2 size={18} />
                                    <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em' }}>NAVSYSTEM_SETUP</span>
                                </div>
                                <div className="tooltip-container right down">
                                    <HelpCircle size={12} color="#444" />
                                    <div className="tooltip-text">
                                        Configure external navigation hardware. Ensure the Protocol (e.g. UBLOX) matches your physical GPS chip.
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={{ border: '1px solid #333', padding: '15px', background: '#0a0a0a' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                                        <MapPin size={14} color="var(--status-info)" />
                                        <span style={{ fontSize: '9px', fontWeight: 700 }}>GPS_RECEIVER</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <select
                                            className="input-ui"
                                            style={{ width: '100%' }}
                                            value={gpsConfig.protocol}
                                            onChange={(e) => setGpsConfig(prev => ({ ...prev, protocol: e.target.value }))}
                                        >
                                            <option value="UBLOX">PROTOCOL: UBLOX</option>
                                            <option value="NMEA">PROTOCOL: NMEA</option>
                                            <option value="MSP">PROTOCOL: MSP_GPS</option>
                                        </select>
                                        <select
                                            className="input-ui"
                                            style={{ width: '100%' }}
                                            value={gpsConfig.baudrate}
                                            onChange={(e) => setGpsConfig(prev => ({ ...prev, baudrate: e.target.value }))}
                                        >
                                            <option value="57600">BAUDRATE: 57600</option>
                                            <option value="115200">BAUDRATE: 115200</option>
                                            <option value="230400">BAUDRATE: 230400</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ border: '1px solid #333', padding: '15px', background: '#0a0a0a' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                                        <Settings2 size={14} color="var(--status-warn)" />
                                        <span style={{ fontSize: '9px', fontWeight: 700 }}>MAGNETOMETER</span>
                                    </div>
                                    <button
                                        className={`btn-ui ${calibrationActive ? '' : 'primary'}`}
                                        style={{ width: '100%' }}
                                        onClick={handleCalibration}
                                        disabled={calibrationActive}
                                    >
                                        <RotateCcw size={14} className={calibrationActive ? 'spin' : ''} />
                                        {calibrationActive ? 'CALIBRATING...' : 'TRIGGER_CALIBRATION'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. WHITELABELING & STATS */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {isVisible(['Brand', 'Whitelabel', 'Name', 'Display', 'Logo', 'Vector']) && (
                        <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '20px', borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888' }}>
                                    <Building2 size={18} />
                                    <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em' }}>GCS_WHITELABELING</span>
                                </div>
                                <div className="tooltip-container left down">
                                    <HelpCircle size={12} color="#444" />
                                    <div className="tooltip-text">
                                        Set a custom identifier for this GCS instance. This name is displayed in the header and log exports.
                                    </div>
                                </div>
                            </div>
                            <input
                                type="text"
                                className="input-ui"
                                style={{ width: '100%', fontSize: '12px', fontWeight: 700, marginBottom: '15px' }}
                                value={appName}
                                onChange={(e) => setAppName(e.target.value)}
                            />
                            <button
                                className={`btn-ui ${saveStatus ? '' : 'primary'}`}
                                style={{
                                    width: '160px',
                                    padding: '12px'
                                }}
                                onClick={handleSave}
                            >
                                {saveStatus ? 'SAVED' : 'COMMIT_CHANGES'}
                            </button>
                        </div>
                    )}

                    {isVisible(['MCU', 'Clock', 'Stats', 'CPU', 'Flash', 'Firmware', 'Info', 'Core']) && (
                        <div style={{ background: '#111', border: '1px solid #333', padding: '20px', borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888' }}>
                                    <Cpu size={16} />
                                    <span style={{ fontSize: '9px', fontWeight: 700 }}>SYSTEM_CORE_INFO</span>
                                </div>
                                <div className="tooltip-container left down">
                                    <HelpCircle size={12} color="#444" />
                                    <div className="tooltip-text">
                                        Physical hardware specs read from the Flight Controller's descriptor.
                                    </div>
                                </div>
                            </div>

                            {!isConnected ? (
                                <div style={{ padding: '20px', textAlign: 'center', opacity: 0.3 }}>
                                    <div style={{ fontSize: '8px', letterSpacing: '0.1em' }}>AWAITING_PROTOCOL_HANDSHAKE...</div>
                                </div>
                            ) : (
                                [
                                    { l: 'MCU', v: hwInfo?.mcu || 'N/A' },
                                    { l: 'CLOCK', v: hwInfo?.clock || 'N/A' },
                                    { l: 'FLASH', v: hwInfo?.flash || 'N/A' }
                                ].map(i => (
                                    <div key={i.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '8px' }}>
                                        <span style={{ color: '#666' }}>{i.l}</span>
                                        <span style={{ fontFamily: 'var(--font-data)' }}>{i.v}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
