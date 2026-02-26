'use client';

import { CadNode, NodeType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, ExternalLink } from 'lucide-react';

const TYPE_STYLES: Record<NodeType, string> = {
  company:  'bg-amber-400/20 text-amber-700 dark:text-amber-300 border-amber-400/40',
  kernel:   'bg-teal-400/20 text-teal-700 dark:text-teal-300 border-teal-400/40',
  software: 'bg-violet-400/20 text-violet-700 dark:text-violet-300 border-violet-400/40',
};

const TYPE_LABELS: Record<NodeType, string> = {
  company:  'Company',
  kernel:   'Kernel',
  software: 'Software',
};

interface Props {
  node: CadNode;
  onClose: () => void;
}

export default function NodeCard({ node, onClose }: Props) {
  return (
    <div className="absolute bottom-4 right-4 z-20 w-80 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base leading-tight truncate">{node.name}</h3>
          <div className="mt-1.5">
            <span
              className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_STYLES[node.type]}`}
            >
              {TYPE_LABELS[node.type]}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 p-1 rounded-md hover:bg-accent transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {node.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {node.description}
          </p>
        )}

        {node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {node.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {node.url && (
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {new URL(node.url).hostname}
          </a>
        )}
      </div>
    </div>
  );
}
