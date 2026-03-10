import { useState, useEffect, useRef } from 'react';
import { HelpCircle } from 'lucide-react';

interface TelemetryGraphProps {
    data: number;
    label: string;
    color: string;
    min: number;
    max: number;
    limit?: number;
    tooltip?: string;
    tooltipOrientation?: string;
    isConnected?: boolean;
}

export const TelemetryGraph = ({
    data,
    label,
    color,
    min,
    max,
    limit = 100,
    tooltip,
    tooltipOrientation = "left down",
    isConnected = true
}: TelemetryGraphProps) => {
    const [history, setHistory] = useState<number[]>(new Array(limit).fill(0));
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        setHistory(prev => {
            const next = [...prev.slice(1), data];
            return next;
        });
    }, [data]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Draw Grids
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw Line
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';

        history.forEach((val, i) => {
            const x = (width / (limit - 1)) * i;
            let normalized = (val - min) / (max - min);

            // Safety guard for Infinity/NaN
            if (!isFinite(normalized)) normalized = 0;

            const y = height - (normalized * height);

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw Gradient Fill
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `${color}44`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fill();

    }, [history, color, min, max, limit]);

    return (
        <div style={{
            background: '#0a0a0a',
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '12px',
            flex: 1,
            minWidth: '240px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#666', letterSpacing: '0.1em' }}>{label.toUpperCase()}</span>
                    {tooltip && (
                        <div className={`tooltip-container ${tooltipOrientation}`}>
                            <HelpCircle size={10} color="#444" />
                            <div className="tooltip-text">{tooltip}</div>
                        </div>
                    )}
                </div>
                <span style={{
                    fontSize: '11px',
                    color: isConnected ? color : '#444',
                    fontFamily: 'var(--font-data)',
                    fontWeight: 600
                }}>
                    {isConnected ? (data || 0).toFixed(1) : "---"}
                </span>
            </div>
            <canvas
                ref={canvasRef}
                width={400}
                height={100}
                style={{
                    width: '100%',
                    height: '80px',
                    display: 'block',
                    opacity: isConnected ? 1 : 0.2,
                    transition: 'opacity 0.3s'
                }}
            />
        </div>
    );
};
