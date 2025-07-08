# Task 4.0 Checklist - OpenAI Integration

## Relevant Files

- `.env.example` - Environment variables template (needs creation)
- `src/services/openai.ts` - OpenAI API integration service
- `src/services/mock-openai.ts` - Mock OpenAI service for testing
- `src/types/openai.ts` - OpenAI-specific type definitions
- `__tests__/services/openai.test.ts` - Unit tests for OpenAI service
- `__tests__/services/mock-openai.test.ts` - Tests for mock service
- `src/utils/retry.ts` - Retry logic utility (if needed separately)

### Notes

- Run all tests inside Docker container: `docker exec casethread-dev npm test`
- Mock OpenAI responses for all unit tests - no real API calls
- Test files go in `__tests__/` directory mirroring `src/` structure
- Ensure .env.example is created but .env is gitignored

## Tasks

- [ ] 4.0 Implement OpenAI integration
  - [ ] 4.1 Create src/services/openai.ts with OpenAI client initialization
  - [ ] 4.2 Implement buildPrompt function to combine template, explanation, and YAML data
  - [ ] 4.3 Create generateDocument function with error handling and retry logic
  - [ ] 4.4 Add timeout handling for long-running API calls (60 second timeout)
  - [ ] 4.5 Implement response validation to ensure valid markdown output
  - [ ] 4.6 Add cost estimation based on token count (optional logging)
  - [ ] 4.7 Create mock OpenAI service for testing purposes 