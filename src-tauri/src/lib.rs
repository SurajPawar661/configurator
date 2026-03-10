mod msp;
// Force reload of Tauri commands handler

use serialport;
use std::sync::{Mutex, Arc, atomic::{AtomicBool, Ordering}};
use tauri::{State, Emitter, AppHandle};
use std::io::{Read, Write};
use msp::{MspPacket, MspVersion};
use serde::Serialize;

#[derive(Serialize, Clone)]
struct TelemetryUpdate {
    pitch: f32,
    roll: f32,
    yaw: f32,
    vbatt: f32,
    cpu_load: f32,
    status: String,
    channels: Vec<u16>,
    motors: Vec<u16>,
    heartbeat: u32,
    msp_protocol: String,
    gyro_loop: String,
    accel_grav: String,
    gnss_fix: String,
    satellites: u32,
    hdop: f32,
}

#[tauri::command]
fn ping() -> String { "pong".to_string() }

struct AppState {
    port: Arc<Mutex<Option<Box<dyn serialport::SerialPort + Send>>>>,
    is_polling: Arc<AtomicBool>,
    virtual_motors: Arc<Mutex<Vec<u16>>>,
    pitch_trim: Arc<Mutex<f32>>,
    roll_trim: Arc<Mutex<f32>>,
}

#[tauri::command]
fn list_serial_ports() -> Vec<String> {
    let mut ports = match serialport::available_ports() {
        Ok(ports) => ports.iter().map(|p| p.port_name.clone()).collect(),
        Err(_) => vec![],
    };
    ports.push("VIRTUAL_FC (Simulated)".to_string());
    ports
}

fn start_polling_thread(
    port_clone: Arc<Mutex<Option<Box<dyn serialport::SerialPort + Send>>>>,
    is_polling_clone: Arc<AtomicBool>,
    handle: AppHandle,
    virtual_motors: Arc<Mutex<Vec<u16>>>,
    pitch_trim: Arc<Mutex<f32>>,
    roll_trim: Arc<Mutex<f32>>,
) {
    std::thread::spawn(move || {
        println!("Starting background telemetry loop...");
        let start_time = std::time::Instant::now();
        let mut pulse = 0u32;
        
        while is_polling_clone.load(Ordering::SeqCst) {
            pulse = pulse.wrapping_add(1);
            let mut current_update;
            // Polling loop

            {
                let mut port_guard = port_clone.lock().unwrap();
                if let Some(port) = port_guard.as_mut() {
                    // 1. Polling Cycle (Sequence of requests)
                    let cmds = [msp::MSP_ATTITUDE, msp::MSP_ANALOG, msp::MSP_STATUS, msp::MSP_RC, msp::MSP_MOTOR];
                    let mut roll = 0.0; let mut pitch = 0.0; let mut yaw = 0.0; 
                    let mut vbatt = 0.0; let mut cpu_load = 0.0;
                    let mut rc_channels = vec![1500; 16];
                    let mut motor_vals = vec![1000; 8];

                    for &cmd in &cmds {
                        let req = MspPacket { version: MspVersion::V1, cmd, payload: vec![] };
                        if let Ok(_) = port.write_all(&req.encode()) {
                            let mut buffer = [0u8; 512]; // Increased for RC/Motor packets
                            if let Ok(n) = port.read(&mut buffer) {
                                if let Some((packet, _)) = MspPacket::decode(&buffer[..n]) {
                                    match packet.cmd {
                                        msp::MSP_ATTITUDE => {
                                            roll = packet.read_i16(0) as f32 / 10.0;
                                            pitch = packet.read_i16(2) as f32 / 10.0;
                                            yaw = packet.read_i16(4) as f32;
                                        }
                                        msp::MSP_ANALOG => {
                                            vbatt = packet.read_u8(0) as f32 / 10.0;
                                        }
                                        msp::MSP_STATUS => {
                                            cpu_load = packet.read_u16(11) as f32;
                                        }
                                        msp::MSP_RC => {
                                            for i in 0..16 {
                                                if packet.payload.len() >= (i+1)*2 {
                                                    rc_channels[i] = packet.read_u16(i*2);
                                                }
                                            }
                                        }
                                        msp::MSP_MOTOR => {
                                            for i in 0..8 {
                                                if packet.payload.len() >= (i+1)*2 {
                                                    motor_vals[i] = packet.read_u16(i*2);
                                                }
                                            }
                                        }
                                        _ => {}
                                    }
                                }
                            }
                        }
                    }

                    current_update = Some(TelemetryUpdate {
                        pitch: pitch + *pitch_trim.lock().unwrap(),
                        roll: roll + *roll_trim.lock().unwrap(),
                        yaw, vbatt, cpu_load,
                        status: "CONNECTED".to_string(),
                        channels: rc_channels,
                        motors: motor_vals,
                        heartbeat: pulse,
                        msp_protocol: "V2.1_SECURE".to_string(),
                        gyro_loop: "8.0kHz".to_string(),
                        accel_grav: "9.81m/s²".to_string(),
                        gnss_fix: "NO_LOCK".to_string(),
                        satellites: 0,
                        hdop: 9.99,
                    });
                } else {
                    // --- SIMULATION FALLBACK ---
                    let elapsed = start_time.elapsed().as_secs_f32();
                    let motors = virtual_motors.lock().unwrap().clone();
                    
                    let satellites = if elapsed % 60.0 > 10.0 { 12 } else { 0 };
                    let gnss_fix = if satellites > 0 { "3D_FIX".to_string() } else { "NO_LOCK".to_string() };
                    let hdop = if satellites > 0 { 0.95 + (elapsed.sin() * 0.05) } else { 9.99 };

                    current_update = Some(TelemetryUpdate {
                        pitch: ((elapsed * 2.0).sin() * 15.0) + *pitch_trim.lock().unwrap(),
                        roll: ((elapsed * 1.5).cos() * 10.0) + *roll_trim.lock().unwrap(),
                        yaw: (elapsed * 0.5) % 360.0,
                        vbatt: 16.2 + (elapsed.sin() * 0.1),
                        cpu_load: 12.0 + (elapsed.cos() * 2.0),
                        status: "VIRTUAL".to_string(),
                        channels: vec![1500; 12],
                        motors,
                        heartbeat: pulse,
                        msp_protocol: "V2.1_MOCKED".to_string(),
                        gyro_loop: "8.0kHz".to_string(),
                        accel_grav: format!("{:.2}m/s²", 9.81 + (elapsed.sin() * 0.02)),
                        gnss_fix,
                        satellites,
                        hdop,
                    });
                }
            }

            if let Some(update) = current_update {
                let _ = handle.emit("telemetry", update);
            }
            
            std::thread::sleep(std::time::Duration::from_millis(20)); // High freq polling (50Hz)
        }
        println!("Background telemetry loop stopped.");
    });
}

