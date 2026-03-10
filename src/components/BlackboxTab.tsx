import { useState, useEffect } from 'react';
import {
    History,
    FileSearch,
    BarChart3,
    Waves,
    Play,
    Pause,
    RotateCcw,
    Binary,
    Maximize2,
    HelpCircle
} from 'lucide-react';
import { useModal } from '../context/ModalContext';

// Reusable Multi-Track Plotter (Engineering Grade)
const MultiTrackPlot = ({ data, color, height = 120, label }: { data: number[], color: string, height?: number, label: string }) => {
    const points = data.map((d, i) => `${i * (1000 / (data.length - 1))},${height / 2 - d * (height / 100)}`).join(' ');
    return (
        <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#666', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>TRACK_ID: {label}</span>
                    <div className="tooltip-container right down">
                        <HelpCircle size={10} color="#444" />
                        <div className="tooltip-text">Timed-domain 'wave' data showing raw sensor or PID loop values.</div>
                    </div>
                </div>
                <span>SAMPLE_RATE: 1.0kHz</span>
            </div>
            <div style={{
                height: `${height}px`,
                background: '#050505',
                border: '1px solid #222',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <svg viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                    <polyline points={points} fill="none" stroke={color} strokeWidth="1" />
                </svg>
                {/* Background Grid */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)', backgroundSize: '50px 20px', pointerEvents: 'none' }} />
            </div>
        </div>
    );
};

export const BlackboxTab = () => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [logMetadata, setLogMetadata] = useState<any>(null);
    const [isMaximized, setIsMaximized] = useState(false);
    const { showModal } = useModal();

    // Mock Data Streams (100 points)
    const [track1, setTrack1] = useState(Array.from({ length: 100 }, () => (Math.random() - 0.5) * 40));
    const [track2, setTrack2] = useState(Array.from({ length: 100 }, () => (Math.random() - 0.5) * 20));
    const [track3, setTrack3] = useState(Array.from({ length: 100 }, () => Math.sin(Math.random()) * 30));

    // Playback Timer & Data Simulation
    useEffect(() => {
        let interval: any;
        if (isPlaying && isLoaded) {
            interval = setInterval(() => {
                setCurrentTime(prev => (prev + 0.1) % 165); // Loop at 2:45 (165s)

                // Jiggle data to simulate playback
                setTrack1(prev => [...prev.slice(1), (Math.random() - 0.5) * 40]);
                setTrack2(prev => [...prev.slice(1), (Math.random() - 0.5) * 20]);
                setTrack3(prev => [...prev.slice(1), Math.sin(Date.now() / 100) * 30]);
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isPlaying, isLoaded]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
    };

    const handleFileUpload = (e: any) => {
        const file = e.target.files[0];
        if (file) {
            setIsLoaded(true);
            setLogMetadata({
                name: file.name,
                size: (file.size / 1024).toFixed(1) + ' KB',
                duration: '02:45',
                fc_target: 'MATEKF405',
                start_time: new Date().toLocaleTimeString()
            });
            setCurrentTime(0);
        }
    };

    const handleExport = () => {
        showModal({
            title: "EXPORT_INITIALIZED",
            message: `Preparing CSV export for ${logMetadata?.name || 'current_log'}. This may take a moment for large files.`,
            type: 'success'
        });
    };

    return (
        <div style={{
            padding: '24px',
            height: '100%',
            display: 'flex',
            gap: '24px',
            overflowX: 'hidden',
            position: 'relative'
        }}>
            {/* 1. Log Logistics Sidebar */}
            <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '20px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888' }}>
                            <FileSearch size={18} />
                            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em' }}>LOG_UPLINK</span>
                        </div>
                        <div className="tooltip-container right down">
                            <HelpCircle size={12} color="#444" />
                            <div className="tooltip-text">Upload your onboard flight logs (.btf, .bbl, .csv) for deep forensic analysis. Review PID performance and hardware health after a mission.</div>
                        </div>
                    </div>

                    {!isLoaded ? (
                        <div
                            style={{
                                border: '2px dashed #333',
                                padding: '40px 20px',
                                textAlign: 'center',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                            onClick={() => document.getElementById('bb-upload')?.click()}
                        >
                            <History size={32} color="#444" style={{ marginBottom: '12px' }} />
                            <div style={{ fontSize: '9px', color: '#666' }}>DRAG_AND_DROP_LOG_FILE</div>
                            <div style={{ fontSize: '8px', color: '#444', marginTop: '4px' }}>.btf, .bbl, .csv supported</div>
                            <input type="file" id="bb-upload" hidden onChange={handleFileUpload} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                                <div style={{ fontSize: '9px', color: '#666' }}>FILE_IDENTIFIER</div>
                                <div style={{ fontSize: '11px', color: 'var(--status-ok)', fontWeight: 600 }}>{logMetadata.name}</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <div style={{ fontSize: '8px', color: '#666' }}>LOG_SIZE</div>
                                    <div style={{ fontSize: '10px' }}>{logMetadata.size}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '8px', color: '#666' }}>DURATION</div>
                                    <div style={{ fontSize: '10px' }}>{logMetadata.duration}</div>
                                </div>
                            </div>
                            <button className="btn-ui" style={{ width: '100%', padding: '10px', marginTop: '10px' }} onClick={() => { setIsLoaded(false); setIsPlaying(false); }}>
                                <RotateCcw size={14} /> UNLOAD_DATA
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. FFT Spectrum (Placeholder Mock) */}
                <div style={{ flex: 1, background: '#111', border: '1px solid #333', padding: '15px', borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888' }}>
                            <Waves size={14} />
                            <span style={{ fontSize: '9px', fontWeight: 700 }}>SPECTRUM_ANALYSIS (FFT)</span>
                        </div>
                        <div className="tooltip-container right down">
                            <HelpCircle size={10} color="#444" />
                            <div className="tooltip-text">Frequency domain representation of your gyro data. High peaks indicate mechanical vibrations or electrical noise. Unlike the 'waves' on the right, this is a spectral snapshot.</div>
                        </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '2px', background: '#050505', padding: '10px', position: 'relative' }}>
                        {Array.from({ length: 40 }).map((_, i) => (
                            <div key={i} style={{
                                flex: 1,
                                background: i > 25 ? 'var(--status-err)' : i > 15 ? 'var(--status-warn)' : 'var(--status-info)',
                                height: `${(isPlaying ? Math.random() : 0.5) * 80 + 10}%`,
                                opacity: 0.6,
                                transition: 'height 0.1s ease'
                            }} />
                        ))}
                        <div style={{ position: 'absolute', bottom: '2px', left: '10px', fontSize: '7px', color: '#444' }}>0Hz</div>
                        <div style={{ position: 'absolute', bottom: '2px', right: '10px', fontSize: '7px', color: '#444' }}>500Hz</div>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '8px', color: '#666', fontStyle: 'italic' }}>
                        Vibration signature identified in 200Hz - 250Hz band.
                    </div>
                </div>
            </div>

            {/* 3. Main Plotter Area */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                ...(isMaximized ? {
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    right: '12px',
                    bottom: '12px',
                    zIndex: 100,
                    background: 'var(--bg-primary)'
                } : {})
            }}>
                <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '10px 20px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button
                            className={`btn-ui ${isPlaying ? 'primary' : ''}`}
                            onClick={() => setIsPlaying(!isPlaying)}
                            disabled={!isLoaded}
                        >
                            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <div style={{ height: '14px', width: '1px', background: '#333' }} />
                        <div style={{ fontSize: '10px', fontFamily: 'var(--font-data)', color: '#aaa' }}>
                            {formatTime(currentTime)} / 00:02:45
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn-ui primary" onClick={handleExport} disabled={!isLoaded}><Binary size={14} /> EXPORT_CSV</button>
                        <button className={`btn-ui ${isMaximized ? 'primary' : ''}`} onClick={() => setIsMaximized(!isMaximized)}>
                            <Maximize2 size={14} />
                        </button>
                    </div>
                </div>

                <div style={{
                    flex: 1,
                    background: '#0a0a0a',
                    border: '1px solid #333',
                    padding: '24px',
                    overflowY: 'auto'
                }}>
                    {!isLoaded ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                            <BarChart3 size={64} color="#888" style={{ marginBottom: '20px' }} />
                            <div style={{ fontSize: '10px', letterSpacing: '0.2em' }}>AWAITING_DATA_INGESTION</div>
                        </div>
                    ) : (
                        <>
                            <MultiTrackPlot data={track1} color="var(--status-ok)" label="GYRO_RATE_PITCH" />
                            <MultiTrackPlot data={track2} color="var(--status-info)" label="PID_LOOP_P" />
                            <MultiTrackPlot data={track3} color="var(--status-warn)" label="ACCEL_Z_RAW" />
                            <MultiTrackPlot data={track1} color="#9c27b0" label="MOTOR_DYNAMICS_1" />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
