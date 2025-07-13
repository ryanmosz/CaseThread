import React, { useEffect, useState } from 'react';
import { Card, CardBody, Progress, Button } from '@heroui/react';
import { useBackgroundGeneration } from '../contexts/BackgroundGenerationContext';

interface BackgroundGenerationStatusProps {
  isModalOpen?: boolean;
}

export const BackgroundGenerationStatus: React.FC<BackgroundGenerationStatusProps> = ({ 
  isModalOpen = false 
}) => {
  const { state, cancelGeneration } = useBackgroundGeneration();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

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

  // Reset minimized state when generation starts/stops
  useEffect(() => {
    if (!state.isGenerating) {
      setIsMinimized(false);
    }
  }, [state.isGenerating]);

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

  // Show compact mode if modal is open OR user has minimized it
  const shouldShowCompact = isModalOpen || isMinimized;

  // Prominent version when no modal is open and not minimized
  if (!shouldShowCompact) {
    return (
      <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] shadow-2xl border-3 border-primary/80 bg-background/98 backdrop-blur-lg z-50 animate-in slide-in-from-bottom-4 duration-300">
        <CardBody className="p-8 relative">
          {/* Minimize button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMinimized(true)}
            className="absolute top-4 right-4 text-foreground/60 hover:text-foreground/80 min-w-0 px-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Enhanced Quality Generation
            </h3>
            <p className="text-base text-foreground/80 mb-1">
              {state.templateName}
            </p>
            <p className="text-sm text-foreground/60">
              {formatTime(elapsedTime)} elapsed • Est. 3-4 min total
            </p>
          </div>

          <Progress
            value={progressPercentage}
            className="mb-4"
            color="primary"
            size="md"
          />

          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-foreground/70">
              Running in background...
            </span>
            <span className="text-sm font-medium text-primary">
              {Math.round(progressPercentage)}%
            </span>
          </div>

          <div className="text-center">
            <Button
              size="sm"
              variant="light"
              onClick={cancelGeneration}
              className="text-foreground/60 hover:text-foreground/80"
            >
              Cancel Generation
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Compact version when modal is open or minimized
  return (
    <Card className="fixed bottom-4 right-4 w-96 shadow-lg border-2 border-primary/60 bg-background/95 backdrop-blur-sm z-50">
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