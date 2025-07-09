#!/usr/bin/env npx tsx

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Orchestrator } from '../src/agents/Orchestrator';
import { ParallelOrchestrator } from '../src/agents/ParallelOrchestrator';
import { OpenAIService } from '../src/services/openai';
import { loadTemplate } from '../src/services/template';
import { parseYaml } from '../src/services/yaml';
import { logger } from '../src/utils/logger';
import { Template, YamlData } from '../src/types';

interface QualityMetrics {
  legal_accuracy: number;
  legal_completeness: number;
  legal_compliance: number;
  professional_formatting: number;
  clarity_precision: number;
  risk_assessment: number;
  enforceability: number;
  jurisdictional_accuracy: number;
  overall_score: number;
  detailed_analysis: string;
  critical_issues: string[];
  recommendations: string[];
}

interface ComparisonResult {
  document_type: string;
  regular_time: number;
  parallel_time: number;
  speed_improvement: number;
  regular_quality: QualityMetrics;
  parallel_quality: QualityMetrics;
  quality_difference: number;
  winner: 'regular' | 'parallel' | 'tie';
  analysis: string;
}

class LegalQualityJudge {
  private openai: OpenAIService;

  constructor() {
    this.openai = new OpenAIService({
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'o3',
      temperature: 0.1,
      maxTokens: 2000
    });
  }

