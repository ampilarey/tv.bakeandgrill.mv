/**
 * Legacy route — ticker messages now live in Smart Overlays.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/common/Spinner';

export default function TickerManagement() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/admin/overlays', { replace: true });
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-tv-bg">
      <Spinner size="xl" />
    </div>
  );
}
