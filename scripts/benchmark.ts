#!/usr/bin/env ts-node

/**
 * Benchmark script – measures wall-clock time for legacy Orchestrator vs ParallelOrchestrator.
 *
 * Usage:
 *   ts-node scripts/benchmark.ts <document-type> <input.yaml> [--trials N]
 */

import { performance } from 'perf_hooks';
import { Orchestrator } from '../src/agents/Orchestrator';
import { ParallelOrchestrator } from '../src/agents/ParallelOrchestrator';

const [, , docType, inputPath, ...rest] = process.argv;
const trialsFlagIdx = rest.indexOf('--trials');
const trials = trialsFlagIdx !== -1 ? parseInt(rest[trialsFlagIdx + 1] || '1', 10) : 1;

if (!docType || !inputPath) {
  console.error('Usage: benchmark <document-type> <input.yaml> [--trials N]');
  process.exit(1);
}

async function runOnce(orchestrator: any) {
  const start = performance.now();
  const result = await orchestrator.runJob({
    documentType: docType,
    inputPath,
    outputPath: 'benchmark-output',
    options: { debug: false }
  });
  const ms = performance.now() - start;
  return { ms, success: result.success };
}

(async () => {
  let serialTimes: number[] = [];
  let parallelTimes: number[] = [];

  for (let i = 0; i < trials; i++) {
    const serial = await runOnce(new Orchestrator());
    const parallel = await runOnce(new ParallelOrchestrator());
    if (!serial.success || !parallel.success) {
      console.error('Generation failed in one of the trials');
      process.exit(1);
    }
    serialTimes.push(serial.ms);
    parallelTimes.push(parallel.ms);
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  console.log(`Trials: ${trials}`);
  console.log(`Legacy avg:   ${avg(serialTimes).toFixed(0)} ms`);
  console.log(`Parallel avg: ${avg(parallelTimes).toFixed(0)} ms`);
  console.log(`Speed-up:     ${(avg(serialTimes) / avg(parallelTimes)).toFixed(2)}×`);
})(); 