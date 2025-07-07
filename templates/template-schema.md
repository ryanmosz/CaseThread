# CaseThread Template Schema

## Template Structure

Each template must follow this JSON schema for consistency and CLI parsing:

```json
{
  "id": "template-id",
  "name": "Human Readable Template Name",
  "type": "template-type",
  "version": "1.0.0",
  "description": "Brief description of the template's purpose",
  "complexity": "low|medium|high",
  "estimatedTime": "30-60 minutes",
  "metadata": {
    "category": "patent|trademark|licensing|general",
    "jurisdiction": "federal|state|international",
    "lastUpdated": "2024-01-01",
    "author": "CaseThread"
  },
  "requiredFields": [
    {
      "id": "field_id",
      "name": "Field Name",
      "type": "text|date|number|select|multiselect|boolean",
      "description": "Help text for the field",
      "required": true,
      "validation": {
        "pattern": "regex pattern (optional)",
        "minLength": 1,
        "maxLength": 100
      },
      "options": ["option1", "option2"] // for select/multiselect
    }
  ],
  "sections": [
    {
      "id": "section_id",
      "title": "Section Title",
      "order": 1,
      "required": true,
      "content": "Template content with {{variable}} placeholders",
      "conditionalOn": {
        "field": "field_id",
        "value": "specific_value"
      },
      "firmCustomizable": true,
      "helpText": "Guidance for this section"
    }
  ],
  "variables": {
    "variable_name": {
      "source": "field_id",
      "transform": "uppercase|lowercase|titlecase|none",
      "default": "default value if not provided"
    }
  },
  "prompts": {
    "section_id": {
      "system": "You are an IP attorney drafting a {{document_type}}",
      "user": "Generate content for {{section_title}} based on: {{context}}",
      "temperature": 0.3,
      "maxTokens": 500
    }
  }
}
```

## Field Types

- **text**: Single line text input
- **textarea**: Multi-line text input
- **date**: Date picker
- **number**: Numeric input
- **select**: Single choice dropdown
- **multiselect**: Multiple choice selection
- **boolean**: Yes/No checkbox

## Variable Syntax

- `{{variable_name}}`: Simple variable replacement
- `{{#if condition}}...{{/if}}`: Conditional content
- `{{#each array}}...{{/each}}`: Repeating content
- `{{uppercase variable}}`: Transform functions
- `{{date variable "MM/DD/YYYY"}}`: Date formatting

## Section Types

1. **Static**: Fixed content with variable substitution
2. **Dynamic**: AI-generated based on inputs
3. **Hybrid**: Template with AI-enhanced sections
4. **Conditional**: Appears based on user selections

## Validation Rules

- All templates must have unique IDs
- Required fields must be marked
- Sections must have sequential order numbers
- Variables must reference valid field IDs
- Prompts must include both system and user messages 