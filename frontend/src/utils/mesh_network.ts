'use client';

import {
  Frame,
  FrameType,
  FRAME_SIZE,
  computeChecksum,
  validateChecksum,
  parseFrame,
  truncateDeviceId,
} from './mesh_protocol';

export interface MeshNodeData {
  deviceId: string;
  lastSeen: number;
  signalStrength: number;
  sequenceNumber: number;
  isConnected: boolean;
  nodeType: 'gateway' | 'relay' | 'endpoint';
  knownPeers: Map<string, number>;
  pendingMessages: Frame[];
}

export class MeshNode {
  deviceId: string;
  lastSeen: number;
  signalStrength: number;
  sequenceNumber: number;
  isConnected: boolean;
  nodeType: 'gateway' | 'relay' | 'endpoint';
  knownPeers: Map<string, number>;
  pendingMessages: Frame[];

  constructor(deviceId: string, nodeType: 'gateway' | 'relay' | 'endpoint' = 'endpoint') {
    this.deviceId = deviceId;
    this.lastSeen = Date.now();
    this.signalStrength = -30 - Math.random() * 60;
    this.sequenceNumber = 0;
    this.isConnected = true;
    this.nodeType = nodeType;
    this.knownPeers = new Map();
    this.pendingMessages = [];
  }

  getNextSequence(): number {
    return ++this.sequenceNumber;
  }

  addPeer(peerId: string, rssi?: number) {
    this.knownPeers.set(peerId, rssi ?? -50 - Math.random() * 40);
  }

  removePeer(peerId: string) {
    this.knownPeers.delete(peerId);
  }

  updateSignalStrength() {
    this.signalStrength = -30 - Math.random() * 60;
  }
}

type MessageCallback = (frame: Frame) => void;

export class MeshNetwork {
  private static instance: MeshNetwork;

  nodes: Map<string, MeshNode> = new Map();
  localNode: MeshNode | null = null;
  messageHistory: Frame[] = [];
  maxHops: number = 15;
  broadcastInterval: number = 30000;

  private discoveryInterval: ReturnType<typeof setInterval> | null = null;
  private onMessageCallbacks: MessageCallback[] = [];

  private constructor() {}

  static getInstance(): MeshNetwork {
    if (!MeshNetwork.instance) {
      MeshNetwork.instance = new MeshNetwork();
    }
    return MeshNetwork.instance;
  }

  initialize(deviceId: string, nodeType: 'gateway' | 'relay' | 'endpoint' = 'endpoint'): MeshNode {
    const existing = this.nodes.get(deviceId);
    if (existing) {
      this.localNode = existing;
      return existing;
    }

    const node = new MeshNode(deviceId, nodeType);
    this.nodes.set(deviceId, node);
    this.localNode = node;
    return node;
  }

  startDiscovery() {
    if (this.discoveryInterval) return;

    this.discoveryInterval = setInterval(() => {
      if (!this.localNode) return;

      const now = Date.now();
      for (const [, node] of this.nodes) {
        if (node.deviceId === this.localNode.deviceId) continue;
        if (now - node.lastSeen > 120000) {
          node.isConnected = false;
          this.localNode.removePeer(node.deviceId);
        }
      }

      this.simulatePeerDiscovery();
    }, this.broadcastInterval);
  }

