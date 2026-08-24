import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { getErrorMessage } from '../services/api';
import { notifyError, notifySuccess } from '../utils/notify';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import Logo from '../components/Logo';
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from =
    (location.state as { from?: string } | null)?.from ?? '/';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      notifySuccess('Welcome back!');
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'OWNER') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err));
      notifyError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pm-color-page)] lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-600 to-emerald-600 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-emerald-300/20 blur-2xl" />

        <div className="relative flex items-center gap-3">
          <Logo className="h-11 w-11" />
          <span className="text-2xl font-bold tracking-tight text-white">
            Spotit
          </span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
            Smart Parking Made Simple
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-emerald-100">
            Reserve parking, navigate seamlessly and manage your parking
            sessions in real time.
          </p>
        </div>

        <p className="relative text-sm text-emerald-200">
          &copy; {new Date().getFullYear()} Spotit. All rights reserved.
        </p>
      </aside>

      {/* Login card */}
      <main className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-4 lg:hidden">
            <Logo className="h-14 w-14" />
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--pm-color-text)]">
                Spotit
              </h1>
              <p className="text-sm text-[var(--pm-color-muted)]">
                Smart Parking Made Simple
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--pm-color-surface)] p-8 shadow-sm ring-1 ring-[var(--pm-color-border)] sm:p-10">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--pm-color-text)]">
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm text-[var(--pm-color-muted)]">
              Sign in to your Spotit account to continue.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <Input
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Input
                id="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              {error && <Alert variant="error" message={error} />}

              <Button type="submit" loading={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--pm-color-muted)]">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
