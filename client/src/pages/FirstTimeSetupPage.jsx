import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export default function FirstTimeSetupPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    phone_number: '',
    first_name: '',
    last_name: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Pre-populate form with existing user data
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        phone_number: user.phoneNumber || user.phone_number || '',
        email: user.email || '',
        first_name: user.firstName || user.first_name || '',
        last_name: user.lastName || user.last_name || ''
      }));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    // Phone number is mandatory (7 digits)
    if (!formData.phone_number || !/^\d{7}$/.test(formData.phone_number)) {
      setError('Phone number is required (7 digits)');
      return;
    }

    // Email is optional, but if provided, must be valid
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please provide a valid email address');
      return;
    }

    // First name is required
    if (!formData.first_name || !formData.first_name.trim()) {
      setError('First name is required');
      return;
    }

    // Password is mandatory on first setup
    if (!formData.new_password) {
      setError('New password is required');
      return;
    }

    if (formData.new_password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Update profile first, then password (no current password needed for first-time setup)
      await api.put(`/users/${user.id}/first-time-setup`, {
        phone_number: formData.phone_number,
        email: formData.email || null,
        first_name: formData.first_name,
        last_name: formData.last_name || null,
        new_password: formData.new_password
      });

      // Refresh user data from server
      const verifyResponse = await api.get('/auth/verify');
      if (verifyResponse.data.valid && verifyResponse.data.user) {
        updateUser(verifyResponse.data.user);
      }

      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-tv-bg flex items-start md:items-center justify-center p-4 py-8 md:py-4 overflow-y-auto" style={{ paddingBottom: 'max(2rem, calc(80px + env(safe-area-inset-bottom, 0px)))' }}>
      <div className="max-w-2xl w-full my-auto">
        <div className="bg-tv-bgElevated rounded-2xl p-6 md:p-8 border-2 border-tv-accent shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">👋</div>
            <h1 className="text-3xl font-bold text-tv-accent mb-2">Welcome!</h1>
            <p className="text-tv-textSecondary">Please complete your profile setup</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/20 border-2 border-red-500/50 rounded-xl p-4">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="bg-tv-gold/10 border-2 border-tv-gold/30 rounded-xl p-4 mb-6">
              <p className="text-tv-text text-sm">
                <strong>🔒 First-Time Setup Required</strong><br/>
                Please verify your contact information and set a new secure password to continue.
              </p>
            </div>
            
            {/* Show current phone number */}
            {user?.phoneNumber && (
              <div className="bg-tv-accent/10 border-2 border-tv-accent/30 rounded-xl p-4 mb-4">
                <p className="text-tv-text text-sm">
                  <strong>📱 Your Account Phone:</strong> {user.phoneNumber || user.phone_number}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                placeholder="John"
                required
              />
              
              <Input
                label="Last Name (Optional)"
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                placeholder="Doe"
              />
            </div>

            <Input
              label="Phone Number (7 digits)"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 7);
                setFormData({...formData, phone_number: value});
              }}
              placeholder="1234567"
              required
              maxLength="7"
            />

            <Input
              label="Email Address (Optional)"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="your.email@example.com"
            />

            <div className="pt-4 border-t-2 border-tv-borderSubtle">
              <h3 className="text-lg font-bold text-tv-text mb-2">Set Your Password</h3>
              <p className="text-tv-textSecondary text-sm mb-4">Create a secure password for your account</p>
              
              <div className="space-y-4">
                <Input
                  label="New Password"
                  type="password"
                  value={formData.new_password}
                  onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                  placeholder="••••••••"
                  required
                  helperText="Must be at least 8 characters"
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-6 min-h-[56px]"
            >
              {loading ? 'Updating...' : 'Complete Setup'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

