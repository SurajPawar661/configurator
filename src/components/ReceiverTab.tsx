import { HelpCircle } from "lucide-react";

interface ReceiverTabProps {
    channels: number[]; // 1000 - 2000 range
    isConnected: boolean;
}

const CH_NAMES = [
    "ROLL", "PITCH", "YAW", "THROTTLE",
    "AUX 1", "AUX 2", "AUX 3", "AUX 4",
    "AUX 5", "AUX 6", "AUX 7", "AUX 8"
];

export const ReceiverTab = ({ channels, isConnected }: ReceiverTabProps) => {
    return (
        <div style={{
            padding: '24px',
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
        }}>
            {/* 1. HEADER SECTION */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #333',
                paddingBottom: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.1em', color: '#eee', fontWeight: 800 }}>RX_CHANNEL_MONITOR</h3>
                    <div className="tooltip-container down">
                        <HelpCircle size={12} color="#444" />
                        <div className="tooltip-text" style={{ width: '250px' }}>
                            Displays real-time pulse width modulation (PWM) values from your radio receiver. Standard range is 1000-2000µs, with 1500µs as the center. Use this to verify stick movement and switch assignments.
                        </div>
                    </div>
                </div>
                <div style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color: isConnected ? 'var(--status-ok)' : '#666',
                    padding: '4px 10px',
                    background: isConnected ? 'rgba(67, 160, 71, 0.1)' : '#111',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: isConnected ? 'rgba(67, 160, 71, 0.2)' : '#222'
                }}>
                    {isConnected ? 'PROTOCOL :: CRSF / 150Hz' : 'SYSTEM_OFFLINE'}
                </div>
            </div>

            {/* 2. MAIN CONTENT AREA */}
            <div style={{
                display: 'flex',
                gap: '40px',
                flex: 1,
                minHeight: 0
            }}>
                {/* Left Side: Channel Bars (60% width) */}
                <div style={{
                    flex: '1.5',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '24px 40px',
                    opacity: isConnected ? 1 : 0.3,
                    transition: 'opacity 0.3s',
                    background: '#0a0a0a',
                    padding: '20px',
                    border: '1px solid #1a1a1a',
                    borderRadius: '4px'
                }}>
                    {/* Primary Channels Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '8px', color: '#444', marginBottom: '4px', letterSpacing: '0.2em' }}>PRIMARY_CHANNELS</div>
                        {CH_NAMES.slice(0, 4).map((name, i) => (
                            <ChannelBar key={name} name={name} value={channels[i]} isPrimary isConnected={isConnected} />
                        ))}
                    </div>

                    {/* AUX Channels Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '8px', color: '#444', marginBottom: '4px', letterSpacing: '0.2em' }}>AUXILIARY_CHANNELS</div>
                        {CH_NAMES.slice(4).map((name, i) => (
                            <ChannelBar key={name} name={name} value={channels[i + 4]} isConnected={isConnected} />
                        ))}
                    </div>
                </div>

                {/* Right Side: Stick Preview (Fixed width) */}
                <div style={{
                    width: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    opacity: isConnected ? 1 : 0.3,
                    transition: 'opacity 0.3s',
                    background: '#0d0d0d',
                    padding: '20px',
                    border: '1px solid #222',
                    borderRadius: '4px',
                    alignSelf: 'flex-start'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '10px', color: '#888', fontWeight: 600, letterSpacing: '0.1em' }}>STICK_POSITION</div>
                        <div className="tooltip-container">
                            <HelpCircle size={10} color="#444" />
                            <div className="tooltip-text">
                                Visual gimbal preview. T/Y (Throttle/Yaw) on the left, R/P (Roll/Pitch) on the right.
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                        <StickGimbal name="LEFT (T/Y)" x={channels[2]} y={channels[3]} isConnected={isConnected} />
                        <StickGimbal name="RIGHT (R/P)" x={channels[0]} y={channels[1]} isConnected={isConnected} />
                    </div>

                    <div style={{ marginTop: '10px', padding: '10px', borderTop: '1px solid #1a1a1a', fontSize: '9px', color: '#444', fontStyle: 'italic' }}>
                        * Verify stick directions and range before first flight. Standard 1500 center recommended.
                    </div>
                </div>
            </div>
        </div>
    );
};

const ChannelBar = ({ name, value, isPrimary, isConnected }: { name: string, value: number, isPrimary?: boolean, isConnected: boolean }) => {
    const safeValue = value || (isPrimary ? 1500 : 1000);
    const percentage = ((safeValue - 1000) / 1000) * 100;
    const hasSignal = isConnected && value > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: 'var(--font-data)', letterSpacing: '0.05em' }}>
                <span style={{ color: isPrimary ? '#bbb' : '#666', fontWeight: isPrimary ? 700 : 400 }}>{name}</span>
                <span style={{
                    color: !hasSignal ? '#333' : (value > 1900 || value < 1100 ? 'var(--status-warn)' : 'var(--accent)'),
                    fontWeight: 800
                }}>
                    {hasSignal ? value : "---"}
                </span>
            </div>
            <div style={{ height: '8px', background: '#050505', border: '1px solid #1a1a1a', position: 'relative', borderRadius: '1px' }}>
                <div
                    style={{
                        height: '100%',
                        width: `${hasSignal ? percentage : 0}%`,
                        background: isPrimary ? '#333' : '#1a1a1a',
                        transition: 'width 0.1s ease-out',
                        boxShadow: isPrimary && hasSignal ? '0 0 5px rgba(255,255,255,0.05)' : 'none'
                    }}
                />
                {/* Deadband Center Line */}
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: '#222', opacity: 0.8 }} />
            </div>
        </div>
    );
};

const StickGimbal = ({ name, x, y, isConnected }: { name: string, x: number, y: number, isConnected: boolean }) => {
    // Map 1000-2000 to -40 to 40
    const hasSignal = isConnected && x > 0 && y > 0;
    const posX = hasSignal ? ((x - 1500) / 500) * 50 : 0;
    const posY = hasSignal ? -((y - 1500) / 500) * 50 : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{
                width: '120px',
                height: '120px',
                background: '#050505',
                border: '1px solid #222',
                position: 'relative',
                borderRadius: '4px'
            }}>
                {/* Grid */}
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: '#111' }} />
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#111' }} />

                {/* Visual Bounds */}
                <div style={{ position: 'absolute', inset: '10px', border: '1px dashed #111', borderRadius: '2px' }} />

                {/* Stick Dot */}
                <div
                    style={{
                        position: 'absolute',
                        left: `calc(50% + ${posX}px)`,
                        top: `calc(50% + ${posY}px)`,
                        width: '8px',
                        height: '8px',
                        background: hasSignal ? 'var(--accent)' : '#222',
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: hasSignal ? '0 0 15px var(--accent)' : 'none',
                        transition: 'left 0.1s ease-out, top 0.1s ease-out'
                    }}
                />
            </div>
            <div style={{ fontSize: '9px', color: '#555', fontWeight: 600, letterSpacing: '0.05em' }}>{name}</div>
        </div>
    );
};
