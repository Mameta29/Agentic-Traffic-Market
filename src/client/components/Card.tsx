'use client';

import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/client/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: 'green' | 'pink' | 'cyan' | 'none';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, glow = 'green', children, ...props }, ref) => {
    const glowStyles = {
      green: 'border-green-500/30 hover:border-green-500/60',
      pink: 'border-pink-500/30 hover:border-pink-500/60',
      cyan: 'border-cyan-500/30 hover:border-cyan-500/60',
      none: 'border-gray-700',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-slate-900/50 backdrop-blur-sm border rounded-lg transition-colors',
          glowStyles[glow],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-4 border-b border-gray-700', className)} {...props} />
  )
);

CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-4', className)} {...props} />
  )
);

CardContent.displayName = 'CardContent';


