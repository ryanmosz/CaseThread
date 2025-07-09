import React, { useState } from 'react';
import { Button, Card, CardBody, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
import { Template } from '../../../../shared/types';

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onTemplateSelect: (template: Template) => void;
  onGenerateDocument: (formData: any) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onGenerateDocument
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [formData, setFormData] = useState<Record<string, any>>({});

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

  return (
    <>
      <div className="custom-scrollbar overflow-y-auto h-full p-4">
        <div className="space-y-3">
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
              <CardBody className="p-4">
                <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {template.metadata.category}
                  </span>
                  <span className="text-xs text-gray-500">
                    {template.requiredFields?.length || 0} fields
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* Template Form Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>
            Generate Document: {selectedTemplate?.name}
          </ModalHeader>
          <ModalBody>
            {selectedTemplate && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  {selectedTemplate.description}
                </p>
                
                {selectedTemplate.requiredFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'boolean' ? (
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        checked={formData[field.id] || false}
                        onChange={(e) => handleFieldChange(field.id, e.target.checked)}
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
                      <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                    )}
                  </div>
                ))}
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