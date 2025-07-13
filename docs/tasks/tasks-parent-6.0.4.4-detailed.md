# Task 6.0.4.4 - Implement Responsive PDF Sizing

## Overview
Implement responsive sizing for the PDF viewer that adapts to different screen sizes, window resizing, and layout changes. This ensures the PDF viewer provides an optimal viewing experience across all devices and window configurations.

## Requirements

### Functional Requirements
1. Auto-resize PDF viewer on window resize
2. Maintain aspect ratio during resize
3. Adjust zoom level for different screen sizes
4. Handle split-pane resize in the GUI
5. Support portrait and landscape orientations
6. Provide optimal initial zoom based on viewport
7. Handle container size changes smoothly

### Technical Requirements
1. Use ResizeObserver API for container monitoring
2. Calculate optimal zoom levels dynamically
3. Debounce resize calculations
4. Maintain scroll position during resize
5. Handle CSS media queries for breakpoints

## Implementation Details

### 1. Create Responsive PDF Container

Container component with resize handling:

```typescript
// src/electron/renderer/src/components/ResponsivePDFContainer.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFViewer } from './PDFViewer';
import { debounce } from 'lodash';

interface ResponsivePDFContainerProps {
  pdfUrl: string | null;
  onSizeChange?: (width: number, height: number) => void;
  minWidth?: number;
  minHeight?: number;
  maintainAspectRatio?: boolean;
}

export const ResponsivePDFContainer: React.FC<ResponsivePDFContainerProps> = ({
  pdfUrl,
  onSizeChange,
  minWidth = 400,
  minHeight = 500,
  maintainAspectRatio = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [optimalZoom, setOptimalZoom] = useState(1);
  const [isResizing, setIsResizing] = useState(false);

  // Calculate optimal zoom based on container size
  const calculateOptimalZoom = useCallback((width: number, height: number) => {
    // Standard PDF page dimensions (US Letter in points)
    const PDF_WIDTH = 612;
    const PDF_HEIGHT = 792;
    
    // Calculate zoom to fit width
    const widthZoom = (width * 0.9) / PDF_WIDTH;
    
    // Calculate zoom to fit height
    const heightZoom = (height * 0.9) / PDF_HEIGHT;
    
    // Use the smaller zoom to ensure full page fits
    const fitPageZoom = Math.min(widthZoom, heightZoom);
    
    // Determine optimal zoom based on viewport
    if (width < 768) {
      // Mobile: Fit to width
      return widthZoom;
    } else if (width < 1024) {
      // Tablet: Fit to page
      return fitPageZoom;
    } else {
      // Desktop: Default to 100% or fit to width if too small
      return Math.max(Math.min(widthZoom, 1), 0.75);
    }
  }, []);

  // Handle resize with debouncing
  const handleResize = useCallback(
    debounce((entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        // Apply minimum dimensions
        const actualWidth = Math.max(width, minWidth);
        const actualHeight = Math.max(height, minHeight);
        
        setDimensions({ width: actualWidth, height: actualHeight });
        
        // Calculate optimal zoom
        const zoom = calculateOptimalZoom(actualWidth, actualHeight);
        setOptimalZoom(zoom);
        
        // Notify parent of size change
        onSizeChange?.(actualWidth, actualHeight);
        
        // Clear resizing flag after animation
        setTimeout(() => setIsResizing(false), 300);
      }
    }, 150),
    [minWidth, minHeight, calculateOptimalZoom, onSizeChange]
  );

  // Set up ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      setIsResizing(true);
      handleResize(entries);
    });

    resizeObserver.observe(container);

    // Initial size calculation
    const rect = container.getBoundingClientRect();
    handleResize([{
      contentRect: rect,
      target: container,
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: []
    }] as ResizeObserverEntry[]);

    return () => {
      resizeObserver.disconnect();
    };
  }, [handleResize]);

  // Viewport size classes for responsive behavior
  const getSizeClass = () => {
    if (dimensions.width < 640) return 'pdf-container-sm';
    if (dimensions.width < 768) return 'pdf-container-md';
    if (dimensions.width < 1024) return 'pdf-container-lg';
    if (dimensions.width < 1280) return 'pdf-container-xl';
    return 'pdf-container-2xl';
  };

  return (
    <div
      ref={containerRef}
      className={`
        relative h-full w-full overflow-hidden
        ${getSizeClass()}
        ${isResizing ? 'pdf-resizing' : ''}
      `}
      style={{
        minWidth: `${minWidth}px`,
        minHeight: `${minHeight}px`
      }}
    >
      <PDFViewer
        pdfUrl={pdfUrl}
        initialZoom={optimalZoom}
        containerDimensions={dimensions}
        className="h-full w-full"
      />
      
      {/* Resize indicator */}
      {isResizing && (
        <div className="absolute top-2 right-2 text-xs bg-background/80 px-2 py-1 rounded">
          {dimensions.width} × {dimensions.height}
        </div>
      )}
    </div>
  );
};
```

