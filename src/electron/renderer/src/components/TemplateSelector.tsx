import React, { useState, useMemo } from 'react';
import { Button, Card, CardBody, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Divider } from '@heroui/react';
import { Template } from '../../../../shared/types';

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onTemplateSelect: (template: Template) => void;
  onGenerateDocument: (formData: any) => void;
}

// Template category definitions
const TEMPLATE_CATEGORIES = {
  patent: {
    name: 'Patent Documents',
    icon: '📄',
    color: 'bg-blue-100 text-blue-800',
  },
  trademark: {
    name: 'Trademark Documents',
    icon: '™️',
    color: 'bg-purple-100 text-purple-800',
  },
  business: {
    name: 'Business Documents',
    icon: '📋',
    color: 'bg-green-100 text-green-800',
  },
} as const;

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onGenerateDocument
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Group templates by category
  const categorizedTemplates = useMemo(() => {
    const grouped = {
      patent: [] as Template[],
      trademark: [] as Template[],
      business: [] as Template[],
    };

    templates.forEach(template => {
      const category = template.metadata.category as keyof typeof grouped;
      if (grouped[category]) {
        grouped[category].push(template);
      } else {
        // Default to business category if unknown
        grouped.business.push(template);
      }
    });

    return grouped;
  }, [templates]);

  const handleTemplateClick = (template: Template) => {
    onTemplateSelect(template);
    setFormData({});
    onOpen();
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleGenerate = () => {
    if (selectedTemplate) {
      onGenerateDocument(formData);
      onClose();
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

  const renderTemplateCategory = (categoryKey: keyof typeof TEMPLATE_CATEGORIES, templates: Template[]) => {
    if (templates.length === 0) return null;

    const category = TEMPLATE_CATEGORIES[categoryKey];
    
    return (
      <div key={categoryKey} className="mb-6">
        <div className="flex items-center mb-3">
          <span className="text-lg mr-2">{category.icon}</span>
          <h3 className="text-sm font-semibold text-gray-900">{category.name}</h3>
        </div>
        
        <div className="space-y-2">
          {templates.map((template) => (
            <Card 
              key={template.id}
              className={`cursor-pointer transition-colors ${
                selectedTemplate?.id === template.id 
                  ? 'ring-2 ring-primary' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleTemplateClick(template)}
            >
              <CardBody className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{template.name}</h4>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{template.description}</p>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded ${category.color}`}>
                      {template.complexity}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    {template.requiredFields?.length || 0} fields
                  </span>
                  <span className="text-xs text-gray-500">
                    {template.estimatedTime}
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="custom-scrollbar overflow-y-auto h-full p-4">
        {renderTemplateCategory('patent', categorizedTemplates.patent)}
        {renderTemplateCategory('trademark', categorizedTemplates.trademark)}
        {renderTemplateCategory('business', categorizedTemplates.business)}
      </div>

      {/* Template Form Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex items-center">
            <div>
              <div className="flex items-center">
                <span className="text-xl mr-2">
                  {selectedTemplate?.metadata.category === 'patent' ? '📄' : 
                   selectedTemplate?.metadata.category === 'trademark' ? '™️' : '📋'}
                </span>
                <span>Generate Document: {selectedTemplate?.name}</span>
              </div>
              <p className="text-sm text-gray-600 font-normal mt-1">
                Estimated time: {selectedTemplate?.estimatedTime} | Complexity: {selectedTemplate?.complexity}
              </p>
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedTemplate && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700">
                    {selectedTemplate.description}
                  </p>
                </div>
                
                <Divider />
                
                <div className="grid gap-4">
                  {selectedTemplate.requiredFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {field.label || field.name}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {field.type === 'textarea' ? (
                        <textarea
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder={field.placeholder}
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          rows={4}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        >
                          <option value="">Select an option</option>
                          {field.options?.map((option: string) => (
                            <option key={option} value={option}>
                              {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'boolean' ? (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            checked={formData[field.id] || false}
                            onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                          />
                          <span className="ml-2 text-sm text-gray-600">Yes</span>
                        </div>
                      ) : field.type === 'number' ? (
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder={field.placeholder}
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          min={field.validation?.min}
                          max={field.validation?.max}
                        />
                      ) : field.type === 'date' ? (
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        />
                      ) : (
                        <input
                          type={field.type}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder={field.placeholder}
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        />
                      )}
                      
                      {field.description && (
                        <p className="text-xs text-gray-500">{field.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleGenerate}>
              Generate Document
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default TemplateSelector; 