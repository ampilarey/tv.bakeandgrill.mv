/**
 * CVA-powered button variants
 * Usage:
 *   import { buttonVariants } from '../ui/button';
 *   <button className={buttonVariants({ variant: 'primary', size: 'sm' })}>Click me</button>
 *
 * Or compose with your existing Button component by spreading the class string.
 */
import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  // Base styles shared by all variants
  'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        primary: [
          'bg-tv-accent text-white',
          'hover:bg-tv-accentDark',
          'focus:ring-tv-accent',
          'shadow-md hover:shadow-lg',
        ],
        ghost: [
          'bg-transparent text-tv-textSecondary',
          'hover:bg-tv-bgHover hover:text-tv-text',
          'focus:ring-tv-accent',
        ],
        danger: [
          'bg-red-600 text-white',
          'hover:bg-red-700',
          'focus:ring-red-500',
          'shadow-md',
        ],
        overlay: [
          'bg-black/70 text-white backdrop-blur-sm',
          'hover:bg-black/90',
          'focus:ring-white/50',
        ],
      },
      size: {
        xs: 'px-2 py-1 text-xs gap-1',
        sm: 'px-3 py-1.5 text-sm gap-1.5',
        md: 'px-4 py-2 text-sm gap-2',
        lg: 'px-5 py-2.5 text-base gap-2',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export const badgeVariants = cva(
  'inline-flex items-center justify-center font-semibold rounded-full',
  {
    variants: {
      color: {
        default: 'bg-tv-bgSoft text-tv-textSecondary',
        success: 'bg-green-500/20 text-green-400 border border-green-500/30',
        danger:  'bg-red-500/20  text-red-400  border border-red-500/30',
        info:    'bg-blue-500/20 text-blue-400  border border-blue-500/30',
        accent:  'bg-tv-accent/20 text-tv-accentLight border border-tv-accent/30',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-xs',
        md: 'px-2.5 py-1   text-xs',
        lg: 'px-3   py-1.5 text-sm',
      },
    },
    defaultVariants: {
      color: 'default',
      size: 'md',
    },
  }
);
