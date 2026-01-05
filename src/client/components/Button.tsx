'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/client/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-green-500/20 border-2 border-green-500 text-green-400 hover:bg-green-500/30 hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]',
      secondary:
        'bg-pink-500/20 border-2 border-pink-500 text-pink-400 hover:bg-pink-500/30 hover:shadow-[0_0_20px_rgba(255,0,110,0.3)]',
      ghost:
        'bg-transparent border-2 border-cyan-500/30 text-cyan-400 hover:border-cyan-500 hover:bg-cyan-500/10',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';



