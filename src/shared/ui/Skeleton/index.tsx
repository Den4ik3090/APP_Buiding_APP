import React from 'react';

interface SkeletonLoaderProps {
  rows?: number;
}

function SkeletonCell({ short = false }: { short?: boolean }) {
  return (
    <div
      className={`h-4 rounded bg-zinc-200 dark:bg-zinc-700 ${short ? 'w-20' : 'w-full'}`}
    />
  );
}

export default function SkeletonLoader({ rows = 8 }: SkeletonLoaderProps) {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="h-5 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-8 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-zinc-100 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex-1 space-y-2">
              <SkeletonCell />
              <SkeletonCell short />
            </div>
            <div className="flex shrink-0 gap-2">
              <div className="h-7 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-7 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
