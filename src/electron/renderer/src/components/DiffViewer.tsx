import React, { useMemo } from 'react';
import { Card, CardBody, Button, Chip, ScrollShadow } from '@heroui/react';

interface DiffViewerProps {
  originalText: string;
  modifiedText: string;
  title?: string;
  onApplyChanges?: (newContent: string) => void;
  onClose?: () => void;
}

interface DiffSegment {
  type: 'equal' | 'delete' | 'insert';
  content: string;
}

interface DiffLine {
  type: 'equal' | 'delete' | 'insert' | 'context';
  content: string;
  originalLineNumber?: number;
  modifiedLineNumber?: number;
  segments?: DiffSegment[];
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  originalText,
  modifiedText,
  title = 'Document Changes',
  onApplyChanges,
  onClose
}) => {
  const diffLines = useMemo(() => {
    // Safety check: limit document size to prevent performance issues
    const maxWords = 5000;
    const originalWords = originalText.split(/\s+/).length;
    const modifiedWords = modifiedText.split(/\s+/).length;
    
    if (originalWords > maxWords || modifiedWords > maxWords) {
      return [{
        type: 'context' as const,
        content: `Document too large to display word-level diff (${Math.max(originalWords, modifiedWords)} words). Maximum: ${maxWords} words.`,
        originalLineNumber: undefined,
        modifiedLineNumber: undefined
      }];
    }
    
    return computeDiff(originalText, modifiedText);
  }, [originalText, modifiedText]);

  const stats = useMemo(() => {
    const additions = diffLines.filter(line => line.type === 'insert').length;
    const deletions = diffLines.filter(line => line.type === 'delete').length;
    const changes = Math.max(additions, deletions);
    return { additions, deletions, changes };
  }, [diffLines]);

  const handleApplyChanges = () => {
    if (onApplyChanges) {
      onApplyChanges(modifiedText);
    }
  };

  return (
    <Card className="w-full h-full">
      <CardBody className="p-0 h-full flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-gray-500 dark:border-gray-400 p-4 bg-background/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                <div className="flex items-center space-x-2 text-xs text-foreground/60">
                  <span>
                    <Chip size="sm" color="success" variant="flat" className="text-xs">
                      +{stats.additions}
                    </Chip>
                  </span>
                  <span>
                    <Chip size="sm" color="danger" variant="flat" className="text-xs">
                      -{stats.deletions}
                    </Chip>
                  </span>
                  <span>{stats.changes} changes</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="flat"
                color="primary"
                onClick={handleApplyChanges}
                className="text-xs"
              >
                Apply Changes
              </Button>
              <Button
                size="sm"
                variant="light"
                onClick={onClose}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>

        {/* Diff Content */}
        <ScrollShadow className="flex-1 overflow-auto">
          <div className="font-mono text-sm">
            {diffLines.map((line, index) => (
              <div
                key={index}
                className={`
                  flex items-start hover:bg-background/50 transition-colors mb-2
                  ${line.type === 'delete' ? 'bg-danger/10 border-l-2 border-danger' : ''}
                  ${line.type === 'insert' ? 'bg-success/10 border-l-2 border-success' : ''}
                  ${line.type === 'context' ? 'bg-default/5' : ''}
                `}
              >
                {/* Line Numbers */}
                <div className="flex-shrink-0 w-20 px-2 py-1 text-xs text-foreground/40 select-none border-r border-divider/50">
                  <div className="flex justify-between">
                    <span>{line.originalLineNumber || ''}</span>
                    <span>{line.modifiedLineNumber || ''}</span>
                  </div>
                </div>

                {/* Change Type Indicator */}
                <div className="flex-shrink-0 w-6 px-1 py-1 text-center text-xs select-none">
                  {line.type === 'delete' && (
                    <span className="text-danger">-</span>
                  )}
                  {line.type === 'insert' && (
                    <span className="text-success">+</span>
                  )}
                  {line.type === 'equal' && (
                    <span className="text-foreground/40"> </span>
                  )}
                  {line.type === 'context' && (
                    <span className="text-foreground/40">...</span>
                  )}
                </div>

                {/* Line Content with Inline Word Diff */}
                <div className="flex-1 px-2 py-1 whitespace-pre-wrap break-words leading-relaxed">
                  {line.segments ? (
                    line.segments.map((segment, segmentIndex) => {
                      if (segment.type === 'equal') {
                        return (
                          <span key={segmentIndex} className="text-foreground">
                            {segment.content}
                          </span>
                        );
                      } else if (segment.type === 'insert') {
                        return (
                          <span
                            key={segmentIndex}
                            className="bg-success/20 text-success-800 dark:text-success-200 px-0.5 rounded"
                          >
                            {segment.content}
                          </span>
                        );
                      } else if (segment.type === 'delete') {
                        return (
                          <span
                            key={segmentIndex}
                            className="bg-danger/20 text-danger-800 dark:text-danger-200 px-0.5 rounded line-through"
                          >
                            {segment.content}
                          </span>
                        );
                      }
                      return null;
                    })
                  ) : (
                    <span className="text-foreground">{line.content}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollShadow>
      </CardBody>
    </Card>
  );
};

// Word-based diff algorithm for inline changes
function computeDiff(originalText: string, modifiedText: string): DiffLine[] {
  const originalParagraphs = originalText.split('\n\n');
  const modifiedParagraphs = modifiedText.split('\n\n');
  
  const diffLines: DiffLine[] = [];
  const maxParagraphs = Math.max(originalParagraphs.length, modifiedParagraphs.length);
  
  for (let i = 0; i < maxParagraphs; i++) {
    const originalParagraph = i < originalParagraphs.length ? originalParagraphs[i] : null;
    const modifiedParagraph = i < modifiedParagraphs.length ? modifiedParagraphs[i] : null;
    
    if (originalParagraph === null && modifiedParagraph !== null) {
      // New paragraph
      diffLines.push({
        type: 'insert',
        content: modifiedParagraph,
        originalLineNumber: undefined,
        modifiedLineNumber: i + 1,
        segments: [{ type: 'insert', content: modifiedParagraph }]
      });
    } else if (originalParagraph !== null && modifiedParagraph === null) {
      // Deleted paragraph
      diffLines.push({
        type: 'delete',
        content: originalParagraph,
        originalLineNumber: i + 1,
        modifiedLineNumber: undefined,
        segments: [{ type: 'delete', content: originalParagraph }]
      });
    } else if (originalParagraph === modifiedParagraph) {
      // Unchanged paragraph
      diffLines.push({
        type: 'equal',
        content: originalParagraph || '',
        originalLineNumber: i + 1,
        modifiedLineNumber: i + 1,
        segments: [{ type: 'equal', content: originalParagraph || '' }]
      });
    } else if (originalParagraph && modifiedParagraph) {
      // Changed paragraph - compute word-level diff
      const wordDiff = computeWordDiff(originalParagraph, modifiedParagraph);
      diffLines.push({
        type: 'equal',
        content: modifiedParagraph,
        originalLineNumber: i + 1,
        modifiedLineNumber: i + 1,
        segments: wordDiff
      });
    }
  }
  
  return diffLines;
}

// Word-level diff algorithm
function computeWordDiff(originalText: string, modifiedText: string): DiffSegment[] {
  const originalWords = originalText.split(/(\s+)/);
  const modifiedWords = modifiedText.split(/(\s+)/);
  
  // For very long paragraphs, use a simpler approach to avoid performance issues
  const maxWordsForLCS = 200;
  if (originalWords.length > maxWordsForLCS || modifiedWords.length > maxWordsForLCS) {
    return computeSimpleWordDiff(originalWords, modifiedWords);
  }
  
  const segments: DiffSegment[] = [];
  const dp: number[][] = Array(originalWords.length + 1).fill(null).map(() => Array(modifiedWords.length + 1).fill(0));
  
  // Simple LCS for words (optimized for small word counts)
  for (let i = 1; i <= originalWords.length; i++) {
    for (let j = 1; j <= modifiedWords.length; j++) {
      if (originalWords[i - 1] === modifiedWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to create segments
  let i = originalWords.length;
  let j = modifiedWords.length;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalWords[i - 1] === modifiedWords[j - 1]) {
      segments.unshift({ type: 'equal', content: originalWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      segments.unshift({ type: 'insert', content: modifiedWords[j - 1] });
      j--;
    } else if (i > 0) {
      segments.unshift({ type: 'delete', content: originalWords[i - 1] });
      i--;
    }
  }
  
  return segments;
}

// Simple word diff for long paragraphs
function computeSimpleWordDiff(originalWords: string[], modifiedWords: string[]): DiffSegment[] {
  const segments: DiffSegment[] = [];
  const maxWords = Math.max(originalWords.length, modifiedWords.length);
  
  for (let i = 0; i < maxWords; i++) {
    const originalWord = i < originalWords.length ? originalWords[i] : null;
    const modifiedWord = i < modifiedWords.length ? modifiedWords[i] : null;
    
    if (originalWord === modifiedWord) {
      segments.push({ type: 'equal', content: originalWord || '' });
    } else {
      if (originalWord) {
        segments.push({ type: 'delete', content: originalWord });
      }
      if (modifiedWord) {
        segments.push({ type: 'insert', content: modifiedWord });
      }
    }
  }
  
  return segments;
}

export default DiffViewer; 