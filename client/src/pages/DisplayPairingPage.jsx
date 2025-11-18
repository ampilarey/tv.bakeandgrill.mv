import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/common/Spinner';
import QRCode from 'qrcode';

export default function DisplayPairingPage() {
  const [pairingMethod, setPairingMethod] = useState('pin'); // pin, qr, id, auto
  const [pinCode, setPinCode] = useState('');
  const [displayInfo, setDisplayInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [locationPin, setLocationPin] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    requestPinFromServer();
    fetchLocations();
    checkAutoPairing();
  }, []);

  // Generate QR code for pairing when QR method is selected
  useEffect(() => {
    if (pairingMethod === 'qr' && pinCode) {
      generateQRCode();
    }
  }, [pairingMethod, pinCode]);

  const generateQRCode = async () => {
    if (!pinCode) return;
    
    setQrCodeLoading(true);
    try {
      // Create pairing URL with PIN code for admin to pair this display
      const pairingUrl = `${window.location.origin}/#/admin/displays?autoPairPin=${pinCode}`;
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(pairingUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#B03A48',  // tv-accent color
          light: '#FFFFFF'
        }
      });
      
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setQrCodeLoading(false);
    }
  };

  // Auto-refresh PIN every 5 minutes
  useEffect(() => {
    if ((pairingMethod === 'pin' || pairingMethod === 'qr') && pinCode) {
      const interval = setInterval(() => {
        requestPinFromServer();
      }, 5 * 60 * 1000);

      // Also poll to check if admin has paired this PIN
      // This works for BOTH PIN and QR methods since QR also uses PIN internally
      const checkInterval = setInterval(() => {
        checkIfPinPaired();
      }, 3000); // Check every 3 seconds

      return () => {
        clearInterval(interval);
        clearInterval(checkInterval);
      };
    }
  }, [pairingMethod, pinCode]);

  const requestPinFromServer = async () => {
    setLoading(true);
    try {
      const response = await api.post('/pairing/request-pin');
      setPinCode(response.data.pin);
    } catch (error) {
      console.error('Error requesting PIN:', error);
      // Fallback to client-side generation
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      setPinCode(pin);
    } finally {
      setLoading(false);
    }
  };

  const checkIfPinPaired = async () => {
    if (!pinCode) return;

    try {
      const response = await api.post('/pairing/check-pin', { pin: pinCode });
      console.log('🔍 Checking if PIN paired:', response.data);
      
      if (response.data.paired && response.data.display) {
        console.log('✅ Display paired successfully! Redirecting to player...', response.data.display);
        handlePairingSuccess(response.data.display);
      }
    } catch (error) {
      // Not paired yet, keep waiting
      console.log('⏳ Not paired yet, continuing to wait...');
    }
  };

  const fetchLocations = async () => {
    try {
      // Public route - no auth needed
      const response = await api.get('/pairing/locations');
      setLocations(response.data.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]); // Set empty array on error
    }
  };

  const checkAutoPairing = async () => {
    try {
      // Public route - no auth needed
      const response = await api.post('/pairing/auto-pair');
      if (response.data.success && response.data.display) {
        handlePairingSuccess(response.data.display);
      }
    } catch (error) {
      // Auto-pairing not available, that's ok
      console.log('Auto-pairing not available');
      // Don't show error to user
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
    console.log('🎉 Pairing successful! Display info:', display);
    console.log('📋 Display token:', display.token);
    
    setDisplayInfo(display);
    
    // Redirect to kiosk mode after showing success message
    console.log('⏱️ Will redirect to player in 2 seconds...');
    
    setTimeout(() => {
      const redirectUrl = `/#/display?token=${display.token}`;
      console.log('🔄 Redirecting to:', redirectUrl);
      console.log('🔄 Full URL:', window.location.origin + redirectUrl);
      
      // Use both navigate AND window.location as fallback
      try {
        navigate(`/display?token=${display.token}`);
      } catch (navError) {
        console.error('❌ Navigate failed, using window.location:', navError);
        window.location.href = `${window.location.origin}/#/display?token=${display.token}`;
      }
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
      <div className="min-h-screen flex items-center justify-center bg-tv-bg">
        <div className="text-center p-8">
          <div className="text-8xl mb-6 animate-bounce">✅</div>
          <h1 className="text-4xl md:text-5xl font-bold text-tv-accent mb-4">Paired Successfully!</h1>
          <p className="text-tv-text text-lg mb-6">
            Display: <span className="text-tv-accent font-bold text-2xl">{displayInfo.name}</span>
          </p>
          <div className="bg-tv-bgElevated rounded-xl p-6 border-2 border-tv-accent/30 mb-6 max-w-md mx-auto">
            <p className="text-tv-text font-medium mb-2">Loading player...</p>
            <Spinner className="mt-4" />
          </div>
          <p className="text-tv-textMuted text-sm">
            Redirecting to player...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tv-bg overflow-auto">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <div className="text-6xl md:text-7xl mb-4">📺</div>
          <h1 className="text-3xl md:text-5xl font-bold text-tv-accent mb-3">Display Setup</h1>
          <p className="text-base md:text-lg text-tv-textSecondary">Choose a pairing method to connect this display</p>
        </div>

        {/* Pairing Method Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-10">
          {[
            { value: 'pin', label: 'PIN Code', icon: '🔢', desc: 'Enter 6-digit code' },
            { value: 'qr', label: 'QR Code', icon: '📱', desc: 'Scan to pair' },
            { value: 'id', label: 'Location ID', icon: '📍', desc: 'Select location' },
            { value: 'auto', label: 'Auto-Detect', icon: '🔍', desc: 'Find automatically' }
          ].map(method => (
            <button
              key={method.value}
              onClick={() => {
                setPairingMethod(method.value);
                setError('');
              }}
              className={`p-4 md:p-6 rounded-xl border-2 transition-all shadow-lg ${
                pairingMethod === method.value
                  ? 'border-tv-accent bg-tv-accent/10 shadow-tv-accent/20'
                  : 'border-tv-borderSubtle bg-tv-bgElevated hover:border-tv-accent/50 hover:shadow-xl'
              }`}
            >
              <div className="text-3xl md:text-5xl mb-2">{method.icon}</div>
              <div className="text-tv-text font-bold text-sm md:text-base">{method.label}</div>
              <div className="text-tv-textMuted text-xs mt-1 hidden md:block">{method.desc}</div>
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border-2 border-red-500/50 text-red-600 p-4 rounded-xl mb-6 font-medium shadow-lg">
            ⚠️ {error}
          </div>
        )}

        {/* Method 1: PIN Code Pairing */}
        {pairingMethod === 'pin' && (
          <div className="bg-tv-bgElevated rounded-2xl p-6 md:p-10 border-2 border-tv-borderSubtle shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-bold text-tv-accent text-center mb-6">
              🔢 Enter this PIN in Admin Panel
            </h2>
            <div className="bg-gradient-to-br from-tv-accent/5 to-tv-gold/5 rounded-2xl p-8 md:p-12 mb-6 relative border-2 border-tv-accent/20 shadow-inner">
              <div className="text-6xl md:text-8xl lg:text-9xl font-bold text-tv-accent text-center tracking-[0.3em] font-mono drop-shadow-lg">
                {loading ? '------' : pinCode}
              </div>
              <div className="absolute top-3 right-3 md:top-4 md:right-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-tv-bgElevated/90 rounded-full border border-tv-borderSubtle">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs md:text-sm text-tv-textSecondary font-medium">Active</span>
                </div>
              </div>
            </div>
            <div className="space-y-4 text-center">
              <div className="bg-tv-bgSoft rounded-xl p-4 md:p-5 border border-tv-borderSubtle">
                <p className="text-tv-text text-sm md:text-base font-medium leading-relaxed">
                  <span className="text-tv-accent font-bold">1.</span> Open Admin Panel on your phone<br/>
                  <span className="text-tv-accent font-bold">2.</span> Go to Displays → "Pair Display"<br/>
                  <span className="text-tv-accent font-bold">3.</span> Enter this PIN code<br/>
                  <span className="text-tv-accent font-bold">4.</span> Display connects automatically
                </p>
              </div>
              <div className="bg-tv-accent/10 border-2 border-tv-accent/30 rounded-xl p-3 md:p-4">
                <p className="text-tv-accent text-sm md:text-base font-bold flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span>
                  Checking for pairing every 3 seconds...
                </p>
              </div>
            </div>
            <p className="text-tv-textMuted text-center text-xs md:text-sm mt-6 font-medium">
              🔄 PIN refreshes automatically every 5 minutes
            </p>
          </div>
        )}

        {/* Method 2: QR Code Pairing - REVERSED FLOW: Display shows QR, Admin scans */}
        {pairingMethod === 'qr' && (
          <div className="bg-tv-bgElevated rounded-2xl p-6 md:p-10 border-2 border-tv-borderSubtle shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-bold text-tv-accent text-center mb-6">
              📱 Scan QR Code with Admin Phone
            </h2>
            
            {qrCodeLoading || !qrCodeDataUrl ? (
              <div className="bg-white rounded-2xl p-8 md:p-12 mb-6 max-w-md mx-auto flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                  <Spinner size="xl" />
                  <p className="text-tv-text font-medium mt-4">Generating QR Code...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 md:p-10 mb-6 max-w-lg mx-auto shadow-2xl border-4 border-tv-accent/20">
                <div className="relative">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="Pairing QR Code" 
                    className="w-full h-auto rounded-xl"
                  />
                  <div className="absolute -top-3 -right-3 bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    ACTIVE
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-tv-text font-bold text-lg mb-2">PIN: <span className="text-tv-accent text-2xl font-mono tracking-wider">{pinCode}</span></p>
                  <p className="text-tv-textSecondary text-sm">(Backup - use if QR scan fails)</p>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="bg-tv-bgSoft rounded-xl p-4 md:p-5 border border-tv-borderSubtle">
                <p className="text-tv-text text-sm md:text-base font-medium leading-relaxed text-center">
                  <span className="text-tv-accent font-bold">1.</span> Open your Admin Panel on phone<br/>
                  <span className="text-tv-accent font-bold">2.</span> Use phone camera to scan this QR code<br/>
                  <span className="text-tv-accent font-bold">3.</span> Enter display details<br/>
                  <span className="text-tv-accent font-bold">4.</span> Display connects automatically
                </p>
              </div>
              
              <div className="bg-tv-accent/10 border-2 border-tv-accent/30 rounded-xl p-3 md:p-4">
                <p className="text-tv-accent text-sm md:text-base font-bold flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span>
                  Checking for pairing every 3 seconds...
                </p>
              </div>
              
              <div className="bg-tv-gold/10 border border-tv-gold/30 rounded-xl p-3 text-center">
                <p className="text-tv-text text-xs md:text-sm font-medium">
                  💡 <span className="font-bold">Tip:</span> Point your phone camera at the QR code. It will auto-detect and open the pairing link.
                </p>
              </div>
            </div>
            
            <p className="text-tv-textMuted text-center text-xs md:text-sm mt-6 font-medium">
              🔄 QR code refreshes every 5 minutes
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

