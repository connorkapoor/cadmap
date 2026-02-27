'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { forceCollide, forceCenter, polygonHull } from 'd3';
import { CadNode, GraphData, NodeType } from '@/types';
import { useNodePositions } from '@/hooks/useNodePositions';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
      Building graph…
    </div>
  ),
});

// ── Node / link colors ────────────────────────────────────────────────────────

const NODE_COLORS: Record<NodeType, { light: string; dark: string }> = {
  company:  { light: '#f59e0b', dark: '#fbbf24' },
  kernel:   { light: '#14b8a6', dark: '#2dd4bf' },
  software: { light: '#8b5cf6', dark: '#a78bfa' },
};

const LINK_COLORS: Record<string, string> = {
  'owns':        '#6b7280',
  'uses-kernel': '#0ea5e9',
  'built-on':    '#f97316',
};

// ── Ring radii (kernel inner, company middle, software outer) ─────────────────

const RING_RADII: Record<NodeType, number> = {
  kernel:   170,
  company:  350,
  software: 570,
};

// ── Sector definitions ────────────────────────────────────────────────────────
// 8 equal wedges of 45° each, starting at 12 o'clock (−π/2) going clockwise.

interface SectorDef {
  name: string;
  centerAngle: number;
  darkBg: string;
  lightBg: string;
  darkLabel: string;
  lightLabel: string;
}

const T = 2 * Math.PI / 9; // 40° step (9 sectors)

const SECTORS: SectorDef[] = [
  {
    name: 'B-Rep Kernels',
    centerAngle: -Math.PI / 2,           // 12 o'clock
    darkBg: 'rgba(251,191,36,0.09)',  lightBg: 'rgba(251,191,36,0.06)',
    darkLabel: 'rgba(252,211,77,0.7)', lightLabel: 'rgba(120,53,15,0.5)',
  },
  {
    name: 'Enterprise Parametric',
    centerAngle: -Math.PI / 2 + T,       // ~1:30
    darkBg: 'rgba(99,102,241,0.09)',  lightBg: 'rgba(99,102,241,0.06)',
    darkLabel: 'rgba(129,140,248,0.7)', lightLabel: 'rgba(79,70,229,0.5)',
  },
  {
    name: 'Desktop & Professional',
    centerAngle: -Math.PI / 2 + 2 * T,  // 3 o'clock
    darkBg: 'rgba(14,165,233,0.09)',  lightBg: 'rgba(14,165,233,0.06)',
    darkLabel: 'rgba(56,189,248,0.7)', lightLabel: 'rgba(7,89,133,0.5)',
  },
  {
    name: 'BIM & AEC',
    centerAngle: -Math.PI / 2 + 3 * T,  // ~4:30
    darkBg: 'rgba(34,197,94,0.09)',   lightBg: 'rgba(34,197,94,0.06)',
    darkLabel: 'rgba(74,222,128,0.7)', lightLabel: 'rgba(21,128,61,0.5)',
  },
  {
    name: 'Simulation & Analysis',
    centerAngle: -Math.PI / 2 + 4 * T,  // 6 o'clock
    darkBg: 'rgba(239,68,68,0.09)',   lightBg: 'rgba(239,68,68,0.06)',
    darkLabel: 'rgba(252,165,165,0.7)', lightLabel: 'rgba(153,27,27,0.5)',
  },
  {
    name: 'EDA, CAM & Mfg',
    centerAngle: -Math.PI / 2 + 5 * T,  // ~7:30
    darkBg: 'rgba(249,115,22,0.09)',  lightBg: 'rgba(249,115,22,0.06)',
    darkLabel: 'rgba(251,146,60,0.7)', lightLabel: 'rgba(154,52,18,0.5)',
  },
  {
    name: 'DCC, Mesh & Sculpt',
    centerAngle: -Math.PI / 2 + 6 * T,  // 9 o'clock
    darkBg: 'rgba(236,72,153,0.09)',  lightBg: 'rgba(236,72,153,0.06)',
    darkLabel: 'rgba(244,114,182,0.7)', lightLabel: 'rgba(157,23,77,0.5)',
  },
  {
    name: 'Open Source & Code-First',
    centerAngle: -Math.PI / 2 + 7 * T,
    darkBg: 'rgba(20,184,166,0.09)',  lightBg: 'rgba(20,184,166,0.06)',
    darkLabel: 'rgba(45,212,191,0.7)', lightLabel: 'rgba(13,148,136,0.5)',
  },
  {
    name: 'Implicit / SDF',
    centerAngle: -Math.PI / 2 + 8 * T,
    darkBg: 'rgba(163,230,53,0.09)',  lightBg: 'rgba(163,230,53,0.06)',
    darkLabel: 'rgba(163,230,53,0.7)', lightLabel: 'rgba(63,98,18,0.5)',
  },
];

