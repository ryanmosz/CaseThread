# Task 6.0.4.1: Implement PDF Viewer Component

## Overview
This task implements an integrated PDF viewer component to replace the current temporary solution of opening PDFs in a new window, providing a seamless viewing experience within the application.

## Current State Analysis

### Current Implementation
- PDF opens in new browser window
- No integrated viewer
- No PDF navigation controls
- Cannot switch between text and PDF views

### Requirements
1. Embedded PDF viewer in the application
2. Navigation controls (zoom, page navigation)
3. Search functionality within PDF
4. Print and export capabilities
5. Responsive sizing

## Implementation Plan

### 1. Install PDF.js React Wrapper (Priority: High)

**Terminal**: Install dependencies

```bash
npm install pdfjs-dist@3.11.174 react-pdf@7.7.0
npm install --save-dev @types/pdfjs-dist
```

### 2. Create PDF Viewer Component (Priority: High)

**File**: Create `src/electron/renderer/src/components/PDFViewer.tsx`

```typescript
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Printer,
  ChevronLeft,
  ChevronRight,
  Search,
  Maximize,
  Minimize
} from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  url: string;
  onScroll?: (scrollTop: number) => void;
  scrollPosition?: number;
  zoomLevel?: number;
  searchQuery?: string;
  onPageChange?: (page: number) => void;
  onError?: (error: Error) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  url,
  onScroll,
  scrollPosition = 0,
  zoomLevel = 100,
  searchQuery = '',
  onPageChange,
  onError,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(zoomLevel / 100);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>(searchQuery);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<any>(null);
  
  // Handle document load success
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    console.log('PDF loaded with', numPages, 'pages');
  };
  
  // Handle document load error
  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    if (onError) {
      onError(error);
    }
  };
  
  // Zoom controls
  const zoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 3));
  };
  
  const zoomOut = () => {
    setScale(prev => Math.max(prev * 0.8, 0.5));
  };
  
  const resetZoom = () => {
    setScale(1);
  };
  
  const fitToWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 40; // Padding
      setScale(containerWidth / 612); // Standard PDF width
    }
  };
  
  // Page navigation
  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, numPages));
  };
  
  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, numPages));
    setCurrentPage(validPage);
    if (onPageChange) {
      onPageChange(validPage);
    }
  };
  
  // Rotation
  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };
  
  // Search functionality
  const handleSearch = useCallback(async (text: string) => {
    if (!text || !documentRef.current) {
      setSearchResults([]);
      return;
    }
    
    const results: any[] = [];
    
    // Search through all pages
    for (let i = 1; i <= numPages; i++) {
      const page = await documentRef.current.getPage(i);
      const textContent = await page.getTextContent();
      
      // Search in text items
      textContent.items.forEach((item: any) => {
        if (item.str.toLowerCase().includes(text.toLowerCase())) {
          results.push({
            page: i,
            text: item.str,
            position: item.transform,
          });
        }
      });
    }
    
    setSearchResults(results);
    
    // Go to first result
    if (results.length > 0) {
      goToPage(results[0].page);
    }
  }, [numPages]);
  
  // Handle search input
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch(searchText);
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [searchText, handleSearch]);
  
  // Print functionality
  const handlePrint = () => {
    window.print();
  };
  
  // Download functionality
  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `document-${Date.now()}.pdf`;
      link.click();
      
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };
  
  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (onScroll) {
      onScroll(e.currentTarget.scrollTop);
    }
  };
  
  // Restore scroll position
  useEffect(() => {
    if (containerRef.current && scrollPosition) {
      containerRef.current.scrollTop = scrollPosition;
    }
  }, [scrollPosition]);

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-white border-b shadow-sm">
        {/* Left controls */}
        <div className="flex items-center gap-2">
          {/* Page navigation */}
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-12 px-2 py-1 text-center border rounded"
              min={1}
              max={numPages}
            />
            <span className="text-sm text-gray-600">/ {numPages}</span>
          </div>
          
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-2" />
          
          {/* Zoom controls */}
          <button
            onClick={zoomOut}
            className="p-2 rounded hover:bg-gray-100"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <select
            value={Math.round(scale * 100)}
            onChange={(e) => setScale(parseInt(e.target.value) / 100)}
            className="px-2 py-1 border rounded"
          >
            <option value="50">50%</option>
            <option value="75">75%</option>
            <option value="100">100%</option>
            <option value="125">125%</option>
            <option value="150">150%</option>
            <option value="200">200%</option>
          </select>
          
          <button
            onClick={zoomIn}
            className="p-2 rounded hover:bg-gray-100"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <button
            onClick={fitToWidth}
            className="px-2 py-1 text-sm rounded hover:bg-gray-100"
            title="Fit to width"
          >
            Fit
          </button>
        </div>
        
        {/* Center controls - Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search PDF..."
              className="pl-8 pr-4 py-1 border rounded-md"
            />
            {searchResults.length > 0 && (
              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                {searchResults.length} results
              </span>
            )}
          </div>
        </div>
        
        {/* Right controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={rotate}
            className="p-2 rounded hover:bg-gray-100"
            title="Rotate"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-2" />
          
          <button
              onClick={handlePrint}
            className="p-2 rounded hover:bg-gray-100"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleDownload}
            className="p-2 rounded hover:bg-gray-100"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
              onClick={toggleFullscreen}
            className="p-2 rounded hover:bg-gray-100"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
                {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      
      {/* PDF Document */}
      <div 
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        <div className="flex justify-center p-4">
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            ref={documentRef}
            className="shadow-lg"
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              rotate={rotation}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="border bg-white"
            />
          </Document>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-50 border-t text-xs text-gray-600">
        <span>Page {currentPage} of {numPages}</span>
        <span>{Math.round(scale * 100)}%</span>
      </div>
    </div>
  );
};
```

