export default function SkeletonLoader({ type = 'card', count = 1 }) {
  const loaders = Array(count).fill(0);

  if (type === 'card') {
    return (
      <div className="space-y-3">
        {loaders.map((_, i) => (
          <div 
            key={i} 
            className="bg-background-lighter rounded-lg p-4 animate-pulse"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-slate-700 rounded w-3/4"></div>
                <div className="h-4 bg-slate-700 rounded w-1/2"></div>
              </div>
              <div className="w-16 h-16 bg-slate-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-2">
        {loaders.map((_, i) => (
          <div 
            key={i} 
            className="bg-background-lighter rounded-lg p-3 animate-pulse"
          >
            <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-2">
        {loaders.map((_, i) => (
          <div 
            key={i} 
            className="grid grid-cols-4 gap-4 bg-background-lighter rounded-lg p-4 animate-pulse"
          >
            <div className="h-4 bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className="space-y-2 animate-pulse">
        {loaders.map((_, i) => (
          <div key={i} className="h-4 bg-slate-700 rounded w-full"></div>
        ))}
      </div>
    );
  }

  // Default
  return (
    <div className="animate-pulse">
      <div className="h-20 bg-slate-700 rounded"></div>
    </div>
  );
}

