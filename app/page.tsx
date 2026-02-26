'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { graphData } from '@/data/cadData';
import { CadNode, NodeType, Tag } from '@/types';
import FilterSidebar from '@/components/FilterSidebar';
import NodeCard from '@/components/NodeCard';
import Legend from '@/components/Legend';
import ThemeToggle from '@/components/ThemeToggle';
import { useNodePositions } from '@/hooks/useNodePositions';
import { RotateCcw, Network } from 'lucide-react';

// Dynamic import to prevent SSR
const CadGraph = dynamic(() => import('@/components/CadGraph'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <Network className="h-8 w-8 animate-pulse" />
      <span className="text-sm">Loading graph…</span>
    </div>
  ),
});

export default function HomePage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { clearPositions } = useNodePositions();

  const [search, setSearch] = useState('');
  const [typeFilters, setTypeFilters] = useState<Set<NodeType>>(new Set());
  const [tagFilters, setTagFilters] = useState<Set<Tag>>(new Set());
  const [selectedNode, setSelectedNode] = useState<CadNode | null>(null);

  const handleTypeToggle = useCallback((type: NodeType) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleTagToggle = useCallback((tag: Tag) => {
    setTagFilters((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setSearch('');
    setTypeFilters(new Set());
    setTagFilters(new Set());
    setSelectedNode(null);
  }, []);

  // Compute which node IDs are "active" (highlighted) based on filters
  const activeNodeIds = useMemo<Set<string>>(() => {
    const hasFilters =
      search.trim() !== '' || typeFilters.size > 0 || tagFilters.size > 0;
    if (!hasFilters) return new Set<string>();

    const matched = new Set<string>();
    for (const node of graphData.nodes) {
      const matchesSearch =
        search.trim() === '' ||
        node.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilters.size === 0 || typeFilters.has(node.type);
      const matchesTags =
        tagFilters.size === 0 ||
        node.tags.some((t) => tagFilters.has(t));

      if (matchesSearch && matchesType && matchesTags) {
        matched.add(node.id);
      }
    }
    return matched;
  }, [search, typeFilters, tagFilters]);

  const visibleCount =
    activeNodeIds.size === 0 ? graphData.nodes.length : activeNodeIds.size;

  const handleResetLayout = useCallback(() => {
    clearPositions();
    window.location.reload();
  }, [clearPositions]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 dark:bg-slate-950 light:bg-slate-50">
      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2.5">
          <Network className="h-5 w-5 text-teal-400" />
          <span className="font-bold text-base tracking-tight">CadMap</span>
          <span className="hidden sm:inline text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
            CAD Ecosystem Explorer
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetLayout}
            title="Reset graph layout"
            className="p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-accent transition-colors shadow-sm text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Graph — full viewport minus header */}
      <main className="absolute inset-0 top-12">
        <CadGraph
          graphData={graphData}
          activeNodeIds={activeNodeIds}
          onNodeClick={setSelectedNode}
          selectedNodeId={selectedNode?.id ?? null}
          isDark={isDark}
        />
      </main>

      {/* Filter sidebar — pointer-events-none on wrapper so the canvas stays interactive;
          the sidebar's own div carries pointer-events-auto */}
      <div className="absolute inset-0 top-12 pointer-events-none z-20">
        <FilterSidebar
          search={search}
          onSearchChange={setSearch}
          typeFilters={typeFilters}
          onTypeToggle={handleTypeToggle}
          tagFilters={tagFilters}
          onTagToggle={handleTagToggle}
          onReset={handleReset}
          visibleCount={visibleCount}
          totalCount={graphData.nodes.length}
        />
      </div>

      {/* Node detail card */}
      {selectedNode && (
        <NodeCard node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}

      {/* Legend */}
      <Legend />
    </div>
  );
}
