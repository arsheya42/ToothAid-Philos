import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import PageHeader from '../components/PageHeader';
import { getOutboxOps, getLastSyncAt, performSync } from '../db/indexedDB';

const SyncPage = ({ token, setToken }) => {
  const navigate = useNavigate();
  const [pendingOps, setPendingOps] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const loadData = async () => {
      const ops = await getOutboxOps();
      const syncTime = await getLastSyncAt();
      setPendingOps(ops);
      setLastSync(syncTime);
    };
    
    loadData();
    const interval = setInterval(loadData, 2000);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline) {
      setSyncResult({ success: false, error: 'Device is offline' });
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    try {
      const result = await performSync(token);
      setSyncResult(result);
      
      // Reload data
      const ops = await getOutboxOps();
      const syncTime = await getLastSyncAt();
      setPendingOps(ops);
      setLastSync(syncTime);
      
      // If deletions occurred, reload the page after a short delay to refresh UI
      if (result.success && result.deletedCount > 0) {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      setSyncResult({ success: false, error: error.message });
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Never';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${month}/${day}/${year}, ${hours}:${minutesStr} ${ampm}`;
  };

  return (
    <div className="container" style={{ overflowX: 'hidden' }}>
      <PageHeader title="Sync" subtitle="Synchronize data with server" icon="sync" />

      {/* Main Card */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '4px 0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        {/* Connection Status Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 16px',
          borderBottom: '1px solid #f2f2f7'
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isOnline ? '#34C759' : '#FF3B30',
            marginRight: '10px'
          }} />
          <svg viewBox="0 0 24 24" fill="none" stroke={isOnline ? '#34C759' : '#FF3B30'} strokeWidth="2" style={{ width: '20px', height: '20px', marginRight: '10px' }}>
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" fill={isOnline ? '#34C759' : '#FF3B30'} />
          </svg>
          <span style={{ fontSize: '16px', fontWeight: '600', color: isOnline ? '#34C759' : '#FF3B30' }}>
            {isOnline ? 'Connected' : 'Offline'}
          </span>
        </div>

        {/* Last Sync Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid #f2f2f7'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="1.5" style={{ width: '20px', height: '20px' }}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 6v6l4 2" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: '16px', color: '#1c1c1e' }}>Last Sync</span>
          </div>
          <span style={{ fontSize: '15px', color: '#8e8e93' }}>{formatDate(lastSync)}</span>
        </div>

        {/* Pending Changes Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="1.5" style={{ width: '20px', height: '20px' }}>
              <rect x="5" y="3" width="14" height="18" rx="2" />
              <path d="M9 7h6" />
              <path d="M9 11h6" />
              <path d="M9 15h4" />
            </svg>
            <span style={{ fontSize: '16px', color: '#1c1c1e' }}>Pending Changes</span>
          </div>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--color-primary)',
            background: 'var(--color-primary-soft)',
            padding: '4px 12px',
            borderRadius: '12px'
          }}>
            {pendingOps.length}
          </span>
        </div>
      </div>

      {/* Sync Button */}
      <button
        onClick={handleSync}
        className="btn btn-primary btn-block"
        disabled={syncing || !isOnline}
        style={{
          marginTop: '20px',
          marginBottom: '16px',
          opacity: (!isOnline || syncing) ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          style={{ 
            width: '18px', 
            height: '18px',
            animation: syncing ? 'spin 1s linear infinite' : 'none'
          }}
        >
          <path d="M4 12c0-4.4 3.6-8 8-8 2.8 0 5.2 1.4 6.6 3.5" />
          <path d="M20 12c0 4.4-3.6 8-8 8-2.8 0-5.2-1.4-6.6-3.5" />
          <path d="M16 4l3 3.5-3.5 3" />
          <path d="M8 20l-3-3.5 3.5-3" />
        </svg>
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>

      {/* Sync Result */}
      {syncResult && (
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: syncResult.success ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
          marginBottom: '16px'
        }}>
          <p style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: '500',
            color: syncResult.success ? '#34C759' : '#FF3B30'
          }}>
            {syncResult.success
              ? (syncResult.message || 'Sync completed successfully!')
              : syncResult.syncedCount > 0
                ? `${syncResult.syncedCount} synced; ${syncResult.failedCount || 'some'} still pending. ${syncResult.error}`
                : `Sync failed; changes remain on this device. ${syncResult.error}`
            }
          </p>
        </div>
      )}

      {/* Offline Warning */}
      {!isOnline && (
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(255, 149, 0, 0.1)'
        }}>
          <p style={{ margin: 0, fontSize: '15px', color: '#FF9500' }}>
            You're offline. Sync will be available when connected.
          </p>
        </div>
      )}

      <NavBar />
    </div>
  );
};

export default SyncPage;
