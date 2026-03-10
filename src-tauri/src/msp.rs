#[allow(dead_code)]
pub const MSP_STATUS: u16 = 101;
#[allow(dead_code)]
pub const MSP_RAW_IMU: u16 = 102;
#[allow(dead_code)]
pub const MSP_MOTOR: u16 = 104;
#[allow(dead_code)]
pub const MSP_RC: u16 = 105;
pub const MSP_ATTITUDE: u16 = 108;
#[allow(dead_code)]
pub const MSP_ALTITUDE: u16 = 109;
pub const MSP_ANALOG: u16 = 110;
pub const MSP_ACC_CALIBRATION: u16 = 205;
pub const MSP_SET_MOTOR: u16 = 214;
pub const MSP_SET_BEEPER_CONFIG: u16 = 215;
pub const MSP_SET_NAME: u16 = 216;
pub const MSP_SET_ARMING_CONFIG: u16 = 217;
pub const MSP_SET_BATTERY_CONFIG: u16 = 218;
pub const MSP_EEPROM_WRITE: u16 = 250;

pub struct MspPacket {
    pub version: MspVersion,
    pub cmd: u16,
    pub payload: Vec<u8>,
}

#[derive(Clone, Copy, PartialEq)]
pub enum MspVersion {
    V1,
    V2,
}

impl MspPacket {
    pub fn encode(&self) -> Vec<u8> {
        match self.version {
            MspVersion::V1 => self.encode_v1(),
            MspVersion::V2 => self.encode_v2(),
        }
    }

    fn encode_v1(&self) -> Vec<u8> {
        let mut data = Vec::new();
        data.push(b'$');
        data.push(b'M');
        data.push(b'<'); // Request
        data.push(self.payload.len() as u8);
        data.push(self.cmd as u8);
        data.extend_from_slice(&self.payload);

        let mut checksum: u8 = 0;
        checksum ^= self.payload.len() as u8;
        checksum ^= self.cmd as u8;
        for &b in &self.payload {
            checksum ^= b;
        }
        data.push(checksum);
        data
    }

    fn encode_v2(&self) -> Vec<u8> {
        let mut data = Vec::new();
        data.push(b'$');
        data.push(b'X');
        data.push(b'<');
        data.push(0); // Flags

        // Function ID (2 bytes, LE)
        data.push((self.cmd & 0xFF) as u8);
        data.push(((self.cmd >> 8) & 0xFF) as u8);

        // Payload Size (2 bytes, LE)
        data.push((self.payload.len() & 0xFF) as u8);
        data.push(((self.payload.len() >> 8) & 0xFF) as u8);

        data.extend_from_slice(&self.payload);

        // CRC8 of everything from index 3 (Flags) to end of payload
        let crc = calculate_crc8(&data[3..]);
        data.push(crc);
        data
    }

    pub fn decode(data: &[u8]) -> Option<(MspPacket, usize)> {
        if data.len() < 6 {
            return None;
        }

        // Find start of frame
        let mut start_idx = 0;
        while start_idx < data.len() && data[start_idx] != b'$' {
            start_idx += 1;
        }

        let remaining = &data[start_idx..];
        if remaining.len() < 6 {
            return None;
        }

        match remaining[1] {
            b'M' => {
                // MSP v1
                let direction = remaining[2];
                if direction != b'>' && direction != b'!' {
                    return None;
                }

                let size = remaining[3] as usize;
                let cmd = remaining[4] as u16;
                let frame_len = 6 + size;

                if remaining.len() < frame_len {
                    return None;
                }

                let payload = remaining[5..5 + size].to_vec();
                let checksum = remaining[5 + size];

                let mut calculated: u8 = 0;
                calculated ^= size as u8;
                calculated ^= cmd as u8;
                for &b in &payload {
                    calculated ^= b;
                }

                if calculated == checksum {
                    Some((
                        MspPacket {
                            version: MspVersion::V1,
                            cmd,
                            payload,
                        },
                        start_idx + frame_len,
                    ))
                } else {
                    None
                }
            }
            b'X' => {
                // MSP v2
                if remaining.len() < 9 {
                    return None;
                }

                let direction = remaining[2];
                if direction != b'>' && direction != b'!' {
                    return None;
                }

                let _flags = remaining[3];
                let cmd = (remaining[4] as u16) | ((remaining[5] as u16) << 8);
                let size = (remaining[6] as usize) | ((remaining[7] as usize) << 8);
                let frame_len = 9 + size;

                if remaining.len() < frame_len {
                    return None;
                }

                let payload = remaining[8..8 + size].to_vec();
                let checksum = remaining[8 + size];

                // Calculate CRC8 from index 3 to 8+size (not including header $X>)
                if calculate_crc8(&remaining[3..8 + size]) == checksum {
                    Some((
                        MspPacket {
                            version: MspVersion::V2,
                            cmd,
                            payload,
                        },
                        start_idx + frame_len,
                    ))
                } else {
                    None
                }
            }
            _ => None,
        }
    }

    pub fn read_i16(&self, offset: usize) -> i16 {
        if self.payload.len() < offset + 2 {
            return 0;
        }
        i16::from_le_bytes([self.payload[offset], self.payload[offset + 1]])
    }

    #[allow(dead_code)]
    pub fn read_u16(&self, offset: usize) -> u16 {
        if self.payload.len() < offset + 2 {
            return 0;
        }
        u16::from_le_bytes([self.payload[offset], self.payload[offset + 1]])
    }

    pub fn read_u8(&self, offset: usize) -> u8 {
        if self.payload.len() < offset + 1 {
            return 0;
        }
        self.payload[offset]
    }
}

pub fn calculate_crc8(data: &[u8]) -> u8 {
    let mut crc = 0u8;
    for &byte in data {
        crc ^= byte;
        for _ in 0..8 {
            if crc & 0x80 != 0 {
                crc = (crc << 1) ^ 0xD5;
            } else {
                crc <<= 1;
            }
        }
    }
    crc
}
