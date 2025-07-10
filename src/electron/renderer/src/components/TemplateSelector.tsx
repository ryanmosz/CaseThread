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
  Chip,
  Divider
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

interface SelectOption {
  key: string;
  label: string;
}

const formatOptionLabel = (value: string): string => {
  return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const createSelectOption = (value: string): SelectOption => ({
  key: value,
  label: formatOptionLabel(value)
});

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
    setFormData({});
    setFormErrors({});
    onOpen();
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    let serializableValue = value;
    if (typeof value === 'object' && value !== null) {
      serializableValue = JSON.parse(JSON.stringify(value));
    }
    
    setFormData(prev => ({
      ...prev,
      [fieldId]: serializableValue
    }));
    
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
      
      if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        errors[field.id] = `${field.name} is required`;
        return;
      }
      
      if (value && field.validation) {
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
    if (!selectedTemplate || !validateForm()) return;
    
    setIsGenerating(true);
    try {
      const cleanFormData = JSON.parse(JSON.stringify(formData));
      await onGenerateDocument(cleanFormData);
      onClose();
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFormField = (field: TemplateField) => {
    const value = formData[field.id];
    const error = formErrors[field.id];
    
    const commonProps = {
      key: field.id,
      label: field.name,
      description: field.description,
      isRequired: field.required,
      isInvalid: !!error,
      errorMessage: error,
      'aria-label': field.name,
      'aria-describedby': field.description ? `${field.id}-description` : undefined,
      className: 'w-full transition-all duration-200 focus:ring-2 focus:ring-primary/20'
    };

    const renderFieldLabel = () => (
      <div className="flex items-center justify-between mb-1.5">
        <label 
          htmlFor={field.id}
          className="block text-sm font-medium text-foreground"
        >
          {field.name}
          {field.required && (
            <span className="text-danger ml-1" aria-hidden="true">*</span>
          )}
        </label>
        {field.validation?.maxLength && (
          <span className="text-xs text-foreground/50">
            {value?.length || 0}/{field.validation.maxLength}
          </span>
        )}
      </div>
    );

    const renderFieldDescription = () => (
      field.description && (
        <p 
          id={`${field.id}-description`}
          className="mt-1 text-xs text-foreground/60"
        >
          {field.description}
        </p>
      )
    );

    const renderFieldError = () => (
      error && (
        <p className="mt-1 text-xs text-danger">
          {error}
        </p>
      )
    );

    const fieldWrapper = (children: React.ReactNode) => (
      <div key={field.id} className="relative space-y-1">
        {renderFieldLabel()}
        {children}
        {renderFieldDescription()}
        {renderFieldError()}
      </div>
    );
    
    switch (field.type) {
      case 'textarea':
        return fieldWrapper(
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            minRows={4}
            className="resize-y rounded-lg bg-background border-divider focus:border-primary"
          />
        );
        
      case 'select':
        const selectOptions = field.options?.map(createSelectOption) || [];
        return fieldWrapper(
          <Select
            id={field.id}
            placeholder={`Select ${field.name.toLowerCase()}`}
            selectedKeys={value ? [value] : []}
            onSelectionChange={(keys) => {
              const selectedValue = Array.from(keys)[0];
              handleFieldChange(field.id, selectedValue);
            }}
            className="rounded-lg bg-background border-divider focus:border-primary"
          >
            {selectOptions.map((option) => (
              <SelectItem key={option.key} className="capitalize">
                {option.label}
              </SelectItem>
            ))}
          </Select>
        );
        
      case 'multiselect':
        const multiselectOptions = field.options?.map(createSelectOption) || [];
        return fieldWrapper(
          <>
            <Select
              id={field.id}
              placeholder={`Select ${field.name.toLowerCase()}`}
              selectionMode="multiple"
              selectedKeys={value || []}
              onSelectionChange={(keys) => {
                const selectedValues = Array.from(keys);
                handleFieldChange(field.id, selectedValues);
              }}
              className="rounded-lg bg-background border-divider focus:border-primary"
            >
              {multiselectOptions.map((option) => (
                <SelectItem key={option.key} className="capitalize">
                  {option.label}
                </SelectItem>
              ))}
            </Select>
            {value && value.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 pb-1">
                {value.map((item: string) => (
                  <Chip
                    key={item}
                    size="sm"
                    color="primary"
                    variant="flat"
                    className="capitalize"
                  >
                    {formatOptionLabel(item)}
                  </Chip>
                ))}
              </div>
            )}
          </>
        );
        
      case 'date':
        return fieldWrapper(
          <Input
            id={field.id}
            type="date"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="rounded-lg bg-background border-divider focus:border-primary"
          />
        );
        
      case 'number':
        return fieldWrapper(
          <Input
            id={field.id}
            type="number"
            placeholder={field.placeholder}
            value={value?.toString() || ''}
            onChange={(e) => {
              const numValue = parseFloat(e.target.value);
              handleFieldChange(field.id, isNaN(numValue) ? 0 : numValue);
            }}
            className="rounded-lg bg-background border-divider focus:border-primary"
          />
        );
        
      case 'boolean':
        return (
          <div key={field.id} className="relative py-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id={field.id}
                isSelected={Boolean(value)}
                onValueChange={(checked) => handleFieldChange(field.id, checked)}
                isInvalid={!!error}
                size="lg"
                color="primary"
                className="mt-0.5"
              />
              <div className="flex-1">
                <label 
                  htmlFor={field.id}
                  className="block text-sm font-medium text-foreground cursor-pointer"
                >
                  {field.name}
                  {field.required && (
                    <span className="text-danger ml-1" aria-hidden="true">*</span>
                  )}
                </label>
                {field.description && (
                  <p className="mt-0.5 text-xs text-foreground/60">
                    {field.description}
                  </p>
                )}
                {error && (
                  <p className="mt-1 text-xs text-danger">{error}</p>
                )}
              </div>
            </div>
          </div>
        );
        
      default:
        return fieldWrapper(
          <Input
            id={field.id}
            type="text"
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="rounded-lg bg-background border-divider focus:border-primary"
          />
        );
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

      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        size="4xl"
        scrollBehavior="inside"
        isDismissable={!isGenerating}
        backdrop="blur"
        classNames={{
          base: "min-h-[600px] max-h-[90vh]",
          body: "max-h-[60vh] overflow-y-auto custom-scrollbar px-6",
          header: "border-b border-divider px-6",
          footer: "border-t border-divider bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 py-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {selectedTemplate?.name}
                </h2>
                <p className="text-sm text-foreground/60 font-normal">
                  {selectedTemplate?.description}
                </p>
              </ModalHeader>
              <ModalBody>
                {selectedTemplate && (
                  <div className="space-y-8">
                    <div className="flex flex-wrap gap-2 pb-4">
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
                    
                    <Divider className="my-6" />
                    
                    <div className="grid gap-6">
                      {selectedTemplate.requiredFields.map(renderFormField)}
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="flex justify-end gap-3 py-4">
                <Button 
                  variant="flat" 
                  onPress={onClose}
                  isDisabled={isGenerating}
                  size="md"
                  className="bg-foreground/5 hover:bg-foreground/10 transition-colors border border-divider/50 hover:border-divider px-6"
                  startContent={
                    <svg 
                      className="w-4 h-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M6 18L18 6M6 6l12 12" 
                      />
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
                      <svg 
                        className="w-4 h-4" 
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