### 2. Create useViewportSize Hook

Hook for tracking viewport dimensions:

```typescript
// src/electron/renderer/src/hooks/useViewportSize.ts
import { useState, useEffect } from 'react';

interface ViewportSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
}

export const useViewportSize = (): ViewportSize => {
  const [size, setSize] = useState<ViewportSize>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 640,
    isTablet: window.innerWidth >= 640 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  }));

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setSize({
        width,
        height,
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
        orientation: width > height ? 'landscape' : 'portrait'
      });
    };

    // Debounce resize events
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return size;
};
```

### 3. Update PDFViewer for Responsive Behavior

Enhance PDFViewer with responsive features:

```typescript
// Update PDFViewer.tsx
interface PDFViewerProps {
  pdfUrl: string | null;
  initialZoom?: number;
  containerDimensions?: { width: number; height: number };
  onError?: (error: string) => void;
  className?: string;
  showControls?: boolean;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfUrl,
  initialZoom = 1,
  containerDimensions,
  // ... other props
}) => {
  const viewport = useViewportSize();
  const [zoom, setZoom] = useState(initialZoom);
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  // Update zoom when initial zoom changes
  useEffect(() => {
    setZoom(initialZoom);
  }, [initialZoom]);

  // Preserve scroll position during resize
  const preserveScrollPosition = useCallback(() => {
    if (iframeRef.current) {
      const scrollContainer = iframeRef.current.parentElement;
      if (scrollContainer) {
        const scrollRatioX = scrollContainer.scrollLeft / scrollContainer.scrollWidth;
        const scrollRatioY = scrollContainer.scrollTop / scrollContainer.scrollHeight;
        setScrollPosition({ x: scrollRatioX, y: scrollRatioY });
      }
    }
  }, []);

  // Restore scroll position after resize
  useEffect(() => {
    if (containerDimensions && iframeRef.current) {
      const scrollContainer = iframeRef.current.parentElement;
      if (scrollContainer && (scrollPosition.x > 0 || scrollPosition.y > 0)) {
        scrollContainer.scrollLeft = scrollPosition.x * scrollContainer.scrollWidth;
        scrollContainer.scrollTop = scrollPosition.y * scrollContainer.scrollHeight;
      }
    }
  }, [containerDimensions, scrollPosition]);

  // Responsive control visibility
  const shouldShowControls = showControls && !viewport.isMobile;
  
  // Adjust control layout for tablets
  const controlsLayout = viewport.isTablet ? 'compact' : 'full';

  return (
    <div className={`pdf-viewer-responsive ${className}`}>
      {shouldShowControls && (
        <PDFControls
          layout={controlsLayout}
          // ... other props
        />
      )}
      
      {/* Mobile controls overlay */}
      {viewport.isMobile && pdfUrl && (
        <MobilePDFControls
          zoom={zoom}
          onZoomChange={setZoom}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
      
      {/* PDF content with responsive styles */}
      <div 
        className={`
          pdf-content
          ${viewport.isMobile ? 'pdf-mobile' : ''}
          ${viewport.isTablet ? 'pdf-tablet' : ''}
          ${viewport.isDesktop ? 'pdf-desktop' : ''}
        `}
      >
        {/* Existing PDF iframe/content */}
      </div>
    </div>
  );
};
```

