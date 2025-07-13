import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  Button,
  ButtonGroup,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Input,
  Card,
  CardBody,
  Spinner
} from '@heroui/react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker for react-pdf v7
// Try to use the ESM worker first, fallback to minified version
try {
  // For Vite, use dynamic import URL
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url,
  ).toString();
} catch (e) {
  // Fallback to public directory
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

interface PDFViewerProps {
  url: string;
  onClose?: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ url, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [error, setError] = useState<string>('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  
  // Log the blob URL when component mounts or URL changes
  useEffect(() => {
    console.log('[PDFViewer] Component mounted with URL:', url);
    console.log('[PDFViewer] URL type:', typeof url);
    console.log('[PDFViewer] URL starts with blob:', url?.startsWith('blob:'));
  }, [url]);
  
  // Handle document load success
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    console.log('PDF loaded with', numPages, 'pages');
  };
  
  // Handle document load error
  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError(error.message);
  };
  
  // Calculate page width based on container
  useEffect(() => {
    const updatePageWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Leave some padding
        setPageWidth(containerWidth - 80);
      }
    };
    
    updatePageWidth();
    window.addEventListener('resize', updatePageWidth);
    
    return () => {
      window.removeEventListener('resize', updatePageWidth);
    };
  }, []);
  
  // Zoom controls
  const zoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 3));
  };
  
  const zoomOut = () => {
    setScale(prev => Math.max(prev * 0.8, 0.5));
  };
  
  const fitToWidth = () => {
    setScale(1);
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
  };
  
  // Rotation
  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };
  
  // Zoom options
  const zoomOptions = [
    { key: '50', label: '50%', value: 0.5 },
    { key: '75', label: '75%', value: 0.75 },
    { key: '100', label: '100%', value: 1 },
    { key: '125', label: '125%', value: 1.25 },
    { key: '150', label: '150%', value: 1.5 },
    { key: '200', label: '200%', value: 2 }
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPreviousPage();
          break;
        case 'ArrowRight':
          goToNextPage();
          break;
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomOut();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            fitToWidth();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardBody className="text-center">
            <p className="text-red-600 mb-4">Failed to load PDF</p>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            {onClose && (
              <Button color="primary" onClick={onClose}>
                Close
              </Button>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-white border-b shadow-sm">
        {/* Left controls */}
        <div className="flex items-center gap-2">
          {/* Page navigation */}
          <ButtonGroup size="sm">
            <Button
              isIconOnly
              variant="flat"
              onClick={goToPreviousPage}
              isDisabled={currentPage <= 1}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            
            <Button variant="flat" className="min-w-[100px]">
              <Input
                type="number"
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                className="w-12 text-center"
                size="sm"
                min={1}
                max={numPages}
              />
              <span className="mx-1">/</span>
              <span>{numPages || '—'}</span>
            </Button>
            
            <Button
              isIconOnly
              variant="flat"
              onClick={goToNextPage}
              isDisabled={currentPage >= numPages}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </ButtonGroup>
          
          <div className="w-px h-6 bg-gray-300" />
          
          {/* Zoom controls */}
          <ButtonGroup size="sm">
            <Button
              isIconOnly
              variant="flat"
              onClick={zoomOut}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </Button>
            
            <Dropdown>
              <DropdownTrigger>
                <Button variant="flat">
                  {Math.round(scale * 100)}%
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Zoom levels"
                onAction={(key) => {
                  const option = zoomOptions.find(opt => opt.key === key);
                  if (option) setScale(option.value);
                }}
              >
                {zoomOptions.map(option => (
                  <DropdownItem key={option.key}>
                    {option.label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
            
            <Button
              isIconOnly
              variant="flat"
              onClick={zoomIn}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </Button>
            
            <Button
              variant="flat"
              size="sm"
              onClick={fitToWidth}
            >
              Fit
            </Button>
          </ButtonGroup>
          
          <div className="w-px h-6 bg-gray-300" />
          
          {/* Rotation */}
          <Button
            isIconOnly
            variant="flat"
            size="sm"
            onClick={rotate}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>
        
        {/* Right controls */}
        {onClose && (
          <Button
            variant="flat"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        )}
      </div>
      
      {/* PDF Document */}
      <div className="flex-1 overflow-auto">
        <div className="flex justify-center p-4" ref={pageRef}>
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-96">
                <Spinner size="lg" />
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              rotate={rotation}
              width={pageWidth || undefined}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg border bg-white"
            />
          </Document>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-50 border-t text-xs text-gray-600">
        <span>Page {currentPage} of {numPages || '—'}</span>
        <span>{Math.round(scale * 100)}%</span>
      </div>
    </div>
  );
}; 