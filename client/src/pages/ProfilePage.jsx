import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';
import Footer from '../components/Footer';
import { lightTap, successFeedback, errorFeedback } from '../utils/haptics';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: user?.firstName || user?.first_name || '',
    last_name: user?.lastName || user?.last_name || '',
    email: user?.email || '',
    phone_number: user?.phoneNumber || user?.phone_number || ''
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    lightTap();

    try {
      const response = await api.put('/users/profile', profileForm);
      updateUser(response.data.user);
      setIsEditingProfile(false);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      successFeedback();
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update profile' 
      });
      errorFeedback();
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    lightTap();

    // Validate passwords
    if (passwordForm.new_password.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      errorFeedback();
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      errorFeedback();
      return;
    }

    setLoading(true);

    try {
      await api.put('/users/password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });

      setIsChangingPassword(false);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      successFeedback();
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Password change error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to change password' 
      });
      errorFeedback();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen md:min-h-screen bg-tv-bg flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="bg-tv-bgElevated border-b border-tv-borderSubtle p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-tv-textSecondary hover:text-tv-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden md:inline">Back</span>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-tv-text">Profile Settings</h1>
              <p className="text-tv-textSecondary text-sm mt-1">Manage your account information</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6 md:pb-6 w-full flex-1">
        {/* Message Display */}
        {message.text && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-tv-accent/20 text-tv-accent border-2 border-tv-accent/50' 
              : 'bg-tv-error/20 text-tv-error border-2 border-tv-error/50'
          }`}>
            {message.text}
          </div>
        )}

        {/* Profile Information Card */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-tv-text">Profile Information</h2>
            {!isEditingProfile && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setIsEditingProfile(true);
                  setIsChangingPassword(false);
                  lightTap();
                }}
              >
                Edit Profile
              </Button>
            )}
          </div>

          {!isEditingProfile ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-tv-textSecondary">Full Name</label>
                <p className="text-tv-text font-medium">
                  {user?.firstName || user?.first_name} {user?.lastName || user?.last_name}
                </p>
              </div>
              <div>
                <label className="text-sm text-tv-textSecondary">Email</label>
                <p className="text-tv-text font-medium">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm text-tv-textSecondary">Phone Number</label>
                <p className="text-tv-text font-medium">{user?.phoneNumber || user?.phone_number || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm text-tv-textSecondary">Role</label>
                <p className="text-tv-text font-medium capitalize">{user?.role}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <Input
                label="First Name"
                value={profileForm.first_name}
                onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                required
              />
              <Input
                label="Last Name"
                value={profileForm.last_name}
                onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                required
              />
              <Input
                label="Phone Number (7 digits)"
                type="tel"
                value={profileForm.phone_number}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 7);
                  setProfileForm({ ...profileForm, phone_number: value });
                }}
                placeholder="1234567"
                required
                maxLength="7"
              />
              <Input
                label="Email (Optional)"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                placeholder="user@example.com"
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setProfileForm({
                      first_name: user?.firstName || user?.first_name || '',
                      last_name: user?.lastName || user?.last_name || '',
                      email: user?.email || '',
                      phone_number: user?.phoneNumber || user?.phone_number || ''
                    });
                    lightTap();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Change Password Card */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-tv-text">Change Password</h2>
            {!isChangingPassword && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setIsChangingPassword(true);
                  setIsEditingProfile(false);
                  lightTap();
                }}
              >
                Change Password
              </Button>
            )}
          </div>

          {!isChangingPassword ? (
            <p className="text-tv-textSecondary">
              Keep your account secure by regularly updating your password.
            </p>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                required
              />
              <Input
                label="New Password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                required
                helperText="Must be at least 8 characters"
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                required
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Changing...' : 'Change Password'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
                    lightTap();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Appearance */}
        <Card>
          <h2 className="text-xl font-bold text-tv-text mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-tv-text font-medium mb-1">Theme</p>
              <p className="text-tv-textSecondary text-sm">
                Choose your preferred color scheme
              </p>
            </div>
            <button
              onClick={() => {
                toggleTheme();
                lightTap();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-tv-bgSoft hover:bg-tv-bgHover rounded-lg transition-colors"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
              <span className="text-tv-text capitalize">{theme}</span>
            </button>
          </div>
        </Card>

        {/* Account Information */}
        <Card>
          <h2 className="text-xl font-bold text-tv-text mb-4">Account Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-tv-textSecondary">Account Type</span>
              <span className="text-tv-text capitalize">{user?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tv-textSecondary">Member Since</span>
              <span className="text-tv-text">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Footer className="flex-shrink-0" />
    </div>
  );
}

