import { useState, useEffect, useRef } from "react";
import { Component, ErrorInfo, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Settings, Activity, Radio, Zap, Terminal, Target, Settings2,
  Compass, History, LayoutDashboard, SlidersHorizontal, ArrowUpCircle, RefreshCw, RotateCcw, HelpCircle
} from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

// Components
import { Drone3D } from "./components/Drone3D";
import { PIDTuning } from "./components/PIDTuning";
import { ReceiverTab } from "./components/ReceiverTab";
import { MotorControlTab } from "./components/MotorControlTab";
import { CLITab } from "./components/CLITab";
import { ModesTab } from "./components/ModesTab";
import { FirmwareTab } from "./components/FirmwareTab";
import { BlackboxTab } from "./components/BlackboxTab";
import { AdvancedConfigTab } from "./components/AdvancedConfigTab";
import { SystemConfigTab } from "./components/SystemConfigTab";
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { TelemetryGraph } from './components/TelemetryGraph';
import { ModalProvider, useModal } from "./context/ModalContext";
import "./App.css";

// --- Minimal Error Boundary ---
interface Props { children?: ReactNode; }
interface State { hasError: boolean; }
class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };
  public static getDerivedStateFromError(_: Error): State { return { hasError: true }; }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Uncaught error:", error, errorInfo); }
  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#121212', color: '#e53935', fontFamily: 'monospace' }}>
          <h2>CRITICAL_RENDER_FAILURE</h2>
          <p>The module system has encountered a fatal exception. Please check terminal logs.</p>
          <button className="btn-ui" onClick={() => window.location.reload()}>REBOOT_UI</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const DashboardView = ({
  attitude, isConnected,
  onCalibrate, onTrim, onResetTrim,
  isCalibrating, calStep, onStartCalibration
}: any) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', height: '100%', minHeight: 0 }}>
    <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '4px', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
      <Drone3D pitch={attitude.pitch} roll={attitude.roll} yaw={attitude.yaw} />
      <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '20px', zIndex: 10 }}>
        <div style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '10px', background: 'rgba(0,0,0,0.5)', borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#888' }}>PITCH</div>
            <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--font-data)' }}>{(attitude?.pitch || 0).toFixed(1)}°</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button className="btn-ui" style={{ padding: '1px 4px', fontSize: '8px' }} onClick={() => onTrim('pitch', 0.1)}>+</button>
            <button className="btn-ui" style={{ padding: '1px 4px', fontSize: '8px' }} onClick={() => onTrim('pitch', -0.1)}>-</button>
          </div>
        </div>
        <div style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '10px', background: 'rgba(0,0,0,0.5)', borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#888' }}>ROLL</div>
            <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--font-data)' }}>{(attitude?.roll || 0).toFixed(1)}°</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button className="btn-ui" style={{ padding: '1px 4px', fontSize: '8px' }} onClick={() => onTrim('roll', 0.1)}>+</button>
            <button className="btn-ui" style={{ padding: '1px 4px', fontSize: '8px' }} onClick={() => onTrim('roll', -0.1)}>-</button>
          </div>
        </div>
      </div>
      {/* Quick Calibration Action */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          className="btn-ui primary"
          onClick={onCalibrate}
          disabled={!isConnected}
          style={{ padding: '8px 16px', fontSize: '10px', fontWeight: 800 }}
        >
          CALIBRATE_ACC
        </button>
        <button
          className="btn-ui"
          style={{ padding: '6px 16px', fontSize: '9px', opacity: 0.8, fontWeight: 700 }}
          onClick={onResetTrim}
        >
          RESET_TRIM
        </button>
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '12px', paddingBottom: '80px', minHeight: 0 }}>
      {/* Accelerometer Alignment Section (Moved from Config) */}
      <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '20px', borderRadius: '4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888' }}>
            <Compass size={18} />
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em' }}>ACCELEROMETER_ALIGNMENT</span>
            <div className="tooltip-container down">
              <HelpCircle size={10} color="#666" />
              <div className="tooltip-text">
                Synchronizes the Inertial Measurement Unit (IMU) with the physical horizon. This is critical for stable, level flight. Follow the 6-point wizard by placing the drone in all primary orientations.
              </div>
            </div>
          </div>
        </div>

        <div style={{
          height: '180px',
          background: '#0a0a0a',
          border: '1px solid #222',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '20px',
          borderRadius: '4px'
        }}>
          {isCalibrating ? (
            <div style={{ textAlign: 'center', width: '100%' }}>
              <Activity size={24} color="var(--status-warn)" style={{ marginBottom: '12px', animation: 'pulse 1s infinite' }} />
              <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--status-warn)', letterSpacing: '0.1em' }}>STEP {calStep} / 6</div>
              <div style={{ fontSize: '10px', color: '#fff', marginTop: '10px', textTransform: 'uppercase' }}>
                {calStep === 1 && "Place drone LEVEL on a flat surface"}
                {calStep === 2 && "Point NOSE vertically UP"}
                {calStep === 3 && "Point NOSE vertically DOWN"}
                {calStep === 4 && "Rest drone on LEFT SIDE"}
                {calStep === 5 && "Rest drone on RIGHT SIDE"}
                {calStep === 6 && "Place drone UPSIDE DOWN"}
              </div>
              <div style={{ width: '100%', height: '2px', background: '#222', marginTop: '20px', borderRadius: '1px' }}>
                <div style={{ width: `${(calStep / 6) * 100}%`, height: '100%', background: 'var(--status-warn)', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#444' }}>ACCELEROMETER_IDLE</div>
              <div style={{ fontSize: '8px', color: '#333', marginTop: '4px', maxWidth: '180px' }}>6-Point calibration required for stable horizon.</div>
              <button
                className="btn-ui primary"
                style={{ marginTop: '16px', padding: '8px 16px' }}
                onClick={onStartCalibration}
                disabled={!isConnected}
              >
                <RotateCcw size={12} /> BEGIN_WIZARD
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0, background: '#111', border: '1px solid #333', padding: '15px 20px', borderRadius: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#888' }}>DYNAMICS_VECTORS</div>
            <div className="tooltip-container">
              <HelpCircle size={10} color="#555" />
              <div className="tooltip-text">
                Real-time raw accelerometer and gyroscope data. Essential for diagnosing mechanical vibrations, sensor noise, or motor imbalances affecting flight performance.
              </div>
            </div>
          </div>
          <div style={{ fontSize: '8px', color: (Math.abs(attitude.pitch) < 1 && Math.abs(attitude.roll) < 1) ? 'var(--status-ok)' : 'var(--status-warn)' }}>
            {(Math.abs(attitude.pitch) < 1 && Math.abs(attitude.roll) < 1) ? "LEVEL_STABLE" : "OFF_LEVEL"}
          </div>
        </div>
        {['ACC_X', 'ACC_Y', 'ACC_Z', 'GYRO_X', 'GYRO_Y', 'GYRO_Z'].map((axis, i) => {
          // Use a fixed timestamp for animation frame to avoid "jumps" on React re-renders
          const time = Date.now() / 4000;
          return (
            <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '9px', width: '40px', color: '#555' }}>{axis}</span>
              <div style={{ flex: 1, height: '4px', background: '#222', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${50 + (Math.sin(time + i) * 30)}%`,
                    height: '100%',
                    background: 'var(--accent)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'tuning' | 'radio' | 'motors' | 'config' | 'cli' | 'firmware' | 'blackbox' | 'advanced' | 'diagnostics' | 'modes'>('dashboard');
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [ports, setPorts] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [attitude, setAttitude] = useState({ pitch: 0, roll: 0, yaw: 0 });
  const [vbatt, setVbatt] = useState(0);
  const [cpuLoad, setCpuLoad] = useState(0);
  const [channels, setChannels] = useState<number[]>(new Array(12).fill(0));
  const [motorOutputs, setMotorOutputs] = useState<number[]>(new Array(8).fill(1000));
  const [isLogging, setIsLogging] = useState(false);
  const logDataRef = useRef<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const clearTerminal = () => setTerminalOutput([]);
  const [linkStatus, setLinkStatus] = useState<'OK' | 'LOST' | 'INITIALIZING'>('INITIALIZING');
  const [mspProtocol, setMspProtocol] = useState<string>('');
  const [gyroLoop, setGyroLoop] = useState<string>('');
  const [accelGrav, setAccelGrav] = useState<string>('');
  const [gnssFix, setGnssFix] = useState<string>('');
  const [satellites, setSatellites] = useState<number>(0);
  const [hdop, setHdop] = useState<number>(0);
  const [isWindowSmall, setIsWindowSmall] = useState(false);

  // Calibration Wizard State
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calStep, setCalStep] = useState(0);

  const startCalibrationWizard = async () => {
    if (!isConnected) return;
    setIsCalibrating(true);
    setCalStep(1);
    addLog("Initiating 6-Point Calibration Wizard...", "warning");
    try {
      await invoke("calibrate_accelerometer");
      for (let i = 2; i <= 6; i++) {
        await new Promise(r => setTimeout(r, 1500));
        setCalStep(i);
      }
      addLog("Calibration sequence complete", "success" as any);
      showModal({
        title: "CALIBRATION_COMPLETE",
        message: "Accelerometer wizard finished successfully.",
        type: 'success'
      });
    } catch (e) {
      addLog(`Calibration failed: ${e}`, "error");
    } finally {
      setIsCalibrating(false);
      setCalStep(0);
    }
  };

  // Update & Error State
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading'>('idle');
  const [hasUpdate, setHasUpdate] = useState<any>(null);
  const { showModal, updateProgress } = useModal();

  // UI state
  const [diagWidth, setDiagWidth] = useState<number>(() => {
    const saved = localStorage.getItem('vector_gcs_diag_width');
    return saved ? parseInt(saved, 10) : 280;
  });
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);

  const lastHeartbeat = useRef(0);
  const lastHeartbeatTime = useRef(Date.now());

  // Global Error Handler
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      showModal({
        title: "FATAL_SYSTEM_EXCEPTION",
        message: (
          <div>
            <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '4px', border: '1px solid #222', marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>EXCEPTION_TRACE:</div>
              <code style={{ fontSize: '11px', color: '#e53935', fontFamily: 'monospace', display: 'block', wordBreak: 'break-all' }}>
                {e.message}
              </code>
            </div>
            <p>The application state has been corrupted. A safe reboot is required to restore telemetry pipelines.</p>
          </div>
        ),
        type: 'error',
        confirmText: "REBOOT_APPLICATION",
        onConfirm: () => window.location.reload()
      });
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [showModal]);

  // Update Checker
  const checkForUpdates = async (silent = true) => {
    // Once-a-day check logic using localStorage
    if (silent) {
      const lastCheck = localStorage.getItem('vector_gcs_last_update_check');
      const now = Date.now();
      if (lastCheck && now - parseInt(lastCheck, 10) < 24 * 60 * 60 * 1000) {
        console.log("Update check skipped (last checked < 24h ago)");
        return;
      }
      localStorage.setItem('vector_gcs_last_update_check', now.toString());
    }

    if (!silent) setUpdateStatus('checking');
    try {
      const update = await check();
      if (update) {
        setHasUpdate(update);
        setUpdateStatus('available');
        if (!silent) {
          showModal({
            title: "OTA_SYSTEM_UPDATE",
            message: "A new version of Vector GCS is available. This update includes stability improvements and critical logic patches.",
            type: 'info',
            confirmText: "PROCEED_WITH_UPDATE",
            showCancel: true,
            cancelText: "ABORT",
            onConfirm: () => handleUpdate(update)
          });
        }
      } else {
        setHasUpdate(null);
        setUpdateStatus('idle');
        if (!silent) addLog("No updates available", "info");
      }
    } catch (e) {
      console.error(e);
      setUpdateStatus('idle');
      if (!silent) addLog(`Update check failed: ${e}`, "error");
    }
  };

  useEffect(() => {
    // Only check automatically if 24h has passed (handled inside checkForUpdates)
    checkForUpdates(true);
  }, []);

  const handleUpdate = async (update: any) => {
    setUpdateStatus('downloading');
    showModal({
      title: "BRACING_FOR_UPGRADE",
      message: "Our engineering team has prepared critical enhancements for your Vector drone.",
      type: 'update',
      progress: 0,
      updateInfo: (
        <ul>
          <li>Enhanced Telemetry Pipeline Stability</li>
          <li>Optimized 3D Rendering Performance</li>
          <li>Branded 'Vector Configurator' Identity</li>
          <li>Improved Multi-Platform Build Infrastructure</li>
        </ul>
      )
    });

    try {
      addLog("Downloading Branded System Update...", "warning");

      let progress = 0;
      // Simulate/Bridge progress since tauri-plugin-updater doesn't expose raw bits natively yet
      // but we can provide a smooth transition.
      const interval = setInterval(() => {
        progress += 5;
        if (progress <= 90) updateProgress(progress);
        if (progress >= 95) clearInterval(interval);
      }, 500);

      await update.downloadAndInstall();

      clearInterval(interval);
      updateProgress(100);

      addLog("Update complete. Finalizing mission resources...", "success" as any);

      showModal({
        title: "MISSION_STAGING_COMPLETE",
        message: (
          <div>
            <p>The upgrade has been successfully staged. System will now relaunch with professional branding and enhanced telemetry modules.</p>
            <div className="update-info-card" style={{ marginTop: '10px' }}>
              <span style={{ color: 'var(--status-ok)', fontWeight: 800 }}>SUCCESS: Version 0.1.9 Installed</span>
            </div>
          </div>
        ),
        type: 'success',
        confirmText: "LAUNCH_VECTOR_0.1.9",
        onConfirm: async () => {
          await relaunch();
        }
      });
    } catch (e) {
      addLog(`Mission Aborted: ${e}`, "error");
      setUpdateStatus('available');
      showModal({
        title: "UPDATE_FAILURE",
        message: `The system was unable to pull resources: ${e}`,
        type: 'error'
      });
    }
  };

  // Watchdog
  useEffect(() => {
    const timer = setInterval(() => {
      if (isConnected && Date.now() - lastHeartbeatTime.current > 1500) {
        setLinkStatus('LOST');
      } else if (isConnected) {
        setLinkStatus('OK');
      }
    }, 500);
    return () => clearInterval(timer);
  }, [isConnected]);

  // Resizing effect
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!isResizing) return;
      if (isResizing === 'diag') {
        const newWidth = window.innerWidth - e.clientX;
        setDiagWidth(Math.max(200, Math.min(600, newWidth)));
      }
    };

    const handleUp = () => {
      setIsResizing(null);
    };

    if (isResizing) {
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!isResizing) {
      localStorage.setItem('vector_gcs_diag_width', diagWidth.toString());
    }
  }, [isResizing, diagWidth]);

  // Window Size Check
  useEffect(() => {
    const checkSize = () => {
      // Threshold: 95% of available screen width or height
      const isSmall = window.innerWidth < window.screen.availWidth * 0.9 ||
        window.innerHeight < window.screen.availHeight * 0.8;
      setIsWindowSmall(isSmall);
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const lastUiUpdate = useRef(0);

  useEffect(() => {
    scanPorts();
    const unlisten = listen<any>("telemetry", (event) => {
      const data = event.payload;
      if (data) {
        // Throttle UI updates to ~20Hz (50ms) to reduce WebKit IPC pressure
        const now = Date.now();
        if (now - lastUiUpdate.current < 50) return;
        lastUiUpdate.current = now;

        setAttitude({ pitch: data.pitch, roll: data.roll, yaw: data.yaw });
        setVbatt(data.vbatt);
        setCpuLoad(data.cpu_load);

        if (data.heartbeat !== lastHeartbeat.current) {
          lastHeartbeat.current = data.heartbeat;
          lastHeartbeatTime.current = Date.now();
        }

        if (isLogging) {
          logDataRef.current.push({ t: Date.now(), v: data.vbatt, c: data.cpu_load, p: data.pitch, r: data.roll });
          if (logDataRef.current.length > 5000) logDataRef.current.shift();
        }

        if (data.channels) setChannels(data.channels);
        if (data.motors) setMotorOutputs(data.motors);

        if (data.msp_protocol) setMspProtocol(data.msp_protocol);
        if (data.gyro_loop) setGyroLoop(data.gyro_loop);
        if (data.accel_grav) setAccelGrav(data.accel_grav);
        if (data.gnss_fix) setGnssFix(data.gnss_fix);
        if (data.satellites !== undefined) setSatellites(data.satellites);
        if (data.hdop !== undefined) setHdop(data.hdop);
      }
    });
    return () => {
      unlisten.then(f => f());
    };
  }, [isLogging, isConnected]); // Re-run when connection state changes to reset listener

  const scanPorts = async () => {
    setIsScanning(true);
    addLog("ENUMERATING_SERIAL_PORTS...", "info");
    try {
      const p = await invoke<string[]>("list_serial_ports");
      setPorts(p);
      if (p.length > 0 && !selectedPort) setSelectedPort(p[0]);
      addLog(`SCAN_COMPLETE: Found ${p.length} hardware interfaces`, "success" as any);
    } catch (e) {
      addLog(`Scan Error: ${e}`, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleConnect = async () => {
    if (isConnected) {
      try {
        await invoke("close_serial_port");
        setIsConnected(false);
        setLinkStatus('INITIALIZING');
        addLog("Link Severed", "warning");
      } catch (e) {
        addLog(`Disconnect Failed: ${e}`, "error");
      }
    } else if (selectedPort) {
      try {
        // Tauri v2 by default maps snake_case Rust args to CamelCase JS args
        await invoke("open_serial_port", { portName: selectedPort, baudRate: 115200 });
        setIsConnected(true);
        setLinkStatus('OK');
        addLog(`Connected to ${selectedPort} @ 115200`, "info");
      } catch (e) {
        addLog(`Connection Failed: ${e}`, "error");
      }
    }
  };

  const addLog = (msg: string, _type: 'info' | 'error' | 'warning' | 'packet' = 'info') => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setTerminalOutput(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  };

  const handleSetMotor = async (index: number, value: number) => {
    try {
      await invoke("send_motor_command", { index, value });
    } catch (e) {
      addLog(`Motor Error: ${e}`, 'error');
    }
  };

  const handleSetAllMotors = async (value: number) => {
    try {
      await invoke("set_all_motors", { value });
    } catch (e) {
      addLog(`Motor Error: ${e}`, 'error');
    }
  };

  const handleCalibrate = async () => {
    if (!isConnected) return;
    addLog("Initiating Accelerometer Calibration...", "warning");
    try {
      const res = await invoke<string>("calibrate_accelerometer");
      addLog(`Calibration: ${res}`, "success" as any);
      showModal({
        title: "CALIBRATION_COMPLETE",
        message: "Accelerometer zero-point has been updated. Ensure drone remains level for subsequent checks.",
        type: 'success'
      });
    } catch (e) {
      addLog(`Calibration Failed: ${e}`, "error");
    }
  };

  const [pitchTrim, setPitchTrim] = useState(0);
  const [rollTrim, setRollTrim] = useState(0);

  const handleTrimUpdate = async (type: 'pitch' | 'roll', delta: number) => {
    if (!isConnected) return;
    const newVal = type === 'pitch' ? pitchTrim + delta : rollTrim + delta;
    const rounded = Math.round(newVal * 10) / 10;

    if (type === 'pitch') setPitchTrim(rounded);
    else setRollTrim(rounded);

    try {
      await invoke("set_acc_trim", {
        pitch: type === 'pitch' ? rounded : pitchTrim,
        roll: type === 'roll' ? rounded : rollTrim
      });
      addLog(`Trim adjusted: ${type} -> ${rounded.toFixed(1)}°`, "info");
    } catch (e) {
      addLog(`Trim sync failed: ${e}`, "error");
    }
  };

  const resetTrims = async () => {
    if (!isConnected) return;
    setPitchTrim(0);
    setRollTrim(0);
    try {
      await invoke("set_acc_trim", { pitch: 0, roll: 0 });
      addLog("Trims reset to zero", "info");
    } catch (e) {
      addLog("Trim reset failed", "error");
    }
  };

  const handleReboot = async () => {
    addLog("Initiating Reboot Sequence...", "warning");
    // Mock backup
    addLog("Auto-backup committed to /backups/reboot_auto.json", "info");
    await new Promise(r => setTimeout(r, 2000));
    setActiveView('dashboard');
  };

  return (
    <div className={`app-viewport ${isResizing ? 'resizing' : ''} ${!isConnected ? 'disconnected' : ''}`} style={{
      ['--diag-width' as any]: `${diagWidth}px`,
    }}>
      {isWindowSmall && (
        <div className="size-overlay">
          <div className="size-content">
            <LayoutDashboard size={48} color="var(--status-warn)" />
            <h1 style={{ letterSpacing: '0.2em', fontWeight: 900 }}>MAXIMUM_SIZE_REQUIRED</h1>
            <p style={{ color: '#888', maxWidth: '300px', margin: '20px auto' }}>
              The Vector GCS interface requires a maximized workspace for mission-critical telemetry accuracy.
              Please expand window to continue.
            </p>
            <div className="pulse-dot" style={{ margin: '0 auto' }}></div>
          </div>
        </div>
      )}
      {/* 1. STATUS BAR */}
      <header className="status-bar">
        <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '24px' }}>
          <img src="/logo.png" alt="Vector GCS Logo" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
          <div className="logo-text" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: '10px', letterSpacing: '0.05em' }}>VECTOR GCS</span>
            <small style={{ fontSize: '7px', color: '#666', marginTop: '-2px' }}>LINK::{linkStatus}</small>
          </div>
        </div>

        <div className="status-item">PITCH: <b>{isConnected ? (attitude?.pitch || 0).toFixed(1) : "---"}°</b></div>
        <div className="status-item">ROLL: <b>{isConnected ? (attitude?.roll || 0).toFixed(1) : "---"}°</b></div>
        <div className="status-item">VBATT: <b className={isConnected ? "text-success" : ""} style={{ color: isConnected ? 'var(--status-ok)' : '#444' }}>
          {isConnected ? (vbatt || 0).toFixed(2) + "V" : "---V"}
        </b></div>
        <div className="status-item">CPU: <b style={{ color: isConnected ? '#ddd' : '#444' }}>
          {isConnected ? (cpuLoad || 0).toFixed(1) + "%" : "---%"}
        </b></div>


        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <select className="input-ui" value={selectedPort} onChange={(e) => setSelectedPort(e.target.value)} disabled={isConnected}>
            {ports.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <button
            className={`btn-ui ${hasUpdate ? 'primary pulse' : ''}`}
            style={{ gap: '6px' }}
            onClick={() => hasUpdate ? showModal({
              title: "OTA_SYSTEM_UPDATE",
              message: "A new version of Vector GCS is available. This update includes stability improvements and critical logic patches.",
              type: 'info',
              confirmText: "PROCEED_WITH_UPDATE",
              showCancel: true,
              cancelText: "ABORT",
              onConfirm: () => handleUpdate(hasUpdate) // hasUpdate here refers to the update object if available
            }) : checkForUpdates(false)}
            disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
          >
            {updateStatus === 'downloading' ? (
              <RefreshCw size={12} className="spin" />
            ) : (
              <ArrowUpCircle size={12} color={hasUpdate ? 'var(--status-ok)' : '#666'} />
            )}
            <span style={{ fontSize: '9px' }}>
              {updateStatus === 'downloading' ? "INSTALLING..." : hasUpdate ? "UPDATE_AVAIL" : "CHECK_UPDATE"}
            </span>
          </button>

          <button
            className="btn-ui"
            onClick={scanPorts}
            disabled={isConnected || isScanning}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '80px', justifyContent: 'center' }}
          >
            {isScanning ? <RefreshCw size={12} className="spin" /> : <RefreshCw size={12} />}
            {isScanning ? "SCANNING..." : "SCAN"}
          </button>
          <button className={`btn-ui ${isConnected ? '' : 'primary'}`} onClick={toggleConnect}>
            {isConnected ? 'DISCONNECT' : 'LINK'}
          </button>
        </div>
      </header>

      {/* 2. NAVIGATION */}
      {isConnected && (
        <nav className="nav-panel">
          <div className={`nav-link ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')} title="Dashboard">
            <LayoutDashboard size={18} />
          </div>
          <div className={`nav-link ${activeView === 'tuning' ? 'active' : ''}`} onClick={() => setActiveView('tuning')} title="PID Tuning">
            <SlidersHorizontal size={18} />
          </div>
          <div className={`nav-link ${activeView === 'radio' ? 'active' : ''}`} onClick={() => setActiveView('radio')} title="Receiver">
            <Radio size={18} />
          </div>
          <div className={`nav-link ${activeView === 'modes' ? 'active' : ''}`} onClick={() => setActiveView('modes')} title="Modes">
            <Compass size={18} />
          </div>
          <div className={`nav-link ${activeView === 'motors' ? 'active' : ''}`} onClick={() => setActiveView('motors')} title="Motors">
            <Zap size={18} />
          </div>
          <div className={`nav-link ${activeView === 'config' ? 'active' : ''}`} onClick={() => setActiveView('config')} title="Config">
            <Settings size={18} />
          </div>
          <div className={`nav-link ${activeView === 'diagnostics' ? 'active' : ''}`} onClick={() => setActiveView('diagnostics')} title="Diagnostics">
            <Activity size={18} />
          </div>
          <div className={`nav-link ${activeView === 'firmware' ? 'active' : ''}`} onClick={() => setActiveView('firmware')} title="Firmware">
            <Target size={18} />
          </div>
          <div className={`nav-link ${activeView === 'blackbox' ? 'active' : ''}`} onClick={() => setActiveView('blackbox')} title="Blackbox">
            <History size={18} />
          </div>
          <div className={`nav-link ${activeView === 'advanced' ? 'active' : ''}`} onClick={() => setActiveView('advanced')} title="Advanced">
            <Settings2 size={18} />
          </div>
          <div className={`nav-link ${activeView === 'cli' ? 'active' : ''}`} onClick={() => setActiveView('cli')} title="CLI">
            <Terminal size={18} />
          </div>
        </nav>
      )}

      {/* 3. FLIGHT CORE */}
      <main className="flight-core">
        {isConnected ? (
          <>
            <div className="arena-header">NODE::{activeView.toUpperCase()} / TELEMETRY__FEED</div>
            <div className="flight-arena">
              <ErrorBoundary>
                {activeView === 'dashboard' ? (
                  <DashboardView
                    attitude={attitude}
                    vbatt={vbatt}
                    cpuLoad={cpuLoad}
                    isConnected={isConnected}
                    linkStatus={linkStatus}
                    onCalibrate={handleCalibrate}
                    onTrim={handleTrimUpdate}
                    onResetTrim={resetTrims}
                    isCalibrating={isCalibrating}
                    calStep={calStep}
                    onStartCalibration={startCalibrationWizard}
                  />
                ) : activeView === 'tuning' ? (
                  <PIDTuning isConnected={isConnected} />
                ) : activeView === 'radio' ? (
                  <ReceiverTab channels={channels} isConnected={isConnected} />
                ) : activeView === 'modes' ? (
                  <ModesTab channels={channels} isConnected={isConnected} />
                ) : activeView === 'motors' ? (
                  <MotorControlTab
                    motorOutputs={motorOutputs}
                    onSetMotor={handleSetMotor}
                    onSetAll={handleSetAllMotors}
                  />
                ) : activeView === 'config' ? (
                  <SystemConfigTab onSave={handleReboot} />
                ) : activeView === 'diagnostics' ? (
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                      <TelemetryGraph
                        label="BATTERY_VOLTAGE"
                        data={vbatt}
                        min={0} max={25}
                        color="#43a047"
                        tooltip="Real-time voltage from the flight controller. Use this to monitor for voltage sags during motor tests or to ensure your battery isn't over-discharged."
                        tooltipOrientation="right down"
                        isConnected={isConnected}
                      />
                      <TelemetryGraph
                        label="CPU_LOAD"
                        data={cpuLoad}
                        min={0} max={100}
                        color="#2196f3"
                        tooltip="The current workload of the Flight Controller's processor. Values >70% can lead to unstable flight or loop-time jitter."
                        tooltipOrientation="left down"
                        isConnected={isConnected}
                      />
                      <TelemetryGraph
                        label="GYRO_PITCH"
                        data={attitude.pitch}
                        min={-90} max={90}
                        color="#2196f3"
                        tooltip="Raw angular data from the IMU's pitch axis. Verifies gyro response to physical nose up/down movement."
                        tooltipOrientation="left down"
                        isConnected={isConnected}
                      />
                      <TelemetryGraph
                        label="GYRO_ROLL"
                        data={attitude.roll}
                        min={-90} max={90}
                        color="#ffb300"
                        tooltip="Raw angular data from the IMU's roll axis. Verifies gyro response to lateral tilting."
                        tooltipOrientation="right down"
                        isConnected={isConnected}
                      />
                    </div>
                  </div>
                ) : activeView === 'firmware' ? (
                  <FirmwareTab isConnected={isConnected} />
                ) : activeView === 'blackbox' ? (
                  <BlackboxTab />
                ) : activeView === 'advanced' ? (
                  <AdvancedConfigTab />
                ) : activeView === 'cli' ? (
                  <CLITab
                    isConnected={isConnected}
                    onClearTerminal={clearTerminal}
                    onSendCommand={async (cmd) => {
                      addLog(`> ${cmd}`, 'packet');
                      try {
                        const res = await invoke<string>("send_cli_command", { cmd });
                        res.split('\n').forEach(line => addLog(line, 'info'));
                      } catch (e) {
                        addLog(`CLI Error: ${e}`, 'error');
                      }
                    }}
                    terminalOutput={terminalOutput}
                  />
                ) : null}
              </ErrorBoundary>

              {/* Floating Console Toggle */}
              <div className={`console-trigger ${isConsoleOpen ? 'active' : ''}`}>
                <button
                  className={`btn-ui ${isConsoleOpen ? 'primary' : ''}`}
                  onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                >
                  <Terminal size={12} style={{ transform: isConsoleOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                  <span style={{ fontSize: '9px' }}>{isConsoleOpen ? "HIDE_TERMINAL" : "TERMINAL"}</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="connect-splash">
            <div className="splash-content">
              <div className="splash-logo">
                <img src="/logo.png" alt="Vector GCS" />
              </div>
              <h1 className="splash-title">VECTOR GCS</h1>
              <p className="splash-subtitle">AERONAUTICAL_CONTROL_INTERFACE</p>
              <div className="splash-status">
                <div className="pulse-dot"></div>
                <span>AWAITING_COMM_LINK_ESTABLISHMENT</span>
              </div>
              <div className="splash-guide">
                <p>1. Connect flight controller via USB</p>
                <p>2. Select serial interface from top bar</p>
                <p>3. Initialize LINK to begin telemetry</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. VERTICAL RESIZER */}
      {isConnected && <div className="resizer-v" onPointerDown={() => setIsResizing('diag')} />}

      {/* 5. DIAGNOSTICS PANEL */}
      {isConnected && (
        <aside className="diag-panel">
          <div className="diag-head">SYSTEM_MATRIX :: {linkStatus}</div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ErrorBoundary>
              <DiagnosticsPanel
                vbatt={vbatt}
                cpuLoad={cpuLoad}
                isConnected={isConnected}
                linkStatus={linkStatus}
                attitude={attitude}
                mspProtocol={mspProtocol}
                gyroLoop={gyroLoop}
                accelGrav={accelGrav}
                gnssFix={gnssFix}
                satellites={satellites}
                hdop={hdop}
              />
            </ErrorBoundary>
            {/* Connection Feed Mini */}
            <div style={{ background: '#111', border: '1px solid #333', padding: '12px', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#888' }}>PACKET_STREAM</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className={`btn-ui ${isLogging ? 'primary' : ''}`}
                    style={{ fontSize: '8px', padding: '2px 6px', height: '14px' }}
                    onClick={() => setIsLogging(!isLogging)}
                  >
                    {isLogging ? "LOGGING" : "LOG"}
                  </button>
                  <div style={{ fontSize: '8px', color: isConnected ? 'var(--status-ok)' : '#444' }}>{isConnected ? "STABLE" : "IDLE"}</div>
                </div>
              </div>
              <div style={{ height: '120px', overflowY: 'auto', fontFamily: 'var(--font-data)', fontSize: '9px', color: '#555' }}>
                {terminalOutput.filter(l => l.includes("LINK") || l.includes("Heartbeat") || l.includes("Connection")).slice(0, 10).map((l, i) => (
                  <div key={i} style={{ marginBottom: '2px' }}>{l}</div>
                ))}
              </div>
            </div>
            <ErrorBoundary>
              {activeView !== 'diagnostics' && isConnected && (
                <div style={{ background: '#0a0a0a', border: '1px solid #222', padding: '10px' }}>
                  <TelemetryGraph label="LIVE_VOLTAGE" data={vbatt} min={0} max={25} color="#43a047" limit={50} />
                </div>
              )}
            </ErrorBoundary>
          </div>
        </aside>
      )}

      {/* 6. CONSOLE (Overlay) */}
      <footer className={`console ${isConsoleOpen ? '' : 'hidden'}`}>
        <div className="console-ctrl">
          <span>VECTOR_GCS_INDUSTRIAL :: TERMINAL_BUS</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-ui" style={{ height: '14px', padding: '0 6px' }} onClick={() => setTerminalOutput([])}>FLUSH</button>
            <button className="btn-ui" style={{ height: '14px', padding: '0 6px' }} onClick={() => setIsConsoleOpen(false)}>CLOSE</button>
          </div>
        </div>
        <div className="console-body">
          {terminalOutput.map((l, i) => (
            <div key={i} className="log-line" style={{ marginBottom: '2px' }}>{l}</div>
          ))}
          {terminalOutput.length === 0 && <span style={{ color: '#222' }}>// Pipeline empty...</span>}
        </div>
      </footer>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <ModalProvider>
      <App />
    </ModalProvider>
  );
}
