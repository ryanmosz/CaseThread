# CaseThread Multi-Model Pipeline - Product Context

## Why This Project Exists

### Problem Statement
The current CaseThread system, while fast (6 seconds), creates quality challenges for attorneys who:
- Need partner-level document quality for high-stakes legal matters
- Require sophisticated context integration from legal precedents
- Want consistent quality across all generated documents
- Need iterative refinement to achieve professional standards

### Critical Discovery
The existing system has a major gap: **ContextBundle retrieved by ContextBuilderAgent is NOT passed to OpenAI service**, meaning sophisticated legal precedents in ChromaDB are unused in document generation.

### Solution Vision
A quality-focused 3-agent pipeline with strategic model selection that delivers partner-level legal documents through contextual intelligence, rigorous quality gates, and iterative refinement.

## How It Should Work

### Multi-Model Agent Flow
1. **Agent 1: Contextual Document Writer**
   - Context Assembly (GPT-4): Organize ChromaDB precedents and attorney patterns
   - Document Generation (o3): Core legal writing with context integration
   - Basic Refinement (GPT-4): Handle simple revision requests

2. **Agent 2: Quality Gate Analyzer**
   - Initial Scanning (GPT-4): Basic completeness and formatting checks
   - Legal Analysis (o3): Complex legal accuracy and risk assessment
   - Scoring & Feedback (GPT-4): Generate structured feedback and quality scores

3. **Agent 3: Final Reviewer**
   - Consistency Check (GPT-4): Cross-reference consistency across document
   - Strategic Review (o3): Partner-level strategic positioning and final quality
   - Client Readiness (GPT-4): Final formatting and presentation polish

### Core User Experience Principles
- **Quality Over Speed**: 25-35 seconds vs 6 seconds for partner-level quality
- **Cost Optimization**: Strategic model selection for 40-50% cost reduction
- **Context Intelligence**: ChromaDB precedents actively enhance documents
- **Iterative Refinement**: Quality gates with targeted feedback loops

## Quality Standards Integration

### 5-Criteria Quality Scoring System
1. **Legal Accuracy** (25%): Correct terminology, citations, legal concepts
2. **Completeness** (25%): All template sections, required elements
3. **Consistency** (20%): Terminology alignment, logical flow
4. **Professional Tone** (15%): Appropriate formality and legal writing
5. **Risk Mitigation** (15%): Protective language, compliance considerations

### Quality Gates
- **Agent 2 Gate**: 80% minimum threshold
- **Agent 3 Gate**: 90% minimum threshold
- **Maximum 3 refinement iterations** with targeted feedback

## Context Integration System

### ChromaDB Precedent Utilization
- **Legal Precedents**: Similar case outcomes and legal strategies
- **Attorney Patterns**: Learned preferences and successful approaches
- **Client Preferences**: Specific terms and risk tolerance levels
- **Document Templates**: 8 core IP document types with contextual enhancement

### Learning System
- **Pattern Recognition**: Successful document generation strategies
- **Attorney Preferences**: Individual attorney style and approach learning
- **Client Adaptation**: Client-specific customization and requirements
- **Quality Improvement**: Continuous refinement based on feedback

## Integration Requirements

### Backend Preservation
- Maintain existing CLI functionality with optional quality mode
- Preserve multi-agent architecture (Context Builder, Drafting, Overseer)
- Keep ChromaDB integration and vector search capabilities
- Ensure Docker deployment compatibility

### Enhanced Data Flow
```
User Request → Context Assembly (GPT-4) → Document Generation (o3) → Quality Analysis (GPT-4 + o3) → Final Review (GPT-4 + o3) → Refined Document
```

## Success Metrics
- **Quality Improvement**: 90%+ documents meet partner-level standards
- **Efficiency Gains**: 40% reduction in attorney revision time
- **Cost Optimization**: 40-50% cost reduction vs all-o3 approach
- **Context Utilization**: ChromaDB precedents actively enhance document quality
- **Learning System**: Continuous improvement from generation sessions 