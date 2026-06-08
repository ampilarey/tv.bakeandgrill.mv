import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from './common/Modal';
import Button from './common/Button';
import Input from './common/Input';
import { successFeedback, errorFeedback } from '../utils/haptics';

export default function PairDisplayModal({ isOpen, onClose, onSuccess, autoPairPin = null }) {
  const [method, setMethod] = useState('pin');
  const [pinCode, setPinCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [displayLocation, setDisplayLocation] = useState('');
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchPlaylists();
      if (autoPairPin) {
        setPinCode(autoPairPin);
        setMethod('pin');
      }
    }
  }, [isOpen, autoPairPin]);

  const fetchPlaylists = async () => {
    try {
      const response = await api.get('/pairing/playlists');
      setPlaylists(response.data.playlists || []);
    } catch (err) {
      console.error('Error fetching playlists:', err);
    }
  };

  const togglePlaylist = (id) => {
    const pid = parseInt(id, 10);
    setSelectedPlaylistIds((prev) => {
      if (prev.includes(pid)) return prev.filter((x) => x !== pid);
      return [...prev, pid];
    });
  };

  const playlistPayload = () => ({
    playlist_id: selectedPlaylistIds[0],
    playlist_ids: selectedPlaylistIds,
  });

  const validatePlaylists = () => {
    if (!selectedPlaylistIds.length) {
      setError('Select at least one playlist');
      errorFeedback();
      return false;
    }
    return true;
  };

  const handlePairWithPin = async () => {
    if (!pinCode || pinCode.length !== 6) {
      setError('Please enter a valid 6-digit PIN');
      errorFeedback();
      return;
    }
    if (!displayName || !validatePlaylists()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/pairing/admin-pair-pin', {
        pin: pinCode,
        name: displayName,
        location: displayLocation,
        ...playlistPayload(),
      });

      successFeedback();
      onSuccess?.(response.data.display);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Pairing failed');
      errorFeedback();
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!displayName || !validatePlaylists()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/pairing/generate-qr', {
        name: displayName,
        location: displayLocation,
        ...playlistPayload(),
      });

      setQrCode(response.data.qr_url);
      successFeedback();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate QR code');
      errorFeedback();
    } finally {
      setLoading(false);
    }
  };

  const handleManualCreate = async () => {
    if (!displayName || !validatePlaylists()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/displays', {
        name: displayName,
        location: displayLocation,
        ...playlistPayload(),
      });

      successFeedback();
      onSuccess?.(response.data.display);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create display');
      errorFeedback();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pair New Display">
      <div className="space-y-6">
        <div className="flex gap-2 border-b border-tv-borderSubtle">
          {[
            { value: 'pin', label: '🔢 PIN Code' },
            { value: 'qr', label: '📱 QR Code' },
            { value: 'manual', label: '🔗 Manual Link' },
          ].map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => {
                setMethod(m.value);
                setError('');
                setQrCode('');
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                method === m.value
                  ? 'text-tv-accent border-b-2 border-tv-accent'
                  : 'text-tv-textSecondary hover:text-tv-text'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g., Cafe Main Counter"
            required
          />
          <Input
            label="Location (Optional)"
            value={displayLocation}
            onChange={(e) => setDisplayLocation(e.target.value)}
            placeholder="e.g., Ground Floor"
          />
          <div>
            <label className="block text-sm font-medium text-tv-textSecondary mb-2">
              Stream Playlists * <span className="text-tv-textMuted font-normal">(select one or more)</span>
            </label>
            <p className="text-xs text-tv-textMuted mb-2">
              Channels from all selected playlists are merged on the TV. The first selected is the primary playlist.
            </p>
            <div className="max-h-40 overflow-y-auto rounded-lg border-2 border-tv-borderSubtle bg-tv-bgElevated divide-y divide-tv-borderSubtle">
              {playlists.length === 0 ? (
                <p className="p-3 text-sm text-tv-textMuted">No active playlists found</p>
              ) : (
                playlists.map((p) => {
                  const checked = selectedPlaylistIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-tv-bgSoft ${
                        checked ? 'bg-tv-accent/10' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-tv-accent w-4 h-4"
                        checked={checked}
                        onChange={() => togglePlaylist(p.id)}
                      />
                      <span className="text-sm text-tv-text">{p.name}</span>
                      {checked && selectedPlaylistIds[0] === p.id && (
                        <span className="ml-auto text-xs text-tv-accent font-medium">Primary</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {method === 'pin' && (
          <div>
            <Input
              label="6-Digit PIN from Display"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit PIN"
              maxLength="6"
              className="text-center text-2xl font-mono tracking-widest"
            />
            <p className="text-tv-textMuted text-sm mt-2">
              The display will show a 6-digit PIN code. Enter it here to pair.
            </p>
          </div>
        )}

        {method === 'qr' && (
          <div className="space-y-4">
            <div className="bg-tv-accent/10 border-2 border-tv-accent/30 rounded-xl p-5">
              <h4 className="text-tv-accent font-bold text-lg mb-3 flex items-center gap-2">
                <span className="text-3xl">📱</span>
                Scan QR Code from Display
              </h4>
              <p className="text-tv-text text-sm leading-relaxed">
                Open the pair page on the TV and scan the QR code with your phone.
              </p>
            </div>
            {qrCode && (
              <div className="text-center p-4 bg-white rounded-lg">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`} alt="QR" />
              </div>
            )}
            <Button onClick={handleGenerateQR} disabled={loading} className="w-full">
              {loading ? 'Generating…' : 'Generate QR Pairing Code'}
            </Button>
          </div>
        )}

        {method === 'manual' && (
          <p className="text-sm text-tv-textMuted">
            Creates a display and gives you a URL to open on the TV browser.
          </p>
        )}

        <div className="flex gap-3 pt-2 border-t border-tv-borderSubtle">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          {method === 'pin' && (
            <Button onClick={handlePairWithPin} disabled={loading} className="flex-1">
              {loading ? 'Pairing…' : 'Pair Display'}
            </Button>
          )}
          {method === 'manual' && (
            <Button onClick={handleManualCreate} disabled={loading} className="flex-1">
              {loading ? 'Creating…' : 'Create Display'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
