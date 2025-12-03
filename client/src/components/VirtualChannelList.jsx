import { FixedSizeList as List } from 'react-window';
import Badge from './common/Badge';
// TEMPORARILY DISABLED - causing crashes
// import { checkStreamStatus } from '../utils/streamValidator';

export default function VirtualChannelList({ 
  channels, 
  currentChannel, 
  onChannelClick, 
  onToggleFavorite, 
  isFavorite, 
  height = 600 
}) {
  // STREAM VALIDATION TEMPORARILY DISABLED
  // const [channelStatuses, setChannelStatuses] = useState({});
  // const [checking, setChecking] = useState(false);
  const Row = ({ index, style }) => {
    const channel = channels[index];
    
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
                {currentChannel?.id === channel.id && (
                  <Badge color="success" size="sm">Playing</Badge>
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

