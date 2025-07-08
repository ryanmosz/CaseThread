# Product Requirements Document: Parent Task 4.0 - OpenAI Integration

## Introduction/Overview

This PRD defines the implementation of OpenAI integration for the CaseThread CLI POC. The integration will connect the existing template and YAML services with OpenAI's o3 model to generate professional legal documents. This component forms the core AI-powered document generation capability of the CaseThread system.

## Goals

1. Implement a robust OpenAI service that integrates with existing template and YAML services
2. Create reliable prompt engineering to combine templates, explanations, and YAML data
3. Ensure proper error handling and user feedback for API failures
4. Validate generated documents meet expected markdown format requirements
5. Provide cost estimation and logging for API usage tracking
6. Enable comprehensive testing through mock OpenAI service implementation

## User Stories

1. **As a legal professional**, I want to generate legal documents using AI so that I can save time on document drafting.
2. **As a CLI user**, I want clear feedback when OpenAI is unavailable so that I understand why generation failed.
3. **As a law firm administrator**, I want to track API usage costs so that I can monitor expenses.
4. **As a developer**, I want to test document generation without hitting the real API so that I can develop efficiently.
5. **As a user**, I want the system to handle long API response times gracefully so that I know the process is still running.

## Functional Requirements

1. **OpenAI Client Initialization**
   - Initialize OpenAI client using API key from environment variables
   - Configure client with o3 model and 0.2 temperature
   - Validate API key presence on service initialization
   - Provide clear error messages for missing configuration

2. **Prompt Building**
   - Combine template JSON structure, explanation markdown, and YAML data into coherent prompt
   - Format prompt to instruct AI to generate professional legal documents
   - Include clear instructions for markdown output format
   - Ensure prompt stays within token limits for o3 model

3. **Document Generation**
   - Send formatted prompt to OpenAI API
   - Handle API responses with proper error catching
   - Implement retry logic with exponential backoff (max 3 retries)
   - Report unavailability to user and exit gracefully if API is down
   - Respect 60-second timeout for long-running requests

4. **Response Validation**
   - Verify response contains valid markdown syntax
   - Check that response is not empty or truncated
   - Validate basic document structure (headers, sections)
   - Ensure response length is reasonable (1-20 pages worth)

5. **Cost Tracking**
   - Calculate token usage from API response
   - Estimate cost based on o3 model pricing
   - Log cost information to debug log (optional)
   - Provide cost summary in verbose mode

6. **Mock Service Implementation**
   - Create mock OpenAI service for testing
   - Generate deterministic responses based on input
   - Simulate API delays and failures for testing
   - Support all the same methods as real service

7. **Error Handling**
   - Catch and handle OpenAI API errors gracefully
   - Provide user-friendly error messages
   - Log detailed errors to debug log
   - Exit with appropriate error codes

## Non-Goals (Out of Scope)

1. **Streaming responses** - o3 model doesn't support streaming
2. **Multiple model support** - Only o3 model for this POC
3. **Response caching** - Not needed for POC
4. **Batch processing** - Single document generation only
5. **Custom temperature per document type** - Fixed at 0.2
6. **Token optimization** - Basic implementation sufficient

## Design Considerations

### Service Architecture
- Service should be stateless and instantiable
- Use dependency injection pattern for testability
- Separate concerns between prompt building and API calls
- Return structured response objects with metadata

### Prompt Engineering
- Use clear, structured prompts with numbered sections
- Include examples in prompt when helpful
- Explicitly request markdown format output
- Specify professional legal language requirement

### Error Strategy
- Fail fast on configuration errors
- Retry transient network errors
- Clear distinction between user errors and system errors
- Always clean up resources on failure

## Technical Considerations

### Dependencies
- OpenAI SDK v4.x as specified in tech stack
- Existing types from `src/types/index.ts`
- Winston logger from `src/utils/logger.ts`
- Environment variables via dotenv

### Integration Points
- Template service for loading templates
- YAML service for parsing input data
- Logger for debug output
- Future CLI command handler

### Testing Approach
- Unit tests for each public method
- Integration tests with mock service
- Error scenario coverage
- No actual API calls in tests

## Success Metrics

1. **Functionality**
   - Successfully generates documents for all template types
   - Handles API unavailability gracefully
   - Provides accurate cost estimates

2. **Reliability**
   - 100% test coverage for OpenAI service
   - All error paths tested and handled
   - Retry logic prevents transient failures

3. **Performance**
   - Response within 60 seconds timeout
   - Minimal overhead beyond API call time
   - Efficient prompt construction

4. **Developer Experience**
   - Clear service interface
   - Comprehensive mock for testing
   - Well-documented code

## Open Questions

1. **Token Limits** - What's the maximum expected prompt size? (Assumed: Will fit within o3 context window)
2. **Rate Limiting** - Should we implement rate limiting? (Assumed: No, rely on OpenAI SDK)
3. **Response Format** - Any specific markdown formatting requirements? (Assumed: Standard markdown)
4. **Logging Detail** - How verbose should cost logging be? (Assumed: Summary only) 