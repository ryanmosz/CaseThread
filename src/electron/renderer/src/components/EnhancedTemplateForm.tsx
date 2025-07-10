import React, { useState, useEffect, useMemo } from 'react';
import { 
  Button, 
  Card, 
  CardBody, 
  CardHeader,
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  Input,
  Textarea,
  Select,
  SelectItem,
  Checkbox,
  Chip,
  Divider,
  Progress,
  Accordion,
  AccordionItem
} from '@heroui/react';
import toast from 'react-hot-toast';
import { Template, TemplateField } from '../../../../shared/types';

interface EnhancedTemplateFormProps {
  template: Template;
  isOpen: boolean;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isGenerating?: boolean;
}

interface FormData {
  [key: string]: any;
}

interface FormErrors {
  [key: string]: string;
}

interface ConditionalLogic {
  [templateId: string]: {
    [triggerField: string]: {
      affectedFields: string[];
      showWhen: (value: any) => boolean;
      clearWhen?: (value: any) => boolean;
    };
  };
}

// Define conditional logic for all templates based on GUI field requirements
const CONDITIONAL_LOGIC: ConditionalLogic = {
  'provisional-patent-application': {
    'has_drawings': {
      affectedFields: ['drawing_descriptions'],
      showWhen: (value) => value === true,
      clearWhen: (value) => value === false
    },
    'include_claims': {
      affectedFields: ['claims_text'],
      showWhen: (value) => value === true,
      clearWhen: (value) => value === false
    }
  },
  'patent-assignment-agreement': {
    'consideration_type': {
      affectedFields: ['dollar_amount', 'other_consideration_description'],
      showWhen: (value) => value === 'monetary',
      clearWhen: (value) => value !== 'monetary'
    }
  },
  'nda-ip-specific': {
    'mutual': {
      affectedFields: [], // Changes labels but no field show/hide
      showWhen: () => true
    }
  },
  'office-action-response': {
    'interview_conducted': {
      affectedFields: ['interview_date'],
      showWhen: (value) => value === true,
      clearWhen: (value) => value === false
    }
  },
  'patent-license-agreement': {
    'exclusivity': {
      affectedFields: ['field_restrictions'],
      showWhen: (value) => value === 'field_exclusive',
      clearWhen: (value) => value !== 'field_exclusive'
    }
  },
  'technology-transfer-agreement': {
    'training_required': {
      affectedFields: ['training_details'],
      showWhen: (value) => value === true,
      clearWhen: (value) => value === false
    },
    'milestone_payments': {
      affectedFields: ['milestone_descriptions'],
      showWhen: (value) => value === true,
      clearWhen: (value) => value === false
    }
  },
  'trademark-application': {
    'filing_basis': {
      affectedFields: ['first_use_date', 'first_use_commerce_date', 'specimen_description'],
      showWhen: (value) => value === 'use',
      clearWhen: (value) => value !== 'use'
    }
  },
  'cease-and-desist-letter': {
    // No conditional fields - simplest template
  }
};

