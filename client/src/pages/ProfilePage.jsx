import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';
import Footer from '../components/Footer';
import { lightTap, successFeedback, errorFeedback } from '../utils/haptics';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || ''
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
    if (passwordForm.new_password.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
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
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      {/* Header */}
      <div className="bg-background-light border-b border-slate-700 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
          <p className="text-text-secondary text-sm mt-1">Manage your account information</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Message Display */}
        {message.text && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
              : 'bg-red-500/20 text-red-400 border border-red-500/50'
          }`}>
            {message.text}
          </div>
        )}

        {/* Profile Information Card */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Profile Information</h2>
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
                <label className="text-sm text-text-secondary">Full Name</label>
                <p className="text-white font-medium">
                  {user?.first_name} {user?.last_name}
                </p>
              </div>
              <div>
                <label className="text-sm text-text-secondary">Email</label>
                <p className="text-white font-medium">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm text-text-secondary">Role</label>
                <p className="text-white font-medium capitalize">{user?.role}</p>
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
                label="Email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                required
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
                      first_name: user?.first_name || '',
                      last_name: user?.last_name || '',
                      email: user?.email || ''
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
            <h2 className="text-xl font-bold text-white">Change Password</h2>
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
            <p className="text-text-secondary">
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
                helperText="Must be at least 6 characters"
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
          <h2 className="text-xl font-bold text-white mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium mb-1">Theme</p>
              <p className="text-text-secondary text-sm">
                Choose your preferred color scheme
              </p>
            </div>
            <button
              onClick={() => {
                toggleTheme();
                lightTap();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-background-lighter hover:bg-background rounded-lg transition-colors"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
              <span className="text-white capitalize">{theme}</span>
            </button>
          </div>
        </Card>

        {/* Account Information */}
        <Card>
          <h2 className="text-xl font-bold text-white mb-4">Account Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Account Type</span>
              <span className="text-white capitalize">{user?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Member Since</span>
              <span className="text-white">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Footer />
    </div>
  );
}

