# CaseThread Test Scenario Scripts

This directory contains scripts for running comprehensive test scenarios with the CaseThread document generation system.

## Available Scripts

### 1. `run-all-scenarios.sh`
**Full Test Suite - Standard Mode**
- Runs all 20 scenario files through the standard document generation pipeline
- Outputs organized by client in `output/test-scenarios/`
- Generates comprehensive results and logs

```bash
./scripts/run-all-scenarios.sh
```

### 2. `run-scenarios-quality.sh`
**Flexible Test Runner with Quality Mode Support**
- Supports both standard and LangGraph quality modes
- Can run single files or all scenarios
- Dry-run capability to preview commands
- Organized output by client

```bash
# Run all scenarios in standard mode
./scripts/run-scenarios-quality.sh

# Run all scenarios with LangGraph quality pipeline
./scripts/run-scenarios-quality.sh --quality

# Preview commands without execution
./scripts/run-scenarios-quality.sh --dry-run

# Run single scenario
./scripts/run-scenarios-quality.sh --file cil-01-patent-assignment.yaml

# Run single scenario with quality mode
./scripts/run-scenarios-quality.sh --quality --file cil-01-patent-assignment.yaml
```

### 3. `scenario-commands.txt`
**Individual Command Reference**
- Copy/paste commands for running individual scenarios
- Includes both standard and quality mode examples
- Organized by client

## Test Scenarios Overview

The scripts process **20 YAML scenario files** covering:

### ChemInnovate Labs (6 scenarios)
- Patent Assignment Agreement
- Patent License Agreement  
- Office Action Response
- Provisional Patent Application
- Cease and Desist Letter
- Technology Transfer Agreement

### Iris Design Studio (4 scenarios)
- Trademark Amendment
- Settlement NDA
- Opposition Response
- Office Action Response (trademark)

### Rainbow Tales Publishing (4 scenarios)
- Collaboration NDA
- Trademark Application
- Technology Transfer Agreement (animation)
- Cease and Desist Response

### TechFlow Solutions (6 scenarios)
- Patent Assignment (founders)
- Office Action Response (Alice rejection)
- GPL Compliance Memo
- Patent License (CloudGiant)
- Cease and Desist Letter
- Patent Strategy Memo

## Output Organization

Results are organized by client:
```
output/
├── test-scenarios/           # Standard mode results
│   ├── ChemInnovate-Labs/
│   ├── Iris-Design-Studio/
│   ├── Rainbow-Tales-Publishing/
│   └── TechFlow-Solutions/
├── quality-test/             # Quality mode results
│   ├── ChemInnovate-Labs/
│   ├── Iris-Design-Studio/
│   ├── Rainbow-Tales-Publishing/
│   └── TechFlow-Solutions/
├── test-scenarios.log        # Detailed execution logs
├── quality-test.log          # Quality mode logs
├── test-results.txt          # Summary results
└── quality-results.txt       # Quality mode summary
```

## Performance Expectations

### Standard Mode (6 seconds per document)
- Total time: ~2 minutes for all 20 scenarios
- Uses existing pipeline with GPT-4o

### Quality Mode (25-35 seconds per document)
- Total time: ~8-12 minutes for all 20 scenarios
- Uses LangGraph pipeline with GPT-4 + o3 strategic selection
- Includes quality gates, iterative refinement, and enhanced legal analysis

## Usage Examples

### Quick Test - Single Document
```bash
# Test one scenario in standard mode
npm run cli -- generate "patent-assignment-agreement" "docs/testing/scenario-inputs/cil-01-patent-assignment.yaml" --output "./output/test.md"

# Test same scenario with quality mode
npm run cli -- generate "patent-assignment-agreement" "docs/testing/scenario-inputs/cil-01-patent-assignment.yaml" --output "./output/test-quality.md" --quality
```

### Full Test Suite
```bash
# Run all scenarios - standard mode (fast)
./scripts/run-all-scenarios.sh

# Run all scenarios - quality mode (comprehensive)
./scripts/run-scenarios-quality.sh --quality
```

### Preview Commands
```bash
# See what would be executed without running
./scripts/run-scenarios-quality.sh --dry-run
./scripts/run-scenarios-quality.sh --dry-run --quality
```

### Testing Individual Clients
```bash
# Test just ChemInnovate Labs scenarios
./scripts/run-scenarios-quality.sh --file cil-01-patent-assignment.yaml
./scripts/run-scenarios-quality.sh --file cil-02-patent-license.yaml
./scripts/run-scenarios-quality.sh --file cil-03-office-action-response.yaml
# ... etc
```

## Error Handling

- Scripts continue on individual failures
- Failed scenarios are logged and reported
- Exit codes indicate overall success/failure
- Detailed error logs available in output directory

## Requirements

- Node.js and npm installed
- CaseThread project properly configured
- OpenAI API key configured for quality mode
- Sufficient disk space for output files

## Troubleshooting

### Common Issues

1. **Script permission denied**
   ```bash
   chmod +x scripts/run-all-scenarios.sh
   chmod +x scripts/run-scenarios-quality.sh
   ```

2. **YAML file not found**
   - Ensure you're in the project root directory
   - Check that scenario files exist in `docs/testing/scenario-inputs/`

3. **Quality mode failures**
   - Verify OpenAI API key is configured
   - Check that LangGraph dependencies are installed
   - Review logs for specific error messages

4. **Output directory issues**
   - Scripts create output directories automatically
   - Ensure sufficient disk space
   - Check file permissions

## Script Features

- **Colored output** for easy reading
- **Progress tracking** with timing
- **Client-based organization** of results
- **Comprehensive logging** 
- **Error resilience** - continues on failures
- **Flexible execution** - single files or full suite
- **Mode selection** - standard vs quality pipeline 