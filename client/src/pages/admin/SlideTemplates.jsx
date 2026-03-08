/**
 * Slide Templates Management Page
 * Build and manage reusable slide designs
 */
import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';
import Spinner from '../../components/common/Spinner';

const TEMPLATE_TYPES = [
  { value: 'image_price', label: 'Image + Price', icon: '🖼️', desc: 'Product photo with name and price' },
  { value: 'text_only',   label: 'Text Only',     icon: '📝', desc: 'Headline and body text' },
  { value: 'offer',       label: 'Offer / Promo',  icon: '🏷️', desc: 'Promotional deal or discount' },
  { value: 'qr_code',     label: 'QR Code',        icon: '📱', desc: 'QR code with title and description' },
  { value: 'custom',      label: 'Custom',         icon: '✏️', desc: 'Free-form custom layout' },
];

const FONTS = ['Inter', 'Georgia', 'Playfair Display', 'Roboto', 'Montserrat', 'Lato'];

const TYPE_BADGE_COLORS = {
  image_price: 'bg-blue-100 text-blue-700',
  text_only:   'bg-purple-100 text-purple-700',
  offer:       'bg-orange-100 text-orange-700',
  qr_code:     'bg-teal-100 text-teal-700',
  custom:      'bg-gray-100 text-gray-700',
};

