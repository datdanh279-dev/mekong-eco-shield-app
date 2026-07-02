'use client';

export const PROTOCOL_VERSION = 0x4444;
export const FRAME_SIZE = 64;
export const PROTOCOL_MAGIC = 'DD';

export enum FrameType {
  HEARTBEAT = 0x01,
  ALERT = 0x02,
  COORD = 0x03,
  TOKEN = 0x04,
  GOV_VOTE = 0x05,
}

export enum AlertType {
  FLOOD = 0x01,
  SALINITY = 0x02,
  STORM = 0x03,
  EARTHQUAKE = 0x04,
}

export interface AlertPayload {
  alertType: AlertType;
  severity: number;
  latitude: number;
  longitude: number;
  radius: number;
  timestamp: number;
}

export interface CoordPayload {
  latitude: number;
  longitude: number;
}

export interface Frame {
  protocolVersion: number;
  frameType: FrameType;
  hopCount: number;
  sourceId: number;
  destId: number;
  sequenceNumber: number;
  checksum: number;
  encryptionFlag: number;
  payload: Uint8Array;
  raw?: Uint8Array;
}

const CRC16_TABLE: number[] = [];
for (let i = 0; i < 256; i++) {
  let crc = i;
  for (let j = 0; j < 8; j++) {
    if (crc & 1) {
      crc = (crc >>> 1) ^ 0xa001;
    } else {
      crc = crc >>> 1;
    }
  }
  CRC16_TABLE[i] = crc;
}

export function computeChecksum(data: Uint8Array): number {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC16_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffff) & 0xffff;
}

export function validateChecksum(data: Uint8Array): boolean {
  if (data.length !== FRAME_SIZE) return false;
  const stored = (data[16] << 8) | data[17];
  const frame = new Uint8Array(data);
  frame[16] = 0;
  frame[17] = 0;
  const computed = computeChecksum(frame);
  return stored === computed;
}

export function truncateDeviceId(deviceId: string): number {
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    const char = deviceId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash >>> 0;
}

export function compressCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  const latNorm = Math.round((lat + 90) * 23860);
  const lngNorm = Math.round((lng + 180) * 11930);
  return {
    lat: Math.max(0, Math.min(0xffffffff, latNorm)),
    lng: Math.max(0, Math.min(0xffffffff, lngNorm)),
  };
}

export function decompressCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: (lat / 23860) - 90,
    lng: (lng / 11930) - 180,
  };
}

function encodeFloat64(value: number): Uint8Array {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setFloat64(0, value, false);
  return new Uint8Array(buf);
}

function decodeFloat64(bytes: Uint8Array, offset: number): number {
  const buf = new ArrayBuffer(8);
  const view = new Uint8Array(buf);
  for (let i = 0; i < 8; i++) view[i] = bytes[offset + i];
  return new DataView(buf).getFloat64(0, false);
}

function buildFrame(
  frameType: FrameType,
  sourceId: number,
  destId: number,
  payload: Uint8Array,
  sequenceNumber?: number,
): Uint8Array {
  const frame = new Uint8Array(FRAME_SIZE);
  frame.fill(0);

  frame[0] = (PROTOCOL_VERSION >> 8) & 0xff;
  frame[1] = PROTOCOL_VERSION & 0xff;
  frame[2] = frameType;
  frame[3] = 0;
  frame[4] = (sourceId >> 24) & 0xff;
  frame[5] = (sourceId >> 16) & 0xff;
  frame[6] = (sourceId >> 8) & 0xff;
  frame[7] = sourceId & 0xff;
  frame[8] = (destId >> 24) & 0xff;
  frame[9] = (destId >> 16) & 0xff;
  frame[10] = (destId >> 8) & 0xff;
  frame[11] = destId & 0xff;
  frame[12] = 0;
  frame[13] = 0;
  frame[14] = 0;
  frame[15] = sequenceNumber ?? 0;
  frame[16] = 0;
  frame[17] = 0;
  frame[18] = 0x00;

  for (let i = 0; i < Math.min(payload.length, 40); i++) {
    frame[24 + i] = payload[i];
  }

  const crc = computeChecksum(frame);
  frame[16] = (crc >> 8) & 0xff;
  frame[17] = crc & 0xff;

  return frame;
}

export function createHeartbeat(sourceId: string): Uint8Array {
  const srcId = truncateDeviceId(sourceId);
  const payload = new Uint8Array(40);
  const now = Math.floor(Date.now() / 60000);
  payload[0] = (now >> 8) & 0xff;
  payload[1] = now & 0xff;
  return buildFrame(FrameType.HEARTBEAT, srcId, 0, payload);
}

