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
      
      // Check for auto-pair PIN from QR code scan
      if (window.autoPairPin) {
        console.log('📱 Auto-filling PIN from QR code:', window.autoPairPin);
        setPinCode(window.autoPairPin);
        setMethod('pin');
        // Clear it so it doesn't auto-fill again
        delete window.autoPairPin;
      }
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
        <div className="flex gap-2 border-b border-tv-borderSubtle">
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
                  ? 'text-tv-accent border-b-2 border-tv-accent'
                  : 'text-tv-textSecondary hover:text-tv-text'
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
            <label className="block text-sm font-medium text-tv-textSecondary mb-2">
              Default Playlist *
            </label>
            <select
              value={playlistId}
              onChange={(e) => setPlaylistId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-tv-bgElevated border-2 border-tv-borderSubtle text-tv-text focus:outline-none focus:ring-2 focus:ring-tv-accent"
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
            <p className="text-tv-textMuted text-sm mt-2">
              The display will show a 6-digit PIN code. Enter it here to pair.
            </p>
          </div>
        )}

        {method === 'qr' && (
          <div className="space-y-4">
            <div className="bg-tv-gold/10 border-2 border-tv-gold/30 rounded-xl p-4">
              <h4 className="text-tv-text font-bold mb-2 flex items-center gap-2">
                <span className="text-2xl">💡</span>
                Easy QR Code Pairing
              </h4>
              <p className="text-tv-text text-sm leading-relaxed">
                <span className="font-bold">New easier way:</span> The display shows a QR code. You scan it with your phone camera, and it opens this page with the PIN already filled in!
              </p>
            </div>
            
            <div className="bg-tv-bgSoft rounded-xl p-5 border border-tv-borderSubtle">
              <h4 className="text-tv-text font-bold mb-3">📱 How to use QR Code Pairing:</h4>
              <ol className="text-tv-text text-sm space-y-2 list-decimal list-inside">
                <li>On the TV/Display, open: <code className="bg-tv-accent/10 text-tv-accent px-2 py-0.5 rounded text-xs">tv.bakeandgrill.mv/#/pair</code></li>
                <li>Select "📱 QR Code" tab</li>
                <li><strong>A large QR code will appear on the TV screen</strong></li>
                <li>Use your phone camera to scan the QR code</li>
                <li>Your phone will open this page with PIN auto-filled</li>
                <li>Just enter display name & playlist, then click Pair!</li>
              </ol>
            </div>
            
            <div className="bg-tv-bgElevated border-2 border-tv-borderSubtle rounded-xl p-4">
              <p className="text-tv-textSecondary text-sm text-center">
                The QR code is displayed <strong className="text-tv-accent">on the TV screen</strong>, not here in admin panel.
              </p>
            </div>
          </div>
        )}

        {method === 'manual' && (
          <div className="bg-tv-bgSoft rounded-lg p-4 border border-tv-borderSubtle">
            <p className="text-tv-textSecondary text-sm mb-2">
              After creating, you'll get a unique URL to enter in the display browser.
            </p>
            <p className="text-tv-textMuted text-xs">
              Note: URL will be long and difficult to type. Consider using PIN or QR code method instead.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-tv-borderSubtle">
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

