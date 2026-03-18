/**
 * ChannelSidebar
 * Reusable channel list panel used for both the desktop sidebar and the
 * mobile bottom-sheet drawer in PlayerPage.
 */
import { useCallback } from 'react';
import Button from './common/Button';
import Input from './common/Input';
import Badge from './common/Badge';

/** Small coloured dot showing channel live-status */
function LiveStatusDot({ isLive, size = 'sm' }) {
  const s = size === 'lg' ? 'w-3 h-3' : 'w-2 h-2';
  if (isLive === 1 || isLive === true)
    return <span className={`${s} rounded-full bg-green-500 flex-shrink-0 animate-pulse`} title="Live" />;
  if (isLive === 0 || isLive === false)
    return <span className={`${s} rounded-full bg-red-500 flex-shrink-0`} title="Offline" />;
  return <span className={`${s} rounded-full bg-gray-500/40 flex-shrink-0`} title="Status unknown" />;
}

export default function ChannelSidebar({
  variant = 'desktop',        // 'desktop' | 'mobile'
  channels,
  filteredChannels,
  groups,
  currentChannel,
  favorites,
  recentlyWatched,
  searchQuery,
  selectedGroup,
  showFavoritesOnly,
  viewMode,
  displayedChannels,
  showAllRecent,
  searchHistory,
  showSearchSuggestions,
  onSearch,
  onSearchFocus,
  onSearchBlur,
  onSearchHistorySelect,
  onClearSearchHistory,
  onGroupChange,
  onFavoritesToggle,
  onViewModeChange,
  onChannelClick,
  onToggleFavorite,
  isFavorite,
  onLoadMore,
  onBack,
  onLogout,
  onShowAllRecentToggle,
}) {
  const headerClasses = variant === 'mobile'
    ? 'p-4 pb-3 border-b border-tv-borderSubtle bg-tv-bgElevated sticky top-0 z-20 shadow-[0_-12px_32px_rgba(0,0,0,0.65)] flex-shrink-0'
    : 'p-4 border-b border-tv-borderSubtle flex-shrink-0';

  const listWrapperClasses = variant === 'mobile'
    ? 'flex-1 overflow-y-auto custom-scrollbar p-2 pb-32 bg-tv-bgElevated min-h-0'
    : 'flex-1 overflow-y-auto custom-scrollbar p-3 bg-tv-bgElevated min-h-0';

  const footerClasses = variant === 'mobile'
    ? 'p-3 border-t border-tv-borderSubtle text-xs text-tv-textMuted text-center bg-tv-bgElevated/95 sticky bottom-0 flex-shrink-0'
    : 'p-3 border-t border-tv-borderSubtle text-sm text-tv-textMuted text-center flex-shrink-0';

  const showRecent = variant === 'mobile' && recentlyWatched.length > 0
    && !searchQuery && !selectedGroup && !showFavoritesOnly;

  return (
    <>
      {/* Header: nav + search + filters */}
      <div className={headerClasses}>
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {currentChannel ? 'Stop' : 'Back'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout}>Logout</Button>
        </div>

        {/* Search with history dropdown */}
        <div className="relative mb-3">
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
          />
          {showSearchSuggestions && searchHistory.length > 0 && !searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-tv-bgSoft border-2 border-tv-borderSubtle rounded-xl shadow-2xl z-10 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between p-3 border-b border-tv-borderSubtle bg-tv-bgHover/50">
                <span className="text-xs text-tv-textSecondary font-semibold uppercase tracking-wide">Recent Searches</span>
                <button onClick={onClearSearchHistory} className="text-xs text-tv-error hover:text-tv-error/80 font-medium">Clear</button>
              </div>
              {searchHistory.map((term, index) => (
                <button
                  key={index}
                  onClick={() => onSearchHistorySelect(term)}
                  className="w-full text-left px-4 py-2.5 hover:bg-tv-bgHover text-tv-text text-sm transition-all flex items-center gap-3 border-b border-tv-borderSubtle/30 last:border-0"
                >
                  <span className="text-tv-accent">🔍</span>
                  <span>{term}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant={showFavoritesOnly ? 'primary' : 'ghost'} size="sm" onClick={onFavoritesToggle}>
            ⭐ Favorites
          </Button>
          <select
            value={selectedGroup}
            onChange={(e) => onGroupChange(e.target.value)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-tv-bgSoft text-tv-text border-2 border-tv-borderSubtle focus:outline-none focus:ring-2 focus:ring-tv-accent focus:border-tv-accent"
          >
            <option value="">All Groups</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <div className="ml-auto flex border-2 border-tv-borderSubtle rounded-lg overflow-hidden bg-tv-bgSoft">
            {['list', 'grid'].map(mode => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={`px-4 py-1.5 text-sm font-medium transition-all ${
                  mode === 'grid' ? 'border-l-2 border-tv-borderSubtle' : ''
                } ${viewMode === mode
                  ? 'bg-tv-accent text-white shadow-md'
                  : 'bg-transparent text-tv-textSecondary hover:bg-tv-bgHover hover:text-tv-text'
                }`}
                title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} View`}
              >
                {mode === 'list' ? '☰ List' : '⊞ Grid'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className={listWrapperClasses}>
        {/* Recently Watched — mobile only */}
        {showRecent && (
          <div className="p-2 border-b border-tv-borderSubtle">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-semibold text-tv-textSecondary uppercase tracking-wide">🕒 Recently Watched</h3>
              {recentlyWatched.length > 5 && (
                <button onClick={onShowAllRecentToggle} className="text-xs text-tv-accent hover:text-tv-accentSoft transition-colors">
                  {showAllRecent ? 'Show Less' : `Show All (${recentlyWatched.length})`}
                </button>
              )}
            </div>
            <div className="space-y-1">
              {(showAllRecent ? recentlyWatched : recentlyWatched.slice(0, 5)).map(channel => (
                <div
                  key={`recent-${channel.id}`}
                  onClick={() => onChannelClick(channel)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    currentChannel?.id === channel.id
                      ? 'bg-tv-accent/20 border-l-3 border-tv-accent'
                      : 'bg-tv-bgSoft hover:bg-tv-bgHover border-l-3 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium truncate text-sm ${currentChannel?.id === channel.id ? 'text-tv-accent' : 'text-tv-text'}`}>
                          {channel.name}
                        </h3>
                        {currentChannel?.id === channel.id && <Badge color="success" size="sm">Playing</Badge>}
                      </div>
                      {channel.group && <p className="text-xs text-tv-textMuted">{channel.group}</p>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(channel); }}
                      className="ml-2 p-1 hover:scale-110 transition-transform text-tv-accentSoft"
                    >
                      {isFavorite(channel.id) ? '⭐' : '☆'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Channels */}
        {filteredChannels.length === 0 ? (
          <div className="p-8 text-center text-tv-textMuted"><p>No channels found</p></div>
        ) : (
          <div>
            {showRecent && (
              <h3 className="text-sm font-semibold text-tv-textSecondary uppercase tracking-wide mb-2 px-1">📺 All Channels</h3>
            )}
            {variant === 'desktop' && (
              <h3 className="text-sm font-semibold text-tv-textSecondary uppercase tracking-wide mb-3 px-1">📺 All Channels</h3>
            )}

            {/* List View */}
            {viewMode === 'list' && filteredChannels.slice(0, displayedChannels).map(channel => (
              <div
                key={channel.id}
                onClick={() => onChannelClick(channel)}
                className={`flex items-center gap-3 px-3 py-3 mb-1.5 rounded-lg cursor-pointer transition-all ${
                  currentChannel?.id === channel.id
                    ? 'bg-tv-accent/20 border-l-3 border-tv-accent shadow-lg'
                    : 'bg-transparent hover:bg-tv-bgHover border-l-3 border-transparent'
                }`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-tv-bgHover border border-tv-borderSubtle flex items-center justify-center overflow-hidden">
                  {channel.logo
                    ? <img src={channel.logo} alt={channel.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    : <span className="text-xl text-tv-textMuted">📺</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <LiveStatusDot isLive={channel.is_live} />
                    <h3 className={`font-medium truncate ${currentChannel?.id === channel.id ? 'text-tv-accent' : 'text-tv-text'}`}>
                      {channel.name}
                    </h3>
                  </div>
                  {channel.group && <p className="text-xs text-tv-textMuted truncate">{channel.group}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {currentChannel?.id === channel.id && <Badge color="success" size="sm">Playing</Badge>}
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(channel); }}
                    className="p-1 hover:scale-110 transition-transform text-tv-accentSoft"
                    title={isFavorite(channel.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFavorite(channel.id) ? '⭐' : '☆'}
                  </button>
                </div>
              </div>
            ))}

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 gap-2">
                {filteredChannels.slice(0, displayedChannels).map(channel => (
                  <div
                    key={channel.id}
                    onClick={() => onChannelClick(channel)}
                    className={`p-3 rounded-lg cursor-pointer transition-all relative ${
                      currentChannel?.id === channel.id
                        ? 'bg-tv-accent/20 border-2 border-tv-accent shadow-lg'
                        : 'bg-tv-bgSoft hover:bg-tv-bgHover border-2 border-transparent'
                    }`}
                  >
                    <div className="text-center">
                      {channel.logo ? (
                        <img src={channel.logo} alt={channel.name} loading="lazy"
                          className="w-16 h-16 mx-auto mb-2 rounded-lg object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="w-16 h-16 mx-auto mb-2 bg-tv-bgHover border border-tv-borderSubtle rounded-lg flex items-center justify-center text-2xl">📺</div>
                      )}
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <LiveStatusDot isLive={channel.is_live} />
                        <h3 className={`font-medium text-sm truncate ${currentChannel?.id === channel.id ? 'text-tv-accent' : 'text-tv-text'}`}>
                          {channel.name}
                        </h3>
                      </div>
                      {channel.group && <p className="text-xs text-tv-textMuted truncate">{channel.group}</p>}
                      {currentChannel?.id === channel.id && <Badge color="success" size="sm" className="mt-2">▶️</Badge>}
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(channel); }}
                        className="absolute top-2 right-2 p-1 bg-tv-bgElevated/80 rounded hover:scale-110 transition-transform text-tv-accentSoft"
                      >
                        {isFavorite(channel.id) ? '⭐' : '☆'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredChannels.length > displayedChannels && (
              <div className="mt-4 text-center">
                <Button variant="ghost" onClick={onLoadMore} className="w-full">
                  Load More ({filteredChannels.length - displayedChannels} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={footerClasses}>
        <span className="text-tv-textMuted">
          Showing {Math.min(displayedChannels, filteredChannels.length)} of {filteredChannels.length} channels
          {filteredChannels.length !== channels.length && ` (${channels.length} total)`}
        </span>
      </div>
    </>
  );
}
