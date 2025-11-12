import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/common/Spinner';

export default function DisplayPairingPage() {
  const [pairingMethod, setPairingMethod] = useState('pin'); // pin, qr, id, auto
  const [pinCode, setPinCode] = useState('');
  const [displayInfo, setDisplayInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [locationPin, setLocationPin] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    generatePinCode();
    fetchLocations();
    checkAutoPairing();
  }, []);

  // Auto-refresh PIN every 5 minutes
  useEffect(() => {
    if (pairingMethod === 'pin') {
      const interval = setInterval(() => {
        generatePinCode();
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [pairingMethod]);

  const generatePinCode = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setPinCode(pin);
    setLoading(false);
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/pairing/locations');
      setLocations(response.data.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const checkAutoPairing = async () => {
    try {
      const response = await api.post('/pairing/auto-pair');
      if (response.data.success && response.data.display) {
        handlePairingSuccess(response.data.display);
      }
    } catch (error) {
      // Auto-pairing not available, that's ok
      console.log('Auto-pairing not available');
    }
  };

  const handlePinPairing = async () => {
    if (!pinCode) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/pairing/check-pin', { pin: pinCode });
      if (response.data.success && response.data.paired && response.data.display) {
        handlePairingSuccess(response.data.display);
      } else {
        setError('PIN not paired yet. Please wait for admin to complete pairing.');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Pairing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationPairing = async () => {
    if (!selectedLocation || !locationPin) {
      setError('Please select location and enter PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/pairing/pair-with-location', {
        location_id: selectedLocation,
        pin: locationPin
      });
      if (response.data.success && response.data.display) {
        handlePairingSuccess(response.data.display);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Invalid location or PIN');
    } finally {
      setLoading(false);
    }
  };

  const handlePairingSuccess = (display) => {
    setDisplayInfo(display);
    localStorage.setItem('display_token', display.token);
    localStorage.setItem('display_id', display.id);
    
    // Redirect to kiosk mode after 2 seconds
    setTimeout(() => {
      navigate(`/display?token=${display.token}`);
    }, 2000);
  };

  // Check for QR code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrToken = params.get('qr');
    
    if (qrToken) {
      setPairingMethod('qr');
      pairWithQR(qrToken);
    }
  }, []);

  const pairWithQR = async (token) => {
    setLoading(true);
    try {
      const response = await api.post('/pairing/pair-with-qr', { qr_token: token });
      if (response.data.success && response.data.display) {
        handlePairingSuccess(response.data.display);
      }
    } catch (error) {
      setError('Invalid or expired QR code');
      setPairingMethod('pin');
    } finally {
      setLoading(false);
    }
  };

  if (displayInfo) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-white mb-2">Paired Successfully!</h1>
          <p className="text-text-secondary mb-4">
            Display: <span className="text-primary font-bold">{displayInfo.name}</span>
          </p>
          <p className="text-text-muted text-sm">Redirecting to player...</p>
          <Spinner className="mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📺 Display Setup</h1>
          <p className="text-text-secondary">Choose a pairing method to connect this display</p>
        </div>

        {/* Pairing Method Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { value: 'pin', label: 'PIN Code', icon: '🔢' },
            { value: 'qr', label: 'QR Code', icon: '📱' },
            { value: 'id', label: 'Location ID', icon: '📍' },
            { value: 'auto', label: 'Auto-Detect', icon: '🔍' }
          ].map(method => (
            <button
              key={method.value}
              onClick={() => {
                setPairingMethod(method.value);
                setError('');
              }}
              className={`p-6 rounded-lg border-2 transition-all ${
                pairingMethod === method.value
                  ? 'border-primary bg-primary/20'
                  : 'border-slate-700 bg-background-light hover:border-slate-600'
              }`}
            >
              <div className="text-4xl mb-2">{method.icon}</div>
              <div className="text-white font-medium">{method.label}</div>
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Method 1: PIN Code Pairing */}
        {pairingMethod === 'pin' && (
          <div className="bg-background-light rounded-lg p-8 border border-slate-700">
            <h2 className="text-2xl font-bold text-white text-center mb-4">
              Enter this PIN in Admin Panel
            </h2>
            <div className="bg-background rounded-lg p-8 mb-6">
              <div className="text-7xl font-bold text-primary text-center tracking-widest font-mono">
                {loading ? '------' : pinCode}
              </div>
            </div>
            <p className="text-text-secondary text-center text-sm">
              1. Go to Admin Panel → Displays → "Pair New Display"<br/>
              2. Enter this PIN code<br/>
              3. This display will connect automatically
            </p>
            <p className="text-text-muted text-center text-xs mt-4">
              PIN refreshes every 5 minutes
            </p>
          </div>
        )}

        {/* Method 2: QR Code Pairing */}
        {pairingMethod === 'qr' && (
          <div className="bg-background-light rounded-lg p-8 border border-slate-700">
            <h2 className="text-2xl font-bold text-white text-center mb-4">
              Scan QR Code
            </h2>
            <div className="bg-white rounded-lg p-8 mb-6 max-w-md mx-auto">
              <div className="aspect-square flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">📱</div>
                  <p className="text-slate-900 font-medium">
                    QR Code will appear here
                  </p>
                  <p className="text-slate-600 text-sm mt-2">
                    Generate from Admin Panel
                  </p>
                </div>
              </div>
            </div>
            <p className="text-text-secondary text-center text-sm">
              1. Admin Panel → Displays → "Generate QR Code"<br/>
              2. Scan with phone camera<br/>
              3. Display connects automatically
            </p>
          </div>
        )}

        {/* Method 3: Location ID Pairing */}
        {pairingMethod === 'id' && (
          <div className="bg-background-light rounded-lg p-8 border border-slate-700">
            <h2 className="text-2xl font-bold text-white text-center mb-6">
              Select Your Location
            </h2>
            
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Display Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-slate-600 text-white text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose location...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} - {loc.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  4-Digit PIN
                </label>
                <input
                  type="text"
                  maxLength="4"
                  value={locationPin}
                  onChange={(e) => setLocationPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter PIN"
                  className="w-full px-4 py-3 rounded-lg bg-background border border-slate-600 text-white text-2xl text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                onClick={handleLocationPairing}
                disabled={!selectedLocation || locationPin.length !== 4}
                className="w-full py-3 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Connect Display
              </button>
            </div>

            <p className="text-text-muted text-center text-xs mt-6">
              Get the 4-digit PIN from your cafe manager
            </p>
          </div>
        )}

        {/* Method 4: Auto-Discovery */}
        {pairingMethod === 'auto' && (
          <div className="bg-background-light rounded-lg p-8 border border-slate-700">
            <h2 className="text-2xl font-bold text-white text-center mb-6">
              Auto-Detecting Display...
            </h2>
            
            <div className="text-center py-12">
              <Spinner size="xl" />
              <p className="text-text-secondary mt-4">
                Searching for available displays on your network...
              </p>
            </div>

            <div className="mt-6 bg-background rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Requirements:</h3>
              <ul className="text-text-secondary text-sm space-y-2">
                <li>✓ Display must be on the cafe WiFi network</li>
                <li>✓ Network discovery must be enabled</li>
                <li>✓ Firewall must allow local connections</li>
              </ul>
            </div>

            <button
              onClick={checkAutoPairing}
              className="w-full mt-4 py-3 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold transition-colors"
            >
              Retry Auto-Detection
            </button>
          </div>
        )}

        {/* Help Footer */}
        <div className="mt-8 text-center">
          <p className="text-text-muted text-sm mb-2">Need help?</p>
          <p className="text-text-secondary text-sm">
            Contact your administrator or try a different pairing method above
          </p>
        </div>
      </div>
    </div>
  );
}