// Mini live preview rendered inside the modal
function SlidePreview({ form }) {
  const bg   = form.background_color || '#ffffff';
  const pri  = form.primary_color    || '#1e293b';
  const sec  = form.secondary_color  || '#64748b';
  const font = form.font_family      || 'Inter';
  const type = form.template_type    || 'custom';

  const style = { backgroundColor: bg, fontFamily: font };

  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner"
      style={{ aspectRatio: '16/9', ...style }}
    >
      {type === 'image_price' && (
        <div className="flex h-full">
          <div className="w-1/2 h-full flex items-center justify-center" style={{ backgroundColor: sec + '30' }}>
            <div className="flex flex-col items-center gap-1 opacity-60">
              <svg className="w-10 h-10" style={{ color: sec }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs" style={{ color: sec }}>Image</span>
            </div>
          </div>
          <div className="w-1/2 h-full flex flex-col justify-center px-5 gap-2">
            <div className="text-sm font-bold leading-tight" style={{ color: pri }}>Item Name</div>
            <div className="text-xs" style={{ color: sec }}>Short description here</div>
            <div className="text-lg font-bold mt-1" style={{ color: pri }}>MVR 120</div>
          </div>
        </div>
      )}

      {type === 'text_only' && (
        <div className="h-full flex flex-col items-center justify-center px-8 text-center gap-3">
          <div className="text-base font-bold leading-snug" style={{ color: pri }}>
            Your Headline Goes Here
          </div>
          <div className="text-xs leading-relaxed" style={{ color: sec }}>
            Supporting body text. Great for announcements,<br />daily specials, or event info.
          </div>
        </div>
      )}

      {type === 'offer' && (
        <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: sec }}>
            Special Offer
          </div>
          <div className="text-2xl font-black leading-none" style={{ color: pri }}>
            50% OFF
          </div>
          <div className="text-sm font-medium" style={{ color: pri }}>
            All Beverages Today
          </div>
          <div
            className="mt-2 px-4 py-1.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: pri, color: bg }}
          >
            Limited Time
          </div>
        </div>
      )}

      {type === 'qr_code' && (
        <div className="h-full flex items-center justify-center gap-6 px-8">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 border-2"
            style={{ borderColor: pri }}
          >
            <svg className="w-10 h-10" style={{ color: pri }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm9-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm11-2h2v2h-2v-2zm2 2h2v2h-2v-2zm-4 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-4-4h2v2h-2v-2z" />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-sm font-bold" style={{ color: pri }}>Scan to Order</div>
            <div className="text-xs" style={{ color: sec }}>Point camera at QR code</div>
          </div>
        </div>
      )}

      {type === 'custom' && (
        <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="text-sm font-bold" style={{ color: pri }}>Custom Layout</div>
          <div className="text-xs" style={{ color: sec }}>Your design here</div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  name: '',
  template_type: 'image_price',
  background_color: '#1a1a2e',
  primary_color: '#f5c518',
  secondary_color: '#a0a0b0',
  font_family: 'Inter',
};

export default function SlideTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const { showToast } = useToast();

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/templates');
      if (res.data.success) setTemplates(res.data.templates);
    } catch {
      showToast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name:             t.name,
      template_type:    t.template_type,
      background_color: t.background_color || '#ffffff',
      primary_color:    t.primary_color    || '#1e293b',
      secondary_color:  t.secondary_color  || '#64748b',
      font_family:      t.font_family      || 'Inter',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Name is required', 'error');
    try {
      if (editing) {
        await api.put(`/templates/${editing.id}`, form);
        showToast('Template updated');
      } else {
        await api.post('/templates', form);
        showToast('Template created');
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save template', 'error');
    }
  };

  const handleDelete = async (t) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    try {
      await api.delete(`/templates/${t.id}`);
      showToast('Template deleted');
      fetchTemplates();
    } catch {
      showToast('Failed to delete template', 'error');
    }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

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
          <h1 className="text-3xl font-bold">Slide Templates</h1>
          <p className="text-gray-600 mt-1">
            Reusable designs for your media slides
          </p>
        </div>
        <Button onClick={openNew}>+ New Template</Button>
      </div>

      {/* Grid */}
      {templates.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-4xl mb-3">🎨</p>
          <p className="text-gray-700 font-medium">No templates yet</p>
          <p className="text-gray-500 text-sm mt-1">Create a template to reuse slide designs quickly</p>
          <Button onClick={openNew} className="mt-5">Create First Template</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map(t => {
            const typeInfo = TEMPLATE_TYPES.find(x => x.value === t.template_type);
            return (
              <div key={t.id} className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
                {/* Mini preview */}
                <div
                  className="w-full flex items-center justify-center"
                  style={{ aspectRatio: '16/9', backgroundColor: t.background_color || '#fff' }}
                >
                  <div className="text-3xl">{typeInfo?.icon || '🎨'}</div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 truncate">{t.name}</h3>
                    {t.is_system && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-100 text-yellow-700 font-medium flex-shrink-0">
                        System
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE_COLORS[t.template_type] || 'bg-gray-100 text-gray-700'}`}>
                      {typeInfo?.label || t.template_type}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{t.font_family}</span>
                  </div>

                  {/* Color swatches */}
                  <div className="flex items-center gap-1.5 mb-4">
                    {[t.background_color, t.primary_color, t.secondary_color].map((c, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full border border-gray-200 shadow-sm"
                        style={{ backgroundColor: c || '#ccc' }}
                        title={c}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {!t.is_system && (
                      <>
                        <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(t)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(t)}>
                          Delete
                        </Button>
                      </>
                    )}
                    {t.is_system && (
                      <span className="text-xs text-gray-400 italic">System template — read only</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Edit "${editing.name}"` : 'New Slide Template'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Template Name"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Cafe Menu Item"
            required
          />

          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEMPLATE_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => set('template_type', type.value)}
                  className={`flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all ${
                    form.template_type === type.value
                      ? 'border-tv-gold bg-tv-gold/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg mb-1">{type.icon}</span>
                  <span className="text-xs font-semibold text-gray-800">{type.label}</span>
                  <span className="text-xs text-gray-500 mt-0.5 leading-tight">{type.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
            <SlidePreview form={form} />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Background', key: 'background_color' },
              { label: 'Primary',    key: 'primary_color'    },
              { label: 'Secondary',  key: 'secondary_color'  },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                  />
                  <span className="text-xs text-gray-500 font-mono">{form[key]}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Font */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Font</label>
            <select
              value={form.font_family}
              onChange={e => set('font_family', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tv-gold"
            >
              {FONTS.map(f => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">
              {editing ? 'Save Changes' : 'Create Template'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