  stopDiscovery() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
  }

  sendMessage(frame: Frame): boolean {
    if (!this.localNode) return false;

    const raw = frame.raw;
    if (!raw) return false;

    if (!validateChecksum(raw)) {
      const crc = computeChecksum(raw);
      raw[16] = (crc >> 8) & 0xff;
      raw[17] = crc & 0xff;
    }

    const parsed = parseFrame(raw);
    parsed.hopCount = 0;
    this.messageHistory.push(parsed);
    this.routeMessage(parsed);
    return true;
  }

  routeMessage(frame: Frame) {
    if (frame.hopCount >= this.maxHops) return;

    frame.hopCount++;

    for (const [, node] of this.nodes) {
      if (!node.isConnected) continue;
      if (node.deviceId === this.localNode?.deviceId) continue;

      const delay = Math.random() * 100;
      setTimeout(() => {
        this.receiveMessage(frame, node);
      }, delay);
    }
  }

  receiveMessage(frame: Frame, fromNode?: MeshNode) {
    if (!this.localNode) return;

    if (frame.hopCount >= this.maxHops) return;

    const destIdStr = frame.destId.toString(16).padStart(8, '0');
    const localIdStr = this.localNode.deviceId;

    if (destIdStr !== '00000000' && destIdStr !== truncateDeviceId(localIdStr).toString(16).padStart(8, '0')) {
      this.routeMessage(frame);
      return;
    }

    this.messageHistory.push(frame);

    if (fromNode) {
      fromNode.lastSeen = Date.now();
      this.localNode.addPeer(fromNode.deviceId, fromNode.signalStrength);
    }

    for (const cb of this.onMessageCallbacks) {
      cb(frame);
    }
  }

  getPeerCount(): number {
    if (!this.localNode) return 0;
    return this.localNode.knownPeers.size;
  }

  getMeshStrength(): number {
    if (this.nodes.size === 0) return 0;

    const totalNodes = this.nodes.size;
    const connectedNodes = Array.from(this.nodes.values()).filter((n) => n.isConnected).length;
    const avgRssi = Array.from(this.nodes.values()).reduce((sum, n) => sum + n.signalStrength, 0) / totalNodes;
    const peerCount = this.getPeerCount();

    const connectivityScore = (connectedNodes / totalNodes) * 40;
    const signalScore = Math.max(0, Math.min(30, ((-avgRssi - 30) / 60) * 30));
    const peerScore = Math.min(30, peerCount * 5);

    return Math.round(Math.min(100, connectivityScore + signalScore + peerScore));
  }

  simulatePeerDiscovery() {
    if (!this.localNode) return;

    const names = [
      'MKE-001', 'MKE-002', 'MKE-003', 'MKE-004', 'MKE-005',
      'MKE-006', 'MKE-007', 'MKE-008', 'MKE-009', 'MKE-010',
      'MKE-011', 'MKE-012', 'MKE-013', 'MKE-014', 'MKE-015',
    ];

    const types: Array<'gateway' | 'relay' | 'endpoint'> = ['gateway', 'relay', 'endpoint'];

    for (let i = 0; i < 3 + Math.floor(Math.random() * 5); i++) {
      const name = names[Math.floor(Math.random() * names.length)];
      if (name === this.localNode.deviceId) continue;
      if (this.nodes.has(name)) {
        const existing = this.nodes.get(name)!;
        existing.isConnected = true;
        existing.lastSeen = Date.now();
        existing.updateSignalStrength();
        this.localNode.addPeer(name, existing.signalStrength);
        continue;
      }

      const type = types[Math.floor(Math.random() * types.length)];
      const node = new MeshNode(name, type);
      this.nodes.set(name, node);
      this.localNode.addPeer(name, node.signalStrength);
      node.addPeer(this.localNode.deviceId, this.localNode.signalStrength);
    }
  }

  getNetworkMap() {
    const nodeList = Array.from(this.nodes.values()).map((n) => ({
      id: n.deviceId,
      type: n.nodeType,
      connected: n.isConnected,
      signalStrength: Math.round(n.signalStrength),
      lastSeen: n.lastSeen,
      peerCount: n.knownPeers.size,
    }));

    const edges: Array<{ source: string; target: string; rssi: number }> = [];
    const seen = new Set<string>();

    for (const [id, node] of this.nodes) {
      for (const [peerId] of node.knownPeers) {
        const key = [id, peerId].sort().join('-');
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({
            source: id,
            target: peerId,
            rssi: node.signalStrength,
          });
        }
      }
    }

    return { nodes: nodeList, edges };
  }

  getMessageCount(): number {
    return this.messageHistory.length;
  }

  onMessage(callback: MessageCallback) {
    this.onMessageCallbacks.push(callback);
  }

  clearHistory() {
    this.messageHistory = [];
  }

  generateTestAlert(): Frame | null {
    if (!this.localNode) return null;
    const { createAlert, AlertType } = require('./mesh_protocol');
    const types = [AlertType.FLOOD, AlertType.SALINITY, AlertType.STORM];
    const type = types[Math.floor(Math.random() * types.length)];
    const severity = 1 + Math.floor(Math.random() * 10);
    const lat = 9.8 + Math.random() * 2;
    const lng = 105.5 + Math.random() * 2;
    const radius = 100 + Math.floor(Math.random() * 5000);
    const raw = createAlert(this.localNode.deviceId, type, severity, lat, lng, radius);
    return parseFrame(raw);
  }

  cleanup() {
    this.stopDiscovery();
    this.nodes.clear();
    this.localNode = null;
    this.messageHistory = [];
    this.onMessageCallbacks = [];
  }
}
