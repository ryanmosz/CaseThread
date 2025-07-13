import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Card, 
  CardBody, 
  useDisclosure,
  Chip
} from '@heroui/react';
import { Template } from '../../../../shared/types';
import EnhancedTemplateForm from './EnhancedTemplateForm';

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onTemplateSelect: (template: Template) => void;
  onGenerateDocument: (formData: any, options?: { useMultiagent?: boolean }) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onGenerateDocument
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isGenerating, setIsGenerating] = useState(false);

  // Inject custom scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgb(var(--background) / 0.1);
        border-radius: 3px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgb(var(--primary) / 0.2);
        border-radius: 3px;
        transition: all 0.2s ease;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgb(var(--primary) / 0.3);
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleTemplateClick = (template: Template) => {
    onTemplateSelect(template);
    onOpen();
  };

  const handleFormSubmit = async (formData: any, options?: { useMultiagent?: boolean }) => {
    setIsGenerating(true);
    try {
      await onGenerateDocument(formData, options);
      onClose();
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };



  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 mb-6 bg-primary/10 rounded-full flex items-center justify-center">
          <svg 
            className="w-8 h-8 text-primary/60" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" 
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Templates Found
        </h3>
        <p className="text-sm text-foreground/60 mb-4 max-w-xs">
          Templates will appear here once available
        </p>
        <div className="text-xs text-foreground/40 bg-foreground/5 px-3 py-1 rounded-md">
          Check templates directory
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        className="custom-scrollbar overflow-y-auto h-full p-4 space-y-3"
        role="list"
        aria-label="Available templates"
      >
        {templates.map((template) => (
          <div
            key={template.id}
            role="listitem"
            className="cursor-pointer group focus-within:outline-none"
            onClick={() => handleTemplateClick(template)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTemplateClick(template);
              }
            }}
            tabIndex={0}
          >
            <Card 
              className={`
                transition-all duration-200 hover:shadow-lg border
                ${selectedTemplate?.id === template.id 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-divider hover:border-primary/30 hover:bg-foreground/5'}
                focus-visible:ring-2 focus-visible:ring-primary/30
              `}
            >
              <CardBody className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground mb-1 group-hover:text-primary transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-xs text-foreground/60 leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                  <div 
                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-hidden="true"
                  >
                    <svg 
                      className="w-4 h-4 text-primary" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 5l7 7-7 7" 
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <Chip
                    size="sm"
                    color="primary"
                    variant="flat"
                    className="capitalize"
                  >
                    {template.metadata.category}
                  </Chip>
                  <div className="flex items-center gap-3">
                    <span 
                      className="text-xs text-foreground/50 flex items-center gap-1"
                      title={`${template.requiredFields?.length || 0} required fields`}
                    >
                      <svg 
                        className="w-3 h-3" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                        />
                      </svg>
                      {template.requiredFields?.length || 0} fields
                    </span>
                    <Chip
                      size="sm"
                      color="warning"
                      variant="flat"
                      className="capitalize"
                    >
                      {template.complexity}
                    </Chip>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        ))}
      </div>

      {selectedTemplate && (
        <EnhancedTemplateForm
          template={selectedTemplate}
          isOpen={isOpen}
          onSubmit={handleFormSubmit}
          onCancel={onClose}
          isGenerating={isGenerating}
        />
      )}
    </>
  );
};

export default TemplateSelector; 