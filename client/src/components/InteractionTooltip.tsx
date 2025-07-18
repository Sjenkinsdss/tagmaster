import { useState } from 'react';
import { Info, Play, ExternalLink, MousePointer } from 'lucide-react';

interface InteractionTooltipProps {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'video' | 'default';
  children: React.ReactNode;
}

const platformGuides = {
  instagram: {
    icon: <MousePointer className="w-4 h-4" />,
    title: "Instagram Interaction Guide",
    content: [
      "• View post content and captions directly in the embed",
      "• Click anywhere to open full post on Instagram.com",
      "• Likes, comments, and shares happen on Instagram",
      "• Videos may show preview - click to play on Instagram"
    ],
    color: "from-purple-500 to-pink-500"
  },
  facebook: {
    icon: <MousePointer className="w-4 h-4" />,
    title: "Facebook Interaction Guide", 
    content: [
      "• View post content and reactions in the embed",
      "• Click anywhere to open full post on Facebook.com",
      "• Comments and shares redirect to Facebook",
      "• Videos play within embed with full controls"
    ],
    color: "from-blue-600 to-blue-500"
  },
  tiktok: {
    icon: <Play className="w-4 h-4" />,
    title: "TikTok Interaction Guide",
    content: [
      "• Videos play directly in the embed player",
      "• Use controls to pause, replay, and adjust volume",
      "• Click profile or sounds to open TikTok app/website",
      "• Likes and comments happen on TikTok.com"
    ],
    color: "from-black to-gray-700"
  },
  youtube: {
    icon: <Play className="w-4 h-4" />,
    title: "YouTube Interaction Guide",
    content: [
      "• Videos play directly with full YouTube controls",
      "• Use player controls for volume, quality, fullscreen",
      "• Click title or channel to open on YouTube.com",
      "• Comments and subscriptions happen on YouTube"
    ],
    color: "from-red-600 to-red-500"
  },
  video: {
    icon: <Play className="w-4 h-4" />,
    title: "Video Player Guide",
    content: [
      "• Videos play directly with browser controls",
      "• Use controls for play, pause, volume, fullscreen",
      "• Right-click for additional video options",
      "• No external redirects - fully contained player"
    ],
    color: "from-gray-600 to-gray-500"
  },
  default: {
    icon: <ExternalLink className="w-4 h-4" />,
    title: "Content Interaction Guide",
    content: [
      "• Click to open content in new tab",
      "• Some content may have interaction limitations",
      "• Use 'View Original' button for full experience",
      "• Platform policies may affect embedding behavior"
    ],
    color: "from-gray-500 to-gray-600"
  }
};

export function InteractionTooltip({ platform, children }: InteractionTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const guide = platformGuides[platform];

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      
      {isVisible && (
        <div className="absolute top-2 right-2 z-50 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 animate-in fade-in-0 zoom-in-95 duration-200 backdrop-blur-sm">
          <div className={`flex items-center gap-2 mb-3 text-white p-2 rounded-lg bg-gradient-to-r ${guide.color}`}>
            {guide.icon}
            <h3 className="font-semibold text-sm">{guide.title}</h3>
          </div>
          
          <div className="space-y-1">
            {guide.content.map((item, index) => (
              <div key={index} className="text-sm text-gray-700 leading-relaxed">
                {item}
              </div>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="w-3 h-3" />
              <span>Hover over content for interaction tips</span>
            </div>
          </div>
          
          {/* Tooltip arrow */}
          <div className="absolute top-4 -left-2 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
}

interface InteractionGuideProps {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'video' | 'default';
  className?: string;
}

export function InteractionGuide({ platform, className = "" }: InteractionGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const guide = platformGuides[platform];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-gradient-to-r ${guide.color} hover:opacity-90 transition-opacity shadow-sm`}
      >
        {guide.icon}
        <span>How to interact</span>
        <Info className="w-3 h-3" />
      </button>
      
      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className={`flex items-center gap-2 mb-3 text-white p-2 rounded-lg bg-gradient-to-r ${guide.color}`}>
            {guide.icon}
            <h3 className="font-semibold text-sm">{guide.title}</h3>
          </div>
          
          <div className="space-y-1">
            {guide.content.map((item, index) => (
              <div key={index} className="text-sm text-gray-700 leading-relaxed">
                {item}
              </div>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => setIsExpanded(false)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Click anywhere outside to close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}