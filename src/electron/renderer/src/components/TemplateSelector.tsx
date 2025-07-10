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
                className={`transition-colors hover:shadow-md ${
                  selectedTemplate?.id === template.id 
                    ? 'ring-2 ring-primary bg-primary-50' 
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
                  variant="light" 
                  onPress={onClose}
                  isDisabled={isGenerating}
                  size="md"
                >
                  Cancel
                </Button>
                <Button 
                  color="secondary" 
                  onPress={handleGenerate}
                  isDisabled={isGenerating || !selectedTemplate}
                  isLoading={isGenerating}
                  size="md"
                  className="min-w-[140px]"
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