import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Card, 
  CardBody, 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  useDisclosure,
  Input,
  Textarea,
  Select,
  SelectItem,
  Checkbox,
  DatePicker,
  Chip,
  Spinner
} from '@heroui/react';
import { Template, TemplateField } from '../../../../shared/types';

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onTemplateSelect: (template: Template) => void;
  onGenerateDocument: (formData: any) => void;
}

interface FormErrors {
  [key: string]: string;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onGenerateDocument
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Inject custom scrollbar styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        transition: background 0.2s ease;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleTemplateClick = (template: Template) => {
    console.log('Template clicked:', template.id);
    onTemplateSelect(template);
    setFormData({});
    setFormErrors({});
    onOpen();
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    console.log('Field changed:', fieldId, '=', value, typeof value);
    
    // Ensure the value is serializable
    let serializableValue = value;
    if (typeof value === 'object' && value !== null) {
      // For objects, ensure they are plain objects
      serializableValue = JSON.parse(JSON.stringify(value));
    }
    
    setFormData(prev => ({
      ...prev,
      [fieldId]: serializableValue
    }));
    
    // Clear error when user starts typing
    if (formErrors[fieldId]) {
      setFormErrors(prev => ({
        ...prev,
        [fieldId]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    if (!selectedTemplate) return false;
    
    const errors: FormErrors = {};
    
    selectedTemplate.requiredFields.forEach(field => {
      const value = formData[field.id];
      
      // Check required fields
      if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        errors[field.id] = `${field.name} is required`;
        return;
      }
      
      if (value && field.validation) {
        // Check string length
        if (typeof value === 'string') {
          if (field.validation.minLength && value.length < field.validation.minLength) {
            errors[field.id] = `${field.name} must be at least ${field.validation.minLength} characters`;
          }
          if (field.validation.maxLength && value.length > field.validation.maxLength) {
            errors[field.id] = `${field.name} must not exceed ${field.validation.maxLength} characters`;
          }
          if (field.validation.pattern && !new RegExp(field.validation.pattern).test(value)) {
            errors[field.id] = `${field.name} format is invalid`;
          }
        }
        
        // Check number range
        if (field.type === 'number' && typeof value === 'number') {
          if (field.validation.min !== undefined && value < field.validation.min) {
            errors[field.id] = `${field.name} must be at least ${field.validation.min}`;
          }
          if (field.validation.max !== undefined && value > field.validation.max) {
            errors[field.id] = `${field.name} must not exceed ${field.validation.max}`;
          }
        }
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !validateForm()) {
      console.log('Validation failed or no template selected');
      return;
    }
    
    setIsGenerating(true);
    try {
      console.log('Generating document with data:', formData);
      
      // Create a clean, serializable copy of form data
      const cleanFormData = JSON.parse(JSON.stringify(formData));
      
      // Ensure all required fields are present
      const processedData = { ...cleanFormData };
      
      console.log('Processed form data:', processedData);
      
      await onGenerateDocument(processedData);
      onClose();
    } catch (error) {
      console.error('Generation failed:', error);
      // Don't close the modal on error so user can try again
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFormField = (field: TemplateField) => {
    const value = formData[field.id];
    const error = formErrors[field.id];
    
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            key={field.id}
            label={field.name}
            description={field.description}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            isRequired={field.required}
            isInvalid={!!error}
            errorMessage={error}
            minRows={4}
          />
        );
        
      case 'select':
        return (
          <Select
            key={field.id}
            label={field.name}
            description={field.description}
            placeholder={`Select ${field.name.toLowerCase()}`}
            selectedKeys={value ? [value] : []}
            onSelectionChange={(keys) => {
              const selectedValue = Array.from(keys)[0];
              handleFieldChange(field.id, selectedValue);
            }}
            isRequired={field.required}
            isInvalid={!!error}
            errorMessage={error}
          >
            {field.options?.map((option) => (
              <SelectItem key={option}>
                {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </SelectItem>
            )) || []}
          </Select>
        );
        
      case 'multiselect':
        return (
          <div key={field.id} className="space-y-2">
            <Select
              label={field.name}
              description={field.description}
              placeholder={`Select ${field.name.toLowerCase()}`}
              selectionMode="multiple"
              selectedKeys={value || []}
              onSelectionChange={(keys) => {
                const selectedValues = Array.from(keys);
                handleFieldChange(field.id, selectedValues);
              }}
              isRequired={field.required}
              isInvalid={!!error}
              errorMessage={error}
            >
              {field.options?.map((option) => (
                <SelectItem key={option}>
                  {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              )) || []}
            </Select>
            {value && value.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {value.map((item: string) => (
                  <Chip key={item} size="sm" color="primary" variant="flat">
                    {item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        );
        
      case 'date':
        return (
          <Input
            key={field.id}
            type="date"
            label={field.name}
            description={field.description}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            isRequired={field.required}
            isInvalid={!!error}
            errorMessage={error}
          />
        );
        
      case 'number':
        return (
          <Input
            key={field.id}
            type="number"
            label={field.name}
            description={field.description}
            placeholder={field.placeholder}
            value={value?.toString() || ''}
            onChange={(e) => {
              const numValue = parseFloat(e.target.value);
              handleFieldChange(field.id, isNaN(numValue) ? 0 : numValue);
            }}
            isRequired={field.required}
            isInvalid={!!error}
            errorMessage={error}
          />
        );
        
      case 'boolean':
        return (
          <div key={field.id} className="flex flex-row gap-2 items-center">
            <Checkbox
              isSelected={Boolean(value)}
              onValueChange={(checked) => handleFieldChange(field.id, checked)}
              isInvalid={!!error}
              size="lg"
              color="success"
              aria-label={field.name}
            >
              <div className="flex flex-col">
                <span>{field.name}{field.required && ' *'}</span>
                {field.description && (
                  <span className="text-sm text-gray-600">{field.description}</span>
                )}
                {error && <span className="text-sm text-danger">{error}</span>}
              </div>
            </Checkbox>
          </div>
        );
        
      default:
        return (
          <Input
            key={field.id}
            type="text"
            label={field.name}
            description={field.description}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            isRequired={field.required}
            isInvalid={!!error}
            errorMessage={error}
          />
        );
    }
  };

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 mb-6 bg-primary/10 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Templates Found</h3>
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
      <div className="custom-scrollbar overflow-y-auto h-full p-4">
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="cursor-pointer group"
              onClick={() => handleTemplateClick(template)}
            >
              <Card 
                className={`transition-all duration-200 hover:shadow-lg border ${
                  selectedTemplate?.id === template.id 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-divider hover:border-primary/30 hover:bg-foreground/5'
                }`}
              >
                <CardBody className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-foreground mb-1 group-hover:text-primary transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-foreground/60 leading-relaxed">{template.description}</p>
                    </div>
                    <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
                      {template.metadata.category}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-foreground/50 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {template.requiredFields?.length || 0} fields
                      </span>
                      <span className="text-xs text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full font-medium">
                        {template.complexity}
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Template Form Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        size="4xl"
        scrollBehavior="inside"
        isDismissable={!isGenerating}
        backdrop="blur"
        classNames={{
          base: "min-h-[600px] max-h-[90vh]",
          body: "max-h-[60vh] overflow-y-auto",
          footer: "border-t border-gray-200 bg-gray-50"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold">{selectedTemplate?.name}</h3>
                  <p className="text-sm text-gray-600 font-normal">
                    {selectedTemplate?.description}
                  </p>
                </div>
              </ModalHeader>
              <ModalBody className="py-6">
                {selectedTemplate && (
                  <div className="space-y-6">
                    {/* Template metadata */}
                    <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-200">
                      <Chip size="sm" color="primary" variant="flat">
                        {selectedTemplate.metadata.category}
                      </Chip>
                      <Chip size="sm" color="warning" variant="flat">
                        {selectedTemplate.complexity}
                      </Chip>
                      <Chip size="sm" color="default" variant="flat">
                        {selectedTemplate.estimatedTime}
                      </Chip>
                    </div>
                    
                    {/* Form fields */}
                    <div className="space-y-6">
                      {selectedTemplate.requiredFields.map(renderFormField)}
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="flex justify-end gap-3 py-4 px-6">
                <Button 
                  variant="flat" 
                  onPress={onClose}
                  isDisabled={isGenerating}
                  size="md"
                  className="bg-foreground/5 hover:bg-foreground/10 transition-colors border border-divider/50 hover:border-divider px-6"
                  startContent={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  }
                >
                  Cancel
                </Button>
                <Button 
                  color="primary" 
                  variant="solid"
                  onPress={handleGenerate}
                  isDisabled={isGenerating || !selectedTemplate}
                  isLoading={isGenerating}
                  size="md"
                  className="bg-primary hover:bg-primary/90 text-white px-6 font-medium transition-colors min-w-[160px]"
                  startContent={
                    !isGenerating ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ) : undefined
                  }
                >
                  {isGenerating ? 'Generating...' : 'Generate Document'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default TemplateSelector; 