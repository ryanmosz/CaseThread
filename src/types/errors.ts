export enum ErrorCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  INVALID_ARGUMENTS = 2,
  INVALID_INPUT = 3,
  EMPTY_FILE = 4,
  FILE_TOO_LARGE = 5,
  FILE_ACCESS_ERROR = 6,
  INVALID_OUTPUT = 7,
  PERMISSION_ERROR = 8,
  FILE_READ_ERROR = 9,
  INVALID_OPTION = 10,
  DISK_FULL = 11,
  SYSTEM_LIMIT = 12,
  PARSING_ERROR = 13,
  PDF_GENERATION_ERROR = 14,
  GENERATION_ERROR = 15,
  VERIFICATION_ERROR = 16,
  FILE_NOT_FOUND = 17,
}

export interface ErrorMessages {
  INVALID_TYPE: (type: string, supported: string[]) => string;
  FILE_NOT_FOUND: (path: string) => string;
  TEMPLATE_NOT_FOUND: (type: string) => string;
  INVALID_YAML: (details: string) => string;
  MISSING_YAML_FIELDS: (fields: string[]) => string;
  OPENAI_ERROR: (details: string) => string;
  NETWORK_ERROR: () => string;
  PERMISSION_ERROR: (path: string) => string;
  UNKNOWN_ERROR: () => string;
}

export const ERROR_MESSAGES: ErrorMessages = {
  INVALID_TYPE: (type, supported) => 
    `Invalid document type: '${type}'\n\n` +
    `Supported document types:\n${supported.map(t => `  • ${t}`).join('\n')}\n\n` +
    `Example: casethread-poc generate patent-assignment input.yaml`,
    
  FILE_NOT_FOUND: (path) =>
    `File not found: '${path}'\n\n` +
    `Please check that the file exists and the path is correct.\n` +
    `Try using an absolute path or ensure you're in the right directory.`,
    
  TEMPLATE_NOT_FOUND: (type) =>
    `Template files not found for document type: '${type}'\n\n` +
    `Expected files:\n` +
    `  • templates/core/${type}.json\n` +
    `  • templates/explanations/${type}-explanation.md\n\n` +
    `Please ensure template files are properly installed.`,
    
  INVALID_YAML: (details) =>
    `Invalid YAML format in input file:\n\n${details}\n\n` +
    `Please check your YAML syntax. Common issues:\n` +
    `  • Incorrect indentation (use spaces, not tabs)\n` +
    `  • Missing colons after keys\n` +
    `  • Unclosed quotes`,
    
  MISSING_YAML_FIELDS: (fields) =>
    `Missing required fields in YAML input:\n\n` +
    `Required fields:\n${fields.map(f => `  • ${f}`).join('\n')}\n\n` +
    `Please add these fields to your input file and try again.`,
    
  OPENAI_ERROR: (details) =>
    `OpenAI API error:\n\n${details}\n\n` +
    `Possible solutions:\n` +
    `  • Check your API key is valid (OPENAI_API_KEY in .env)\n` +
    `  • Verify you have API credits available\n` +
    `  • Try again in a few moments if rate limited`,
    
  NETWORK_ERROR: () =>
    `Network connection error\n\n` +
    `Unable to connect to OpenAI API. Please check:\n` +
    `  • Your internet connection is working\n` +
    `  • No firewall/proxy blocking the connection\n` +
    `  • OpenAI services are operational`,
    
  PERMISSION_ERROR: (path) =>
    `Permission denied: '${path}'\n\n` +
    `Unable to write to the specified location. Please check:\n` +
    `  • You have write permissions for the directory\n` +
    `  • The directory is not read-only\n` +
    `  • Try using a different output directory with --output`,
    
  UNKNOWN_ERROR: () =>
    `An unexpected error occurred\n\n` +
    `Please try again or check the debug logs for more information.\n` +
    `Run with --debug flag to see detailed error information.`
}; 