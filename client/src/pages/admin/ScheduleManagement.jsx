/**
 * Schedule Management Page
 * Admin UI for managing display schedules
 * Phase 5: Advanced Scheduling
 */
import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';
import Spinner from '../../components/common/Spinner';

function ScheduleManagement() {
  const [schedules, setSchedules] = useState([]);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState(null);
  const [displays, setDisplays] = useState([]);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    display_id: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    date_start: '',
    date_end: '',
    priority: 0,
    schedule_type: 'time_of_day',
    event_name: '',
    meal_period: '',
    is_active: true
  });

  useEffect(() => {
    fetchDisplays();
    fetchPresets();
  }, []);

  useEffect(() => {
    if (selectedDisplay) {
      fetchSchedules(selectedDisplay);
    }
  }, [selectedDisplay]);

  const fetchDisplays = async () => {
    try {
      const response = await api.get('/displays');
      if (response.data.success) {
        setDisplays(response.data.displays || []);
        if (response.data.displays && response.data.displays.length > 0) {
          setSelectedDisplay(response.data.displays[0].id);
        }
      }
    } catch (error) {
      showToast('Failed to fetch displays', 'error');
    }
  };

  const fetchSchedules = async (displayId) => {
    try {
      setLoading(true);
      const response = await api.get(`/displays/${displayId}/schedules`);
      if (response.data.success) {
        setSchedules(response.data.schedules || []);
      }
    } catch (error) {
      showToast('Failed to fetch schedules', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPresets = async () => {
    try {
      const response = await api.get('/schedules/presets');
      if (response.data.success) {
        setPresets(response.data.presets || []);
      }
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.display_id) {
      showToast('Please select a display', 'error');
      return;
    }

    try {
      if (editingSchedule) {
        await api.put(`/schedules/${editingSchedule.id}`, formData);
        showToast('Schedule updated');
      } else {
        await api.post(`/displays/${formData.display_id}/schedules`, formData);
        showToast('Schedule created');
      }

      setShowModal(false);
      setEditingSchedule(null);
      resetForm();
      fetchSchedules(selectedDisplay || formData.display_id);
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to save schedule', 'error');
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      display_id: schedule.display_id,
      day_of_week: schedule.day_of_week || '',
      start_time: schedule.start_time || '',
      end_time: schedule.end_time || '',
      date_start: schedule.date_start || '',
      date_end: schedule.date_end || '',
      priority: schedule.priority || 0,
      schedule_type: schedule.schedule_type || 'time_of_day',
      event_name: schedule.event_name || '',
      meal_period: schedule.meal_period || '',
      is_active: schedule.is_active !== false
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule?')) return;

    try {
      await api.delete(`/schedules/${id}`);
      showToast('Schedule deleted');
      fetchSchedules(selectedDisplay);
    } catch (error) {
      showToast('Failed to delete schedule', 'error');
    }
  };

  const handleApplyPreset = async (preset) => {
    if (!selectedDisplay) {
      showToast('Please select a display first', 'error');
      return;
    }

    try {
      await api.post(`/schedules/apply-preset/${preset.id}`, {
        displayIds: [selectedDisplay]
      });
      showToast(`Preset "${preset.name}" applied`);
      setShowPresetModal(false);
      fetchSchedules(selectedDisplay);
    } catch (error) {
      showToast('Failed to apply preset', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      display_id: selectedDisplay || '',
      day_of_week: '',
      start_time: '',
      end_time: '',
      date_start: '',
      date_end: '',
      priority: 0,
      schedule_type: 'time_of_day',
      event_name: '',
      meal_period: '',
      is_active: true
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSchedule(null);
    resetForm();
  };

  if (loading && !selectedDisplay) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const selectedDisplayObj = displays.find(d => d.id === selectedDisplay);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedule Management</h1>
          <p className="text-gray-600 mt-1">
            Manage time-based content scheduling for displays
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowPresetModal(true)} variant="secondary">
            Apply Preset
          </Button>
          <Button onClick={() => setShowModal(true)}>
            + Add Schedule
          </Button>
        </div>
      </div>

      {/* Display Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Display
        </label>
        <select
          value={selectedDisplay || ''}
          onChange={(e) => {
            setSelectedDisplay(Number(e.target.value));
          }}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {displays.map(display => (
            <option key={display.id} value={display.id}>
              {display.name} {display.location ? `(${display.location})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Schedules List */}
      {!selectedDisplay ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Please select a display</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No schedules yet</p>
          <Button onClick={() => setShowModal(true)} className="mt-4">
            Create First Schedule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map(schedule => (
            <div
              key={schedule.id}
              className="bg-white rounded-lg shadow p-4 flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    schedule.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {schedule.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {schedule.priority > 0 && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Priority: {schedule.priority}
                    </span>
                  )}
                  {schedule.schedule_type && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      {schedule.schedule_type.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <p className="text-lg font-medium">
                  {schedule.channel_name || schedule.event_name || schedule.meal_period || 'Scheduled Content'}
                </p>
                {schedule.day_of_week !== null && schedule.start_time && (
                  <p className="text-sm text-gray-600 mt-1">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][schedule.day_of_week]} • {schedule.start_time} - {schedule.end_time}
                  </p>
                )}
                {(schedule.date_start || schedule.date_end) && (
                  <p className="text-sm text-gray-500 mt-1">
                    {schedule.date_start && `From: ${schedule.date_start}`}
                    {schedule.date_start && schedule.date_end && ' • '}
                    {schedule.date_end && `Until: ${schedule.date_end}`}
                  </p>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEdit(schedule)}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(schedule.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Schedule Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingSchedule ? 'Edit Schedule' : 'Add Schedule'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display
            </label>
            <select
              value={formData.display_id}
              onChange={(e) => setFormData({ ...formData, display_id: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select display</option>
              {displays.map(display => (
                <option key={display.id} value={display.id}>
                  {display.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule Type
            </label>
            <select
              value={formData.schedule_type}
              onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="time_of_day">Time of Day</option>
              <option value="date_range">Date Range</option>
              <option value="special_event">Special Event</option>
              <option value="meal_period">Meal Period</option>
            </select>
          </div>

          {formData.schedule_type === 'meal_period' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meal Period
              </label>
              <select
                value={formData.meal_period}
                onChange={(e) => setFormData({ ...formData, meal_period: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select meal period</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="late_night">Late Night</option>
              </select>
            </div>
          )}

          {formData.schedule_type === 'time_of_day' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Day of Week
                </label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All days</option>
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
                <Input
                  label="End Time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </>
          )}

          {formData.schedule_type === 'date_range' && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={formData.date_start}
                onChange={(e) => setFormData({ ...formData, date_start: e.target.value })}
              />
              <Input
                label="End Date"
                type="date"
                value={formData.date_end}
                onChange={(e) => setFormData({ ...formData, date_end: e.target.value })}
              />
            </div>
          )}

          {formData.schedule_type === 'special_event' && (
            <Input
              label="Event Name"
              value={formData.event_name}
              onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
              placeholder="e.g., Ramadan, Eid, New Year"
            />
          )}

          <Input
            label="Priority (0-10)"
            type="number"
            min="0"
            max="10"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
            helperText="Higher priority schedules override lower ones"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preset Selector Modal */}
      <Modal
        isOpen={showPresetModal}
        onClose={() => setShowPresetModal(false)}
        title="Apply Schedule Preset"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Select a preset to apply to <strong>{selectedDisplayObj?.name || 'selected display'}</strong>
          </p>
          
          {presets.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No presets available</p>
          ) : (
            <div className="space-y-2">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{preset.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default ScheduleManagement;

