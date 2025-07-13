import { useEffect, useState, useCallback, useRef } from 'react';
import { PDFProgressUpdate } from '../../../../types/pdf-ipc';

export interface PDFProgressState {
  currentStep: string;
  percentage: number;
  detail?: string;
  estimatedTimeRemaining?: number;
  history: PDFProgressUpdate[];
}

export interface PDFProgressCollection {
  [requestId: string]: PDFProgressState;
}

interface UsePDFProgressOptions {
  /**
   * Whether to keep history of all progress updates
   */
  keepHistory?: boolean;
  /**
   * Maximum number of history items to keep (default: 100)
   */
  maxHistorySize?: number;
  /**
   * Whether to auto-clear progress after completion (default: false)
   */
  autoClear?: boolean;
  /**
   * Delay in ms before auto-clearing (default: 5000)
   */
  autoClearDelay?: number;
}

/**
 * Hook for tracking PDF generation progress
 * @param requestId - Specific request ID to track, or undefined to track all
 * @param options - Configuration options
 */
export const usePDFProgress = (
  requestId?: string,
  options: UsePDFProgressOptions = {}
) => {
  const {
    keepHistory = true,
    maxHistorySize = 100,
    autoClear = false,
    autoClearDelay = 5000,
  } = options;

  const [progressData, setProgressData] = useState<PDFProgressCollection>({});
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoClearTimers = useRef<{ [requestId: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    if (!requestId) return;

    const setupSubscription = async () => {
      try {
        // Subscribe to progress updates
        const result = await window.electron.pdf.subscribeProgress(requestId);
        if (!result.success) {
          throw new Error(result.error || 'Failed to subscribe to progress');
        }
        setIsSubscribed(true);
      } catch (err) {
        console.error('Failed to subscribe to progress:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    // Listen for progress events
    const handleProgress = (_event: any, update: PDFProgressUpdate) => {
      if (requestId && update.requestId !== requestId) return;

      setProgressData((prev) => {
        const currentState = prev[update.requestId] || {
          currentStep: '',
          percentage: 0,
          history: [],
        };

        const newHistory = keepHistory
          ? [...currentState.history, update].slice(-maxHistorySize)
          : [];

        const newState: PDFProgressState = {
          currentStep: update.step,
          percentage: update.percentage,
          detail: update.detail,
          estimatedTimeRemaining: update.estimatedTimeRemaining,
          history: newHistory,
        };

        // Handle auto-clear
        if (autoClear && update.percentage === 100) {
          // Clear any existing timer
          if (autoClearTimers.current[update.requestId]) {
            clearTimeout(autoClearTimers.current[update.requestId]);
          }

          // Set new timer
          autoClearTimers.current[update.requestId] = setTimeout(() => {
            setProgressData((p) => {
              const updated = { ...p };
              delete updated[update.requestId];
              return updated;
            });
            delete autoClearTimers.current[update.requestId];
          }, autoClearDelay);
        }

        return {
          ...prev,
          [update.requestId]: newState,
        };
      });
    };

    // Handle completion
    const handleComplete = (_event: any, data: { requestId: string }) => {
      if (requestId && data.requestId !== requestId) return;

      setProgressData((prev) => {
        if (!prev[data.requestId]) return prev;

        return {
          ...prev,
          [data.requestId]: {
            ...prev[data.requestId],
            percentage: 100,
            currentStep: 'Complete',
          },
        };
      });
    };

    // Handle errors
    const handleError = (_event: any, data: { requestId: string; error: any }) => {
      if (requestId && data.requestId !== requestId) return;

      setError(data.error.message || 'PDF generation failed');
    };

    setupSubscription();
    window.electron.onPDFProgress(handleProgress);
    window.electron.on('pdf:complete', handleComplete);
    window.electron.on('pdf:error', handleError);

    return () => {
      // Cleanup
      if (requestId && isSubscribed) {
        window.electron.pdf.unsubscribeProgress(requestId);
      }
      window.electron.removeListener('pdf:progress', handleProgress);
      window.electron.removeListener('pdf:complete', handleComplete);
      window.electron.removeListener('pdf:error', handleError);

      // Clear any pending timers
      Object.values(autoClearTimers.current).forEach(clearTimeout);
      autoClearTimers.current = {};
    };
  }, [requestId, keepHistory, maxHistorySize, autoClear, autoClearDelay]);

  const clearProgress = useCallback((id?: string) => {
    if (id) {
      setProgressData((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      
      // Clear any pending timer for this ID
      if (autoClearTimers.current[id]) {
        clearTimeout(autoClearTimers.current[id]);
        delete autoClearTimers.current[id];
      }
    } else {
      setProgressData({});
      
      // Clear all timers
      Object.values(autoClearTimers.current).forEach(clearTimeout);
      autoClearTimers.current = {};
    }
  }, []);

  const getProgress = useCallback(
    (id?: string): PDFProgressState | undefined => {
      if (id) {
        return progressData[id];
      }
      return requestId ? progressData[requestId] : undefined;
    },
    [progressData, requestId]
  );

  const isComplete = useCallback(
    (id?: string): boolean => {
      const progress = getProgress(id || requestId);
      return progress?.percentage === 100;
    },
    [getProgress, requestId]
  );

  const isInProgress = useCallback(
    (id?: string): boolean => {
      const progress = getProgress(id || requestId);
      return !!progress && progress.percentage < 100;
    },
    [getProgress, requestId]
  );

  return {
    // Single request progress (if requestId provided)
    progress: requestId ? progressData[requestId] : undefined,
    // All progress data
    allProgress: progressData,
    // Subscription state
    isSubscribed,
    // Error state
    error,
    // Helper methods
    clearProgress,
    getProgress,
    isComplete,
    isInProgress,
    // Active request IDs
    activeRequests: Object.keys(progressData).filter((id) => 
      progressData[id].percentage < 100
    ),
  };
}; 