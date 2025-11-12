import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from './common/Modal';
import Button from './common/Button';
import Input from './common/Input';
import { successFeedback, errorFeedback } from '../utils/haptics';

export default function PairDisplayModal({ isOpen, onClose, onSuccess }) {
  const [method, setMethod] = useState('pin'); // pin, qr, manual
  const [pinCode, setPinCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [displayLocation, setDisplayLocation] = useState('');
  const [playlistId, setPlaylistId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchPlaylists();
    }
  }, [isOpen]);

  const fetchPlaylists = async () => {
    try {
      const response = await api.get('/playlists');
      setPlaylists(response.data.playlists || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const handlePairWithPin = async () => {
    if (!pinCode || pinCode.length !== 6) {
      setError('Please enter a valid 6-digit PIN');
      errorFeedback();
      return;
    }

    if (!displayName || !playlistId) {
      setError('Please enter display name and select playlist');
      errorFeedback();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/pairing/admin-pair-pin', {
        pin: pinCode,
        name: displayName,
        location: displayLocation,
        playlist_id: parseInt(playlistId)
      });

      successFeedback();
      onSuccess?.(response.data.display);
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Pairing failed');
      errorFeedback();
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!displayName || !playlistId) {
      setError('Please enter display name and select playlist');
      errorFeedback();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/pairing/generate-qr', {
        name: displayName,
        location: displayLocation,
        playlist_id: parseInt(playlistId)
      });

      setQrCode(response.data.qr_url);
      successFeedback();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to generate QR code');
      errorFeedback();
    } finally {
      setLoading(false);
    }
  };

  const handleManualCreate = async () => {
    if (!displayName || !playlistId) {
      setError('Please enter display name and select playlist');
      errorFeedback();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/displays', {
        name: displayName,
        location: displayLocation,
        playlist_id: parseInt(playlistId)
      });

      successFeedback();
      onSuccess?.(response.data.display);
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create display');
      errorFeedback();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pair New Display">
      <div className="space-y-6">
        {/* Method Tabs */}
        <div className="flex gap-2 border-b border-slate-700">
          {[
            { value: 'pin', label: '🔢 PIN Code' },
            { value: 'qr', label: '📱 QR Code' },
            { value: 'manual', label: '🔗 Manual Link' }
          ].map(m => (
            <button
              key={m.value}
              onClick={() => {
                setMethod(m.value);
                setError('');
                setQrCode('');
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                method === m.value
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Common Fields */}
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
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Default Playlist *
            </label>
            <select
              value={playlistId}
              onChange={(e) => setPlaylistId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-background border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select playlist...</option>
              {playlists.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Method-Specific Content */}
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
            <p className="text-text-muted text-sm mt-2">
              The display will show a 6-digit PIN code. Enter it here to pair.
            </p>
          </div>
        )}

        {method === 'qr' && (
          <div>
            {qrCode ? (
              <div className="bg-white rounded-lg p-6">
                <img src={qrCode} alt="QR Code" className="w-64 h-64 mx-auto" />
                <p className="text-center text-slate-900 font-medium mt-4">
                  Scan this QR code with your phone
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-text-secondary mb-4">
                  Click the button below to generate a QR code that can be scanned by the display.
                </p>
                <Button onClick={handleGenerateQR} disabled={loading}>
                  {loading ? 'Generating...' : 'Generate QR Code'}
                </Button>
              </div>
            )}
          </div>
        )}

        {method === 'manual' && (
          <div className="bg-background rounded-lg p-4 border border-slate-700">
            <p className="text-text-secondary text-sm mb-2">
              After creating, you'll get a unique URL to enter in the display browser.
            </p>
            <p className="text-text-muted text-xs">
              Note: URL will be long and difficult to type. Consider using PIN or QR code method instead.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-700">
          <Button
            onClick={
              method === 'pin' ? handlePairWithPin :
              method === 'qr' ? (qrCode ? onClose : handleGenerateQR) :
              handleManualCreate
            }
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Processing...' : 
             method === 'pin' ? 'Pair Display' :
             method === 'qr' && qrCode ? 'Done' :
             method === 'qr' ? 'Generate QR' :
             'Create Display'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

