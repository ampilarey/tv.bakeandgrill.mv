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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ email: '', phone_number: '', password: '', role: 'user', first_name: '', last_name: '' });
  const [editUser, setEditUser] = useState({ email: '', phone_number: '', first_name: '', last_name: '', role: '' });
  const [error, setError] = useState('');
  const [userPermissions, setUserPermissions] = useState(null);
  
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch permissions first
    fetchUserPermissions();
  }, [currentUser]);

  const fetchUserPermissions = async () => {
    try {
      const response = await api.get('/permissions/me');
      setUserPermissions(response.data.permissions);
      
      // Check if user has access
      const canAccess = currentUser?.role === 'admin' || 
                       response.data.permissions?.can_create_users === 1;
      
      console.log('👥 UserManagement access check:', {
        role: currentUser?.role,
        canCreateUsers: response.data.permissions?.can_create_users,
        hasAccess: canAccess
      });
      
      if (!canAccess) {
        navigate('/dashboard');
        return;
      }
      
      fetchUsers();
    } catch (error) {
      console.error('Error fetching permissions:', error);
      if (currentUser?.role !== 'admin') {
        navigate('/dashboard');
      }
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      // Filter out display users (internal system users for displays)
      const realUsers = (response.data.users || []).filter(u => u.role !== 'display');
      setUsers(realUsers);
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

  const handleEditUser = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await api.put(`/users/${selectedUser.id}`, editUser);
      setShowEditModal(false);
      setEditUser({ email: '', phone_number: '', first_name: '', last_name: '', role: '' });
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    const user = users.find(u => u.id === userId);
    
    if (!user) return;
    
    // If user is already inactive, offer options
    if (!user.is_active) {
      const choice = confirm(
        `User: ${user.first_name} ${user.last_name} is INACTIVE.\n\n` +
        `Click OK to REACTIVATE.\n` +
        `Click Cancel to see more options.`
      );
      
      if (choice) {
        // Reactivate user
        try {
          await api.put(`/users/${userId}`, { is_active: true });
          fetchUsers();
        } catch (error) {
          alert(error.response?.data?.error || 'Failed to reactivate user');
        }
      } else {
        // Ask if they want to permanently delete
        const permanentDelete = confirm(
          `⚠️ PERMANENT DELETE?\n\n` +
          `This will PERMANENTLY delete ${user.first_name} ${user.last_name} and ALL their data.\n\n` +
          `This action CANNOT be undone!\n\n` +
          `Click OK to PERMANENTLY DELETE.\n` +
          `Click Cancel to keep inactive.`
        );
        
        if (permanentDelete) {
          try {
            await api.delete(`/users/${userId}?permanent=true`);
            fetchUsers();
          } catch (error) {
            alert(error.response?.data?.error || 'Failed to permanently delete user');
          }
        }
      }
      return;
    }
    
    // User is active - confirm soft delete
    if (!confirm(`Are you sure you want to deactivate ${user.first_name} ${user.last_name}?\n\n(User can be reactivated later)`)) return;
    
    try {
      await api.delete(`/users/${userId}`);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditUser({
      email: user.email || '',
      phone_number: user.phone_number || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role || 'user'
    });
    setShowEditModal(true);
    setError('');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-tv-bg">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="h-screen md:min-h-screen bg-tv-bg flex flex-col overflow-y-auto">
      {/* Top Bar */}
      <div className="bg-tv-accent border-b border-tv-borderSubtle px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileMenu />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">User Management</h1>
              <p className="text-xs md:text-sm text-white/90 hidden sm:block">Manage admin and staff accounts</p>
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
      <div className="p-6 max-w-7xl mx-auto flex-1 md:pb-6 w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-tv-text">All Users ({users.length})</h2>
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
                  <tr className="border-b border-tv-borderSubtle">
                    <th className="text-left py-3 px-4 text-tv-textSecondary font-medium text-sm">Email</th>
                    <th className="text-left py-3 px-4 text-tv-textSecondary font-medium text-sm">Name</th>
                    <th className="text-left py-3 px-4 text-tv-textSecondary font-medium text-sm">Role</th>
                    <th className="text-left py-3 px-4 text-tv-textSecondary font-medium text-sm">Status</th>
                    <th className="text-left py-3 px-4 text-tv-textSecondary font-medium text-sm">Last Login</th>
                    <th className="text-right py-3 px-4 text-tv-textSecondary font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-tv-borderSubtle hover:bg-tv-bgSoft">
                      <td className="py-3 px-4 text-tv-text">{user.email}</td>
                      <td className="py-3 px-4 text-tv-text">{user.first_name} {user.last_name}</td>
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
                      <td className="py-3 px-4 text-tv-textMuted text-sm">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditModal(user)}
                          >
                            ✏️ Edit
                          </Button>
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
                            variant={user.is_active ? "danger" : "success"}
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.id === currentUser.id}
                          >
                            {user.is_active ? 'Delete' : '✓ Reactivate'}
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
                    <h3 className="text-lg font-semibold text-tv-text mb-1">{user.first_name} {user.last_name}</h3>
                    <p className="text-sm text-tv-textSecondary">{user.email}</p>
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
                
                <div className="text-xs text-tv-textMuted">
                  Last login: {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => openEditModal(user)}
                    className="flex-1 min-h-[44px]"
                  >
                    ✏️ Edit
                  </Button>
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
                    variant={user.is_active ? "danger" : "success"}
                    size="md"
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={user.id === currentUser.id}
                    className="flex-1 min-h-[44px]"
                  >
                    {user.is_active ? 'Delete' : '✓ Reactivate'}
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
            <div className="bg-tv-error/20 border border-tv-error/30 rounded-lg p-3 text-tv-error text-sm">
              {error}
            </div>
          )}
          
          <Input
            label="Phone Number (7 digits)"
            type="tel"
            value={newUser.phone_number}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 7);
              setNewUser({...newUser, phone_number: value});
            }}
            placeholder="1234567"
            required
            maxLength="7"
          />
          
          <Input
            label="Email (Optional)"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
            placeholder="user@example.com"
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
            <label className="block text-sm font-medium text-tv-textSecondary mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              className="w-full px-4 py-2 rounded-lg bg-tv-bgSoft text-tv-text border-2 border-tv-borderSubtle focus:outline-none focus:ring-2 focus:ring-tv-accent"
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

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setError('');
          setSelectedUser(null);
        }}
        title={`Edit User: ${selectedUser?.first_name} ${selectedUser?.last_name}`}
      >
        <form onSubmit={handleEditUser} className="space-y-4">
          {error && (
            <div className="bg-tv-error/20 border border-tv-error/30 rounded-lg p-3 text-tv-error text-sm">
              {error}
            </div>
          )}
          
          <Input
            label="Phone Number (7 digits)"
            type="tel"
            value={editUser.phone_number}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 7);
              setEditUser({...editUser, phone_number: value});
            }}
            placeholder="1234567"
            required
            maxLength="7"
          />
          
          <Input
            label="Email (Optional)"
            type="email"
            value={editUser.email}
            onChange={(e) => setEditUser({...editUser, email: e.target.value})}
            placeholder="user@example.com"
          />
          
          <div>
            <label className="block text-sm font-medium text-tv-textSecondary mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={editUser.role}
              onChange={(e) => setEditUser({...editUser, role: e.target.value})}
              className="w-full px-4 py-2 rounded-lg bg-tv-bgSoft text-tv-text border-2 border-tv-borderSubtle focus:outline-none focus:ring-2 focus:ring-tv-accent"
            >
              <option value="user">User (View Only)</option>
              <option value="staff">Staff (Manage Own Content)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={editUser.first_name}
              onChange={(e) => setEditUser({...editUser, first_name: e.target.value})}
              placeholder="John"
            />
            
            <Input
              label="Last Name"
              value={editUser.last_name}
              onChange={(e) => setEditUser({...editUser, last_name: e.target.value})}
              placeholder="Doe"
            />
          </div>
          
          <div className="bg-tv-gold/10 border border-tv-gold/30 rounded-lg p-3">
            <p className="text-tv-text text-xs">
              💡 To change this user's password, they should use the "Change Password" option in their Profile page.
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Update User
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
      
      <Footer className="flex-shrink-0" />
    </div>
  );
}