### 3. Create Optimized PDF Page Renderer (Priority: Medium)

**File**: Create `src/electron/renderer/src/components/PDFPageRenderer.tsx`

```typescript
import React, { memo } from 'react';
import { Page } from 'react-pdf';

interface PDFPageRendererProps {
  pageNumber: number;
  scale: number;
  rotate: number;
  width?: number;
  onRenderSuccess?: () => void;
  isVisible: boolean;
}

export const PDFPageRenderer = memo<PDFPageRendererProps>(({
  pageNumber,
  scale,
  rotate,
  width,
  onRenderSuccess,
  isVisible,
}) => {
  // Only render if visible (virtualization)
  if (!isVisible) {
    return (
      <div 
        style={{ 
          height: (width || 612) * 1.5 * scale,
          backgroundColor: '#f3f4f6',
        }}
        className="flex items-center justify-center"
      >
        <span className="text-gray-500">Page {pageNumber}</span>
      </div>
    );
  }
  
  return (
    <Page
      pageNumber={pageNumber}
      scale={scale}
      rotate={rotate}
      width={width}
      renderTextLayer={true}
      renderAnnotationLayer={true}
      onRenderSuccess={onRenderSuccess}
      loading={
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
      error={
        <div className="flex items-center justify-center h-96 text-red-600">
          Failed to load page {pageNumber}
        </div>
      }
      className="shadow-md"
    />
  );
});

PDFPageRenderer.displayName = 'PDFPageRenderer';
```

### 4. Create Multi-Page PDF Viewer (Priority: Low)

**File**: Create `src/electron/renderer/src/components/PDFMultiPageViewer.tsx`

```typescript
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Document } from 'react-pdf';
import { PDFPageRenderer } from './PDFPageRenderer';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface PDFMultiPageViewerProps {
  url: string;
  scale: number;
  rotate: number;
  onPageChange?: (page: number) => void;
}

export const PDFMultiPageViewer: React.FC<PDFMultiPageViewerProps> = ({
  url,
  scale,
  rotate,
  onPageChange,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  
  // Intersection observer for virtualization
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const newVisiblePages = new Set<number>();
    
    entries.forEach(entry => {
      const pageNumber = parseInt(entry.target.getAttribute('data-page') || '0');
      if (entry.isIntersecting) {
        newVisiblePages.add(pageNumber);
        
        // Preload adjacent pages
        if (pageNumber > 1) newVisiblePages.add(pageNumber - 1);
        if (pageNumber < numPages) newVisiblePages.add(pageNumber + 1);
      }
    });
    
    setVisiblePages(newVisiblePages);
    
    // Notify current page change
    if (newVisiblePages.size > 0 && onPageChange) {
      const currentPage = Math.min(...Array.from(newVisiblePages));
      onPageChange(currentPage);
    }
  }, [numPages, onPageChange]);
  
  useIntersectionObserver(
    Array.from(pageRefs.current.values()),
    handleIntersection,
    {
      root: containerRef.current,
      rootMargin: '100px',
      threshold: 0.1,
    }
  );
  
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };
  
  const setPageRef = (pageNumber: number, ref: HTMLDivElement | null) => {
    if (ref) {
      pageRefs.current.set(pageNumber, ref);
    } else {
      pageRefs.current.delete(pageNumber);
    }
  };
  
  return (
    <div ref={containerRef} className="h-full overflow-auto bg-gray-100">
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        className="flex flex-col items-center py-4 gap-4"
      >
        {Array.from({ length: numPages }, (_, index) => {
          const pageNumber = index + 1;
          const isVisible = visiblePages.has(pageNumber);
          
          return (
            <div
              key={pageNumber}
              ref={(ref) => setPageRef(pageNumber, ref)}
              data-page={pageNumber}
              className="bg-white"
            >
              <PDFPageRenderer
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotate}
                isVisible={isVisible}
              />
            </div>
          );
        })}
      </Document>
    </div>
  );
};
```

