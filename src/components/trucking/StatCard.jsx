import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function StatCard({ icon: Icon, label, value, trend, trendLabel, accent, large, className }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'rounded-xl border bg-white p-5 shadow-sm dark:bg-slate-800',
        accent
          ? 'border-blue-400 bg-gradient-to-br from-primary-800 to-blue-600 text-white shadow-lg shadow-blue-500/20 dark:from-primary-900 dark:to-blue-700'
          : 'border-slate-200 dark:border-slate-700',
        large && 'col-span-1',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={cn('text-xs font-medium uppercase tracking-wider', accent ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400')}>
            {label}
          </p>
          <p className={cn('mt-2 font-bold tabular-nums', large ? 'text-3xl' : 'text-2xl', accent ? 'text-white' : 'text-slate-900 dark:text-white')}>
            {value}
          </p>
          {trend !== undefined && (
            <p className={cn('mt-1 text-xs', trend >= 0 ? 'text-green-400' : 'text-red-400')}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% {trendLabel}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('rounded-lg p-2', accent ? 'bg-white/20' : 'bg-primary-50 dark:bg-slate-700')}>
            <Icon className={cn('h-5 w-5', accent ? 'text-white' : 'text-primary-800 dark:text-blue-400')} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
