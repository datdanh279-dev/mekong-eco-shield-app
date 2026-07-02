'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface NetworkNode {
  id: string;
  type: 'gateway' | 'relay' | 'endpoint';
  connected: boolean;
  signalStrength: number;
  lastSeen: number;
  peerCount: number;
}

interface NetworkEdge {
  source: string;
  target: string;
  rssi: number;
}

interface NetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  className?: string;
}

interface DrawNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'gateway' | 'relay' | 'endpoint';
  connected: boolean;
  signalStrength: number;
}

const NODE_COLORS: Record<string, string> = {
  gateway: '#22c55e',
  relay: '#3b82f6',
  endpoint: '#a855f7',
};

const NODE_RADIUS: Record<string, number> = {
  gateway: 18,
  relay: 14,
  endpoint: 10,
};

export default function NetworkGraph({ nodes, edges, className = '' }: NetworkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const drawNodesRef = useRef<DrawNode[]>([]);
  const animFrameRef = useRef<number>(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: Math.floor(width), height: Math.floor(height) });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (nodes.length === 0) return;
    const existing = drawNodesRef.current;
    const existingIds = new Set(existing.map((n) => n.id));
    const newNodes: DrawNode[] = [];

    for (const node of nodes) {
      if (existingIds.has(node.id)) {
        const en = existing.find((n) => n.id === node.id)!;
        en.connected = node.connected;
        en.type = node.type;
        newNodes.push(en);
      } else {
        newNodes.push({
          id: node.id,
          x: Math.random() * dimensions.width * 0.8 + dimensions.width * 0.1,
          y: Math.random() * dimensions.height * 0.8 + dimensions.height * 0.1,
          vx: 0,
          vy: 0,
          type: node.type,
          connected: node.connected,
          signalStrength: node.signalStrength,
        });
      }
    }
    drawNodesRef.current = newNodes;
  }, [nodes, dimensions]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const nodeMap = new Map(drawNodesRef.current.map((n) => [n.id, n]));

    const edgeSet = new Set<string>();
    for (const edge of edges) {
      const key = [edge.source, edge.target].sort().join('-');
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);

      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const pulse = (Date.now() / 2000) % 1;
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      ctx.beginPath();
      ctx.arc(midX, midY, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34, 197, 94, ${0.3 + 0.7 * pulse})`;
      ctx.fill();
    }

    for (const node of drawNodesRef.current) {
      const radius = NODE_RADIUS[node.type] || 12;
      const color = node.connected ? NODE_COLORS[node.type] || '#6b7280' : '#6b7280';

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = node.connected ? 1 : 0.4;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = node.id.length > 7 ? node.id.slice(0, 7) + '..' : node.id;
      ctx.fillText(label, node.x, node.y + radius + 12);
    }

    ctx.restore();
  }, [dimensions, edges, offset, scale]);

  useEffect(() => {
    const simulate = () => {
      const nodeList = drawNodesRef.current;
      if (nodeList.length === 0) return;

      const edgeSet = new Set<string>();
      for (const edge of edges) {
        edgeSet.add([edge.source, edge.target].sort().join('-'));
      }

      for (let i = 0; i < nodeList.length; i++) {
        for (let j = i + 1; j < nodeList.length; j++) {
          const a = nodeList[i];
          const b = nodeList[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const key = [a.id, b.id].sort().join('-');
          const connected = edgeSet.has(key);

          if (connected) {
            const spring = (dist - 120) * 0.005;
            a.vx += (dx / dist) * spring;
            a.vy += (dy / dist) * spring;
            b.vx -= (dx / dist) * spring;
            b.vy -= (dy / dist) * spring;
          } else if (dist < 200) {
            const repel = (200 - dist) / 200 * 0.05;
            a.vx -= (dx / dist) * repel;
            a.vy -= (dy / dist) * repel;
            b.vx += (dx / dist) * repel;
            b.vy += (dy / dist) * repel;
          }
        }
      }

      for (const node of nodeList) {
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= 0.85;
        node.vy *= 0.85;
        node.x = Math.max(30, Math.min(dimensions.width - 30, node.x));
        node.y = Math.max(30, Math.min(dimensions.height - 30, node.y));
      }

      draw();
      animFrameRef.current = requestAnimationFrame(simulate);
    };

    animFrameRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [dimensions, edges, draw]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left - offset.x) / scale;
      const my = (e.clientY - rect.top - offset.y) / scale;

      let found: NetworkNode | null = null;
      for (const node of drawNodesRef.current) {
        const dx = mx - node.x;
        const dy = my - node.y;
        const radius = NODE_RADIUS[node.type] || 12;
        if (dx * dx + dy * dy < (radius + 10) * (radius + 10)) {
          found = {
            id: node.id,
            type: node.type,
            connected: node.connected,
            signalStrength: node.signalStrength,
            lastSeen: Date.now(),
            peerCount: 0,
          };
          break;
        }
      }
      setHoveredNode(found);
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [offset, scale],
  );

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.max(0.3, Math.min(3, s * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
  }, [offset]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    setHoveredNode(null);
  }, []);

  const handleGlobalMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setOffset({
        x: offsetStart.current.x + dx,
        y: offsetStart.current.y + dy,
      });
    },
    [],
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleGlobalMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className={`relative w-full h-full min-h-[400px] ${className}`}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onClick={() => {}}
      />
      {hoveredNode && (
        <div
          className="absolute z-10 px-3 py-2 text-xs rounded-lg border border-border bg-card shadow-lg pointer-events-none"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 40 }}
        >
          <div className="font-semibold text-foreground">{hoveredNode.id}</div>
          <div className="text-muted-foreground">
            {hoveredNode.type} |{' '}
            {hoveredNode.connected ? (
              <span className="text-green-500">Online</span>
            ) : (
              <span className="text-red-500">Offline</span>
            )}
          </div>
          <div className="text-muted-foreground">
            RSSI: {hoveredNode.signalStrength} dBm
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 flex gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS.gateway }} />
          Gateway
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS.relay }} />
          Relay
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS.endpoint }} />
          Endpoint
        </span>
      </div>
    </div>
  );
}