export function createAlert(
  sourceId: string,
  alertType: AlertType,
  severity: number,
  lat: number,
  lng: number,
  radius: number,
): Uint8Array {
  const srcId = truncateDeviceId(sourceId);
  const payload = new Uint8Array(40);
  payload.fill(0);
  payload[0] = alertType;
  payload[1] = Math.max(1, Math.min(10, severity));
  const latBytes = encodeFloat64(lat);
  const lngBytes = encodeFloat64(lng);
  for (let i = 0; i < 8; i++) payload[8 + i] = latBytes[i];
  for (let i = 0; i < 8; i++) payload[16 + i] = lngBytes[i];
  payload[24] = (radius >> 8) & 0xff;
  payload[25] = radius & 0xff;
  const ts = Math.floor(Date.now() / 60000);
  payload[26] = (ts >> 8) & 0xff;
  payload[27] = ts & 0xff;
  return buildFrame(FrameType.ALERT, srcId, 0, payload);
}

export function createCoord(sourceId: string, destId: string, lat: number, lng: number): Uint8Array {
  const srcId = truncateDeviceId(sourceId);
  const dstId = truncateDeviceId(destId);
  const payload = new Uint8Array(40);
  payload.fill(0);
  const compressed = compressCoordinates(lat, lng);
  payload[0] = (compressed.lat >> 24) & 0xff;
  payload[1] = (compressed.lat >> 16) & 0xff;
  payload[2] = (compressed.lat >> 8) & 0xff;
  payload[3] = compressed.lat & 0xff;
  payload[4] = (compressed.lng >> 24) & 0xff;
  payload[5] = (compressed.lng >> 16) & 0xff;
  payload[6] = (compressed.lng >> 8) & 0xff;
  payload[7] = compressed.lng & 0xff;
  return buildFrame(FrameType.COORD, srcId, dstId, payload);
}

export function createTokenTransfer(sourceId: string, destId: string, amount: number): Uint8Array {
  const srcId = truncateDeviceId(sourceId);
  const dstId = truncateDeviceId(destId);
  const payload = new Uint8Array(40);
  payload.fill(0);
  const amountInt = Math.round(amount * 100);
  payload[0] = (amountInt >> 24) & 0xff;
  payload[1] = (amountInt >> 16) & 0xff;
  payload[2] = (amountInt >> 8) & 0xff;
  payload[3] = amountInt & 0xff;
  return buildFrame(FrameType.TOKEN, srcId, dstId, payload);
}

export function createGovernanceVote(sourceId: string, proposalId: string, vote: number): Uint8Array {
  const srcId = truncateDeviceId(sourceId);
  const proposalHash = truncateDeviceId(proposalId);
  const payload = new Uint8Array(40);
  payload.fill(0);
  payload[0] = (proposalHash >> 24) & 0xff;
  payload[1] = (proposalHash >> 16) & 0xff;
  payload[2] = (proposalHash >> 8) & 0xff;
  payload[3] = proposalHash & 0xff;
  payload[4] = Math.max(0, Math.min(2, vote));
  return buildFrame(FrameType.GOV_VOTE, srcId, 0, payload);
}

export function parseFrame(data: Uint8Array): Frame {
  if (data.length !== FRAME_SIZE) {
    throw new Error(`Invalid frame size: ${data.length}, expected ${FRAME_SIZE}`);
  }

  const protocolVersion = (data[0] << 8) | data[1];
  const frameType = data[2] as FrameType;
  const hopCount = data[3];
  const sourceId = (data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7];
  const destId = (data[8] << 24) | (data[9] << 16) | (data[10] << 8) | data[11];
  const sequenceNumber = (data[12] << 24) | (data[13] << 16) | (data[14] << 8) | data[15];
  const checksum = (data[16] << 8) | data[17];
  const encryptionFlag = data[18];
  const payload = data.slice(24, 64);

  return {
    protocolVersion,
    frameType,
    hopCount,
    sourceId,
    destId,
    sequenceNumber,
    checksum,
    encryptionFlag,
    payload,
    raw: data,
  };
}

export function encodeMessage(msg: string): Uint8Array {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(msg);
  const result = new Uint8Array(40);
  result.fill(0);
  for (let i = 0; i < Math.min(bytes.length, 40); i++) {
    result[i] = bytes[i];
  }
  return result;
}

export function decodeMessage(data: Uint8Array): string {
  let len = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0) break;
    len++;
  }
  const decoder = new TextDecoder();
  return decoder.decode(data.slice(0, len));
}

export function frameToHex(frame: Uint8Array): string {
  return Array.from(frame)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
}

export function hexToFrame(hex: string): Uint8Array {
  const hexStr = hex.replace(/\s+/g, '');
  const bytes = new Uint8Array(FRAME_SIZE);
  for (let i = 0; i < FRAME_SIZE; i++) {
    bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
  }
  return bytes;
}
