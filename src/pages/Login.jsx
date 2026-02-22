import { useState } from 'react';
import { Truck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { authService } from '../api/auth';
import { useAuth } from '../contexts/useAuth';

export default function Login() {
  const { setUser } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Please enter email and password', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      let user;
      if (mode === 'login') {
        const result = await authService.login(email, password);
        user = result.user;
      } else {
        const result = await authService.register({ email, password });
        user = result.user;
      }
      setUser(user);
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: mode === 'login' ? 'Login failed' : 'Registration failed',
        description: error?.message || 'Please check your credentials and try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-800 mb-4">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">TruckFlow</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">CDL Profit Tracker</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? 'Please wait…' : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <div className="mt-4 text-center">
            {mode === 'login' ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => setMode('register')}
                  className="text-primary-800 dark:text-blue-400 font-medium hover:underline"
                >
                  Register
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-primary-800 dark:text-blue-400 font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
