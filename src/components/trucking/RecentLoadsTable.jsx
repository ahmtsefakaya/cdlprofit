import moment from 'moment';
import { Badge } from '../ui/badge';
import { formatCurrency, formatMiles } from './calcUtils';

export function RecentLoadsTable({ loads = [] }) {
  const sorted = [...loads]
    .sort((a, b) => moment(b.delivery_date || b.pickup_date).diff(moment(a.delivery_date || a.pickup_date)))
    .slice(0, 5);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <p className="text-sm">No loads recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Load ID</th>
            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Broker</th>
            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Route</th>
            <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Miles</th>
            <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount</th>
            <th className="pb-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
            <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {sorted.map((load) => (
            <tr key={load.id || load.load_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <td className="py-3 font-mono text-xs font-medium text-primary-800 dark:text-blue-400">{load.load_id}</td>
              <td className="py-3 text-slate-700 dark:text-slate-300">{load.broker_name}</td>
              <td className="py-3 text-slate-600 dark:text-slate-400">
                <span className="whitespace-nowrap">
                  {load.pickup_city}, {load.pickup_state} → {load.delivery_city}, {load.delivery_state}
                </span>
              </td>
              <td className="py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{formatMiles(load.loaded_miles)}</td>
              <td className="py-3 text-right tabular-nums font-semibold text-slate-900 dark:text-white">{formatCurrency(load.gross_amount)}</td>
              <td className="py-3 text-center">
                <Badge variant={load.status === 'Delivered' ? 'success' : 'warning'}>
                  {load.status || 'Pending'}
                </Badge>
              </td>
              <td className="py-3 text-right text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {load.delivery_date ? moment(load.delivery_date).format('MMM D, YYYY') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