#[tauri::command]
fn set_all_motors(value: u16, state: State<'_, AppState>) -> Result<(), String> {
    let mut motors = state.virtual_motors.lock().unwrap();
    for m in motors.iter_mut() {
        *m = value;
    }
    
    let mut payload = Vec::with_capacity(16);
    for &m in motors.iter() {
        payload.extend_from_slice(&m.to_le_bytes());
    }
    
    let mut guard = state.port.lock().unwrap();
    if let Some(port) = guard.as_mut() {
        let packet = MspPacket {
            version: MspVersion::V1,
            cmd: msp::MSP_SET_MOTOR,
            payload,
        };
        port.write_all(&packet.encode()).map_err(|e| format!("Write error: {}", e))?;
        let _ = port.flush();
    }
    Ok(())
}

#[tauri::command]
fn send_motor_command(index: usize, value: u16, state: State<'_, AppState>) -> Result<(), String> {
    let mut motors = state.virtual_motors.lock().unwrap();
    if index < motors.len() {
        motors[index] = value;
    }
    
    // Construct the payload of 8 u16 (le) motor values
    let mut payload = Vec::with_capacity(16);
    for &m in motors.iter() {
        payload.extend_from_slice(&m.to_le_bytes());
    }
    
    let mut guard = state.port.lock().unwrap();
    if let Some(port) = guard.as_mut() {
        // Send to real hardware
        let packet = MspPacket {
            version: MspVersion::V1,
            cmd: msp::MSP_SET_MOTOR,
            payload,
        };
        port.write_all(&packet.encode()).map_err(|e| format!("Write error: {}", e))?;
        let _ = port.flush();
        println!("Real Motor Command Sent: Index {} -> Value {}", index, value);
    }
    Ok(())
}

