/**
 * Ticker Management Page
 * Admin UI for managing ticker bar messages
 * Phase 3: Info Ticker & Announcements
 */
import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';
import Spinner from '../../components/common/Spinner';

function TickerManagement() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    text: '',
    text_dv: '',
    priority: 0,
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ticker');
      if (response.data.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      showToast('Failed to fetch ticker messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.text.trim()) {
      showToast('Message text is required', 'error');
      return;
    }

    try {
      if (editingMessage) {
        await api.put(`/ticker/${editingMessage.id}`, formData);
        showToast('Ticker message updated');
      } else {
        await api.post('/ticker', formData);
        showToast('Ticker message created');
      }

      setShowModal(false);
      setEditingMessage(null);
      resetForm();
      fetchMessages();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to save message', 'error');
    }
  };

  const handleEdit = (message) => {
    setEditingMessage(message);
    setFormData({
      text: message.text,
      text_dv: message.text_dv || '',
      priority: message.priority,
      start_date: message.start_date || '',
      end_date: message.end_date || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this ticker message?')) return;

    try {
      await api.delete(`/ticker/${id}`);
      showToast('Ticker message deleted');
      fetchMessages();
    } catch (error) {
      showToast('Failed to delete message', 'error');
    }
  };

  const handleToggleActive = async (message) => {
    try {
      await api.put(`/ticker/${message.id}`, {
        is_active: !message.is_active
      });
      showToast(`Message ${!message.is_active ? 'activated' : 'deactivated'}`);
      fetchMessages();
    } catch (error) {
      showToast('Failed to update message', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      text: '',
      text_dv: '',
      priority: 0,
      start_date: '',
      end_date: ''
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMessage(null);
    resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ticker Messages</h1>
          <p className="text-gray-600 mt-1">
            Manage scrolling messages displayed on screens
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          + Add Message
        </Button>
      </div>

      {/* Messages List */}
      {messages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No ticker messages yet</p>
          <Button onClick={() => setShowModal(true)} className="mt-4">
            Create First Message
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(message => (
            <div 
              key={message.id}
              className="bg-white rounded-lg shadow p-4 flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    message.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {message.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {message.priority > 0 && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Priority: {message.priority}
                    </span>
                  )}
                </div>
                <p className="text-lg font-medium">{message.text}</p>
                {message.text_dv && (
                  <p className="text-gray-600 mt-1">{message.text_dv}</p>
                )}
                {(message.start_date || message.end_date) && (
                  <p className="text-sm text-gray-500 mt-2">
                    {message.start_date && `From: ${message.start_date}`}
                    {message.start_date && message.end_date && ' • '}
                    {message.end_date && `Until: ${message.end_date}`}
                  </p>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggleActive(message)}
                >
                  {message.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEdit(message)}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(message.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingMessage ? 'Edit Message' : 'Add Ticker Message'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Message (English)"
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            required
            placeholder="Special offer: Buy 1 Get 1 Free!"
          />

          <Input
            label="Message (Dhivehi)"
            value={formData.text_dv}
            onChange={(e) => setFormData({ ...formData, text_dv: e.target.value })}
            placeholder="Optional Dhivehi translation"
          />

          <Input
            label="Priority"
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
            min="0"
            max="10"
            helperText="Higher priority messages show first (0-10)"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              helperText="Optional"
            />

            <Input
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              helperText="Optional"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingMessage ? 'Update Message' : 'Create Message'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TickerManagement;

