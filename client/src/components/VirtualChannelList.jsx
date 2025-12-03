import { useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import Badge from './common/Badge';
import { checkStreamStatus } from '../utils/streamValidator';

export default function VirtualChannelList({ 
  channels, 
  currentChannel, 
  onChannelClick, 
  onToggleFavorite, 
  isFavorite, 
  height = 600 
}) {
  const [channelStatuses, setChannelStatuses] = useState({});
  const [checking, setChecking] = useState(false);

  // Check stream status in background (lazy validation)
  useEffect(() => {
    if (channels.length === 0 || checking) return;

    const checkStreams = async () => {
      setChecking(true);
      
      // Check channels in batches of 5
      const batchSize = 5;
      
      for (let i = 0; i < Math.min(channels.length, 50); i += batchSize) {
        const batch = channels.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (channel) => {
          const status = await checkStreamStatus(channel.url);
          return { id: channel.id, status };
        });
        
        try {
          const results = await Promise.all(batchPromises);
          
          setChannelStatuses(prev => {
            const updated = { ...prev };
            results.forEach(({ id, status }) => {
              updated[id] = status;
            });
            return updated;
          });
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error('Batch check error:', error);
        }
      }
      
      setChecking(false);
    };

    // Start checking after a short delay (let UI render first)
    const timer = setTimeout(checkStreams, 1000);
    return () => clearTimeout(timer);
  }, [channels.length]);
  const Row = ({ index, style }) => {
    const channel = channels[index];
    const status = channelStatuses[channel.id];
    
    return (
      <div style={style} className="px-2">
        <div
          onClick={() => onChannelClick(channel)}
          className={`
            p-3 mb-2 rounded-lg cursor-pointer transition-all
            ${currentChannel?.id === channel.id 
              ? 'bg-primary/20 border border-primary' 
              : 'bg-background hover:bg-background-lighter border border-transparent'
            }
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-white truncate">{channel.name}</h3>
                
                {/* Playing badge */}
                {currentChannel?.id === channel.id && (
                  <Badge color="success" size="sm">Playing</Badge>
                )}
                
                {/* Live status badge */}
                {status && status.live === true && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                    Live
                  </span>
                )}
                {status && status.live === false && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                    Offline
                  </span>
                )}
                {!status && checking && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                    Checking...
                  </span>
                )}
              </div>
              {channel.group && (
                <p className="text-xs text-text-muted">{channel.group}</p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(channel);
              }}
              className="ml-2 p-1 hover:scale-110 transition-transform"
            >
              {isFavorite(channel.id) ? '⭐' : '☆'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (channels.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted">
        <p>No channels found</p>
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={channels.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  );
}

