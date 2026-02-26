import { useCallback } from 'react';
import { CadNode } from '@/types';

const STORAGE_KEY = 'cadmap-positions';

type PositionMap = Record<string, { x: number; y: number }>;

export function useNodePositions() {
  const getPositions = useCallback((): PositionMap => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const savePositions = useCallback((nodes: CadNode[]) => {
    if (typeof window === 'undefined') return;
    const map: PositionMap = {};
    for (const n of nodes) {
      if (n.x !== undefined && n.y !== undefined) {
        map[n.id] = { x: n.x, y: n.y };
      }
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      // storage might be full — silently ignore
    }
  }, []);

  const clearPositions = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const applyPositions = useCallback(
    (nodes: CadNode[]): CadNode[] => {
      const positions = getPositions();
      return nodes.map((n) => {
        const saved = positions[n.id];
        if (saved) {
          // Set x/y as simulation starting hints only — no fx/fy so nodes aren't pinned
          return { ...n, x: saved.x, y: saved.y };
        }
        return n;
      });
    },
    [getPositions]
  );

  return { getPositions, savePositions, clearPositions, applyPositions };
}