// ── Node → sector assignment ───────────────────────────────────────────────────

const NODE_SECTOR: Record<string, number> = {
  // 0 — B-Rep Kernels
  'parasolid': 0, 'granite': 0, 'shapemanager': 0, 'acis': 0, 'cgm': 0,
  'opencascade': 0, 'c3d': 0, 'solvespace-kernel': 0,
  'kcl': 0,
  'spatial-corp': 0, 'c3d-labs': 0,

  // 1 — Enterprise Parametric (Siemens / PTC / Dassault flagship tools)
  'siemens': 1, 'ptc': 1, 'dassault': 1,
  'nx': 1, 'solidedge': 1, 'creo': 1, 'solidworks': 1,
  'catia': 1, '3dexperience': 1, 'onshape': 1,

  // 2 — Desktop & Professional CAD (Autodesk + direct/NURBS indie modelers)
  'autodesk': 2, 'mcneel': 2, 'shapr3d-company': 2, 'moi3d-company': 2, 'alibre-company': 2,
  'autocad': 2, 'inventor': 2, 'fusion360': 2, 'tinkercad': 2,
  'rhino': 2, 'grasshopper': 2, 'shapr3d': 2, 'plasticity': 2, 'moi3d': 2,
  'spaceclaim': 2, 'alibre': 2,

  // 3 — BIM, AEC & Regional CAD
  'trimble': 3, 'hexagon': 3, 'bricsys': 3, 'graphisoft': 3, 'nemetschek': 3,
  'ascon-group': 3, 'zwsoft': 3, 'nanosoft': 3,
  'revit': 3, 'archicad': 3, 'vectorworks': 3, 'sketchup': 3, 'tekla': 3,
  'bricspad': 3, 'zwcad': 3, 'nanocad': 3, 'kompas3d': 3,

  // 4 — Simulation & Analysis (FEA / CFD / multiphysics)
  'ansys': 4, 'altair': 4, 'comsol-company': 4, 'simscale-company': 4,
  'abaqus': 4, 'hypermesh': 4, 'comsol': 4, 'simscale': 4,

  // 5 — EDA, CAM & Manufacturing
  'altium': 5, 'cadence': 5, 'cnc-software': 5, 'dirac-company': 5,
  'kicad': 5, 'altium-designer': 5, 'eagle': 5, 'orcad': 5,
  'mastercam': 5, 'dirac-app': 5,

  // 6 — DCC, Mesh & Sculpt (creative 3D / VFX / game art)
  'sidefx': 6, 'maxon': 6, 'foundry': 6, 'blender-foundation': 6, 'vectary-company': 6,
  'blender': 6, 'zbrush': 6, 'maya': 6, '3ds-max': 6,
  'houdini': 6, 'cinema4d': 6, 'modo': 6, 'wings3d': 6, 'vectary': 6,

  // 7 — Open Source & Code-First
  'zoo-company': 7, 'solve-space-company': 7,
  'freecad': 7, 'cadquery': 7, 'build123d': 7, 'openscad': 7,
  'brlcad': 7, 'librecad': 7, 'cascadestudio': 7, 'dune3d': 7,
  'solvespace': 7, 'cad-sketcher': 7, 'zoo-app': 7, 'replicad': 7,

  // 8 — Implicit / SDF
  'womp-inc': 8, 'ntop-inc': 8,
  'womp': 8, 'ntop': 8,
  'libfive': 8, 'ntop-kernel': 8,
};

