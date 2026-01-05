'use client';

import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/client/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-slate-800 border-slate-600 text-gray-300',
      success: 'bg-green-500/20 border-green-500 text-green-400',
      warning: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
      error: 'bg-red-500/20 border-red-500 text-red-400',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';