  async evaluateDocument(document: string, documentType: string, template: Template): Promise<QualityMetrics> {
    const templateContent = JSON.stringify(template, null, 2);
    const prompt = `You are an expert legal document reviewer and quality assessor with 20+ years of experience in legal practice. You must evaluate this ${documentType} with EXTREME STRICTNESS as legal documents require absolute precision and accuracy.

DOCUMENT TO EVALUATE:
${document}

TEMPLATE REFERENCE:
${templateContent}

EVALUATION CRITERIA (Rate each on a scale of 1-10, where 10 is exceptional legal quality):

1. LEGAL ACCURACY (Weight: 25%)
   - Correct legal terminology and usage
   - Accurate citations and references
   - Proper legal concepts and principles
   - No factual or legal errors
   - Appropriate legal standards for jurisdiction

2. LEGAL COMPLETENESS (Weight: 20%)
   - All required legal elements present
   - No missing clauses or provisions
   - Comprehensive coverage of legal issues
   - All template sections properly addressed
   - Complete legal framework

3. LEGAL COMPLIANCE (Weight: 20%)
   - Adherence to relevant laws and regulations
   - Compliance with jurisdictional requirements
   - Proper legal procedures followed
   - Regulatory compliance considerations
   - Ethical standards met

4. PROFESSIONAL FORMATTING (Weight: 10%)
   - Proper legal document structure
   - Correct formatting conventions
   - Professional presentation
   - Consistent style and layout
   - Appropriate legal document formatting

5. CLARITY AND PRECISION (Weight: 10%)
   - Clear, unambiguous language
   - Precise legal definitions
   - Logical flow and organization
   - Easy to understand for intended audience
   - No contradictory statements

6. RISK ASSESSMENT (Weight: 10%)
   - Identification of potential legal risks
   - Appropriate risk mitigation measures
   - Protection of client interests
   - Consideration of worst-case scenarios
   - Proactive risk management

7. ENFORCEABILITY (Weight: 3%)
   - Document would be enforceable in court
   - Proper legal structure for enforcement
   - Clear obligations and rights
   - Appropriate remedies specified
   - Legally binding elements present

8. JURISDICTIONAL ACCURACY (Weight: 2%)
   - Appropriate for specified jurisdiction
   - Correct legal standards applied
   - Proper court references
   - Accurate legal procedures
   - Jurisdiction-specific requirements met

CRITICAL EVALUATION STANDARDS:
- Deduct 2 points for ANY legal inaccuracy
- Deduct 3 points for missing critical legal elements
- Deduct 1 point for unclear or ambiguous language
- Deduct 2 points for compliance issues
- Deduct 1 point for formatting problems
- A score below 7 indicates the document may not be suitable for legal use
- A score below 5 indicates serious legal deficiencies

RESPONSE FORMAT (JSON):
{
  "legal_accuracy": [score],
  "legal_completeness": [score],
  "legal_compliance": [score],
  "professional_formatting": [score],
  "clarity_precision": [score],
  "risk_assessment": [score],
  "enforceability": [score],
  "jurisdictional_accuracy": [score],
  "overall_score": [weighted_average],
  "detailed_analysis": "[Comprehensive analysis of document quality, highlighting strengths and weaknesses]",
  "critical_issues": ["[List of critical legal issues found]"],
  "recommendations": ["[Specific recommendations for improvement]"]
}

Be extremely thorough and critical. This is a legal document that could be used in real legal proceedings. Any errors or omissions could have serious legal consequences.`;

    try {
      // Use the OpenAI service to generate document with evaluation prompt
      const dummyTemplate: Template = {
        id: 'quality-evaluation',
        name: 'Quality Evaluation Template',
        description: 'Template for quality evaluation',
        version: '1.0.0',
        category: 'evaluation',
        jurisdiction: 'US',
        sections: [],
        requiredFields: [],
        metadata: {
          author: 'System',
          lastUpdated: new Date().toISOString(),
          tags: ['evaluation', 'quality']
        }
      };

      const dummyYamlData: YamlData = {
        client: 'system',
        attorney: 'system',
        document_type: 'evaluation',
        template: 'quality-evaluation.json'
      };

      const response = await this.openai.generateDocument(
        dummyTemplate,
        prompt,
        dummyYamlData
      );

      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse evaluation response');
      }

      const evaluation = JSON.parse(jsonMatch[0]);
      
      // Validate the evaluation structure
      const requiredFields = [
        'legal_accuracy', 'legal_completeness', 'legal_compliance',
        'professional_formatting', 'clarity_precision', 'risk_assessment',
        'enforceability', 'jurisdictional_accuracy', 'overall_score',
        'detailed_analysis', 'critical_issues', 'recommendations'
      ];

      for (const field of requiredFields) {
        if (!(field in evaluation)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      return evaluation as QualityMetrics;
    } catch (error) {
      logger.error('Error evaluating document quality:', error);
      throw error;
    }
  }

  async compareDocuments(
    regularDoc: string,
    parallelDoc: string,
    documentType: string,
    template: Template
  ): Promise<{ regular: QualityMetrics; parallel: QualityMetrics; comparison: string }> {
    const [regularQuality, parallelQuality] = await Promise.all([
      this.evaluateDocument(regularDoc, documentType, template),
      this.evaluateDocument(parallelDoc, documentType, template)
    ]);

    const comparisonPrompt = `You are a senior legal partner conducting a critical comparison of two ${documentType} documents. Both documents were generated from the same input but using different processing methods.

REGULAR PROCESSING DOCUMENT:
${regularDoc}

PARALLEL PROCESSING DOCUMENT:
${parallelDoc}

QUALITY SCORES:
Regular Document:
- Legal Accuracy: ${regularQuality.legal_accuracy}/10
- Legal Completeness: ${regularQuality.legal_completeness}/10
- Legal Compliance: ${regularQuality.legal_compliance}/10
- Overall Score: ${regularQuality.overall_score}/10

Parallel Document:
- Legal Accuracy: ${parallelQuality.legal_accuracy}/10
- Legal Completeness: ${parallelQuality.legal_completeness}/10
- Legal Compliance: ${parallelQuality.legal_compliance}/10
- Overall Score: ${parallelQuality.overall_score}/10

CRITICAL ANALYSIS REQUIRED:
1. Which document is legally superior and why?
2. Are there any critical legal differences?
3. Which would you recommend for actual legal use?
4. What are the risks of using the lower-quality document?
5. Is the quality difference significant enough to impact legal outcomes?

Provide a comprehensive comparison focusing on legal implications and practical usability. Be extremely critical and highlight any concerns about using either document in legal proceedings.`;

    const dummyTemplate: Template = {
      id: 'comparison-evaluation',
      name: 'Comparison Evaluation Template',
      description: 'Template for comparison evaluation',
      version: '1.0.0',
      category: 'evaluation',
      jurisdiction: 'US',
      sections: [],
      requiredFields: [],
      metadata: {
        author: 'System',
        lastUpdated: new Date().toISOString(),
        tags: ['evaluation', 'comparison']
      }
    };

    const dummyYamlData: YamlData = {
      client: 'system',
      attorney: 'system',
      document_type: 'comparison',
      template: 'comparison-evaluation.json'
    };

    const response = await this.openai.generateDocument(
      dummyTemplate,
      comparisonPrompt,
      dummyYamlData
    );

    return {
      regular: regularQuality,
      parallel: parallelQuality,
      comparison: response.content
    };
  }
}

async function runQualityBenchmark(): Promise<void> {
  console.log('🏛️  Legal Document Quality Benchmark');
  console.log('=====================================');
  console.log('Using o3 as strict legal quality judge');
  console.log('');

  const testCases = [
    {
      type: 'nda-ip-specific',
      input: 'docs/testing/scenario-inputs/rtp-01-collaboration-nda.yaml',
      name: 'NDA with IP Provisions'
    },
    {
      type: 'patent-assignment-agreement',
      input: 'docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml',
      name: 'Patent Assignment Agreement'
    },
    {
      type: 'cease-and-desist-letter',
      input: 'docs/testing/scenario-inputs/tfs-05-cease-desist-cacheflow.yaml',
      name: 'Cease and Desist Letter'
    },
    {
      type: 'office-action-response',
      input: 'docs/testing/scenario-inputs/tfs-02-office-action-alice.yaml',
      name: 'Office Action Response'
    }
  ];

  const results: ComparisonResult[] = [];
  const judge = new LegalQualityJudge();

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log('=' .repeat(50));

    try {
      // Load input data and template
      const inputData = await parseYaml(testCase.input);
      const template = await loadTemplate(testCase.type);

      // Initialize orchestrators
      const regularOrchestrator = new Orchestrator();
      const parallelOrchestrator = new ParallelOrchestrator();

      // Generate documents with timing
      console.log('⚖️  Generating with regular processing...');
      const regularStart = Date.now();
      const regularResult = await regularOrchestrator.runJob({
        documentType: testCase.type,
        inputPath: testCase.input,
        outputPath: './temp-regular',
        options: { debug: false }
      });
      const regularTime = (Date.now() - regularStart) / 1000;

      if (!regularResult.success) {
        throw new Error(`Regular processing failed: ${regularResult.error?.message}`);
      }

      console.log('⚡ Generating with parallel processing...');
      const parallelStart = Date.now();
      const parallelResult = await parallelOrchestrator.runJob({
        documentType: testCase.type,
        inputPath: testCase.input,
        outputPath: './temp-parallel',
        options: { debug: false }
      });
      const parallelTime = (Date.now() - parallelStart) / 1000;

      if (!parallelResult.success) {
        throw new Error(`Parallel processing failed: ${parallelResult.error?.message}`);
      }

      console.log(`⏱️  Regular: ${regularTime.toFixed(2)}s, Parallel: ${parallelTime.toFixed(2)}s`);
      console.log(`🚀 Speed improvement: ${(regularTime / parallelTime).toFixed(2)}×`);

      // Extract document content from results
      const regularDoc = regularResult.reviewPacket?.summary || 'No content generated';
      const parallelDoc = parallelResult.reviewPacket?.summary || 'No content generated';

      // Evaluate quality with strict legal standards
      console.log('🔍 Evaluating legal document quality (this may take a moment)...');
      const qualityComparison = await judge.compareDocuments(
        regularDoc,
        parallelDoc,
        testCase.name,
        template
      );

      const qualityDifference = qualityComparison.parallel.overall_score - qualityComparison.regular.overall_score;
      const winner = Math.abs(qualityDifference) < 0.1 ? 'tie' : 
                    qualityDifference > 0 ? 'parallel' : 'regular';

      const result: ComparisonResult = {
        document_type: testCase.name,
        regular_time: regularTime,
        parallel_time: parallelTime,
        speed_improvement: regularTime / parallelTime,
        regular_quality: qualityComparison.regular,
        parallel_quality: qualityComparison.parallel,
        quality_difference: qualityDifference,
        winner,
        analysis: qualityComparison.comparison
      };

      results.push(result);

      // Display results
      console.log('\n📊 QUALITY ASSESSMENT RESULTS:');
      console.log(`Regular Document Score: ${qualityComparison.regular.overall_score.toFixed(1)}/10`);
      console.log(`Parallel Document Score: ${qualityComparison.parallel.overall_score.toFixed(1)}/10`);
      console.log(`Quality Difference: ${qualityDifference > 0 ? '+' : ''}${qualityDifference.toFixed(1)} points`);
      console.log(`Winner: ${winner.toUpperCase()}`);

      // Show critical issues if any
      if (qualityComparison.regular.critical_issues.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES (Regular):');
        qualityComparison.regular.critical_issues.forEach(issue => console.log(`  - ${issue}`));
      }

      if (qualityComparison.parallel.critical_issues.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES (Parallel):');
        qualityComparison.parallel.critical_issues.forEach(issue => console.log(`  - ${issue}`));
      }

      // Quality warnings
      if (qualityComparison.regular.overall_score < 7) {
        console.log('\n⚠️  WARNING: Regular document quality below legal standards (< 7.0)');
      }
      if (qualityComparison.parallel.overall_score < 7) {
        console.log('\n⚠️  WARNING: Parallel document quality below legal standards (< 7.0)');
      }

    } catch (error) {
      console.error(`❌ Error testing ${testCase.name}:`, error);
    }
  }

