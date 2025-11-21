/**
 * Announcement Sender Component
 * Quick announcement modal for sending messages to displays
 * Phase 3: Info Ticker & Announcements
 */
import { useState } from 'react';
import PropTypes from 'prop-types';
import api from '../services/api';
import Button from './common/Button';
import Input from './common/Input';
import Modal from './common/Modal';
import { useToast } from '../hooks/useToast';

function AnnouncementSender({ displayId, displayName, isOpen, onClose }) {
  const { showToast } = useToast();
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    text: '',
    text_dv: '',
    duration_seconds: 10,
    background_color: '#1e293b',
    text_color: '#ffffff'
  });

  // Quick message templates
  const templates = [
    { text: "We'll be back in 10 minutes", duration: 600 },
    { text: "Kitchen closing in 15 minutes", duration: 60 },
    { text: "Cash only for now", duration: 30 },
    { text: "WiFi password: Guest123", duration: 20 },
    { text: "Please take a seat, we'll be right with you", duration: 15 }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.text.trim()) {
      showToast('Message text is required', 'error');
      return;
    }

    try {
      setSending(true);
      await api.post('/announcements', {
        display_id: displayId,
        ...formData
      });

      showToast(`Announcement sent to ${displayName}`);
      handleClose();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to send announcement', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setFormData({
      ...formData,
      text: template.text,
      duration_seconds: template.duration
    });
  };

  const handleClose = () => {
    setFormData({
      text: '',
      text_dv: '',
      duration_seconds: 10,
      background_color: '#1e293b',
      text_color: '#ffffff'
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Send Announcement to ${displayName}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Templates */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Templates
          </label>
          <div className="flex flex-wrap gap-2">
            {templates.map((template, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                {template.text}
              </button>
            ))}
          </div>
        </div>

        {/* Message Text */}
        <div>
          <Input
            label="Message (English)"
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            required
            placeholder="Enter your announcement"
            className="text-lg"
          />
        </div>

        {/* Dhivehi Text */}
        <div>
          <Input
            label="Message (Dhivehi)"
            value={formData.text_dv}
            onChange={(e) => setFormData({ ...formData, text_dv: e.target.value })}
            placeholder="Optional Dhivehi translation"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Display Duration
          </label>
          <div className="flex gap-2">
            {[5, 10, 15, 30, 60].map(duration => (
              <button
                key={duration}
                type="button"
                onClick={() => setFormData({ ...formData, duration_seconds: duration })}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  formData.duration_seconds === duration
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {duration}s
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.background_color}
                onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                className="w-12 h-12 rounded cursor-pointer"
              />
              <Input
                value={formData.background_color}
                onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                placeholder="#1e293b"
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.text_color}
                onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                className="w-12 h-12 rounded cursor-pointer"
              />
              <Input
                value={formData.text_color}
                onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
             style={{
               backgroundColor: formData.background_color,
               color: formData.text_color
             }}>
          <p className="text-2xl font-bold">
            {formData.text || 'Preview your announcement'}
          </p>
          {formData.text_dv && (
            <p className="text-xl mt-2 opacity-90">{formData.text_dv}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={sending || !formData.text.trim()}
            className="flex-1"
          >
            {sending ? 'Sending...' : 'Send Announcement'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={sending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

AnnouncementSender.propTypes = {
  displayId: PropTypes.number.isRequired,
  displayName: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default AnnouncementSender;

