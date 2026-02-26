'use client';

const ENTRIES = [
  { label: 'Company',  color: 'bg-amber-400 dark:bg-amber-500' },
  { label: 'Kernel',   color: 'bg-teal-400 dark:bg-teal-400' },
  { label: 'Software', color: 'bg-violet-400 dark:bg-violet-400' },
];

const LINK_ENTRIES = [
  { label: 'Owns',        color: 'bg-gray-500' },
  { label: 'Uses kernel', color: 'bg-sky-500' },
  { label: 'Built on',    color: 'bg-orange-500' },
];

export default function Legend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-3 space-y-2.5 text-xs shadow-lg">
      <div>
        <p className="text-muted-foreground font-medium uppercase tracking-wider mb-1.5 text-[10px]">
          Node Type
        </p>
        <div className="space-y-1">
          {ENTRIES.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${color}`} />
              <span className="text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border pt-2">
        <p className="text-muted-foreground font-medium uppercase tracking-wider mb-1.5 text-[10px]">
          Relationship
        </p>
        <div className="space-y-1">
          {LINK_ENTRIES.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`w-5 h-0.5 flex-shrink-0 ${color} rounded-full`} />
              <span className="text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