### 4. Add Responsive Styles

CSS for responsive behavior:

```css
/* src/electron/renderer/src/styles/pdf-viewer.css */

/* Container size classes */
.pdf-container-sm {
  @apply text-xs;
}

.pdf-container-md {
  @apply text-sm;
}

.pdf-container-lg {
  @apply text-base;
}

/* Resizing animation */
.pdf-resizing {
  @apply transition-all duration-300 ease-in-out;
}

/* Mobile-specific styles */
.pdf-mobile {
  @apply p-0;
}

.pdf-mobile .pdf-controls {
  @apply fixed bottom-0 left-0 right-0 bg-background/95 shadow-lg;
}

/* Tablet-specific styles */
.pdf-tablet {
  @apply p-2;
}

.pdf-tablet .pdf-controls-compact {
  @apply flex-wrap;
}

/* Desktop-specific styles */
.pdf-desktop {
  @apply p-4;
}

/* Responsive iframe scaling */
@media (max-width: 640px) {
  .pdf-viewer-iframe {
    min-width: 100vw;
    transform-origin: top left;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .pdf-viewer-iframe {
    min-width: calc(100vw - 2rem);
  }
}

/* Print styles */
@media print {
  .pdf-controls,
  .pdf-resizing-indicator {
    display: none !important;
  }
  
  .pdf-viewer-iframe {
    transform: none !important;
    width: 100% !important;
    height: auto !important;
  }
}
```

### 5. Mobile PDF Controls Component

Simplified controls for mobile:

```typescript
// src/electron/renderer/src/components/MobilePDFControls.tsx
const MobilePDFControls: React.FC<MobilePDFControlsProps> = ({
  zoom,
  onZoomChange,
  currentPage,
  totalPages,
  onPageChange
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 border-t p-2 safe-area-inset-bottom">
      <div className="flex items-center justify-between">
        {/* Page controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            isIconOnly
            onClick={() => onPageChange(currentPage - 1)}
            isDisabled={currentPage <= 1}
          >
            ←
          </Button>
          <span className="text-xs">
            {currentPage} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="flat"
            isIconOnly
            onClick={() => onPageChange(currentPage + 1)}
            isDisabled={currentPage >= totalPages}
          >
            →
          </Button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            onClick={() => onZoomChange(Math.max(0.5, zoom - 0.25))}
          >
            −
          </Button>
          <span className="text-xs w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="sm"
            variant="flat"
            onClick={() => onZoomChange(Math.min(3, zoom + 0.25))}
          >
            +
          </Button>
        </div>
      </div>
    </div>
  );
};
```

## Testing Approach

1. **Unit Tests**
   - Test zoom calculations for different viewports
   - Test resize observer behavior
   - Test responsive breakpoints
   - Test scroll position preservation

2. **Integration Tests**
   - Test with actual window resizing
   - Test orientation changes
   - Test split-pane resizing
   - Test mobile/tablet/desktop modes

3. **Manual Testing**
   - Test on various screen sizes
   - Test browser zoom levels
   - Test with different PDF sizes
   - Test performance during resize
   - Test on actual mobile devices

## Success Criteria

✅ PDF resizes smoothly with window
✅ Optimal zoom calculated correctly
✅ Scroll position preserved
✅ Mobile controls work well
✅ Tablet layout optimized
✅ Desktop experience unchanged
✅ No performance degradation
✅ Orientation changes handled

## Notes

- Consider adding viewport-based presets
- May want pinch-to-zoom on mobile
- Could add responsive thumbnails
- Consider lazy loading for performance
- Monitor memory usage during resizes