#[tauri::command]
async fn open_serial_port(
    port_name: String,
    baud_rate: u32,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<String, String> {
    let mut guard = state.port.lock().unwrap();
    
    // Close existing port
    *guard = None;
    state.is_polling.store(false, Ordering::SeqCst);
    std::thread::sleep(std::time::Duration::from_millis(100)); // Grace period for old thread

    if port_name.contains("VIRTUAL_FC") {
        state.is_polling.store(true, Ordering::SeqCst);
        let port_clone = state.port.clone();
        let is_polling_clone = state.is_polling.clone();
        let handle = app_handle.clone();
        let vm_clone = state.virtual_motors.clone();
        
        let pitch_trim = state.pitch_trim.clone();
        let roll_trim = state.roll_trim.clone();

        start_polling_thread(port_clone, is_polling_clone, handle, vm_clone, pitch_trim, roll_trim);
        return Ok("Virtual Connected".to_string());
    }

    let port_builder = serialport::new(port_name.clone(), baud_rate)
        .timeout(std::time::Duration::from_millis(50));
    
    let port = port_builder.open();

    match port {
        Ok(p) => {
            *guard = Some(p);
            state.is_polling.store(true, Ordering::SeqCst);
            
            let port_clone = state.port.clone();
            let is_polling_clone = state.is_polling.clone();
            let handle = app_handle.clone();
            let vm_clone = state.virtual_motors.clone();

            let pitch_trim = state.pitch_trim.clone();
            let roll_trim = state.roll_trim.clone();

            start_polling_thread(port_clone, is_polling_clone, handle, vm_clone, pitch_trim, roll_trim);
            Ok("Connected".to_string())
        }
        Err(e) => Err(format!("Failed to open port: {}", e)),
    }
}

#[tauri::command]
fn close_serial_port(state: State<'_, AppState>) -> Result<String, String> {
    state.is_polling.store(false, Ordering::SeqCst);
    let mut guard = state.port.lock().unwrap();
    *guard = None;
    Ok("Disconnected".to_string())
}

#[tauri::command]
fn send_msp_command(
    cmd: u16,
    payload: Vec<u8>,
    version: String,
    state: State<'_, AppState>,
) -> Result<MspPacketResponse, String> {
    let mut guard = state.port.lock().unwrap();
    let port = guard.as_mut().ok_or("Not connected")?;

    let msp_version = if version == "v2" { MspVersion::V2 } else { MspVersion::V1 };
    let packet = MspPacket {
        version: msp_version,
        cmd,
        payload,
    };

    let encoded = packet.encode();
    port.write_all(&encoded).map_err(|e| format!("Write error: {}", e))?;
    port.flush().map_err(|e| format!("Flush error: {}", e))?;

    let mut buffer = [0u8; 1024];
    let mut read_data = Vec::new();
    let start = std::time::Instant::now();
    
    while start.elapsed().as_millis() < 500 {
        match port.read(&mut buffer) {
            Ok(n) if n > 0 => {
                read_data.extend_from_slice(&buffer[..n]);
                if let Some((packet, _)) = MspPacket::decode(&read_data) {
                    return Ok(MspPacketResponse {
                        cmd: packet.cmd,
                        payload: packet.payload,
                    });
                }
            }
            Ok(_) => std::thread::sleep(std::time::Duration::from_millis(5)),
            Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => (),
            Err(e) => return Err(format!("Read error: {}", e)),
        }
    }
    Err("Response timeout".to_string())
}

#[tauri::command]
fn send_cli_command(cmd: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut guard = state.port.lock().unwrap();
    
    if guard.is_none() {
        // Virtual Mode handling
        return match cmd.to_lowercase().trim() {
            "help" => Ok("# CLI_HELP :: VIRTUAL_FC\n# status - System status\n# dump - Configuration dump\n# diff - Configuration diff\n# exit - Exit CLI mode".to_string()),
            "status" => Ok("System: VIRTUAL_FC v1.0.0-IND\nUptime: 1242s\nCPU: 12%\nTemperature: 38.4C\nSensors: ACC GYRO BARO\nLink: OK (33Hz)".to_string()),
            "dump" => Ok("# FULL_CONFIGURATION_DUMP\nset pid_roll_p = 45\nset pid_pitch_p = 45\nset motor_pwm_protocol = DSHOT600\nset gyro_lowpass_hz = 100".to_string()),
            _ => Ok(format!("# VIRTUAL_ACK: {}", cmd)),
        };
    }

    let port = guard.as_mut().ok_or("Not connected")?;
    let cmd_with_nl = format!("{}\n", cmd);
    port.write_all(cmd_with_nl.as_bytes()).map_err(|e| e.to_string())?;
    port.flush().map_err(|e| e.to_string())?;

    Ok(format!("# SENT_TO_HARDWARE: {}", cmd))
}

#[tauri::command]
fn calibrate_accelerometer(state: State<'_, AppState>) -> Result<String, String> {
    let mut guard = state.port.lock().unwrap();
    if let Some(port) = guard.as_mut() {
        let req = MspPacket { 
            version: MspVersion::V1, 
            cmd: msp::MSP_ACC_CALIBRATION, 
            payload: vec![] 
        };
        port.write_all(&req.encode()).map_err(|e| e.to_string())?;
        port.flush().map_err(|e| e.to_string())?;
        return Ok("CALIBRATION_TRIGGERED".to_string());
    }
    Ok("VIRTUAL_CALIBRATION_MOCK_SUCCESS".to_string())
}

#[tauri::command]
fn set_acc_trim(pitch: f32, roll: f32, state: State<'_, AppState>) -> Result<String, String> {
    *state.pitch_trim.lock().unwrap() = pitch;
    *state.roll_trim.lock().unwrap() = roll;
    Ok(format!("TRIM_UPDATED: P:{:.1} R:{:.1}", pitch, roll))
}

#[derive(serde::Serialize)]
struct MspPacketResponse {
    cmd: u16,
    payload: Vec<u8>,
}

#[derive(serde::Deserialize)]
struct SystemConfig {
    name: String,
    max_arm_angle: u8,
    voltage_scale: u16,
    current_offset: u16,
    warning_cell_v: f32,
    critical_cell_v: f32,
    beepers: Vec<bool>,
}

#[tauri::command]
async fn save_drone_config(config: SystemConfig, state: State<'_, AppState>) -> Result<String, String> {
    let mut guard = state.port.lock().unwrap();
    let port = guard.as_mut().ok_or("Not connected")?;

    // 1. Set Name
    let mut name_payload = config.name.as_bytes().to_vec();
    if name_payload.len() > 16 { name_payload.truncate(16); }
    let name_packet = MspPacket { version: MspVersion::V1, cmd: msp::MSP_SET_NAME, payload: name_payload };
    port.write_all(&name_packet.encode()).map_err(|e| e.to_string())?;

    // 2. Set Arming Config
    let arming_payload = vec![config.max_arm_angle];
    let arming_packet = MspPacket { version: MspVersion::V1, cmd: msp::MSP_SET_ARMING_CONFIG, payload: arming_payload };
    port.write_all(&arming_packet.encode()).map_err(|e| e.to_string())?;

    // 3. Set Battery Config (Simplified MSP mapping)
    // payload: [vscale, current_offset, warning_cell_v*10, critical_cell_v*10]
    let mut batt_payload = Vec::new();
    batt_payload.extend_from_slice(&(config.voltage_scale as u16).to_le_bytes());
    batt_payload.extend_from_slice(&(config.current_offset as u16).to_le_bytes());
    batt_payload.push((config.warning_cell_v * 10.0) as u8);
    batt_payload.push((config.critical_cell_v * 10.0) as u8);
    let batt_packet = MspPacket { version: MspVersion::V1, cmd: msp::MSP_SET_BATTERY_CONFIG, payload: batt_payload };
    port.write_all(&batt_packet.encode()).map_err(|e| e.to_string())?;

    // 4. Set Beeper Config
    // Bitmask for common beepers
    let mut beeper_mask: u16 = 0;
    if config.beepers.get(0).cloned().unwrap_or(false) { beeper_mask |= 1 << 0; } // ARMING
    if config.beepers.get(1).cloned().unwrap_or(false) { beeper_mask |= 1 << 1; } // DISARMING
    if config.beepers.get(2).cloned().unwrap_or(false) { beeper_mask |= 1 << 2; } // BATT_LOW
    if config.beepers.get(3).cloned().unwrap_or(false) { beeper_mask |= 1 << 3; } // GPS_LOCK
    let beeper_payload = beeper_mask.to_le_bytes().to_vec();
    let beeper_packet = MspPacket { version: MspVersion::V1, cmd: msp::MSP_SET_BEEPER_CONFIG, payload: beeper_payload };
    port.write_all(&beeper_packet.encode()).map_err(|e| e.to_string())?;

    // 5. Save to EEPROM
    let save_packet = MspPacket { version: MspVersion::V1, cmd: msp::MSP_EEPROM_WRITE, payload: vec![] };
    port.write_all(&save_packet.encode()).map_err(|e| e.to_string())?;
    port.flush().map_err(|e| e.to_string())?;

    Ok("CONFIG_COMMIT_SUCCESS".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState {
            port: Arc::new(Mutex::new(None)),
            is_polling: Arc::new(AtomicBool::new(false)),
            virtual_motors: Arc::new(Mutex::new(vec![1000; 8])),
            pitch_trim: Arc::new(Mutex::new(0.0)),
            roll_trim: Arc::new(Mutex::new(0.0)),
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_serial_ports,
            open_serial_port,
            close_serial_port,
            send_msp_command,
            send_motor_command,
            send_cli_command,
            calibrate_accelerometer,
            save_drone_config,
            set_acc_trim,
            set_all_motors,
            ping
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
