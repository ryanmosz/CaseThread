import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface BackgroundGenerationState {
  isGenerating: boolean;
  templateId: string | null;
  templateName: string | null;
  startTime: Date | null;
  progress: number;
}

interface BackgroundGenerationContextType {
  state: BackgroundGenerationState;
  startGeneration: (templateId: string, templateName: string) => void;
  completeGeneration: () => void;
  updateProgress: (progress: number) => void;
  cancelGeneration: () => void;
}

const BackgroundGenerationContext = createContext<BackgroundGenerationContextType | undefined>(undefined);

const initialState: BackgroundGenerationState = {
  isGenerating: false,
  templateId: null,
  templateName: null,
  startTime: null,
  progress: 0,
};

interface BackgroundGenerationProviderProps {
  children: ReactNode;
}

export const BackgroundGenerationProvider: React.FC<BackgroundGenerationProviderProps> = ({ children }) => {
  const [state, setState] = useState<BackgroundGenerationState>(initialState);

  const startGeneration = useCallback((templateId: string, templateName: string) => {
    setState({
      isGenerating: true,
      templateId,
      templateName,
      startTime: new Date(),
      progress: 0,
    });
  }, []);

  const completeGeneration = useCallback(() => {
    setState(initialState);
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
    }));
  }, []);

  const cancelGeneration = useCallback(() => {
    setState(initialState);
  }, []);

  const contextValue: BackgroundGenerationContextType = {
    state,
    startGeneration,
    completeGeneration,
    updateProgress,
    cancelGeneration,
  };

  return (
    <BackgroundGenerationContext.Provider value={contextValue}>
      {children}
    </BackgroundGenerationContext.Provider>
  );
};

export const useBackgroundGeneration = (): BackgroundGenerationContextType => {
  const context = useContext(BackgroundGenerationContext);
  if (context === undefined) {
    throw new Error('useBackgroundGeneration must be used within a BackgroundGenerationProvider');
  }
  return context;
}; 