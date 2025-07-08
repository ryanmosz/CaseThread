## Relevant Files

- `package.json` - Project configuration and dependencies management
- `tsconfig.json` - TypeScript configuration for the project
- `jest.config.js` - Jest testing configuration
- `.env.example` - Environment variables template
- `Dockerfile` - Docker container configuration
- `docker-compose.yml` - Docker compose setup for development
- `src/index.ts` - CLI entry point
- `src/commands/generate.ts` - Generate command implementation
- `src/services/openai.ts` - OpenAI API integration service
- `src/services/template.ts` - Template loading and validation service
- `src/services/yaml.ts` - YAML parsing and validation service
- `src/utils/spinner.ts` - Progress indicator utility
- `src/utils/logger.ts` - Debug logging utility
- `src/utils/validator.ts` - Input validation utility
- `src/types/index.ts` - TypeScript type definitions
- `__tests__/validator.test.ts` - Unit tests for validator
- `__tests__/template.test.ts` - Unit tests for template service
- `__tests__/yaml.test.ts` - Unit tests for YAML service
- `__tests__/generate.integration.test.ts` - Integration tests for generation

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- All development will be done inside Docker container using `docker exec` commands
- Follow npm-package-check rule to verify dependencies before installation
- Follow terminal-path-verification rule for all file operations

## Tasks

- [ ] 1.0 Set up Docker development environment
  - [x] 1.1 Create Dockerfile with Node.js 20 Alpine image, including git and bash
  - [x] 1.2 Create docker-compose.yml with volume mounts for code and node_modules
  - [ ] 1.3 Add .dockerignore file to exclude node_modules and dist directories
  - [ ] 1.4 Create docker-entrypoint.sh script for container initialization
  - [ ] 1.5 Test Docker setup with `docker-compose up -d` and verify container access

- [ ] 2.0 Initialize TypeScript project with dependencies
  - [ ] 2.1 Run `npm init -y` inside container to create package.json
  - [ ] 2.2 Install TypeScript and Node types: `npm install --save-dev typescript @types/node`
  - [ ] 2.3 Create tsconfig.json with strict mode and ES2022 target
  - [ ] 2.4 Install core dependencies following npm-package-check: commander, openai, js-yaml, ora, winston, dotenv, chalk
  - [ ] 2.5 Install dev dependencies: jest, ts-jest, @types/jest, ts-node, nodemon, eslint, prettier
  - [ ] 2.6 Configure npm scripts in package.json (dev, build, start, cli, test, lint, format)
  - [ ] 2.7 Create .env.example with OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TEMPERATURE placeholders

- [ ] 3.0 Implement core services (template, YAML, logging)
  - [ ] 3.1 Create src/types/index.ts with TypeScript interfaces for DocumentType, YamlData, Template
  - [ ] 3.2 Implement src/utils/validator.ts with isValidDocumentType function and SUPPORTED_TYPES constant
  - [ ] 3.3 Create src/utils/logger.ts using Winston with file and console transports
  - [ ] 3.4 Implement src/services/template.ts with loadTemplate and loadExplanation functions
  - [ ] 3.5 Implement src/services/yaml.ts with parseYaml and validateYamlFields functions
  - [ ] 3.6 Create src/utils/spinner.ts wrapper around Ora with updateMessage method
  - [ ] 3.7 Write unit tests for validator, template service, and yaml service

- [ ] 4.0 Implement OpenAI integration
  - [ ] 4.1 Create src/services/openai.ts with OpenAI client initialization
  - [ ] 4.2 Implement buildPrompt function to combine template, explanation, and YAML data
  - [ ] 4.3 Create generateDocument function with error handling and retry logic
  - [ ] 4.4 Add timeout handling for long-running API calls (60 second timeout)
  - [ ] 4.5 Implement response validation to ensure valid markdown output
  - [ ] 4.6 Add cost estimation based on token count (optional logging)
  - [ ] 4.7 Create mock OpenAI service for testing purposes

- [ ] 5.0 Build CLI interface with Commander
  - [ ] 5.1 Create src/index.ts with shebang and Commander setup
  - [ ] 5.2 Implement src/commands/generate.ts with document type and input path arguments
  - [ ] 5.3 Add --output flag for custom output directory with default to current directory
  - [ ] 5.4 Integrate spinner updates throughout the generation process
  - [ ] 5.5 Implement error handling with user-friendly messages and exit codes
  - [ ] 5.6 Add --debug flag to enable verbose logging
  - [ ] 5.7 Create output file with timestamp-based naming pattern

- [ ] 6.0 Create comprehensive test suite
  - [ ] 6.1 Configure jest.config.js for TypeScript and coverage reporting
  - [ ] 6.2 Write unit tests for all validators with valid/invalid cases
  - [ ] 6.3 Create unit tests for template loading with mock file system
  - [ ] 6.4 Write unit tests for YAML parsing with various input scenarios
  - [ ] 6.5 Implement integration test for full document generation flow
  - [ ] 6.6 Add tests for error scenarios (missing files, invalid types, API failures)
  - [ ] 6.7 Create GitHub Actions workflow for automated testing on push
  - [ ] 6.8 Add test coverage reporting with minimum 80% threshold 