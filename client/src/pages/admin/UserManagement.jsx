import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Spinner from '../../components/common/Spinner';
import Badge from '../../components/common/Badge';
import PermissionManager from '../../components/PermissionManager';
import MobileMenu from '../../components/MobileMenu';
import Footer from '../../components/Footer';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'user', first_name: '', last_name: '' });
  const [error, setError] = useState('');
  
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchUsers();
  }, [currentUser, navigate]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await api.post('/users', newUser);
      setShowCreateModal(false);
      setNewUser({ email: '', password: '', role: 'user', first_name: '', last_name: '' });
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.delete(`/users/${userId}`);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tv-bg flex flex-col overflow-y-auto">
      {/* Top Bar */}
      <div className="bg-background-light border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileMenu />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">User Management</h1>
              <p className="text-xs md:text-sm text-text-secondary hidden sm:block">Manage admin and staff accounts</p>
            </div>
          </div>
          <div className="hidden md:flex gap-3">
            <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
              ← Admin Home
            </Button>
            <Button variant="ghost" onClick={logout}>Logout</Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto flex-1">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">All Users ({users.length})</h2>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create User
          </Button>
        </div>

        {/* Users - Desktop Table View */}
        <div className="hidden md:block">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-text-secondary font-medium text-sm">Email</th>
                    <th className="text-left py-3 px-4 text-text-secondary font-medium text-sm">Name</th>
                    <th className="text-left py-3 px-4 text-text-secondary font-medium text-sm">Role</th>
                    <th className="text-left py-3 px-4 text-text-secondary font-medium text-sm">Status</th>
                    <th className="text-left py-3 px-4 text-text-secondary font-medium text-sm">Last Login</th>
                    <th className="text-right py-3 px-4 text-text-secondary font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-800 hover:bg-background-lighter">
                      <td className="py-3 px-4 text-white">{user.email}</td>
                      <td className="py-3 px-4 text-white">{user.first_name} {user.last_name}</td>
                      <td className="py-3 px-4">
                        <Badge color={user.role === 'admin' ? 'primary' : user.role === 'staff' ? 'success' : 'default'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge color={user.is_active ? 'success' : 'danger'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-text-muted text-sm">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-end">
                          {user.role !== 'admin' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowPermissionModal(true);
                              }}
                            >
                              🔑 Permissions
                            </Button>
                          )}
                          <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.id === currentUser.id}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Users - Mobile Card View */}
        <div className="md:hidden space-y-4">
          {users.map((user) => (
            <Card key={user.id}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{user.first_name} {user.last_name}</h3>
                    <p className="text-sm text-text-secondary">{user.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge color={user.role === 'admin' ? 'primary' : user.role === 'staff' ? 'success' : 'default'}>
                      {user.role}
                    </Badge>
                    <Badge color={user.is_active ? 'success' : 'danger'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                
                <div className="text-xs text-text-muted">
                  Last login: {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </div>
                
                <div className="flex gap-2 pt-2">
                  {user.role !== 'admin' && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowPermissionModal(true);
                      }}
                      className="flex-1 min-h-[44px]"
                    >
                      🔑 Permissions
                    </Button>
                  )}
                  <Button 
                    variant="danger" 
                    size="md"
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={user.id === currentUser.id}
                    className="flex-1 min-h-[44px]"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setError('');
          setNewUser({ email: '', password: '', role: 'user', first_name: '', last_name: '' });
        }}
        title="Create New User"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <Input
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
            placeholder="user@example.com"
            required
          />
          
          <Input
            label="Password"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
            placeholder="Minimum 8 characters"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              className="w-full px-4 py-2 rounded-lg bg-background-lighter text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="user">User (View Only)</option>
              <option value="staff">Staff (Manage Own Content)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={newUser.first_name}
              onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
              placeholder="John"
            />
            
            <Input
              label="Last Name"
              value={newUser.last_name}
              onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
              placeholder="Doe"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Permission Management Modal */}
      {showPermissionModal && selectedUser && (
        <PermissionManager
          userId={selectedUser.id}
          userName={`${selectedUser.first_name} ${selectedUser.last_name}` || selectedUser.email}
          onClose={() => {
            setShowPermissionModal(false);
            setSelectedUser(null);
          }}
          onUpdate={() => {
            fetchUsers();
          }}
        />
      )}
      
      <Footer />
    </div>
  );
}