const EnhancedTemplateForm: React.FC<EnhancedTemplateFormProps> = ({
  template,
  isOpen,
  onSubmit,
  onCancel,
  isGenerating = false
}) => {
  const [formData, setFormData] = useState<FormData>(() => {
    // Initialize boolean fields with false by default
    const initialData: FormData = {};
    template.requiredFields.forEach(field => {
      if (field.type === 'boolean') {
        initialData[field.id] = false;
      }
    });
    return initialData;
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [completionProgress, setCompletionProgress] = useState(0);

  // Get conditional logic for this template
  const templateConditionalLogic = CONDITIONAL_LOGIC[template.id] || {};

  // Reset form data when template changes
  useEffect(() => {
    const initialData: FormData = {};
    template.requiredFields.forEach(field => {
      if (field.type === 'boolean') {
        initialData[field.id] = false;
      }
    });
    setFormData(initialData);
    setFormErrors({});
  }, [template.id]);

  // Close loading toast when form closes or generation completes
  useEffect(() => {
    if (!isOpen && !isGenerating) {
      // Dismiss any loading toasts when form closes
      toast.dismiss();
    }
  }, [isOpen, isGenerating]);

  // Calculate which fields should be visible based on current form data
  const visibleFields = useMemo(() => {
    const visible = new Set<string>();
    
    // Add all fields initially
    template.requiredFields.forEach(field => {
      visible.add(field.id);
    });

    // Apply conditional logic
    Object.entries(templateConditionalLogic).forEach(([triggerField, logic]) => {
      const triggerValue = formData[triggerField];
      const shouldShow = logic.showWhen(triggerValue);
      
      logic.affectedFields.forEach(fieldId => {
        if (shouldShow) {
          visible.add(fieldId);
        } else {
          visible.delete(fieldId);
        }
      });
    });

    return visible;
  }, [formData, template.requiredFields, templateConditionalLogic]);

  // Calculate completion progress
  useEffect(() => {
    const requiredVisibleFields = template.requiredFields.filter(
      field => field.required && visibleFields.has(field.id)
    );
    
    const completedFields = requiredVisibleFields.filter(
      field => {
        const value = formData[field.id];
        return value !== undefined && value !== null && value !== '';
      }
    );

    const progress = requiredVisibleFields.length > 0 
      ? (completedFields.length / requiredVisibleFields.length) * 100 
      : 0;
    
    setCompletionProgress(progress);
  }, [formData, template.requiredFields, visibleFields]);

  // Handle field changes with conditional logic
  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [fieldId]: value };
      
      // Apply conditional logic - clear dependent fields when trigger changes
      const conditionalLogic = templateConditionalLogic[fieldId];
      if (conditionalLogic && conditionalLogic.clearWhen && conditionalLogic.clearWhen(value)) {
        conditionalLogic.affectedFields.forEach(dependentField => {
          delete newData[dependentField];
        });
      }
      
      return newData;
    });
    
    // Clear validation errors
    if (formErrors[fieldId]) {
      setFormErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  };

  // Validate only visible fields
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    template.requiredFields.forEach(field => {
      // Only validate visible fields
      if (!visibleFields.has(field.id)) return;
      
      const value = formData[field.id];
      
      // Handle different field types for required validation
      let isEmpty = false;
      if (field.type === 'boolean') {
        // For boolean fields, undefined/null is empty, but false is valid
        isEmpty = value === undefined || value === null;
      } else if (typeof value === 'string') {
        isEmpty = !value || value.trim() === '';
      } else {
        isEmpty = !value;
      }
      
      if (field.required && isEmpty) {
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

  const handleSubmit = () => {
    if (!validateForm()) {
      // Show error toast for validation failures
      const errorCount = Object.keys(formErrors).length;
      toast.error(`Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} in the form before generating the document`, {
        duration: 4000,
      });
      return;
    }
    
    // Show loading toast
    const loadingToast = toast.loading("Generating document...", {
      duration: Infinity, // Keep showing until we dismiss it
    });
    
    // Only submit data for visible fields
    const visibleFormData = Object.fromEntries(
      Object.entries(formData).filter(([key]) => visibleFields.has(key))
    );
    
    onSubmit(visibleFormData);
  };

  const formatOptionLabel = (value: string): string => {
    return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderField = (field: TemplateField) => {
    // Don't render invisible fields
    if (!visibleFields.has(field.id)) return null;

    const value = formData[field.id];
    const error = formErrors[field.id];
    const isOptional = !field.required;
    
    const fieldLabel = field.name + (isOptional ? ' (Optional)' : '');
    const fieldId = `field-${field.id}`;
    
    const commonProps = {
      id: fieldId,
      label: fieldLabel,
      description: field.description,
      isRequired: field.required,
      isInvalid: !!error,
      errorMessage: error,
      className: 'w-full'
    };

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            key={field.id}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            minRows={4}
            maxRows={8}
          />
        );
        
      case 'select':
        return (
          <Select
            {...commonProps}
            key={field.id}
            placeholder={`Select ${field.name.toLowerCase()}`}
            selectedKeys={value ? [value] : []}
            onSelectionChange={(keys) => {
              const selectedValue = Array.from(keys)[0];
              handleFieldChange(field.id, selectedValue);
            }}
          >
            {(field.options || []).map((option) => (
              <SelectItem key={option} className="capitalize">
                {formatOptionLabel(option)}
              </SelectItem>
            ))}
          </Select>
        );
        
      case 'multiselect':
        return (
          <div key={field.id} className="space-y-2">
            <Select
              {...commonProps}
              placeholder={`Select ${field.name.toLowerCase()}`}
              selectionMode="multiple"
              selectedKeys={value || []}
              onSelectionChange={(keys) => {
                const selectedValues = Array.from(keys);
                handleFieldChange(field.id, selectedValues);
              }}
            >
              {(field.options || []).map((option) => (
                <SelectItem key={option} className="capitalize">
                  {formatOptionLabel(option)}
                </SelectItem>
              ))}
            </Select>
            {value && value.length > 0 && (
              <div className="flex flex-wrap gap-1">
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
          </div>
        );
        
      case 'date':
        return (
          <Input
            {...commonProps}
            key={field.id}
            type="date"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        );
        
      case 'number':
        return (
          <Input
            {...commonProps}
            key={field.id}
            type="number"
            placeholder={field.placeholder}
            value={value?.toString() || ''}
            onChange={(e) => {
              const numValue = parseFloat(e.target.value);
              handleFieldChange(field.id, isNaN(numValue) ? 0 : numValue);
            }}
          />
        );
        
      case 'boolean':
        return (
          <div key={field.id} className="flex items-start gap-3 py-2">
            <Checkbox
              id={fieldId}
              isSelected={Boolean(value)}
              onValueChange={(checked) => handleFieldChange(field.id, checked)}
              isInvalid={!!error}
              size="lg"
              color="primary"
            />
            <div className="flex-1">
              <label htmlFor={fieldId} className="text-sm font-medium cursor-pointer">
                {fieldLabel}
              </label>
              {field.description && (
                <p className="text-xs text-foreground/60 mt-1">
                  {field.description}
                </p>
              )}
              {error && (
                <p className="text-xs text-danger mt-1">{error}</p>
              )}
            </div>
          </div>
        );
        
      default:
        return (
          <Input
            {...commonProps}
            key={field.id}
            type="text"
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        );
    }
  };

  // Respect original template field order while grouping required vs optional
  const groupedFields = useMemo(() => {
    const requiredFields: TemplateField[] = [];
    const optionalFields: TemplateField[] = [];

    template.requiredFields.forEach(field => {
      if (!visibleFields.has(field.id)) return;
      
      if (field.required) {
        requiredFields.push(field);
      } else {
        optionalFields.push(field);
      }
    });

    const groups: { [key: string]: TemplateField[] } = {};
    
    if (requiredFields.length > 0) {
      groups['Required Information'] = requiredFields;
    }
    
    if (optionalFields.length > 0) {
      groups['Optional Information'] = optionalFields;
    }

    return groups;
  }, [template.requiredFields, visibleFields]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onCancel}
      size="4xl"
      scrollBehavior="inside"
      classNames={{
        base: "max-h-[90vh]",
        body: "p-0",
        header: "pb-2",
        footer: "pt-4"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {template.name}
            </h2>
            <Chip
              size="sm"
              color="primary"
              variant="flat"
              className="capitalize"
            >
              {template.metadata.category}
            </Chip>
          </div>
          <p className="text-sm text-foreground/60">
            {template.description}
          </p>
          {completionProgress > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-foreground/60 mb-1">
                <span>Form Completion</span>
                <span>{Math.round(completionProgress)}%</span>
              </div>
              <Progress 
                value={completionProgress} 
                color="primary" 
                size="sm"
                className="w-full"
              />
            </div>
          )}
        </ModalHeader>
        
        <ModalBody className="px-6 py-4">
          <div className="space-y-6">
            {Object.entries(groupedFields).map(([groupName, fields]) => (
              <Card key={groupName} className="border-divider">
                <CardHeader className="pb-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    {groupName}
                  </h3>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="space-y-4">
                    {fields.map(renderField)}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </ModalBody>
        
        <ModalFooter>
          <Button 
            variant="light" 
            onPress={onCancel}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button 
            color="primary" 
            onPress={handleSubmit}
            isLoading={isGenerating}
            disabled={completionProgress === 0}
          >
            {isGenerating ? 'Generating...' : 'Generate Document'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EnhancedTemplateForm; 