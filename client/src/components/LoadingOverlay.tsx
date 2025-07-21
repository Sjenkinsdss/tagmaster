import React from "react";
import { Heart, Star, TrendingUp, Camera, Sparkles, Users, Zap } from "lucide-react";

interface LoadingOverlayProps {
  isLoading: boolean;
  variant?: 'influencer' | 'content' | 'ai' | 'engagement' | 'social';
  message?: string;
  children?: React.ReactNode;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  variant = 'influencer',
  message,
  children
}) => {
  const renderInfluencerAnimation = () => (
    <div className="relative">
      <div className="flex items-center justify-center space-x-3">
        <div className="relative">
          <Users className="w-8 h-8 text-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <Heart className="w-4 h-4 text-pink-500 absolute -top-2 -right-2 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
        <Star className="w-6 h-6 text-yellow-400 animate-spin" style={{ animationDelay: '600ms' }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 border-4 border-transparent border-t-blue-400 rounded-full animate-spin opacity-30" />
      </div>
    </div>
  );

  const renderContentAnimation = () => (
    <div className="relative">
      <div className="flex items-center justify-center space-x-4">
        <Camera className="w-8 h-8 text-green-500 animate-pulse" />
        <div className="flex flex-col space-y-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"
              style={{ 
                width: `${20 + i * 10}px`,
                animationDelay: `${i * 150}ms`
              }}
            />
          ))}
        </div>
        <TrendingUp className="w-6 h-6 text-blue-500 animate-bounce" />
      </div>
    </div>
  );

  const renderAIAnimation = () => (
    <div className="relative">
      <div className="flex items-center justify-center">
        <div className="relative">
          <Sparkles className="w-10 h-10 text-purple-500 animate-spin" />
          <div className="absolute inset-0 w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse" />
        </div>
        <div className="absolute">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-ping"
              style={{
                top: `${Math.sin(i * Math.PI / 2) * 25 + 20}px`,
                left: `${Math.cos(i * Math.PI / 2) * 25 + 20}px`,
                animationDelay: `${i * 200}ms`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderEngagementAnimation = () => (
    <div className="relative flex items-center justify-center">
      <div className="flex space-x-3">
        <div className="relative">
          <Heart className="w-6 h-6 text-red-500 animate-pulse" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping" />
        </div>
        <TrendingUp className="w-8 h-8 text-green-500 animate-bounce" />
        <div className="relative">
          <Users className="w-6 h-6 text-blue-500 animate-pulse" />
          <Zap className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1 animate-bounce" />
        </div>
      </div>
      <div className="absolute inset-0 border-2 border-green-400/30 rounded-full animate-ping" style={{ width: '80px', height: '80px', margin: 'auto' }} />
    </div>
  );

  const renderSocialAnimation = () => (
    <div className="relative">
      <div className="grid grid-cols-3 gap-2 items-center justify-center">
        {[
          { icon: Heart, color: 'text-pink-500', delay: 0 },
          { icon: Star, color: 'text-yellow-500', delay: 100 },
          { icon: Users, color: 'text-blue-500', delay: 200 },
          { icon: Camera, color: 'text-green-500', delay: 300 },
          { icon: TrendingUp, color: 'text-purple-500', delay: 400 },
          { icon: Sparkles, color: 'text-indigo-500', delay: 500 }
        ].map(({ icon: Icon, color, delay }, index) => (
          <Icon
            key={index}
            className={`w-5 h-5 ${color} animate-pulse`}
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );

  const renderAnimation = () => {
    switch (variant) {
      case 'content':
        return renderContentAnimation();
      case 'ai':
        return renderAIAnimation();
      case 'engagement':
        return renderEngagementAnimation();
      case 'social':
        return renderSocialAnimation();
      default:
        return renderInfluencerAnimation();
    }
  };

  if (!isLoading) return children;

  return (
    <div className="relative">
      {children && <div className="opacity-50 pointer-events-none">{children}</div>}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        <div className="p-6 rounded-lg bg-card/90 border shadow-lg">
          {renderAnimation()}
          {message && (
            <p className="mt-4 text-center text-sm text-muted-foreground font-medium animate-pulse">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;