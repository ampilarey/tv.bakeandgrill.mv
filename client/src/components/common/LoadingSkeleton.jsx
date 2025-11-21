export default function LoadingSkeleton({ type = 'card', count = 1, className = '' }) {
  const skeletons = {
    // Card skeleton for playlists, displays, etc.
    card: (
      <div className={`bg-tv-bgElevated rounded-xl p-6 border-2 border-tv-borderSubtle ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-tv-bgSoft rounded w-3/4"></div>
          <div className="h-4 bg-tv-bgSoft rounded w-full"></div>
          <div className="h-4 bg-tv-bgSoft rounded w-5/6"></div>
          <div className="flex gap-2 mt-4">
            <div className="h-10 bg-tv-bgSoft rounded w-20"></div>
            <div className="h-10 bg-tv-bgSoft rounded w-20"></div>
          </div>
        </div>
      </div>
    ),

    // List item skeleton
    list: (
      <div className={`bg-tv-bgElevated rounded-lg p-4 border border-tv-borderSubtle ${className}`}>
        <div className="animate-pulse flex items-center gap-4">
          <div className="w-12 h-12 bg-tv-bgSoft rounded-lg flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-tv-bgSoft rounded w-3/4"></div>
            <div className="h-3 bg-tv-bgSoft rounded w-1/2"></div>
          </div>
        </div>
      </div>
    ),

    // Channel grid skeleton
    channel: (
      <div className={`bg-tv-bgElevated rounded-xl p-4 border-2 border-tv-borderSubtle ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="w-full aspect-video bg-tv-bgSoft rounded-lg"></div>
          <div className="h-4 bg-tv-bgSoft rounded w-3/4"></div>
          <div className="h-3 bg-tv-bgSoft rounded w-1/2"></div>
        </div>
      </div>
    ),

    // Table row skeleton
    table: (
      <tr className={className}>
        <td className="px-6 py-4">
          <div className="h-4 bg-tv-bgSoft rounded animate-pulse"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-tv-bgSoft rounded animate-pulse"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-tv-bgSoft rounded animate-pulse"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-8 bg-tv-bgSoft rounded animate-pulse w-20"></div>
        </td>
      </tr>
    ),

    // Text skeleton
    text: (
      <div className={`space-y-2 ${className}`}>
        <div className="h-4 bg-tv-bgSoft rounded animate-pulse"></div>
        <div className="h-4 bg-tv-bgSoft rounded animate-pulse w-5/6"></div>
        <div className="h-4 bg-tv-bgSoft rounded animate-pulse w-4/6"></div>
      </div>
    ),

    // Avatar skeleton
    avatar: (
      <div className={`w-10 h-10 bg-tv-bgSoft rounded-full animate-pulse ${className}`}></div>
    ),

    // Button skeleton
    button: (
      <div className={`h-10 bg-tv-bgSoft rounded-lg animate-pulse ${className}`}></div>
    )
  };

  const skeleton = skeletons[type] || skeletons.card;

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          {skeleton}
        </div>
      ))}
    </>
  );
}

