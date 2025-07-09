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

  const handleTemplateClick = (template: Template) => {
    onTemplateSelect(template);
    setFormData({});
    setFormErrors({});
    onOpen();
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
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
    if (!selectedTemplate || !validateForm()) return;
    
    setIsGenerating(true);
    try {
      await onGenerateDocument(formData);
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
            onSelectionChange={(keys) => handleFieldChange(field.id, Array.from(keys)[0])}
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
              onSelectionChange={(keys) => handleFieldChange(field.id, Array.from(keys))}
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
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value) || 0)}
            isRequired={field.required}
            isInvalid={!!error}
            errorMessage={error}
          />
        );
        
      case 'boolean':
        return (
          <Checkbox
            key={field.id}
            isSelected={value || false}
            onChange={(checked) => handleFieldChange(field.id, checked)}
            isInvalid={!!error}
          >
            <div>
              <span className="font-medium">{field.name}</span>
              {field.description && (
                <p className="text-sm text-gray-600 mt-1">{field.description}</p>
              )}
            </div>
          </Checkbox>
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
      <div className="p-4 text-center text-gray-500">
        <p>No templates found</p>
        <p className="text-xs mt-1">Check your templates directory</p>
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
              className="cursor-pointer"
              onClick={() => handleTemplateClick(template)}
            >
              <Card 
                className={`transition-colors ${
                  selectedTemplate?.id === template.id 
                    ? 'ring-2 ring-primary' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <CardBody className="p-4">
                  <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                  <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {template.metadata.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {template.requiredFields?.length || 0} fields
                      </span>
                      <span className="text-xs text-orange-600">
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
        size="3xl"
        scrollBehavior="inside"
        isDismissable={!isGenerating}
      >
        <ModalContent>
          <ModalHeader>
            <div>
              <h3 className="text-lg font-semibold">{selectedTemplate?.name}</h3>
              <p className="text-sm text-gray-600 font-normal">
                {selectedTemplate?.description}
              </p>
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedTemplate && (
              <div className="space-y-6">
                {/* Template metadata */}
                <div className="flex flex-wrap gap-2 pb-4 border-b">
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
                <div className="space-y-4">
                  {selectedTemplate.requiredFields.map(renderFormField)}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button 
              variant="light" 
              onPress={onClose}
              isDisabled={isGenerating}
            >
              Cancel
            </Button>
            <Button 
              color="primary" 
              onPress={handleGenerate}
              isDisabled={isGenerating}
              isLoading={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Document'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default TemplateSelector; 