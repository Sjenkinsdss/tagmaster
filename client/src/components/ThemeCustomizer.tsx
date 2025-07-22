import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, RefreshCw, Download, Upload, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  description: string;
}

const predefinedPalettes: ColorPalette[] = [
  {
    id: "original",
    name: "Original Theme",
    primary: "#0f62fe",
    secondary: "#f4f4f4",
    accent: "#f4f4f4",
    background: "#ffffff",
    foreground: "#161616",
    muted: "#f4f4f4",
    description: "Default system theme"
  },
  {
    id: "default",
    name: "Carbon Blue",
    primary: "#0f62fe",
    secondary: "#393939", 
    accent: "#8a3ffc",
    background: "#ffffff",
    foreground: "#161616",
    muted: "#f4f4f4",
    description: "Clean and professional default theme"
  },
  {
    id: "forest",
    name: "Forest Green",
    primary: "#198038",
    secondary: "#525252",
    accent: "#ff832b", 
    background: "#f7fdf9",
    foreground: "#161616",
    muted: "#e8f5e8",
    description: "Nature-inspired calming green theme"
  },
  {
    id: "sunset", 
    name: "Sunset Orange",
    primary: "#ff6b35",
    secondary: "#393939",
    accent: "#ffc72c",
    background: "#fffbf7",
    foreground: "#161616", 
    muted: "#ffeee6",
    description: "Warm and energetic orange theme"
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    primary: "#0072ce",
    secondary: "#393939",
    accent: "#00d9ff",
    background: "#f7fcff",
    foreground: "#161616",
    muted: "#e1f3ff",
    description: "Cool and refreshing ocean theme"
  },
  {
    id: "purple",
    name: "Royal Purple", 
    primary: "#6929c4",
    secondary: "#393939",
    accent: "#ff7eb6",
    background: "#faf4ff",
    foreground: "#161616",
    muted: "#f1e8ff",
    description: "Elegant and sophisticated purple theme"
  },
  {
    id: "dark",
    name: "Dark Mode",
    primary: "#78a9ff",
    secondary: "#8d8d8d",
    accent: "#be95ff", 
    background: "#161616",
    foreground: "#ffffff",
    muted: "#262626",
    description: "Easy on the eyes dark theme"
  }
];

interface ThemeCustomizerProps {
  onClose?: () => void;
}