// ── Smooth convex-hull painter ────────────────────────────────────────────────
// Draws a padded, bezier-smoothed blob around the given point set.

function paintHull(ctx: CanvasRenderingContext2D, pts: [number, number][], pad: number) {
  if (pts.length === 0) return;

  if (pts.length === 1) {
    ctx.arc(pts[0][0], pts[0][1], pad, 0, 2 * Math.PI);
    return;
  }

  if (pts.length === 2) {
    const [a, b] = pts;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = (-dy / len) * pad, ny = (dx / len) * pad;
    ctx.moveTo(a[0] + nx, a[1] + ny);
    ctx.lineTo(b[0] + nx, b[1] + ny);
    ctx.arc(b[0], b[1], pad, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
    ctx.lineTo(a[0] - nx, a[1] - ny);
    ctx.arc(a[0], a[1], pad, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
    return;
  }

  const hull = polygonHull(pts);
  if (!hull) {
    ctx.arc(pts[0][0], pts[0][1], pad, 0, 2 * Math.PI);
    return;
  }

  const n = hull.length;
  // Centroid of hull for outward expansion direction
  const cx = hull.reduce((s, p) => s + p[0], 0) / n;
  const cy = hull.reduce((s, p) => s + p[1], 0) / n;

  // Expand each vertex pad units outward from centroid
  const exp: [number, number][] = hull.map(([x, y]) => {
    const dx = x - cx, dy = y - cy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return [x + (dx / len) * pad, y + (dy / len) * pad];
  });

  // Smooth bezier by stepping through edge midpoints as endpoints
  const midX = (i: number, j: number) => (exp[i][0] + exp[j][0]) / 2;
  const midY = (i: number, j: number) => (exp[i][1] + exp[j][1]) / 2;

  ctx.moveTo(midX(n - 1, 0), midY(n - 1, 0));
  for (let i = 0; i < n; i++) {
    ctx.quadraticCurveTo(exp[i][0], exp[i][1], midX(i, (i + 1) % n), midY(i, (i + 1) % n));
  }
  ctx.closePath();
}

// ── Sector-aware radial seeding ───────────────────────────────────────────────
// Each node starts within its sector's 60° wedge at the ring radius for its type.

function computeRadialPositions(nodes: CadNode[]): Record<string, { x: number; y: number }> {
  // Group by (sectorIndex, nodeType)
  const groups: Record<string, CadNode[]> = {};
  for (const node of nodes) {
    const s = NODE_SECTOR[node.id] ?? 0;
    const key = `${s}-${node.type}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(node);
  }

  const HALF = Math.PI / SECTORS.length; // 30° half-width per sector
  const positions: Record<string, { x: number; y: number }> = {};

  for (const [key, ring] of Object.entries(groups)) {
    const [sStr, type] = key.split('-');
    const s = parseInt(sStr, 10);
    const center = SECTORS[s].centerAngle;
    const r = RING_RADII[type as NodeType];
    const count = ring.length;

    ring.forEach((node, i) => {
      const t = count === 1 ? 0.5 : i / (count - 1);
      // Use 80% of the wedge width to leave gaps at sector edges
      const angle = center - HALF * 0.8 + t * HALF * 1.6;
      const jitter = r * 0.05;
      positions[node.id] = {
        x: r * Math.cos(angle) + (Math.random() - 0.5) * jitter,
        y: r * Math.sin(angle) + (Math.random() - 0.5) * jitter,
      };
    });
  }

  return positions;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  graphData: GraphData;
  activeNodeIds: Set<string>;
  onNodeClick: (node: CadNode | null) => void;
  selectedNodeId: string | null;
  isDark: boolean;
}

export default function CadGraph({
  graphData,
  activeNodeIds,
  onNodeClick,
  selectedNodeId,
  isDark,
}: Props) {
  const fgRef = useRef<any>(null);
  const { savePositions, getPositions } = useNodePositions();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const hasZoomedToFit = useRef(false);

  // ── Degree map ──────────────────────────────────────────────────────────────
  const degreeMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of graphData.nodes) map[n.id] = 0;
    for (const l of graphData.links) {
      const src = (l.source as any)?.id ?? l.source;
      const tgt = (l.target as any)?.id ?? l.target;
      map[src] = (map[src] ?? 0) + 1;
      map[tgt] = (map[tgt] ?? 0) + 1;
    }
    return map;
  }, [graphData]);

  const getNodeRadius = useCallback(
    (node: any): number => {
      const degree = degreeMap[node.id] ?? 1;
      return Math.max(12, 10 + Math.sqrt(degree) * 6);
    },
    [degreeMap]
  );

  // ── Stable seeded graph data ────────────────────────────────────────────────
  const seededData = useMemo(() => {
    const saved = getPositions();
    const hasSaved = Object.keys(saved).length > 0;
    const seed = hasSaved ? saved : computeRadialPositions(graphData.nodes as CadNode[]);
    const nodes = graphData.nodes.map((n) => {
      const pos = seed[n.id];
      return pos ? { ...n, x: pos.x, y: pos.y } : { ...n };
    });
    return { nodes, links: graphData.links };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveNodes = useRef(seededData.nodes);

  // ── Resize observer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const e of entries) {
        setDimensions({ width: e.contentRect.width, height: e.contentRect.height });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // ── Force configuration ─────────────────────────────────────────────────────
  useEffect(() => {
    const apply = () => {
      const fg = fgRef.current;
      if (!fg) return false;

      fg.d3Force('charge').strength(-220);
      fg.d3Force('link').distance(65).strength(0.6);
      fg.d3Force('collide', forceCollide((n: any) => getNodeRadius(n) + 6));
      fg.d3Force('center', forceCenter(0, 0).strength(0.03));

      // Sector gravity — pulls each node gently toward its sector's center angle
      // at the ring radius appropriate for its type. Strength decays with alpha.
      fg.d3Force('sector', (alpha: number) => {
        for (const node of liveNodes.current as any[]) {
          const sIdx = NODE_SECTOR[node.id as string];
          if (sIdx === undefined) continue;
          const { centerAngle } = SECTORS[sIdx];
          const targetR = RING_RADII[node.type as NodeType];
          const tx = Math.cos(centerAngle) * targetR;
          const ty = Math.sin(centerAngle) * targetR;
          node.vx = (node.vx ?? 0) + (tx - node.x) * alpha * 0.04;
          node.vy = (node.vy ?? 0) + (ty - node.y) * alpha * 0.04;
        }
      });

      fg.d3ReheatSimulation();
      setTimeout(() => fg.zoomToFit(600, 60), 100);
      return true;
    };

    if (!apply()) {
      const t1 = setTimeout(apply, 200);
      const t2 = setTimeout(apply, 700);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [getNodeRadius]);

  // ── Engine stop ─────────────────────────────────────────────────────────────
  const handleEngineStop = useCallback(() => {
    savePositions(liveNodes.current as CadNode[]);
    if (!hasZoomedToFit.current) {
      hasZoomedToFit.current = true;
      fgRef.current?.zoomToFit(800, 60);
    }
  }, [savePositions]);

  // ── Drag ────────────────────────────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (node: any) => {
      node.fx = node.x;
      node.fy = node.y;
      savePositions(liveNodes.current as CadNode[]);
    },
    [savePositions]
  );

  // ── Node color ──────────────────────────────────────────────────────────────
  const getNodeColor = useCallback(
    (node: any): string => {
      const base = NODE_COLORS[node.type as NodeType];
      const color = isDark ? base.dark : base.light;
      if (activeNodeIds.size === 0) return color;
      return activeNodeIds.has(node.id) ? color : color + '28';
    },
    [activeNodeIds, isDark]
  );

  // ── Link color ──────────────────────────────────────────────────────────────
  const getLinkColor = useCallback(
    (link: any): string => {
      const base = LINK_COLORS[link.relationship] ?? '#6b7280';
      const src = typeof link.source === 'object' ? link.source.id : link.source;
      const tgt = typeof link.target === 'object' ? link.target.id : link.target;
      if (activeNodeIds.size === 0) return base + '99';
      return (activeNodeIds.has(src) || activeNodeIds.has(tgt)) ? base + 'cc' : base + '18';
    },
    [activeNodeIds]
  );

  // ── Sector background painter (runs before nodes/links each frame) ───────────
  // Uses a live convex hull computed from current node positions each frame,
  // so the blob adapts whenever nodes are dragged.
  const drawSectors = useCallback(
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      // Collect live node positions grouped by sector
      const sectorPts: [number, number][][] = SECTORS.map(() => []);
      for (const node of liveNodes.current as any[]) {
        const s = NODE_SECTOR[node.id as string];
        if (s !== undefined && node.x != null && node.y != null) {
          sectorPts[s].push([node.x as number, node.y as number]);
        }
      }

      // Draw a smooth padded hull for each sector
      for (let s = 0; s < SECTORS.length; s++) {
        const pts = sectorPts[s];
        if (pts.length === 0) continue;
        const { darkBg, lightBg } = SECTORS[s];

        ctx.beginPath();
        paintHull(ctx, pts, 48);
        ctx.fillStyle = isDark ? darkBg : lightBg;
        ctx.fill();
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)';
        ctx.lineWidth = 1 / globalScale;
        ctx.stroke();
      }

      // Sector labels at fixed outer positions (always legible even at overview)
      for (let s = 0; s < SECTORS.length; s++) {
        if (sectorPts[s].length === 0) continue;
        const { centerAngle, name, darkLabel, lightLabel } = SECTORS[s];
        const lx = Math.cos(centerAngle) * 770;
        const ly = Math.sin(centerAngle) * 770;
        ctx.font = `700 ${12 / globalScale}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isDark ? darkLabel : lightLabel;
        ctx.fillText(name, lx, ly);
      }
    },
    [isDark]
  );

  // ── Canvas node painter ─────────────────────────────────────────────────────
  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const r = getNodeRadius(node);
      const isSelected = node.id === selectedNodeId;
      const isActive = activeNodeIds.size === 0 || activeNodeIds.has(node.id);

      ctx.globalAlpha = isActive ? 1 : 0.12;

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 5, 0, 2 * Math.PI);
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = getNodeColor(node);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = isDark ? '#ffffff' : '#1f2937';
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }

      const fontSize = Math.min(20, Math.max(7, 11 / globalScale));

      ctx.font = `${node.type === 'company' ? '600 ' : ''}${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const labelY = node.y + r + (2 / globalScale);

      ctx.lineWidth = 3 / globalScale;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.92)';
      ctx.strokeText(node.name, node.x, labelY);

      ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b';
      ctx.fillText(node.name, node.x, labelY);

      ctx.globalAlpha = 1;
    },
    [getNodeColor, getNodeRadius, selectedNodeId, activeNodeIds, isDark]
  );

  const paintPointerArea = useCallback(
    (node: any, color: string, ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, getNodeRadius(node) + 4, 0, 2 * Math.PI);
      ctx.fill();
    },
    [getNodeRadius]
  );

  return (
    <div ref={containerRef} className="w-full h-full">
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={seededData as any}
        nodeId="id"
        nodeCanvasObject={paintNode}
        nodeCanvasObjectMode={() => 'replace'}
        nodePointerAreaPaint={paintPointerArea}
        nodeVal={(node: any) => Math.max(1, degreeMap[(node as CadNode).id] ?? 1)}
        linkColor={getLinkColor}
        linkWidth={(link: any) => {
          if (activeNodeIds.size === 0) return 1.2;
          const src = typeof link.source === 'object' ? link.source.id : link.source;
          const tgt = typeof link.target === 'object' ? link.target.id : link.target;
          return (activeNodeIds.has(src) || activeNodeIds.has(tgt)) ? 2 : 0.3;
        }}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.06}
        onNodeClick={(node: any) => onNodeClick(node as CadNode)}
        onBackgroundClick={() => onNodeClick(null)}
        onNodeDragEnd={handleDragEnd}
        onEngineStop={handleEngineStop}
        onRenderFramePre={drawSectors as any}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.25}
        cooldownTime={6000}
        backgroundColor={isDark ? '#0f172a' : '#f8fafc'}
        enableNodeDrag
        enableZoomInteraction
        enablePanInteraction
      />
    </div>
  );
}
