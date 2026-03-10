import { HelpCircle } from "lucide-react";

interface DiagnosticsPanelProps {
    vbatt: number;
    cpuLoad: number;
    isConnected: boolean;
    linkStatus: 'OK' | 'LOST' | 'INITIALIZING';
    attitude: { pitch: number, roll: number, yaw: number };
    mspProtocol: string;
    gyroLoop: string;
    accelGrav: string;
    gnssFix: string;
    satellites: number;
    hdop: number;
}

export const DiagnosticsPanel = ({
    vbatt, cpuLoad, isConnected, linkStatus, attitude,
    mspProtocol, gyroLoop, accelGrav, gnssFix, satellites, hdop
}: DiagnosticsPanelProps) => {
    const getVbattStatus = () => {
        if (!isConnected) return 'none';
        if (vbatt < 13.6) return 'err'; // Critical (3S/4S low)
        if (vbatt < 14.8) return 'warn'; // Warning
        return 'ok';
    };

    const getCpuStatus = () => {
        if (!isConnected) return 'none';
        if (cpuLoad > 80) return 'err';
        if (cpuLoad > 50) return 'warn';
        return 'ok';
    };

    const getLinkStatus = () => {
        if (!isConnected) return 'err';
        if (linkStatus === 'LOST') return 'err';
        return 'ok';
    };

    const Row = ({ label, value, status }: { label: string, value: string, status?: 'ok' | 'err' | 'warn' | 'none' }) => (
        <div className="diag-item">
            <span>{label}</span>
            <span style={{
                color: status === 'ok' ? 'var(--status-ok)' :
                    status === 'err' ? 'var(--status-err)' :
                        status === 'warn' ? 'var(--status-warn)' : 'var(--text-dim)',
                fontWeight: status && status !== 'none' ? 700 : 400
            }}>{value}</span>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="diag-head" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                SYSTEM_HEALTH
                <div className="tooltip-container down">
                    <HelpCircle size={10} color="#666" />
                    <div className="tooltip-text">
                        Monitors the Flight Controller's core operational status, including real-time battery voltage health, CPU processing load, and the active MSP communication link stability.
                    </div>
                </div>
            </div>
            <Row
                label="FC_UPLINK"
                value={isConnected ? (linkStatus === 'OK' ? 'CONNECTED' : 'LOST') : 'OFFLINE'}
                status={getLinkStatus()}
            />
            <Row
                label="VOLTAGE_HEALTH"
                value={isConnected ? `${(vbatt || 0).toFixed(2)}V` : '---V'}
                status={getVbattStatus()}
            />
            <Row
                label="COMPUTE_LOAD"
                value={isConnected ? `${(cpuLoad || 0).toFixed(1)}%` : '---%'}
                status={getCpuStatus()}
            />
            <Row label="MSP_PROTOCOL" value={isConnected ? mspProtocol : 'OFFLINE'} status={isConnected ? 'ok' : 'none'} />

            <div className="diag-head" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                SENSOR_FUSION
                <div className="tooltip-container">
                    <HelpCircle size={10} color="#666" />
                    <div className="tooltip-text">
                        Processed high-frequency sensor data. Gyro Loop shows the current filtering cycle, while Accel/Grav verifies the gravity vector. Pitch and Roll represent calculated aircraft orientation.
                    </div>
                </div>
            </div>
            <Row label="GYRO_LOOP" value={isConnected ? gyroLoop : '---'} status={isConnected ? 'ok' : 'none'} />
            <Row label="ACCEL_GRAV" value={isConnected ? accelGrav : '---'} status={isConnected ? 'ok' : 'none'} />
            <Row label="ATTITUDE_P" value={isConnected ? `${(attitude?.pitch || 0).toFixed(1)}°` : '---°'} status="none" />
            <Row label="ATTITUDE_R" value={isConnected ? `${(attitude?.roll || 0).toFixed(1)}°` : '---°'} status="none" />

            <div className="diag-head" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                NAVIGATION_UPLINK
                <div className="tooltip-container">
                    <HelpCircle size={10} color="#666" />
                    <div className="tooltip-text">
                        Monitors the Global Navigation Satellite System (GNSS) uplink. Tracks satellite lock count and HDOP (Horizontal Dilution of Precision). A lower HDOP value signifies higher positional accuracy.
                    </div>
                </div>
            </div>
            <Row
                label="GNSS_FIX"
                value={isConnected ? gnssFix : 'OFFLINE'}
                status={!isConnected ? 'none' : (gnssFix === '3D_FIX' ? 'ok' : 'err')}
            />
            <Row label="SATELLITES" value={isConnected ? satellites.toString() : '---'} status="none" />
            <Row
                label="HDOP"
                value={isConnected ? hdop.toFixed(2) : '---'}
                status={!isConnected ? 'none' : (hdop < 2.0 ? 'ok' : 'err')}
            />

            {linkStatus === 'LOST' && (
                <div style={{
                    marginTop: 'auto',
                    padding: '12px',
                    background: 'rgba(229, 57, 53, 0.1)',
                    border: '1px solid var(--status-err)',
                    borderRadius: '4px',
                    fontSize: '9px',
                    color: 'var(--status-err)',
                    animation: 'pulse 2s infinite'
                }}>
                    <b>CRITICAL_FAIL:</b> TELEMETRY_TIMEOUT. Check physical wiring and baudrate settings.
                </div>
            )}
        </div>
    );
};
