# Task 6.0.4.3 - Add PDF Navigation Controls

## Overview
Implement navigation controls for the PDF viewer including zoom controls, page navigation for multi-page documents, and view options. This enhances the PDF viewing experience by providing standard PDF reader controls.

## Requirements

### Functional Requirements
1. Add zoom in/out controls with preset levels
2. Add fit-to-width and fit-to-page options  
3. Display current page and total pages
4. Add page navigation (previous/next/go to)
5. Support keyboard shortcuts for navigation
6. Add rotation controls (90° increments)
7. Remember zoom/view preferences

### Technical Requirements
1. Interface with iframe content when possible
2. Fallback controls for cross-origin restrictions
3. Implement zoom via CSS transforms
4. Handle multi-page PDF navigation
5. Persist view preferences in local storage

## Implementation Details

### 1. Create PDF Controls Component

Navigation controls toolbar:

```typescript
// src/electron/renderer/src/components/PDFControls.tsx
import React, { useState, useEffect } from 'react';
import {
  Button,
  ButtonGroup,
  Input,
  Select,
  SelectItem,
  Tooltip,
  Divider
} from '@heroui/react';

interface PDFControlsProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  rotation: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onRotationChange: (rotation: number) => void;
  onFitToWidth: () => void;
  onFitToPage: () => void;
}

const ZOOM_LEVELS = [
  { value: 0.5, label: '50%' },
  { value: 0.75, label: '75%' },
  { value: 1, label: '100%' },
  { value: 1.25, label: '125%' },
  { value: 1.5, label: '150%' },
  { value: 2, label: '200%' },
  { value: 3, label: '300%' }
];

export const PDFControls: React.FC<PDFControlsProps> = ({
  currentPage,
  totalPages,
  zoom,
  rotation,
  onPageChange,
  onZoomChange,
  onRotationChange,
  onFitToWidth,
  onFitToPage
}) => {
  const [pageInput, setPageInput] = useState(currentPage.toString());

  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  const handlePageInputChange = (value: string) => {
    setPageInput(value);
  };

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 5);
    onZoomChange(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom * 0.8, 0.1);
    onZoomChange(newZoom);
  };

  const handleRotateLeft = () => {
    onRotationChange((rotation - 90 + 360) % 360);
  };

  const handleRotateRight = () => {
    onRotationChange((rotation + 90) % 360);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-background/50">
      {/* Page Navigation */}
      <ButtonGroup size="sm">
        <Tooltip content="Previous Page (←)">
          <Button
            variant="flat"
            isIconOnly
            onClick={handlePreviousPage}
            isDisabled={currentPage <= 1}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
        </Tooltip>

        <div className="flex items-center gap-1 px-2">
          <Input
            size="sm"
            value={pageInput}
            onChange={(e) => handlePageInputChange(e.target.value)}
            onBlur={handlePageInputSubmit}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePageInputSubmit();
              }
            }}
            className="w-12 text-center"
            classNames={{
              input: "text-center"
            }}
          />
          <span className="text-sm text-foreground/60">/ {totalPages}</span>
        </div>

        <Tooltip content="Next Page (→)">
          <Button
            variant="flat"
            isIconOnly
            onClick={handleNextPage}
            isDisabled={currentPage >= totalPages}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </Tooltip>
      </ButtonGroup>

      <Divider orientation="vertical" className="h-6" />

      {/* Zoom Controls */}
      <ButtonGroup size="sm">
        <Tooltip content="Zoom Out (-)">
          <Button
            variant="flat"
            isIconOnly
            onClick={handleZoomOut}
            isDisabled={zoom <= 0.1}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </Button>
        </Tooltip>

        <Select
          size="sm"
          value={zoom.toString()}
          onChange={(e) => onZoomChange(parseFloat(e.target.value))}
          className="w-24"
          aria-label="Zoom level"
        >
          {ZOOM_LEVELS.map((level) => (
            <SelectItem key={level.value} value={level.value.toString()}>
              {level.label}
            </SelectItem>
          ))}
        </Select>

        <Tooltip content="Zoom In (+)">
          <Button
            variant="flat"
            isIconOnly
            onClick={handleZoomIn}
            isDisabled={zoom >= 5}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup size="sm">
        <Tooltip content="Fit to Width">
          <Button
            variant="flat"
            isIconOnly
            onClick={onFitToWidth}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </Button>
        </Tooltip>

        <Tooltip content="Fit to Page">
          <Button
            variant="flat"
            isIconOnly
            onClick={onFitToPage}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </Button>
        </Tooltip>
      </ButtonGroup>

      <Divider orientation="vertical" className="h-6" />

      {/* Rotation Controls */}
      <ButtonGroup size="sm">
        <Tooltip content="Rotate Left">
          <Button
            variant="flat"
            isIconOnly
            onClick={handleRotateLeft}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </Tooltip>

        <Tooltip content="Rotate Right">
          <Button
            variant="flat"
            isIconOnly
            onClick={handleRotateRight}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </Tooltip>
      </ButtonGroup>
    </div>
  );
};
```

### 2. Create Enhanced PDF Viewer

PDF viewer with transform controls:

