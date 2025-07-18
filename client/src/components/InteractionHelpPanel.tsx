import { useState } from 'react';
import { HelpCircle, X, Play, MousePointer, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";

const platformGuides = [
  {
    platform: 'Instagram',
    icon: <MousePointer className="w-5 h-5" />,
    color: "from-purple-500 to-pink-500",
    features: [
      "View post content and captions directly in the embed",
      "Click anywhere to open full post on Instagram.com",
      "Likes, comments, and shares happen on Instagram",
      "Videos may show preview - click to play on Instagram"
    ]
  },
  {
    platform: 'Facebook',
    icon: <MousePointer className="w-5 h-5" />,
    color: "from-blue-600 to-blue-500",
    features: [
      "View post content and reactions in the embed",
      "Click anywhere to open full post on Facebook.com",
      "Comments and shares redirect to Facebook",
      "Videos play within embed with full controls"
    ]
  },
  {
    platform: 'TikTok',
    icon: <Play className="w-5 h-5" />,
    color: "from-black to-gray-700",
    features: [
      "Videos play directly in the embed player",
      "Use controls to pause, replay, and adjust volume",
      "Click profile or sounds to open TikTok app/website",
      "Likes and comments happen on TikTok.com"
    ]
  },
  {
    platform: 'YouTube',
    icon: <Play className="w-5 h-5" />,
    color: "from-red-600 to-red-500",
    features: [
      "Videos play directly with full YouTube controls",
      "Use player controls for volume, quality, fullscreen",
      "Click title or channel to open on YouTube.com",
      "Comments and subscriptions happen on YouTube"
    ]
  },
  {
    platform: 'Direct Video',
    icon: <Play className="w-5 h-5" />,
    color: "from-gray-600 to-gray-500",
    features: [
      "Videos play directly with browser controls",
      "Use controls for play, pause, volume, fullscreen",
      "Right-click for additional video options",
      "No external redirects - fully contained player"
    ]
  }
];

export function InteractionHelpPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Help Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <HelpCircle className="w-4 h-4" />
        <span>Content Interaction Guide</span>
      </Button>

      {/* Help Panel Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <HelpCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Interactive Content Guide</h2>
                  <p className="text-sm text-gray-500">Learn how to interact with different types of embedded content</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {platformGuides.map((guide, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    {/* Platform Header */}
                    <div className={`flex items-center gap-3 mb-4 p-3 rounded-lg bg-gradient-to-r ${guide.color} text-white`}>
                      {guide.icon}
                      <h3 className="font-semibold">{guide.platform}</h3>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2">
                      {guide.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start gap-2 text-sm text-gray-700">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* General Tips */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  General Tips
                </h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Hover over any embedded content to see platform-specific interaction guides</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Look for "How to interact" buttons on embedded content for quick help</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Use "View Original" buttons to access content directly on the platform</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Platform security policies may redirect interactions to the original site</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Embedded content behavior is determined by each platform's security policies
                </p>
                <Button 
                  onClick={() => setIsOpen(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Got it
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}