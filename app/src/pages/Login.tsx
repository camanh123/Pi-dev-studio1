import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { authApi, revokeServerSession } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { PulsingGridSpinner } from '../components/PulsingGridSpinner';
import { PiDevStudioWordmark } from '../components/ui/PiDevStudioMark';
import { useTheme } from '../theme/ThemeContext';
import { useFeatureFlag } from '../contexts/useFeatureFlag';
import { isLocalDemoModeAllowed } from '../lib/localDemoMode';
import { PRODUCT_HERO, PRODUCT_HERO_SUPPORT, PRODUCT_NAME, PRODUCT_TAGLINE } from '../lib/branding';
import toast from 'react-hot-toast';

type LoginMode = 'password' | 'magic-email' | 'magic-sent' | 'magic-code';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUserTheme } = useTheme();
  const { checkAuth, isAuthenticated, enterLocalDemo } = useAuth();
  const redirectTo = (location.state as { from?: string })?.from || '/home';
  const localDemoAllowed = isLocalDemoModeAllowed();

  // Redirect away if already authenticated (covers desktop auto-login injecting
  // the token after the page has mounted).
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [twoFaRequired, setTwoFaRequired] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Magic-link state.
  // When the feature flag is on, the landing view is the email-link form
  // ('magic-email'); users explicitly click "Sign in with password" to
  // reveal the password form. When the flag is off, we fall back to the
  // classic password form and hide every magic-link affordance.
  //
  // Feature flags load asynchronously (FeatureFlagProvider fires a fetch on
  // mount). If we only read the flag in the useState initializer, the first
  // render sees `magicLinkEnabled=false` — before the network completes —
  // and mode gets locked to 'password' even after the flag resolves to
  // true. So we default to 'magic-email' optimistically and let the effect
  // below downgrade to 'password' once the flag has actually loaded. We
  // only overwrite mode if the user hasn't already made their own choice.
  const magicLinkEnabled = useFeatureFlag('magic_link_login');
  const [mode, setMode] = useState<LoginMode>('magic-email');
  const [magicEmail, setMagicEmail] = useState('');
  const userOverrodeModeRef = useRef(false);

  useEffect(() => {
    if (userOverrodeModeRef.current) return;
    setMode(magicLinkEnabled ? 'magic-email' : 'password');
  }, [magicLinkEnabled]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...otpCode];
    newCode[index] = value.slice(-1);
    setOtpCode(newCode);
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpCode(pasted.split(''));
      otpInputRefs.current[5]?.focus();
    }
  };

  const handleVerify2fa = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.verify2fa(tempToken, code);
      localStorage.setItem('token', response.access_token);
      // Update AuthContext so PrivateRoute allows navigation
      await checkAuth({ force: true });
      refreshUserTheme();
      toast.success('Logged in successfully!');
      setLoading(false);
      navigate(redirectTo);
    } catch {
      toast.error('Invalid or expired code');
      setOtpCode(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    try {
      await authApi.resend2faCode(tempToken);
      setResendCooldown(60);
      toast.success('New code sent to your email');
    } catch {
      toast.error('Failed to resend code');
    }
  };

  const handleBack = () => {
    setTwoFaRequired(false);
    setTempToken('');
    setOtpCode(['', '', '', '', '', '']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clear any stale auth state before attempting login
      localStorage.removeItem('token');
      revokeServerSession(); // non-blocking, best-effort

      const response = await authApi.login(formData.email, formData.password);

      if (response.access_token && !response.requires_2fa) {
        // 2FA disabled — JWT issued directly, complete login
        localStorage.setItem('token', response.access_token);
        await checkAuth({ force: true });
        refreshUserTheme();
        navigate(redirectTo);
        return;
      }

      // 2FA required — show OTP input
      setTwoFaRequired(true);
      setTempToken(response.temp_token);
      setResendCooldown(60);
      toast.success('Verification code sent to your email');
      setLoading(false);
      // Focus first OTP input after render
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (error: unknown) {
      // Handle validation errors (array format from FastAPI/Pydantic)
      const err = error as {
        statusCode?: number;
        code?: string;
        response?: { data?: { detail?: Array<{ msg: string }> | string } };
      };
      if (err.response?.data?.detail && Array.isArray(err.response.data.detail)) {
        const messages = err.response.data.detail.map((e) => e.msg).join(', ');
        toast.error(messages);
      } else if (typeof err.response?.data?.detail === 'string') {
        const errorMessage = err.response.data.detail;
        if (errorMessage === 'LOGIN_BAD_CREDENTIALS') {
          toast.error('Invalid email or password');
        } else {
          toast.error(errorMessage);
        }
      } else if (err.code === 'INVALID_CREDENTIALS') {
        toast.error('Invalid email or password');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicEmail) return;
    setLoading(true);
    try {
      await authApi.magicLinkRequest(magicEmail);
      // Stash the pre-login redirect target so MagicLinkConsume can honor it
      // after the user clicks the emailed link (which may open in a new tab).
      // Same browser = same sessionStorage, so round-trip survives.
      if (redirectTo && redirectTo !== '/home') {
        sessionStorage.setItem('magic_link_redirect', redirectTo);
      } else {
        sessionStorage.removeItem('magic_link_redirect');
      }
      setMode('magic-sent');
      setResendCooldown(60);
      toast.success('Check your email for a sign-in link');
    } catch {
      // Request is designed to always succeed, but handle network errors
      toast.error('Could not send email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkResend = async () => {
    if (resendCooldown > 0 || !magicEmail) return;
    try {
      await authApi.magicLinkRequest(magicEmail);
      setResendCooldown(60);
      toast.success('New sign-in email sent');
    } catch {
      toast.error('Could not send email. Please try again.');
    }
  };

  const handleMagicLinkVerify = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.magicLinkVerify(magicEmail, code);
      localStorage.setItem('token', response.access_token);
      await checkAuth({ force: true });
      refreshUserTheme();
      toast.success('Logged in successfully!');
      setLoading(false);
      navigate(redirectTo);
    } catch {
      toast.error('Invalid or expired code');
      setOtpCode(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
      setLoading(false);
    }
  };

  // Switch from magic-link form to password form. Carry the typed email
  // forward so the user doesn't re-enter it.
  const handleSwitchToPassword = () => {
    userOverrodeModeRef.current = true;
    setFormData((prev) => ({ ...prev, email: magicEmail || prev.email }));
    setOtpCode(['', '', '', '', '', '']);
    setResendCooldown(0);
    setMode('password');
  };

  // Switch from password form to magic-link form. Carry the email forward.
  const handleSwitchToMagicEmail = () => {
    userOverrodeModeRef.current = true;
    setMagicEmail(formData.email || magicEmail);
    setFormData((prev) => ({ ...prev, password: '' }));
    setOtpCode(['', '', '', '', '', '']);
    setResendCooldown(0);
    setMode('magic-email');
  };

  // "Back" button from magic-sent/magic-code — return to the landing
  // magic-email form with the email preserved, so the user can edit and
  // retry without starting from scratch.
  const handleBackToMagicEmail = () => {
    setOtpCode(['', '', '', '', '', '']);
    setResendCooldown(0);
    setMode('magic-email');
  };

  const handleGithubLogin = async () => {
    try {
      setLoading(true);
      // Save intended destination so OAuth callback can redirect there
      sessionStorage.setItem('oauth_redirect', redirectTo);
      // Fetch the GitHub OAuth authorization URL from backend
      const authUrl = await authApi.getGithubAuthUrl();
      // Redirect to GitHub OAuth
      window.location.href = authUrl;
    } catch {
      toast.error('Failed to initiate GitHub login');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      // Save intended destination so OAuth callback can redirect there
      sessionStorage.setItem('oauth_redirect', redirectTo);
      // Fetch the Google OAuth authorization URL from backend
      const authUrl = await authApi.getGoogleAuthUrl();
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch {
      toast.error('Failed to initiate Google login');
      setLoading(false);
    }
  };

  const handleEnterLocalDemo = async () => {
    if (!localDemoAllowed) return;
    setLoading(true);
    try {
      await enterLocalDemo();
      toast.success('Entered Local Demo Mode (UI preview only)');
      navigate(redirectTo, { state: { fromLogin: true } });
    } catch {
      toast.error('Could not enter Local Demo Mode');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row studio-app-bg bg-[#0B0A14]">
      {/* Left — brand hero */}
      <div className="relative hidden lg:flex lg:w-[48%] xl:w-1/2 flex-col justify-between p-10 xl:p-14 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 20% 20%, rgba(124,58,237,0.35), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(201,162,39,0.12), transparent 55%), linear-gradient(165deg, #0B0A14 0%, #16122A 55%, #1A1040 100%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(1.5px 1.5px at 18% 22%, rgba(255,255,255,0.55), transparent), radial-gradient(1px 1px at 72% 38%, rgba(245,215,142,0.5), transparent), radial-gradient(1.5px 1.5px at 44% 78%, rgba(255,255,255,0.35), transparent), radial-gradient(1px 1px at 88% 12%, rgba(167,139,250,0.6), transparent)',
            backgroundSize: '100% 100%',
          }}
        />
        <div className="relative z-10">
          <PiDevStudioWordmark markSize={36} showTagline inverted />
        </div>
        <div className="relative z-10 max-w-lg py-16">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5D78E]">
            {PRODUCT_TAGLINE}
          </p>
          <h1 className="font-heading text-4xl xl:text-5xl font-semibold tracking-tight text-white leading-[1.15]">
            {PRODUCT_HERO}
          </h1>
          <p className="mt-4 text-base text-white/70 leading-relaxed">{PRODUCT_HERO_SUPPORT}</p>
          <ul className="mt-8 space-y-3 text-sm text-white/55">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C9A227]" />
              AI agents that write and ship real apps
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A78BFA]" />
              Workspaces, marketplace, and library in one studio
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
              Built for the Pi ecosystem — not price speculation
            </li>
          </ul>
        </div>
        <p className="relative z-10 text-xs text-white/35">
          {PRODUCT_NAME} — developer tools for the Pi ecosystem
        </p>
      </div>

      {/* Right — auth card */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-10 lg:p-12">
        <div className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#141225]/95 backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.45)] p-6 sm:p-8">
          {/* Mobile brand */}
          <div className="mb-6 lg:hidden">
            <PiDevStudioWordmark markSize={32} showTagline />
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-white mb-2">
              Welcome back
            </h1>
            <p className="text-white/55 text-sm leading-relaxed">
              Sign in to continue building with {PRODUCT_NAME}.
            </p>
          </div>

          {twoFaRequired ? (
            /* OTP Verification UI */
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-white/55 text-sm">
                  We sent a 6-digit code to <strong>{formData.email}</strong>
                </p>
              </div>

              {/* OTP Inputs */}
              <div className="flex justify-center gap-3">
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className="w-12 h-14 text-center text-2xl font-bold bg-white/5 border border-white/15 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-all"
                  />
                ))}
              </div>

              {/* Verify Button */}
              <button
                onClick={handleVerify2fa}
                disabled={loading || otpCode.join('').length !== 6}
                className="w-full bg-[#7C3AED] text-white py-3.5 px-4 rounded-xl hover:bg-[#8B5CF6] disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 text-sm"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <PulsingGridSpinner size={18} />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Verify & Sign in'
                )}
              </button>

              {/* Resend / Back */}
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={handleBack}
                  className="text-white/45 hover:text-white/80 transition-colors"
                >
                  Back to login
                </button>
                <button
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0}
                  className="text-[#C4B5FD] hover:text-white font-medium disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          ) : mode === 'magic-email' ? (
            /* Magic Link — email entry (DEFAULT VIEW, includes OAuth) */
            <>
              {/* OAuth — shown on the landing view so users see every
                  sign-in option without needing to toggle modes. The
                  password view deliberately omits these to keep its
                  single focused purpose. */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/15 text-white/90 py-3 px-4 rounded-xl hover:bg-white/10 hover:border-white/25 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200 text-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>

                <button
                  onClick={handleGithubLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/15 text-white/90 py-3 px-4 rounded-xl hover:bg-white/10 hover:border-white/25 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200 text-sm"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Continue with GitHub
                </button>
              </div>

              {/* Divider */}
              <div className="mb-6 flex items-center">
                <div className="flex-1 border-t border-white/10"></div>
                <span className="px-4 text-white/35 text-xs font-medium">
                  Or sign in with email
                </span>
                <div className="flex-1 border-t border-white/10"></div>
              </div>

              <form onSubmit={handleMagicLinkRequest} className="space-y-4">
                <input
                  type="email"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-all placeholder:text-white/35 text-sm"
                  placeholder="Email address"
                  required
                  autoComplete="email"
                  maxLength={254}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !magicEmail}
                  className="w-full bg-[#7C3AED] text-white py-3.5 px-4 rounded-xl hover:bg-[#8B5CF6] disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 text-sm"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <PulsingGridSpinner size={18} />
                      <span>Sending...</span>
                    </div>
                  ) : (
                    'Send sign-in link'
                  )}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleSwitchToPassword}
                    className="text-white/45 hover:text-white/80 text-sm transition-colors"
                  >
                    Sign in with password instead
                  </button>
                </div>
              </form>
            </>
          ) : mode === 'magic-sent' ? (
            /* Magic Link — sent, waiting */
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-white/55 text-sm">
                  We sent a sign-in link to <strong>{magicEmail}</strong>. Click the link in your
                  email, or enter the 6-digit code we emailed.
                </p>
              </div>
              <button
                onClick={() => {
                  setOtpCode(['', '', '', '', '', '']);
                  setMode('magic-code');
                  setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
                }}
                className="w-full bg-[#7C3AED] text-white py-3.5 px-4 rounded-xl hover:bg-[#8B5CF6] font-semibold transition-all duration-200 text-sm"
              >
                Enter code instead
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={handleBackToMagicEmail}
                  className="text-white/45 hover:text-white/80 transition-colors"
                >
                  Use a different email
                </button>
                <button
                  onClick={handleMagicLinkResend}
                  disabled={resendCooldown > 0}
                  className="text-[#C4B5FD] hover:text-white font-medium disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend email'}
                </button>
              </div>
            </div>
          ) : mode === 'magic-code' ? (
            /* Magic Link — code entry */
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-white/55 text-sm">
                  Enter the 6-digit code we sent to <strong>{magicEmail}</strong>
                </p>
              </div>
              <div className="flex justify-center gap-3">
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className="w-12 h-14 text-center text-2xl font-bold bg-white/5 border border-white/15 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-all"
                  />
                ))}
              </div>
              <button
                onClick={handleMagicLinkVerify}
                disabled={loading || otpCode.join('').length !== 6}
                className="w-full bg-[#7C3AED] text-white py-3.5 px-4 rounded-xl hover:bg-[#8B5CF6] disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 text-sm"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <PulsingGridSpinner size={18} />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={handleBackToMagicEmail}
                  className="text-white/45 hover:text-white/80 transition-colors"
                >
                  Use a different email
                </button>
                <button
                  onClick={handleMagicLinkResend}
                  disabled={resendCooldown > 0}
                  className="text-[#C4B5FD] hover:text-white font-medium disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          ) : (
            /* Password Login UI — no OAuth here; the magic-email landing
               view is the front door and offers every sign-in option. */
            <>
              {/* Email + Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white/5 border border-white/15 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-all placeholder:text-white/35 text-sm"
                    placeholder="Email address"
                    required
                    autoComplete="email"
                    maxLength={254}
                    pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$"
                  />
                </div>

                <div>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-white/5 border border-white/15 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-all placeholder:text-white/35 text-sm"
                    placeholder="Password"
                    required
                    autoComplete="current-password"
                    maxLength={128}
                    minLength={6}
                  />
                </div>

                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-white/45 hover:text-white/80 text-xs transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#7C3AED] text-white py-3.5 px-4 rounded-xl hover:bg-[#8B5CF6] disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 text-sm mt-2"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <PulsingGridSpinner size={18} />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              {/* Back to magic-link (the default mode when the flag is on) */}
              {magicLinkEnabled && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={handleSwitchToMagicEmail}
                    disabled={loading}
                    className="text-white/45 hover:text-white/80 text-sm transition-colors"
                  >
                    Sign in with an email link instead
                  </button>
                </div>
              )}

              {/* Sign up link */}
              <div className="mt-6 text-center">
                <p className="text-white/55 text-sm">
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    state={{ from: redirectTo !== '/home' ? redirectTo : undefined }}
                    className="text-[#C4B5FD] hover:text-white font-semibold transition-colors underline"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* DEV-only Local Demo Mode — never rendered in production builds */}
          {localDemoAllowed && !twoFaRequired && (
            <div className="mt-8 pt-6 border-t border-dashed border-white/15">
              <p className="text-xs text-[#F5D78E]/90 mb-3 text-center">
                Local development: preview the authenticated UI without a backend.
              </p>
              <button
                type="button"
                data-testid="enter-local-demo"
                onClick={handleEnterLocalDemo}
                disabled={loading}
                className="w-full border border-[#C9A227]/50 text-[#F5D78E] bg-[#C9A227]/10 py-3 px-4 rounded-xl hover:bg-[#C9A227]/20 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 text-sm"
              >
                Enter Local Demo Mode
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
