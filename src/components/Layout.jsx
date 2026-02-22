import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Truck, Receipt, BarChart3, Settings, Menu, Sun, Moon, LogOut,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';
import { useSettings } from './trucking/useSettings';
import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AppSettings from '../api/entities/AppSettings';
import { useAuth } from '../contexts/useAuth';
import { auth } from '../api/auth';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/loads', label: 'Loads', icon: Truck },
  { path: '/expenses', label: 'Expenses', icon: Receipt },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

function NavLink({ item, onClick }) {
  const location = useLocation();
  const isActive = item.path === '/'
    ? location.pathname === '/'
    : location.pathname.startsWith(item.path);
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
        isActive
          ? 'bg-white/20 text-white'
          : 'text-blue-100 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {item.label}
    </Link>
  );
}

function SidebarContent({ onNavClick }) {
  const { settings } = useSettings();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const darkModeMutation = useMutation({
    mutationFn: async (isDark) => {
      const existing = await AppSettings.list();
      if (existing && existing.length > 0) {
        return await AppSettings.update(existing[0].id, { dark_mode: isDark });
      }
      return await AppSettings.create({ dark_mode: isDark });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      console.error('Failed to save dark mode preference:', error);
    },
  });

  const handleDarkToggle = () => {
    const isDark = !settings.dark_mode;
    document.documentElement.classList.toggle('dark', isDark);
    darkModeMutation.mutate(isDark);
  };

  const handleLogout = () => {
    auth.logout('/');
  };

  return (
    <div className="flex h-full flex-col bg-primary-800">
      {/* Header */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white leading-none">TruckFlow</p>
            {settings.company_name && (
              <p className="text-xs text-blue-200 mt-0.5 truncate max-w-[140px]">{settings.company_name}</p>
            )}
          </div>
        </div>
        {settings.driver_name && (
          <p className="mt-3 text-xs text-blue-200">Driver: <span className="text-white font-medium">{settings.driver_name}</span></p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.path} item={item} onClick={onNavClick} />
        ))}
      </nav>

      {/* Dark Mode Toggle */}
      <div className="px-3 py-2 border-t border-white/10">
        <button
          onClick={handleDarkToggle}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition-all"
        >
          {settings.dark_mode ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
          {settings.dark_mode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/10 space-y-2">
        {user?.email && (
          <p className="text-xs text-blue-300 px-3 truncate">{user.email}</p>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
        <p className="text-xs text-blue-300 px-3">CDL Profit Tracker v1.0</p>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const { settings } = useSettings();

  // Apply dark mode
  useEffect(() => {
    if (settings.dark_mode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.dark_mode]);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <span className="font-bold text-primary-800 dark:text-white">TruckFlow</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={useLocation().pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