```typescript
// Update PDFViewer.tsx
import { PDFControls } from './PDFControls';

interface PDFViewerProps {
  pdfUrl: string | null;
  onError?: (error: string) => void;
  className?: string;
  showControls?: boolean;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfUrl,
  onError,
  className = '',
  showControls = true
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load view preferences
  useEffect(() => {
    const savedPrefs = localStorage.getItem('pdfViewPrefs');
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      setZoom(prefs.zoom || 1);
    }
  }, []);

  // Save view preferences
  useEffect(() => {
    localStorage.setItem('pdfViewPrefs', JSON.stringify({ zoom }));
  }, [zoom]);

  // Apply transforms to iframe
  useEffect(() => {
    if (iframeRef.current) {
      const transform = `scale(${zoom}) rotate(${rotation}deg)`;
      iframeRef.current.style.transform = transform;
      iframeRef.current.style.transformOrigin = 'center center';
    }
  }, [zoom, rotation]);

  const handleFitToWidth = () => {
    if (containerRef.current && iframeRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const iframeWidth = iframeRef.current.clientWidth;
      const newZoom = containerWidth / iframeWidth;
      setZoom(newZoom);
    }
  };

  const handleFitToPage = () => {
    if (containerRef.current && iframeRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const iframeWidth = iframeRef.current.clientWidth;
      const iframeHeight = iframeRef.current.clientHeight;
      
      const widthRatio = containerWidth / iframeWidth;
      const heightRatio = containerHeight / iframeHeight;
      const newZoom = Math.min(widthRatio, heightRatio) * 0.9;
      setZoom(newZoom);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!pdfUrl) return;

      switch (e.key) {
        case 'ArrowLeft':
          setCurrentPage(prev => Math.max(1, prev - 1));
          break;
        case 'ArrowRight':
          setCurrentPage(prev => Math.min(totalPages, prev + 1));
          break;
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(prev => Math.min(5, prev * 1.2));
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(prev => Math.max(0.1, prev * 0.8));
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(1);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdfUrl, totalPages]);

  // Existing PDF display logic...

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {showControls && pdfUrl && (
        <PDFControls
          currentPage={currentPage}
          totalPages={totalPages}
          zoom={zoom}
          rotation={rotation}
          onPageChange={setCurrentPage}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onFitToWidth={handleFitToWidth}
          onFitToPage={handleFitToPage}
        />
      )}
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Existing iframe/content rendering with transforms */}
        <div style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            className="border-0"
            style={{
              width: '100%',
              height: '100%',
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center'
            }}
            title="PDF Document Viewer"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      </div>
    </div>
  );
};
```

### 3. Add Touch Gesture Support

Support for pinch zoom and swipe:

```typescript
// src/electron/renderer/src/hooks/usePDFGestures.ts
import { useEffect, useRef } from 'react';

interface UsePDFGesturesProps {
  onZoom: (delta: number) => void;
  onPan: (deltaX: number, deltaY: number) => void;
  onSwipe: (direction: 'left' | 'right') => void;
}

export const usePDFGestures = (
  elementRef: React.RefObject<HTMLElement>,
  { onZoom, onPan, onSwipe }: UsePDFGesturesProps
) => {
  const touchesRef = useRef<Touch[]>([]);
  const lastDistanceRef = useRef<number>(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchesRef.current = Array.from(e.touches);
      
      if (e.touches.length === 2) {
        const distance = getTouchDistance(e.touches[0], e.touches[1]);
        lastDistanceRef.current = distance;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      
      if (e.touches.length === 2) {
        // Pinch zoom
        const distance = getTouchDistance(e.touches[0], e.touches[1]);
        const delta = distance - lastDistanceRef.current;
        
        if (Math.abs(delta) > 5) {
          onZoom(delta > 0 ? 0.02 : -0.02);
          lastDistanceRef.current = distance;
        }
      } else if (e.touches.length === 1) {
        // Pan
        const touch = e.touches[0];
        const lastTouch = touchesRef.current[0];
        
        if (lastTouch) {
          const deltaX = touch.clientX - lastTouch.clientX;
          const deltaY = touch.clientY - lastTouch.clientY;
          onPan(deltaX, deltaY);
        }
        
        touchesRef.current = [touch];
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Detect swipe
      if (touchesRef.current.length === 1 && e.changedTouches.length === 1) {
        const startTouch = touchesRef.current[0];
        const endTouch = e.changedTouches[0];
        const deltaX = endTouch.clientX - startTouch.clientX;
        
        if (Math.abs(deltaX) > 100) {
          onSwipe(deltaX > 0 ? 'right' : 'left');
        }
      }
      
      touchesRef.current = [];
    };

    const getTouchDistance = (touch1: Touch, touch2: Touch) => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onZoom, onPan, onSwipe]);
};
```

## Testing Approach

1. **Unit Tests**
   - Test zoom calculations
   - Test page navigation logic
   - Test rotation transforms
   - Test keyboard shortcuts

2. **Integration Tests**
   - Test controls with actual PDF
   - Test view persistence
   - Test gesture support
   - Test responsive behavior

3. **Manual Testing**
   - Test all zoom levels
   - Test multi-page navigation
   - Test rotation at different zooms
   - Test keyboard shortcuts
   - Test touch gestures on touch devices

## Success Criteria

✅ Zoom controls work smoothly
✅ Page navigation accurate
✅ Rotation works at all angles
✅ Keyboard shortcuts functional
✅ View preferences persist
✅ Fit-to-width/page accurate
✅ Touch gestures responsive
✅ Performance remains smooth

## Notes

- Consider adding thumbnail navigation
- May want to add search functionality
- Could add annotation tools
- Consider adding bookmarks
- May need PDF.js for advanced features