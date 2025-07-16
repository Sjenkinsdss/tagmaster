import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress source map console errors in development
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    // Filter out source map errors from @jridgewell/trace-mapping
    const message = args[0]?.toString() || '';
    if (message.includes('sourceMappingURL') || 
        message.includes('source map') || 
        message.includes('DevTools failed to load source map') ||
        message.includes('trace-mapping')) {
      return;
    }
    originalError.apply(console, args);
  };
  
  console.warn = (...args) => {
    // Filter out source map warnings too
    const message = args[0]?.toString() || '';
    if (message.includes('sourceMappingURL') || 
        message.includes('source map') || 
        message.includes('DevTools failed to load source map') ||
        message.includes('trace-mapping')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