  // Generate comprehensive report
  generateQualityReport(results);
}

function generateQualityReport(results: ComparisonResult[]): void {
  console.log('\n\n🏛️  COMPREHENSIVE LEGAL QUALITY REPORT');
  console.log('=' .repeat(60));

  // Overall statistics
  const avgRegularScore = results.reduce((sum, r) => sum + r.regular_quality.overall_score, 0) / results.length;
  const avgParallelScore = results.reduce((sum, r) => sum + r.parallel_quality.overall_score, 0) / results.length;
  const avgSpeedImprovement = results.reduce((sum, r) => sum + r.speed_improvement, 0) / results.length;

  console.log('\n📈 OVERALL STATISTICS:');
  console.log(`Average Regular Quality: ${avgRegularScore.toFixed(1)}/10`);
  console.log(`Average Parallel Quality: ${avgParallelScore.toFixed(1)}/10`);
  console.log(`Average Speed Improvement: ${avgSpeedImprovement.toFixed(1)}×`);
  console.log(`Quality Trade-off: ${(avgParallelScore - avgRegularScore).toFixed(1)} points`);

  // Individual results
  console.log('\n📋 INDIVIDUAL RESULTS:');
  results.forEach(result => {
    console.log(`\n${result.document_type}:`);
    console.log(`  Speed: ${result.speed_improvement.toFixed(1)}× faster`);
    console.log(`  Quality: ${result.regular_quality.overall_score.toFixed(1)} → ${result.parallel_quality.overall_score.toFixed(1)} (${result.quality_difference > 0 ? '+' : ''}${result.quality_difference.toFixed(1)})`);
    console.log(`  Winner: ${result.winner.toUpperCase()}`);
  });

  // Legal quality breakdown
  console.log('\n⚖️  LEGAL QUALITY BREAKDOWN:');
  const categories = [
    'legal_accuracy', 'legal_completeness', 'legal_compliance',
    'professional_formatting', 'clarity_precision', 'risk_assessment',
    'enforceability', 'jurisdictional_accuracy'
  ];

  categories.forEach(category => {
    const regularAvg = results.reduce((sum, r) => sum + (r.regular_quality[category as keyof QualityMetrics] as number), 0) / results.length;
    const parallelAvg = results.reduce((sum, r) => sum + (r.parallel_quality[category as keyof QualityMetrics] as number), 0) / results.length;
    const diff = parallelAvg - regularAvg;
    
    console.log(`  ${category.replace('_', ' ').toUpperCase()}: ${regularAvg.toFixed(1)} → ${parallelAvg.toFixed(1)} (${diff > 0 ? '+' : ''}${diff.toFixed(1)})`);
  });

  // Critical issues summary
  const totalRegularIssues = results.reduce((sum, r) => sum + r.regular_quality.critical_issues.length, 0);
  const totalParallelIssues = results.reduce((sum, r) => sum + r.parallel_quality.critical_issues.length, 0);

  console.log('\n🚨 CRITICAL ISSUES SUMMARY:');
  console.log(`Regular Processing: ${totalRegularIssues} critical issues`);
  console.log(`Parallel Processing: ${totalParallelIssues} critical issues`);

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (avgParallelScore >= avgRegularScore && avgParallelScore >= 7.0) {
    console.log('✅ Parallel processing is recommended for production use');
    console.log(`   - Provides ${avgSpeedImprovement.toFixed(1)}× speed improvement`);
    console.log(`   - Maintains legal quality standards (${avgParallelScore.toFixed(1)}/10)`);
  } else if (avgParallelScore >= 7.0) {
    console.log('⚠️  Parallel processing acceptable but with trade-offs');
    console.log(`   - ${avgSpeedImprovement.toFixed(1)}× speed improvement`);
    console.log(`   - Quality trade-off: ${(avgParallelScore - avgRegularScore).toFixed(1)} points`);
  } else {
    console.log('❌ Parallel processing NOT recommended for legal documents');
    console.log(`   - Quality below legal standards (${avgParallelScore.toFixed(1)}/10)`);
    console.log('   - Stick with regular processing for legal compliance');
  }

  // Save detailed report
  const reportPath = join(process.cwd(), `quality-report-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

// Run the benchmark
runQualityBenchmark().catch(console.error); 