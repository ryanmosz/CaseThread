import React, { useEffect, useState } from 'react';
import { Card, CardBody, Progress, Button } from '@heroui/react';
import { useBackgroundGeneration } from '../contexts/BackgroundGenerationContext';

export const BackgroundGenerationStatus: React.FC = () => {
  const { state, cancelGeneration } = useBackgroundGeneration();
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!state.isGenerating || !state.startTime) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.startTime!.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isGenerating, state.startTime]);

  if (!state.isGenerating) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const estimatedTotal = 240; // 4 minutes in seconds
  const progressPercentage = Math.min((elapsedTime / estimatedTotal) * 100, 95); // Cap at 95% until completion

  return (
    <Card className="fixed bottom-4 right-4 w-96 shadow-lg border border-primary/20 bg-background/95 backdrop-blur-sm z-50">
      <CardBody className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Enhanced Quality Generation
            </h4>
            <p className="text-xs text-foreground/70">
              {state.templateName} • {formatTime(elapsedTime)} elapsed
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={cancelGeneration}
            className="text-foreground/60 hover:text-foreground/80 min-w-0 px-2"
          >
            ✕
          </Button>
        </div>

        <Progress
          value={progressPercentage}
          className="mb-2"
          color="primary"
          size="sm"
        />

        <div className="flex justify-between items-center text-xs text-foreground/60">
          <span>Running in background...</span>
          <span>Est. 3-4 min total</span>
        </div>
      </CardBody>
    </Card>
  );
}; 