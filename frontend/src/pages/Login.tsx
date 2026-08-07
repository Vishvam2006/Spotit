import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { getErrorMessage } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import Logo from '../components/Logo';
import AuthSidebar from '../components/AuthSidebar';

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
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <AuthSidebar />

      <main className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-4 lg:hidden">
            <img src="/assets/image.png" alt="ParkMitra" className="h-50 w-auto object-contain" />
            <div className="text-center">
              <p className="text-sm text-[#64748B]">Arrive. Park. Go.</p>
            </div>
          </div>

          <div className="rounded-[24px] bg-white p-8 shadow-[0_18px_44px_rgb(15_23_42_/_0.10)] ring-1 ring-[#E2E8F0] sm:p-10">
            <h2 className="text-3xl font-bold tracking-tight text-[#0F172A]">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Sign in to your ParkMitra account to continue.
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

            <p className="mt-6 text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-bold text-[#0E9F94] hover:text-[#19C7B2]"
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
