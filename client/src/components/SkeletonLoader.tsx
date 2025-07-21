import React from "react";

interface SkeletonLoaderProps {
  variant?: 'post' | 'tag' | 'ad' | 'list' | 'card';
  count?: number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'card',
  count = 1,
  className = ''
}) => {
  const renderPostSkeleton = () => (
    <div className="border rounded-lg p-4 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-muted rounded-full" />
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-muted rounded w-1/3" />
          <div className="h-2 bg-muted rounded w-1/4" />
        </div>
      </div>
      
      {/* Media placeholder */}
      <div className="w-full h-48 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      </div>
      
      {/* Content */}
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
      
      {/* Engagement metrics */}
      <div className="flex space-x-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-muted rounded" />
            <div className="h-2 bg-muted rounded w-8" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderTagSkeleton = () => (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-muted rounded w-1/3" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-6 bg-muted rounded-full" style={{ width: `${60 + i * 10}px` }} />
        ))}
      </div>
    </div>
  );

  const renderAdSkeleton = () => (
    <div className="border rounded-lg p-3 space-y-3 animate-pulse">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded" />
        <div className="flex-1 space-y-1">
          <div className="h-3 bg-muted rounded w-3/4" />
          <div className="h-2 bg-muted rounded w-1/2" />
        </div>
      </div>
      
      {/* Performance metrics */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-2 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderListSkeleton = () => (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center space-x-3 p-2">
          <div className="w-3 h-3 bg-muted rounded-full" />
          <div className="h-3 bg-muted rounded flex-1" style={{ width: `${70 + i * 15}%` }} />
        </div>
      ))}
    </div>
  );

  const renderCardSkeleton = () => (
    <div className="border rounded-lg p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-muted rounded w-2/3" />
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-4/5" />
      </div>
    </div>
  );

  const renderSkeleton = () => {
    switch (variant) {
      case 'post':
        return renderPostSkeleton();
      case 'tag':
        return renderTagSkeleton();
      case 'ad':
        return renderAdSkeleton();
      case 'list':
        return renderListSkeleton();
      default:
        return renderCardSkeleton();
    }
  };

  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={i > 0 ? 'mt-4' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;