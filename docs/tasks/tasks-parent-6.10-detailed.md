# Task 6.5: Update TypeScript Interfaces and Types

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

Update the TypeScript type definitions to include the new signature block schema. This ensures type safety when working with templates that now contain signature block metadata.

## Sub-tasks

### 6.5.1 Analyze current template interfaces

**Implementation Steps:**
1. Open `src/types/index.ts`
2. Review existing template-related interfaces
3. Identify where signature block types should be added
4. Check for any existing signature-related types

**File:** `src/types/index.ts`

### 6.5.2 Define signature block TypeScript interfaces

**Implementation Steps:**
1. Create interfaces for:
   - Field definitions
   - Party information
   - Layout options
   - Signature blocks
2. Use discriminated unions where appropriate
3. Ensure all properties match JSON schema

**Code to Add:**
```typescript
// Signature Block Types
export interface FieldDefinition {
  required: boolean;
  label: string;
  defaultValue?: string;
}

export interface SignatureFields {
  name: FieldDefinition;
  title?: FieldDefinition;
  company?: FieldDefinition;
  date?: FieldDefinition;
  registrationNumber?: FieldDefinition;
  [key: string]: FieldDefinition | undefined;
}

export interface SignatureLayout {
  position: 'standalone' | 'side-by-side';
  groupWith?: string;
  preventPageBreak?: boolean;
}

export interface SignatureParty {
  role: string;
  label: string;
  fields: SignatureFields;
}

export interface SignatureBlock {
  id: string;
  type: 'single' | 'multiple';
  layout?: SignatureLayout;
  party: SignatureParty;
}
```

### 6.5.3 Update Template interface

**Implementation Steps:**
1. Add signatureBlocks property to Template interface
2. Make it optional for backward compatibility
3. Update any related interfaces

**Code Changes:**
```typescript
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  sections: TemplateSection[];
  metadata?: TemplateMetadata;
  signatureBlocks?: SignatureBlock[];  // Add this line
}
```

### 6.5.4 Create type guards for signature blocks

**Implementation Steps:**
1. Create helper functions to validate signature block data
2. Useful for runtime validation when loading templates

**Code to Add:**
```typescript
// Type guards
export function isValidSignatureBlock(obj: any): obj is SignatureBlock {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    ['single', 'multiple'].includes(obj.type) &&
    isValidSignatureParty(obj.party) &&
    (!obj.layout || isValidSignatureLayout(obj.layout))
  );
}

export function isValidSignatureParty(obj: any): obj is SignatureParty {
  return (
    typeof obj === 'object' &&
    typeof obj.role === 'string' &&
    typeof obj.label === 'string' &&
    obj.fields &&
    typeof obj.fields === 'object'
  );
}

export function isValidSignatureLayout(obj: any): obj is SignatureLayout {
  return (
    typeof obj === 'object' &&
    ['standalone', 'side-by-side'].includes(obj.position)
  );
}
```

### 6.5.5 Export signature block types

**Implementation Steps:**
1. Ensure all new types are exported
2. Group signature-related exports together
3. Add JSDoc comments for documentation

**Code Organization:**
```typescript
// At the end of the file, add a section for signature block exports
// Signature Block Types
export type {
  FieldDefinition,
  SignatureFields,
  SignatureLayout,
  SignatureParty,
  SignatureBlock
};

// Export type guards
export {
  isValidSignatureBlock,
  isValidSignatureParty,
  isValidSignatureLayout
};
```

### 6.5.6 Verify TypeScript compilation

**Implementation Steps:**
1. Run TypeScript compiler:
   ```bash
   docker exec casethread-dev npm run build
   ```
2. Fix any compilation errors
3. Ensure no type conflicts

**Common Issues to Check:**
- Import statements are correct
- No circular dependencies
- All types are properly exported

## Testing Approach

1. **TypeScript Compilation:**
   - Must compile without errors
   - Check for any type warnings

2. **IDE Integration:**
   - Types should provide proper IntelliSense
   - Auto-completion should work for signature blocks

3. **Type Safety Verification:**
   ```typescript
   // Test script to verify types work
   const testTemplate: Template = {
     id: "test",
     name: "Test",
     description: "Test template",
     category: "test",
     sections: [],
     signatureBlocks: [
       {
         id: "test-sig",
         type: "single",
         party: {
           role: "test",
           label: "TEST",
           fields: {
             name: { required: true, label: "Name" }
           }
         }
       }
     ]
   };
   ```

## Definition of Done

- [ ] All signature block interfaces defined
- [ ] Template interface updated with optional signatureBlocks
- [ ] Type guards implemented for runtime validation
- [ ] All types properly exported
- [ ] TypeScript compilation successful
- [ ] No type errors in existing code
- [ ] JSDoc comments added for clarity

## Common Pitfalls

1. **Forgetting optional properties** - signatureBlocks must be optional
2. **Overly strict types** - Allow flexibility for future fields
3. **Missing exports** - Ensure all types are exported
4. **Breaking existing code** - Changes must be backward compatible

## Code Example - Complete Type Definitions

```typescript
// Add to src/types/index.ts

// ============= Signature Block Types =============

/**
 * Defines a field within a signature block
 */
export interface FieldDefinition {
  required: boolean;
  label: string;
  defaultValue?: string;
}

/**
 * Collection of fields for a signature party
 */
export interface SignatureFields {
  name: FieldDefinition;
  title?: FieldDefinition;
  company?: FieldDefinition;
  date?: FieldDefinition;
  registrationNumber?: FieldDefinition;
  [key: string]: FieldDefinition | undefined;
}

/**
 * Layout options for signature block positioning
 */
export interface SignatureLayout {
  position: 'standalone' | 'side-by-side';
  groupWith?: string;
  preventPageBreak?: boolean;
}

/**
 * Defines a party who needs to sign
 */
export interface SignatureParty {
  role: string;
  label: string;
  fields: SignatureFields;
}

/**
 * Complete signature block definition
 */
export interface SignatureBlock {
  id: string;
  type: 'single' | 'multiple';
  layout?: SignatureLayout;
  party: SignatureParty;
}

// Update existing Template interface
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  sections: TemplateSection[];
  metadata?: TemplateMetadata;
  signatureBlocks?: SignatureBlock[];  // NEW
}
```

## Notes

- These types will be used by the PDF generation service
- Consider versioning if we need to support multiple schema versions
- Type guards will be useful for template validation
- Keep types flexible enough for future enhancements 