import { useState, type FormEvent, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { getErrorMessage } from '../services/api';
import { notifyError, notifySuccess } from '../utils/notify';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import Logo from '../components/Logo';

export type AuthMode = 'login' | 'register' | 'forgot-password' | 'verify-otp' | 'reset-password';

export default function Auth({ defaultMode = 'login' }: { defaultMode?: AuthMode }) {
  const { login, register, forgotPassword, verifyOtp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<AuthMode>(defaultMode);

  // Update mode if navigation changes (e.g., clicking browser back button)
  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  // Status State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'register') {
      if (!fullName.trim() || !email.trim() || !password) {
        setError('Please fill in all fields.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else if (mode === 'login') {
      if (!email.trim() || !password) {
        setError('Please enter your email and password.');
        return;
      }
    } else if (mode === 'forgot-password') {
      if (!email.trim()) {
        setError('Please enter your email.');
        return;
      }
    } else if (mode === 'verify-otp') {
      if (!otp.trim()) {
        setError('Please enter the OTP.');
        return;
      }
    } else if (mode === 'reset-password') {
      if (!password || password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await register(fullName.trim(), email.trim(), password);
        setSuccess('Account created successfully!');
        notifySuccess('Account created successfully! Please sign in.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        window.history.replaceState(null, '', '/login');
      } else if (mode === 'login') {
        const user = await login(email.trim(), password);
        notifySuccess('Welcome back!');
        if (user.role === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        } else if (user.role === 'OWNER') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      } else if (mode === 'forgot-password') {
        await forgotPassword(email.trim());
        setSuccess('OTP sent successfully!');
        notifySuccess('OTP sent successfully! Please check your email.');
        setMode('verify-otp');
      } else if (mode === 'verify-otp') {
        await verifyOtp(email.trim(), otp.trim());
        setSuccess('OTP verified! You can now reset your password.');
        setMode('reset-password');
      } else if (mode === 'reset-password') {
        const user = await resetPassword(email.trim(), otp.trim(), password);
        notifySuccess('Password reset successfully. Welcome back!');
        if (user.role === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        } else if (user.role === 'OWNER') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
      notifyError(err);
    } finally {
      setLoading(false);
    }
  }

  const toggleMode = () => {
    const newMode = mode === 'login' ? 'register' : 'login';
    setMode(newMode);
    setError('');
    setSuccess('');
    // Update URL to match mode without full reload
    window.history.replaceState(null, '', `/${newMode}`);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#071F1C] overflow-hidden flex flex-col lg:flex-row">
      {/* Background Images */}
      <div className="absolute inset-0 z-0">
        <picture>
          <source media="(min-width: 1024px)" srcSet="/images/auth-bg-desktop.png" />
          <img
            src="/images/auth-bg-mobile.png"
            alt="Spotit Parking"
            className="h-full w-full object-cover object-top opacity-60 mix-blend-overlay lg:opacity-100 lg:mix-blend-normal"
          />
        </picture>
        {/* Overlay to darken background enough for form readability */}
        <div className="absolute inset-0 bg-black/40 lg:bg-black/20" />
      </div>

      {/* Desktop Left Side (Empty to show illustration) / Mobile Top Area */}
      <div className="relative z-10 flex flex-1 flex-col p-6 lg:p-12">
        <Link to="/" className="flex items-center gap-3 w-fit">
          <Logo className="h-10 w-10 text-white" />
          <span className="text-2xl font-bold tracking-tight text-white">Spotit</span>
        </Link>
      </div>

      {/* Right Side / Bottom Sheet Form Area */}
      <div className="relative z-10 flex w-full flex-col justify-end lg:w-1/2 lg:max-w-[600px] lg:justify-center lg:p-12 lg:bg-transparent">
        <div className="w-full rounded-t-[2.5rem] bg-white p-8 pb-12 shadow-2xl lg:rounded-3xl lg:p-12 backdrop-blur-md bg-white/95">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              {mode === 'login' && 'Welcome back'}
              {mode === 'register' && 'Create your account'}
              {mode === 'forgot-password' && 'Reset your password'}
              {mode === 'verify-otp' && 'Verify OTP'}
              {mode === 'reset-password' && 'Set new password'}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {mode === 'login' && 'Sign in to your Spotit account to continue.'}
              {mode === 'register' && 'Join Spotit and start managing your parking sessions.'}
              {mode === 'forgot-password' && 'Enter your email to receive an OTP to reset your password.'}
              {mode === 'verify-otp' && `Enter the 6-digit OTP sent to ${email}.`}
              {mode === 'reset-password' && 'Enter your new password below.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {mode === 'register' && (
              <Input
                id="fullName"
                label="Full Name"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            )}

            {(mode === 'login' || mode === 'register' || mode === 'forgot-password') && (
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
            )}

            {mode === 'verify-otp' && (
              <Input
                id="otp"
                label="OTP"
                type="text"
                autoComplete="one-time-code"
                placeholder="123456"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                required
              />
            )}

            {(mode === 'login' || mode === 'register' || mode === 'reset-password') && (
              <Input
                id="password"
                label="Password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            )}

            {(mode === 'register' || mode === 'reset-password') && (
              <Input
                id="confirmPassword"
                label="Confirm Password"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-end">
                <button 
                  type="button" 
                  onClick={() => {
                    setMode('forgot-password');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-sm font-medium text-[var(--pm-color-action)] hover:text-[var(--pm-color-action-hover)]">
                  Forgot password?
                </button>
              </div>
            )}

            {error && <Alert variant="error" message={error} />}
            {success && <Alert variant="success" message={success} />}

            <Button type="submit" loading={loading} className="w-full rounded-xl py-3 text-base">
              {loading
                ? (
                  mode === 'login' ? 'Signing in...' : 
                  mode === 'register' ? 'Creating account...' :
                  mode === 'forgot-password' ? 'Sending OTP...' :
                  mode === 'verify-otp' ? 'Verifying...' :
                  'Resetting...'
                )
                : (
                  mode === 'login' ? 'Log in' : 
                  mode === 'register' ? 'Create Account' :
                  mode === 'forgot-password' ? 'Send OTP' :
                  mode === 'verify-otp' ? 'Verify OTP' :
                  'Reset Password'
                )}
            </Button>
          </form>

          {mode === 'register' && (
            <p className="mt-6 text-center text-xs text-gray-500">
              By creating an account, you agree to our{' '}
              <a href="#" className="font-medium text-gray-700 underline">Terms of Service</a> and{' '}
              <a href="#" className="font-medium text-gray-700 underline">Privacy Policy</a>.
            </p>
          )}

          <p className="mt-8 text-center text-sm text-gray-600">
            {(mode === 'login' || mode === 'register') && (
              <>
                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-semibold text-[var(--pm-color-action)] hover:text-[var(--pm-color-action-hover)] transition-colors"
                >
                  {mode === 'login' ? 'Register here' : 'Log in here'}
                </button>
              </>
            )}
            {(mode === 'forgot-password' || mode === 'verify-otp' || mode === 'reset-password') && (
              <>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setSuccess('');
                  }}
                  className="font-semibold text-[var(--pm-color-action)] hover:text-[var(--pm-color-action-hover)] transition-colors"
                >
                  Back to login
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
