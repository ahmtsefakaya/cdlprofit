import * as React from 'react';
import { cn } from '../../lib/utils';

const Badge = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-primary-800 text-white',
    secondary: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    destructive: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100',
    outline: 'border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300',
    success: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100',
  };
  return (
    <div
      ref={ref}
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors', variants[variant], className)}
      {...props}
    />
  );
});
Badge.displayName = 'Badge';

export { Badge };