### 5. Update Enhanced Document Viewer Integration (Priority: High)

**File**: Update `src/electron/renderer/src/components/EnhancedDocumentViewer.tsx`

```typescript
import { PDFViewer } from './PDFViewer';
import { usePDFBuffer } from '../hooks/usePDFBuffer';

// In the render method, replace the temporary PDF window.open with:
case 'pdf':
  return (
    <ViewTransition viewKey="pdf">
      {blobUrl ? (
        <PDFViewer
          url={blobUrl}
          onScroll={handlePDFScroll}
          scrollPosition={pdfViewState.scrollPosition}
          zoomLevel={pdfViewState.zoomLevel}
          searchQuery={pdfViewState.searchQuery}
          onPageChange={(page) => {
            updatePDFViewState({ currentPage: page });
          }}
          onError={(error) => {
            console.error('PDF viewer error:', error);
            toast.error('Failed to display PDF');
          }}
  />
) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileImage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Generate PDF to view</p>
            <button
              onClick={handleGeneratePDF}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Generate PDF
            </button>
          </div>
        </div>
      )}
    </ViewTransition>
  );
```

### 6. Create Intersection Observer Hook (Priority: Low)

**File**: Create `src/electron/renderer/src/hooks/useIntersectionObserver.ts`

```typescript
import { useEffect, useRef } from 'react';

export const useIntersectionObserver = (
  elements: Element[],
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) => {
  const observer = useRef<IntersectionObserver | null>(null);
  
  useEffect(() => {
    if (observer.current) {
      observer.current.disconnect();
    }
    
    observer.current = new IntersectionObserver(callback, options);
    
    elements.forEach(element => {
      if (element && observer.current) {
        observer.current.observe(element);
      }
    });
    
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [elements, callback, options]);
};
```

## Testing Requirements

### Unit Tests

```typescript
describe('PDFViewer', () => {
  it('should load PDF and display page count', async () => {
    const { getByText } = render(
      <PDFViewer url="test.pdf" />
    );
    
    await waitFor(() => {
      expect(getByText(/Page 1 of/)).toBeInTheDocument();
    });
  });
  
  it('should handle zoom controls', async () => {
    const { getByTitle, getByText } = render(
      <PDFViewer url="test.pdf" zoomLevel={100} />
    );
    
    const zoomInButton = getByTitle('Zoom in');
    fireEvent.click(zoomInButton);
    
    await waitFor(() => {
      expect(getByText('120%')).toBeInTheDocument();
    });
  });
  
  it('should navigate between pages', async () => {
    const onPageChange = jest.fn();
    const { getByTitle } = render(
      <PDFViewer url="test.pdf" onPageChange={onPageChange} />
    );
    
    await waitFor(() => {
      const nextButton = getByTitle('Next page');
      fireEvent.click(nextButton);
    });
    
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
```

### Integration Tests

```typescript
describe('PDF Viewer Integration', () => {
  it('should integrate with buffer management', async () => {
    // Generate PDF
    // Switch to PDF view
    // Verify PDF displays
    // Verify blob URL is managed properly
  });
  
  it('should handle search across pages', async () => {
    // Load multi-page PDF
    // Search for text
    // Verify navigation to results
    // Verify highlighting
  });
});
```

## Implementation Checklist

- [ ] Install PDF.js dependencies
- [ ] Create base PDF viewer component
- [ ] Add navigation controls
- [ ] Implement zoom functionality
- [ ] Add search capability
- [ ] Create multi-page viewer
- [ ] Add print/download features
- [ ] Integrate with document viewer
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation

## Dependencies

- Task 6.0.3.1 (PDF generation) must be complete
- Task 6.0.6.1 (PDF buffer state) must be complete
- Task 6.0.6.2 (View mode transitions) must be complete

## Estimated Time

- Implementation: 5-6 hours
- Testing: 2-3 hours
- Total: 7-9 hours

## Notes

- Consider lazy loading for large PDFs
- Add thumbnail navigation for multi-page documents
- Consider adding annotation capabilities
- Add support for PDF forms
- Consider implementing text selection and copying
- Monitor memory usage with large PDFs