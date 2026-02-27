'use client';

import { NodeType, Tag } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const NODE_TYPES: { value: NodeType; label: string; color: string }[] = [
  { value: 'company',  label: 'Companies', color: 'bg-amber-400 dark:bg-amber-500' },
  { value: 'kernel',   label: 'Kernels',   color: 'bg-teal-400 dark:bg-teal-400' },
  { value: 'software', label: 'Software',  color: 'bg-violet-400 dark:bg-violet-400' },
];

const TAG_GROUPS: { label: string; tags: { value: Tag; label: string }[] }[] = [
  {
    label: 'License & Business',
    tags: [
      { value: 'open-source',     label: 'Open Source' },
      { value: 'commercial',      label: 'Commercial' },
      { value: 'free',            label: 'Free' },
      { value: 'startup',         label: 'Startup' },
      { value: 'cloud',           label: 'Cloud' },
      { value: 'kernel-provider', label: 'Kernel Provider' },
    ],
  },
  {
    label: 'Modeling Paradigm',
    tags: [
      { value: 'parametric',  label: 'Parametric' },
      { value: 'direct',      label: 'Direct Edit' },
      { value: 'implicit',    label: 'Implicit / SDF' },
      { value: 'procedural',  label: 'Procedural' },
      { value: 'mesh',        label: 'Mesh / Poly' },
      { value: 'sculpt',      label: 'Sculpting' },
      { value: 'bim',         label: 'BIM' },
      { value: 'simulation',  label: 'Simulation' },
      { value: 'cam',         label: 'CAM' },
      { value: 'pcb',         label: 'PCB / EDA' },
    ],
  },
];

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  typeFilters: Set<NodeType>;
  onTypeToggle: (t: NodeType) => void;
  tagFilters: Set<Tag>;
  onTagToggle: (t: Tag) => void;
  onReset: () => void;
  visibleCount: number;
  totalCount: number;
}

export default function FilterSidebar({
  search,
  onSearchChange,
  typeFilters,
  onTypeToggle,
  tagFilters,
  onTagToggle,
  onReset,
  visibleCount,
  totalCount,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`
        absolute left-0 top-0 h-full z-20 flex pointer-events-auto transition-all duration-300
        ${collapsed ? 'w-10' : 'w-72'}
      `}
    >
      {/* Panel */}
      {!collapsed && (
        <div className="w-full h-full bg-background/90 backdrop-blur-md border-r border-border flex flex-col overflow-hidden shadow-xl">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm tracking-wide uppercase text-muted-foreground">
                Filters
              </h2>
              <span className="text-xs text-muted-foreground">
                {visibleCount} / {totalCount} nodes
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search nodes…"
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Node types */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Node Type
              </p>
              <div className="space-y-1.5">
                {NODE_TYPES.map(({ value, label, color }) => {
                  const active = typeFilters.size === 0 || typeFilters.has(value);
                  return (
                    <button
                      key={value}
                      onClick={() => onTypeToggle(value)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors
                        ${
                          typeFilters.has(value)
                            ? 'bg-accent text-accent-foreground'
                            : typeFilters.size === 0
                            ? 'hover:bg-accent/50'
                            : 'opacity-40 hover:opacity-70 hover:bg-accent/30'
                        }`}
                    >
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${color}`} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags */}
            {TAG_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.tags.map(({ value, label }) => {
                    const isActive = tagFilters.has(value);
                    return (
                      <button
                        key={value}
                        onClick={() => onTagToggle(value)}
                        className={`
                          text-xs px-2 py-1 rounded-full border transition-colors font-medium
                          ${
                            isActive
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-transparent border-border text-muted-foreground hover:border-primary/60 hover:text-foreground'
                          }
                        `}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={onReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset filters
            </Button>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`
          absolute top-1/2 -translate-y-1/2 z-30 w-6 h-12 flex items-center justify-center
          bg-background border border-border rounded-r-lg shadow-md
          hover:bg-accent transition-colors
          ${collapsed ? 'right-0 translate-x-full' : '-right-3'}
        `}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}