export default function ThemeCustomizer({ onClose }: ThemeCustomizerProps) {
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette>(predefinedPalettes[0]);
  const [customPalettes, setCustomPalettes] = useState<ColorPalette[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved custom palettes from localStorage
    const saved = localStorage.getItem('customThemePalettes');
    if (saved) {
      try {
        setCustomPalettes(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load custom palettes:', error);
      }
    }
    
    // Load current theme
    const currentTheme = localStorage.getItem('currentTheme');
    if (currentTheme) {
      try {
        const theme = JSON.parse(currentTheme);
        setSelectedPalette(theme);
      } catch (error) {
        console.error('Failed to load current theme:', error);
      }
    }
  }, []);

  const generateRandomPalette = (): ColorPalette => {
    // Generate harmonious color palette using color theory
    const hue = Math.floor(Math.random() * 360);
    const saturation = 60 + Math.random() * 30; // 60-90%
    const lightness = 45 + Math.random() * 10; // 45-55%
    
    const primary = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const secondary = `hsl(${(hue + 180) % 360}, ${saturation * 0.6}%, 35%)`;
    const accent = `hsl(${(hue + 60) % 360}, ${saturation * 0.8}%, ${lightness + 10}%)`;
    const background = `hsl(${hue}, ${saturation * 0.1}%, 98%)`;
    const foreground = `hsl(${hue}, ${saturation * 0.2}%, 10%)`;
    const muted = `hsl(${hue}, ${saturation * 0.3}%, 95%)`;

    const names = [
      "Cosmic", "Aurora", "Mystic", "Vibrant", "Harmony", "Zen", "Dynamic", 
      "Elegant", "Modern", "Creative", "Bold", "Serene", "Energetic", "Sophisticated"
    ];
    
    return {
      id: `custom-${Date.now()}`,
      name: `${names[Math.floor(Math.random() * names.length)]} Theme`,
      primary,
      secondary, 
      accent,
      background,
      foreground,
      muted,
      description: "AI-generated color harmony"
    };
  };

  const applyTheme = (palette: ColorPalette) => {
    const root = document.documentElement;
    
    // Convert HSL to RGB for CSS custom properties
    const convertHslToRgb = (hsl: string) => {
      const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (!match) return hsl;
      
      const h = parseInt(match[1]) / 360;
      const s = parseInt(match[2]) / 100;
      const l = parseInt(match[3]) / 100;
      
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      
      return `${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)}`;
    };

    // Apply theme colors as CSS custom properties
    root.style.setProperty('--primary', convertHslToRgb(palette.primary));
    root.style.setProperty('--secondary', convertHslToRgb(palette.secondary));
    root.style.setProperty('--accent', convertHslToRgb(palette.accent));
    root.style.setProperty('--background', convertHslToRgb(palette.background));
    root.style.setProperty('--foreground', convertHslToRgb(palette.foreground));
    root.style.setProperty('--muted', convertHslToRgb(palette.muted));
    
    // Update Carbon design tokens
    root.style.setProperty('--carbon-blue', palette.primary);
    root.style.setProperty('--carbon-gray-100', palette.foreground);
    root.style.setProperty('--carbon-gray-70', palette.secondary);
    root.style.setProperty('--carbon-gray-20', palette.muted);
    root.style.setProperty('--carbon-gray-10', palette.background);
    
    setSelectedPalette(palette);
    localStorage.setItem('currentTheme', JSON.stringify(palette));
    
    toast({
      title: "Theme Applied",
      description: `Successfully applied ${palette.name} theme`,
    });
  };

  const generateNewPalette = () => {
    setIsGenerating(true);
    
    // Simulate AI processing time
    setTimeout(() => {
      const newPalette = generateRandomPalette();
      const updatedCustom = [...customPalettes, newPalette];
      setCustomPalettes(updatedCustom);
      localStorage.setItem('customThemePalettes', JSON.stringify(updatedCustom));
      setIsGenerating(false);
      
      toast({
        title: "New Palette Generated", 
        description: `Created ${newPalette.name} with AI color harmony`,
      });
    }, 1500);
  };

  const deletePalette = (paletteId: string) => {
    const updated = customPalettes.filter(p => p.id !== paletteId);
    setCustomPalettes(updated);
    localStorage.setItem('customThemePalettes', JSON.stringify(updated));
    
    toast({
      title: "Palette Deleted",
      description: "Custom palette removed successfully",
    });
  };

  const exportTheme = () => {
    const themeData = {
      currentTheme: selectedPalette,
      customPalettes: customPalettes
    };
    
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${selectedPalette.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Theme Exported",
      description: "Theme configuration downloaded successfully",
    });
  };

  const importTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const themeData = JSON.parse(e.target?.result as string);
        
        if (themeData.currentTheme) {
          applyTheme(themeData.currentTheme);
        }
        
        if (themeData.customPalettes) {
          const merged = [...customPalettes, ...themeData.customPalettes];
          // Remove duplicates by ID
          const unique = merged.filter((palette, index, self) => 
            index === self.findIndex(p => p.id === palette.id)
          );
          setCustomPalettes(unique);
          localStorage.setItem('customThemePalettes', JSON.stringify(unique));
        }
        
        toast({
          title: "Theme Imported",
          description: "Theme configuration loaded successfully",
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid theme file format",
        });
      }
    };
    reader.readAsText(file);
  };

  const ColorSwatch = ({ color, label }: { color: string; label: string }) => (
    <div className="flex flex-col items-center space-y-1">
      <div 
        className="w-8 h-8 rounded-full border-2 border-gray-200 shadow-sm"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-gray-600 font-medium">{label}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-4">Choose from preset themes or create custom color palettes</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={exportTheme} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <label className="flex-1">
            <Button variant="outline" size="sm" asChild className="w-full">
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={importTheme}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Current Theme Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Theme: {selectedPalette.name}</span>
            <Badge variant="secondary">{selectedPalette.description}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-6 p-4 bg-gray-50 rounded-lg">
            <ColorSwatch color={selectedPalette.primary} label="Primary" />
            <ColorSwatch color={selectedPalette.secondary} label="Secondary" />
            <ColorSwatch color={selectedPalette.accent} label="Accent" />
            <ColorSwatch color={selectedPalette.background} label="Background" />
            <ColorSwatch color={selectedPalette.foreground} label="Text" />
            <ColorSwatch color={selectedPalette.muted} label="Muted" />
          </div>
        </CardContent>
      </Card>

      {/* AI Palette Generator */}
      <Card>
        <CardHeader>
          <CardTitle>AI Palette Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Generate beautiful color palettes using AI-powered color harmony algorithms
            </p>
            <Button 
              onClick={generateNewPalette}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Palette className="w-4 h-4 mr-2" />
                  Generate New Palette
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Predefined Themes */}
      <Card>
        <CardHeader>
          <CardTitle>Predefined Themes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predefinedPalettes.map((palette) => (
              <div
                key={palette.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedPalette.id === palette.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => applyTheme(palette)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{palette.name}</h3>
                  {selectedPalette.id === palette.id && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="flex space-x-2 mb-2">
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: palette.primary }} />
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: palette.secondary }} />
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: palette.accent }} />
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: palette.muted }} />
                </div>
                <p className="text-xs text-gray-600">{palette.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Palettes */}
      {customPalettes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Generated Palettes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customPalettes.map((palette) => (
                <div
                  key={palette.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedPalette.id === palette.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">{palette.name}</h3>
                    <div className="flex items-center space-x-2">
                      {selectedPalette.id === palette.id && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePalette(palette.id);
                        }}
                        className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div 
                    className="flex space-x-2 mb-2"
                    onClick={() => applyTheme(palette)}
                  >
                    <div className="w-4 h-4 rounded border" style={{ backgroundColor: palette.primary }} />
                    <div className="w-4 h-4 rounded border" style={{ backgroundColor: palette.secondary }} />
                    <div className="w-4 h-4 rounded border" style={{ backgroundColor: palette.accent }} />
                    <div className="w-4 h-4 rounded border" style={{ backgroundColor: palette.muted }} />
                  </div>
                  <p className="text-xs text-gray-600">{palette.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}