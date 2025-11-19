import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export default function FirstTimeSetupPage() {
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
  
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

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

    // Password is mandatory on first setup
    if (!formData.new_password) {
      setError('Password is required');
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

    if (!formData.current_password) {
      setError('Current password is required');
      return;
    }

    setLoading(true);

    try {
      // Update password first (requires current password)
      await api.put('/users/password', {
        current_password: formData.current_password,
        new_password: formData.new_password
      });

      // Update profile with phone number, email, and clear force_password_change flag
      await api.put(`/users/${user.id}`, {
        phone_number: formData.phone_number,
        email: formData.email || null,
        first_name: formData.first_name,
        last_name: formData.last_name,
        force_password_change: false
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
    <div className="min-h-screen bg-tv-bg flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-tv-bgElevated rounded-2xl p-8 border-2 border-tv-accent shadow-2xl">
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
                Please update your contact information and set a new password to continue.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                placeholder="John"
                required
              />
              
              <Input
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                placeholder="Doe"
                required
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
              <h3 className="text-lg font-bold text-tv-text mb-4">Change Password</h3>
              
              <div className="space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  value={formData.current_password}
                  onChange={(e) => setFormData({...formData, current_password: e.target.value})}
                  placeholder="••••••••"
                  required
                />

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
                  label="Confirm New Password"
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
              className="w-full mt-6"
            >
              {loading ? 'Updating...' : 'Complete Setup'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

