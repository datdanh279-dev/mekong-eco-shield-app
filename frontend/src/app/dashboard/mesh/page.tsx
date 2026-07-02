'use client';

import { useEffect, useState, useCallback } from 'react';
import NetworkGraph from '@/components/NetworkGraph';
import { MeshNetwork } from '@/utils/mesh_network';
import {
  createAlert,
  createHeartbeat,
  parseFrame,
  frameToHex,
  AlertType,
  FrameType,
  FRAME_SIZE,
} from '@/utils/mesh_protocol';
import { Radio, Activity, Signal, Server, MessageSquare, Send, Zap, Shield } from 'lucide-react';

export default function MeshDashboardPage() {
  const [mesh] = useState(() => MeshNetwork.getInstance());
  const [peerCount, setPeerCount] = useState(0);
  const [meshStrength, setMeshStrength] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [nodeList, setNodeList] = useState<Array<{ id: string; type: 'gateway' | 'relay' | 'endpoint'; connected: boolean; signalStrength: number; lastSeen: number; peerCount: number }>>([]);
  const [edgeList, setEdgeList] = useState<Array<{ source: string; target: string; rssi: number }>>([]);
  const [log, setLog] = useState<string[]>([]);
  const [testMessage, setTestMessage] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`, ...prev.slice(0, 49)]);
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      const deviceId = 'MKE-HQ-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      mesh.initialize(deviceId, 'gateway');
      mesh.startDiscovery();
      setIsInitialized(true);
      addLog(`Khai báo thiết bị: ${deviceId}`);
      addLog('Bắt đầu khám phá mạng lưới...');
    }

    const interval = setInterval(() => {
      const peerCount = mesh.getPeerCount();
      const strength = mesh.getMeshStrength();
      const msgCount = mesh.getMessageCount();
      const networkMap = mesh.getNetworkMap();

      setPeerCount(peerCount);
      setMeshStrength(strength);
      setMessageCount(msgCount);
      setNodeList(networkMap.nodes);
      setEdgeList(networkMap.edges);
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [mesh, isInitialized, addLog]);

  const handleBroadcast = useCallback(() => {
    if (!mesh.localNode) return;

    const types = [AlertType.FLOOD, AlertType.SALINITY, AlertType.STORM];
    const type = types[Math.floor(Math.random() * types.length)];
    const severity = 5 + Math.floor(Math.random() * 6);
    const lat = 9.8 + Math.random() * 2.5;
    const lng = 105.5 + Math.random() * 2.5;
    const radius = 500 + Math.floor(Math.random() * 5000);

    const raw = createAlert(mesh.localNode.deviceId, type, severity, lat, lng, radius);
    const frame = parseFrame(raw);

    mesh.sendMessage(frame);
    addLog(`Phát ALERT: ${AlertType[type]} (mức ${severity}) tại [${lat.toFixed(3)}, ${lng.toFixed(3)}] - bán kính ${radius}m`);
  }, [mesh, addLog]);

  const handleSendTest = useCallback(() => {
    if (!mesh.localNode || !testMessage.trim()) return;

    const raw = createHeartbeat(mesh.localNode.deviceId);
    const frame = parseFrame(raw);
    frame.raw![24] = testMessage.length;
    for (let i = 0; i < Math.min(testMessage.length, 39); i++) {
      frame.raw![25 + i] = testMessage.charCodeAt(i);
    }

    mesh.sendMessage(frame);
    addLog(`Gửi tin nhắn: "${testMessage}"`);
    setTestMessage('');
  }, [mesh, testMessage, addLog]);

  const handleSimulateDiscovery = useCallback(() => {
    mesh.simulatePeerDiscovery();
    const count = mesh.nodes.size - 1;
    addLog(`Khám phá: tìm thấy ${count} thiết bị lân cận`);
  }, [mesh, addLog]);

  const strengthColor = meshStrength > 70 ? 'text-green-500' : meshStrength > 40 ? 'text-yellow-500' : 'text-red-500';
  const strengthBg = meshStrength > 70 ? 'bg-green-500/10' : meshStrength > 40 ? 'bg-yellow-500/10' : 'bg-red-500/10';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Radio className="w-6 h-6" />
          Mạng lưới Mesh
        </h1>
        <p className="text-sm text-muted-foreground">
          Giao thức DanhDat IEEE 802.15.4 — Giám sát mạng lưới cảm biến Mekong
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Nút hoạt động</span>
            <Server className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{isInitialized ? mesh.nodes.size : 0}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {peerCount} kết nối trực tiếp
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Tin nhắn đã chuyển</span>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{messageCount}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Đã gửi qua mạng lưới
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Cường độ mạng</span>
            <Signal className={`w-4 h-4 ${strengthColor}`} />
          </div>
          <div className={`text-2xl font-bold ${strengthColor}`}>{meshStrength}%</div>
          <div className={`w-full h-1.5 rounded-full mt-2 ${strengthBg}`}>
            <div
              className={`h-full rounded-full transition-all ${meshStrength > 70 ? 'bg-green-500' : meshStrength > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${meshStrength}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Phiên bản giao thức</span>
            <Shield className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono text-xs">IEEE 802.15.4-DD</div>
          <div className="text-xs text-muted-foreground mt-1">
            64 byte / khung — CRC16
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Cấu trúc liên kết mạng
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{nodeList.length} nút</span>
              <span>|</span>
              <span>{edgeList.length} kết nối</span>
            </div>
          </div>
          <NetworkGraph nodes={nodeList} edges={edgeList} className="min-h-[450px]" />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Điều khiển
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={handleSimulateDiscovery}
                className="w-full rounded-lg bg-eco-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-eco-green-700 transition-colors"
              >
                Mô phỏng khám phá thiết bị
              </button>
              <button
                onClick={handleBroadcast}
                className="w-full rounded-lg bg-alert-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-alert-red-700 transition-colors"
              >
                Phát cảnh báo thử nghiệm
              </button>

              <div className="pt-2 border-t border-border">
                <label className="text-xs text-muted-foreground block mb-1">Tin nhắn thử nghiệm</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendTest()}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eco-green-500"
                  />
                  <button
                    onClick={handleSendTest}
                    disabled={!testMessage.trim()}
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-sm">Nhật ký mạng lưới</h2>
              <button
                onClick={() => setLog([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Xóa
              </button>
            </div>
            <div className="p-2 max-h-[220px] overflow-y-auto space-y-0.5">
              {log.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">Chưa có hoạt động nào</p>
              ) : (
                log.map((entry, i) => (
                  <div key={i} className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 hover:bg-accent/50 rounded">
                    {entry}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {nodeList.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Danh sách nút mạng</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Loại</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Trạng thái</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">RSSI</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Bạn bè</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {nodeList.map((node) => (
                  <tr key={node.id} className="hover:bg-accent/50">
                    <td className="p-3 font-mono text-xs">{node.id}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        node.type === 'gateway' ? 'bg-green-500/10 text-green-600' :
                        node.type === 'relay' ? 'bg-blue-500/10 text-blue-600' :
                        'bg-purple-500/10 text-purple-600'
                      }`}>
                        {node.type === 'gateway' ? 'Cổng' : node.type === 'relay' ? 'Chuyển tiếp' : 'Đầu cuối'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 text-xs ${node.connected ? 'text-green-500' : 'text-red-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${node.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                        {node.connected ? 'Trực tuyến' : 'Ngoại tuyến'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{node.signalStrength} dBm</td>
                    <td className="p-3 text-xs text-muted-foreground">{node.peerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
