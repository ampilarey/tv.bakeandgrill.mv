import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Attempting login:', { email });
      const result = await login(email, password);
      console.log('🔐 Login result:', result);
      
      if (result.success) {
        console.log('✅ Login successful, redirecting to dashboard');
        navigate('/dashboard');
      } else {
        console.error('❌ Login failed:', result.error);
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.response?.data?.error || err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-tv-bg flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-7xl grid md:grid-cols-2 gap-6 md:gap-8 items-center">
        {/* Left Side - Features Showcase */}
        <div className="space-y-4 md:space-y-6 order-2 md:order-1">
          <div className="text-center md:text-left mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-tv-accent to-tv-accentHover mb-3 md:mb-4 shadow-2xl">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-tv-text mb-2 md:mb-3">Bake and Grill TV</h1>
            <p className="text-tv-textSecondary text-base md:text-xl">Professional IPTV Streaming Platform</p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            <div className="bg-tv-bgElevated rounded-xl p-3 md:p-4 border-2 border-tv-borderSubtle shadow-lg">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-tv-accent/20 flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-tv-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-tv-text mb-1">Unlimited Playlists</h3>
                  <p className="text-tv-textSecondary text-xs md:text-sm">Add multiple M3U playlists and organize all your channels in one place</p>
                </div>
              </div>
            </div>

            <div className="bg-tv-bgElevated rounded-xl p-3 md:p-4 border-2 border-tv-borderSubtle shadow-lg">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-tv-gold/20 flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-tv-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-tv-text mb-1">Advanced Video Player</h3>
                  <p className="text-tv-textSecondary text-xs md:text-sm">HLS streaming support with auto-retry, keyboard shortcuts, and fullscreen mode</p>
                </div>
              </div>
            </div>

            <div className="bg-tv-bgElevated rounded-xl p-3 md:p-4 border-2 border-tv-borderSubtle shadow-lg">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-tv-accent/20 flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-tv-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-tv-text mb-1">Favorites & History</h3>
                  <p className="text-tv-textSecondary text-xs md:text-sm">Save your favorite channels and track your watch history automatically</p>
                </div>
              </div>
            </div>

            <div className="bg-tv-bgElevated rounded-xl p-3 md:p-4 border-2 border-tv-borderSubtle shadow-lg">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-tv-gold/20 flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-tv-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-tv-text mb-1">Cafe Display Mode</h3>
                  <p className="text-tv-textSecondary text-xs md:text-sm">24/7 kiosk mode for cafe TVs with remote control and scheduling</p>
                </div>
              </div>
            </div>

            <div className="bg-tv-bgElevated rounded-xl p-3 md:p-4 border-2 border-tv-borderSubtle shadow-lg">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-tv-accent/20 flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-tv-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-tv-text mb-1">Mobile-First PWA</h3>
                  <p className="text-tv-textSecondary text-xs md:text-sm">Installable app on mobile and desktop with offline support</p>
                </div>
              </div>
            </div>

            <div className="bg-tv-bgElevated rounded-xl p-3 md:p-4 border-2 border-tv-borderSubtle shadow-lg">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-tv-gold/20 flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-tv-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-tv-text mb-1">Analytics Dashboard</h3>
                  <p className="text-tv-textSecondary text-xs md:text-sm">Track usage, watch time, and popular channels with detailed insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto order-1 md:order-2">
          {/* Logo/Brand - Mobile Only */}
          <div className="text-center mb-6 md:hidden">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-tv-accent to-tv-accentHover mb-6 shadow-2xl">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-tv-text mb-3">Bake and Grill TV</h1>
            <p className="text-tv-textSecondary text-lg">Sign in to access your channels</p>
          </div>

        {/* Login Form */}
        <div className="bg-tv-bgElevated rounded-2xl p-8 border-2 border-tv-borderSubtle shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-tv-error/20 border-2 border-tv-error/40 rounded-xl p-4">
                <p className="text-tv-error text-sm font-medium">{error}</p>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@bakegrill.com"
              required
              autoComplete="email"
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          {/* Display Setup Link */}
          <div className="mt-8 p-6 bg-tv-gold/10 border-2 border-tv-gold/30 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-tv-gold/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-tv-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-tv-text font-bold text-lg mb-2">Setting up a Display?</h3>
                <p className="text-tv-textSecondary text-sm leading-relaxed mb-3">
                  Connect your TV, tablet, or kiosk display to show channels automatically. 
                  Easy setup with PIN code or QR code pairing.
                </p>
                <a
                  href="/#/pair"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-tv-gold hover:bg-tv-goldHover text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Pair Display
                </a>
              </div>
            </div>
          </div>
        </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-base text-tv-textMuted font-medium">
              &copy; 2025 Bake and Grill. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

