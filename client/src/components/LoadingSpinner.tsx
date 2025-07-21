import React from "react";
import { Loader2, Heart, TrendingUp, Users, Camera, Sparkles } from "lucide-react";

interface LoadingSpinnerProps {
  variant?: 'default' | 'influencer' | 'engagement' | 'content' | 'ai' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  variant = 'default',
  size = 'md',
  message,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const containerSizeClasses = {
    sm: 'gap-2 text-sm',
    md: 'gap-3 text-base',
    lg: 'gap-4 text-lg'
  };

  const renderSpinner = () => {
    const baseClasses = `${sizeClasses[size]} text-primary`;
    
    switch (variant) {
      case 'influencer':
        return (
          <div className="relative">
            <Users className={`${baseClasses} animate-pulse`} />
            <Heart className="w-3 h-3 text-pink-500 absolute -top-1 -right-1 animate-bounce" />
          </div>
        );
      
      case 'engagement':
        return (
          <div className="relative flex items-center justify-center">
            <TrendingUp className={`${baseClasses} animate-bounce`} />
            <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping" />
          </div>
        );
      
      case 'content':
        return (
          <div className="relative">
            <Camera className={`${baseClasses} animate-spin`} />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          </div>
        );
      
      case 'ai':
        return (
          <div className="relative">
            <Sparkles className={`${baseClasses} animate-pulse text-purple-500`} />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-20 animate-pulse" />
          </div>
        );
      
      case 'pulse':
        return (
          <div className="relative">
            <div className={`${sizeClasses[size]} rounded-full bg-primary animate-pulse`} />
            <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-primary opacity-30 animate-ping`} />
          </div>
        );
      
      default:
        return <Loader2 className={`${baseClasses} animate-spin`} />;
    }
  };

  return (
    <div className={`flex items-center justify-center ${containerSizeClasses[size]} ${className}`}>
      {renderSpinner()}
      {message && (
        <span className="text-muted-foreground font-medium animate-pulse">
          {message}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;