import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings, 
  Shield, 
  TrendingUp, 
  BarChart3, 
  Tags, 
  Save, 
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Palette
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ThemeCustomizer from "@/components/ThemeCustomizer";

interface ToolConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  category: 'analytics' | 'management' | 'content';
}

const AdminPanel: React.FC = () => {
  const [toolsConfig, setToolsConfig] = useState<ToolConfig[]>([
    {
      id: 'heat-map',
      name: 'Heat Map & Analytics',
      description: 'Engagement heat maps and mood analytics for content analysis',
      icon: <TrendingUp className="w-5 h-5" />,
      enabled: true,
      category: 'analytics'
    },
    {
      id: 'platform-analytics',
      name: 'Platform Analytics Dashboard',
      description: 'Comprehensive platform performance tracking and insights',
      icon: <BarChart3 className="w-5 h-5" />,
      enabled: true,
      category: 'analytics'
    },
    {
      id: 'tag-management',
      name: 'Tag Management',
      description: 'Advanced tag creation, editing, merging, and organization tools',
      icon: <Tags className="w-5 h-5" />,
      enabled: true,
      category: 'management'
    },
    {
      id: 'bulk-operations',
      name: 'Bulk Operations',
      description: 'Bulk post selection, tag application, and content management',
      icon: <Settings className="w-5 h-5" />,
      enabled: true,
      category: 'management'
    },
    {
      id: 'ai-recommendations',
      name: 'AI Tag Recommendations',
      description: 'AI-powered tag suggestions with confidence scoring',
      icon: <Shield className="w-5 h-5" />,
      enabled: true,
      category: 'content'
    },
    {
      id: 'theme-customizer',
      name: 'Theme Customizer',
      description: 'Customize interface colors, generate palettes, and manage themes',
      icon: <Palette className="w-5 h-5" />,
      enabled: true,
      category: 'management'
    }
  ]);

  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for current tools configuration
  const { data: currentConfig, isLoading } = useQuery({
    queryKey: ["/api/admin/tools-config"],
    queryFn: () => 
      fetch("/api/admin/tools-config")
        .then(res => res.json())
        .catch(() => ({ tools: toolsConfig })) // Fallback to default config
  });

  // Mutation to save tools configuration
  const saveConfigMutation = useMutation({
    mutationFn: (config: ToolConfig[]) =>
      fetch("/api/admin/tools-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tools: config })
      }).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Tools configuration has been updated successfully.",
      });
      setHasChanges(false);
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tools-config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save configuration changes.",
        variant: "destructive",
      });
    }
  });

  // Load configuration from API when available
  useEffect(() => {
    if (currentConfig?.tools) {
      setToolsConfig(currentConfig.tools);
    }
  }, [currentConfig]);

  const handleToolToggle = (toolId: string, enabled: boolean) => {
    setToolsConfig(prev => 
      prev.map(tool => 
        tool.id === toolId ? { ...tool, enabled } : tool
      )
    );
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    saveConfigMutation.mutate(toolsConfig);
  };

  const handleResetChanges = () => {
    if (currentConfig?.tools) {
      setToolsConfig(currentConfig.tools);
    }
    setHasChanges(false);
  };

  const enabledCount = toolsConfig.filter(tool => tool.enabled).length;
  const disabledCount = toolsConfig.length - enabledCount;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'analytics': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'management': return 'bg-green-50 border-green-200 text-green-700';
      case 'content': return 'bg-purple-50 border-purple-200 text-purple-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'analytics': return <BarChart3 className="w-4 h-4" />;
      case 'management': return <Settings className="w-4 h-4" />;
      case 'content': return <Tags className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const groupedTools = toolsConfig.reduce((groups, tool) => {
    const category = tool.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(tool);
    return groups;
  }, {} as Record<string, ToolConfig[]>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading admin configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-sm text-gray-600">Manage tools and features availability</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {lastSaved && (
                <div className="text-sm text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
              <Badge variant="outline" className="text-blue-600">
                {enabledCount} of {toolsConfig.length} tools enabled
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600 mb-1">{enabledCount}</div>
              <p className="text-sm text-gray-600">Active Tools</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <EyeOff className="w-6 h-6 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-600 mb-1">{disabledCount}</div>
              <p className="text-sm text-gray-600">Disabled Tools</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                {hasChanges ? (
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {hasChanges ? 'Pending' : 'Saved'}
              </div>
              <p className="text-sm text-gray-600">Configuration Status</p>
            </CardContent>
          </Card>
        </div>

        {/* Changes Alert */}
        {hasChanges && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You have unsaved changes. Click "Save Changes" to apply your configuration updates.
            </AlertDescription>
          </Alert>
        )}

        {/* Tools Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Tools Configuration</span>
            </CardTitle>
            <p className="text-sm text-gray-600">
              Control which tools and features are available to users in the main interface.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(groupedTools).map(([category, tools]) => (
              <div key={category}>
                <div className="flex items-center space-x-2 mb-4">
                  {getCategoryIcon(category)}
                  <h3 className="text-lg font-semibold capitalize text-gray-900">{category} Tools</h3>
                  <Badge variant="outline" className={getCategoryColor(category)}>
                    {tools.filter(t => t.enabled).length}/{tools.length} enabled
                  </Badge>
                </div>
                
                <div className="grid gap-4">
                  {tools.map((tool) => (
                    <div key={tool.id} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="text-gray-600">
                          {tool.icon}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{tool.name}</h4>
                          <p className="text-sm text-gray-600">{tool.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant={tool.enabled ? "default" : "secondary"}
                          className={tool.enabled ? "bg-green-100 text-green-800 border-green-300" : ""}
                        >
                          {tool.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Switch
                          checked={tool.enabled}
                          onCheckedChange={(enabled) => handleToolToggle(tool.id, enabled)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {category !== Object.keys(groupedTools)[Object.keys(groupedTools).length - 1] && (
                  <Separator className="mt-6" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Theme Customizer Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Palette className="w-6 h-6 text-purple-600" />
              Theme Customizer
            </CardTitle>
            <p className="text-sm text-gray-600">
              Customize the interface colors and manage theme palettes for all users
            </p>
          </CardHeader>
          <CardContent>
            <ThemeCustomizer />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center mt-8 p-4 bg-white border rounded-lg">
          <div className="text-sm text-gray-600">
            Changes will take effect immediately for all users after saving.
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={handleResetChanges}
              disabled={!hasChanges || saveConfigMutation.isPending}
            >
              Reset Changes
            </Button>
            <Button 
              onClick={handleSaveChanges}
              disabled={!hasChanges || saveConfigMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveConfigMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;