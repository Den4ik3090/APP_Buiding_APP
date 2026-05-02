import React from 'react';

interface WrapperProps {
  direction?: 'row' | 'column';
  gap?: 'sm' | 'md' | 'lg';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'between';
  wrap?: boolean;
  children: React.ReactNode;
}

const DIRECTION: Record<NonNullable<WrapperProps['direction']>, string> = {
  row:    'flex-row',
  column: 'flex-col',
};

const GAP: Record<NonNullable<WrapperProps['gap']>, string> = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const PADDING: Record<NonNullable<WrapperProps['padding']>, string> = {
  none: 'p-0',
  sm:   'p-2',
  md:   'p-4',
  lg:   'p-6',
};

const ALIGN: Record<NonNullable<WrapperProps['align']>, string> = {
  start:   'items-start',
  center:  'items-center',
  end:     'items-end',
  between: 'justify-between',
};

export function Wrapper({
  direction = 'column',
  gap = 'md',
  padding = 'none',
  align = 'start',
  wrap = false,
  children,
}: WrapperProps) {
  return (
    <div
      className={[
        'flex',
        DIRECTION[direction],
        GAP[gap],
        PADDING[padding],
        ALIGN[align],
        wrap ? 'flex-wrap' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
