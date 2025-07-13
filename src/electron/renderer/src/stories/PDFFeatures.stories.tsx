import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { AlertCircle, FileText, Download, ChevronLeft, ChevronRight, RefreshCw, Bot, Save, Settings } from 'lucide-react';

// Mock component representing the PDF features UI
interface PDFFeatureMockupProps {
  variant: 'text' | 'pdf' | 'loading' | 'error' | 'success';
  showProgress?: boolean;
  progressValue?: number;
  progressMessage?: string;
}

const PDFFeatureMockup: React.FC<PDFFeatureMockupProps> = ({ 
  variant, 
  showProgress, 
  progressValue = 0,
  progressMessage = 'Processing...'
}) => {
  const [viewMode, setViewMode] = useState<'text' | 'pdf'>('text');
  const [pdfGenerated, setPdfGenerated] = useState(variant === 'pdf' || variant === 'success');

  return (
    <div className="w-full max-w-6xl mx-auto border rounded-lg shadow-lg overflow-hidden">
      {/* Enhanced Toolbar */}
      <div className="bg-gray-100 border-b px-4 py-2 flex items-center justify-between">
        {/* Navigation */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Document Name */}
        <div className="flex-1 text-center font-medium">
          patent-assignment.md
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-md shadow-sm">
            <button
              className={`px-3 py-1 text-sm font-medium rounded-l-md border ${
                viewMode === 'text' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
              onClick={() => setViewMode('text')}
              disabled={!pdfGenerated && viewMode === 'pdf'}
            >
              Text
            </button>
            <button
              className={`px-3 py-1 text-sm font-medium rounded-r-md border-l-0 ${
                viewMode === 'pdf' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white text-gray-700 border-gray-300'
              } ${!pdfGenerated ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => pdfGenerated && setViewMode('pdf')}
              disabled={!pdfGenerated}
            >
              PDF
            </button>
          </div>

          {/* Generate PDF Button */}
          <Button 
            variant={variant === 'loading' ? "ghost" : "default"}
            size="sm"
            disabled={variant === 'loading'}
          >
            {variant === 'loading' ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                Generating...
              </div>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-1" />
                Generate PDF
              </>
            )}
          </Button>

          {/* Export Button */}
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!pdfGenerated}
          >
            <Download className="h-4 w-4" />
          </Button>

          {/* Existing buttons */}
          <Button variant="ghost" size="sm">
            <Bot className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Save className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="bg-blue-50 border-b px-4 py-3">
          <div className="mb-2 text-sm font-medium">
            Generating PDF for patent-assignment.md
          </div>
          <Progress value={progressValue} className="mb-2" />
          <div className="text-sm text-gray-600">{progressMessage}</div>
          <div className="mt-2 text-xs space-y-1">
            <div className={progressValue >= 20 ? "text-green-600" : "text-gray-400"}>
              {progressValue >= 20 ? "✓" : "○"} Parsing document structure
            </div>
            <div className={progressValue >= 40 ? "text-green-600" : "text-gray-400"}>
              {progressValue >= 40 ? "✓" : "○"} Extracting metadata
            </div>
            <div className={progressValue >= 60 ? "text-green-600" : progressValue >= 41 ? "text-blue-600" : "text-gray-400"}>
              {progressValue >= 60 ? "✓" : progressValue >= 41 ? "➤" : "○"} Processing signature blocks
            </div>
            <div className={progressValue >= 80 ? "text-green-600" : "text-gray-400"}>
              {progressValue >= 80 ? "✓" : "○"} Generating PDF layout
            </div>
            <div className={progressValue >= 100 ? "text-green-600" : "text-gray-400"}>
              {progressValue >= 100 ? "✓" : "○"} Finalizing document
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {variant === 'error' && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-red-800">PDF Generation Failed</div>
              <div className="text-sm text-red-600 mt-1">
                Unable to generate PDF: Invalid signature block format
              </div>
              <div className="mt-2 space-x-2">
                <Button size="sm" variant="outline">View Details</Button>
                <Button size="sm" variant="default">Retry</Button>
                <Button size="sm" variant="ghost">Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {variant === 'success' && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3">
          <div className="flex items-center text-green-800">
            <div className="font-medium">✅ PDF generated successfully!</div>
            <div className="ml-2 text-sm">
              Click the PDF button to view or the export button to save.
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="h-96 overflow-auto p-6">
        {viewMode === 'text' ? (
          // Text View
          <div className="prose max-w-none">
            <h1>Patent Assignment Agreement</h1>
            <h2>PARTIES</h2>
            <p>
              This Patent Assignment Agreement ("Agreement") is entered into
              as of January 15, 2024, by and between:
            </p>
            <p>
              <strong>Assignor:</strong> TechFlow Solutions Inc.<br />
              123 Innovation Drive, San Francisco, CA 94105
            </p>
            <p>
              <strong>Assignee:</strong> MegaCorp Technologies LLC<br />
              456 Enterprise Way, New York, NY 10001
            </p>
            <p className="text-gray-500">[Document content continues...]</p>
          </div>
        ) : (
          // PDF View
          <div className="bg-gray-200 rounded-lg p-4">
            <div className="bg-white rounded shadow-lg p-8 max-w-4xl mx-auto">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">PATENT ASSIGNMENT AGREEMENT</h1>
              </div>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">PARTIES</h2>
                <p>
                  This Patent Assignment Agreement ("Agreement") is entered
                  into as of January 15, 2024, by and between:
                </p>
                <div>
                  <p className="font-medium">Assignor: TechFlow Solutions Inc.</p>
                  <p>123 Innovation Drive</p>
                  <p>San Francisco, CA 94105</p>
                </div>
                <div>
                  <p className="font-medium">Assignee: MegaCorp Technologies LLC</p>
                  <p>456 Enterprise Way</p>
                  <p>New York, NY 10001</p>
                </div>
              </div>
            </div>
            {/* PDF Controls */}
            <div className="mt-4 bg-gray-100 rounded px-4 py-2 flex items-center justify-center space-x-4">
              <span>Page 1 of 5</span>
              <Button size="sm" variant="ghost">◀</Button>
              <Button size="sm" variant="ghost">▶</Button>
              <select className="text-sm border rounded px-2 py-1">
                <option>100%</option>
                <option>75%</option>
                <option>125%</option>
                <option>150%</option>
              </select>
              <Button size="sm" variant="ghost">🔍+</Button>
              <Button size="sm" variant="ghost">🔍-</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Storybook configuration
const meta = {
  title: 'PDF Features/Mockups',
  component: PDFFeatureMockup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PDFFeatureMockup>;

export default meta;
type Story = StoryObj<typeof meta>;

// Individual stories
export const TextView: Story = {
  args: {
    variant: 'text',
    showProgress: false,
  },
};

export const GeneratingPDF: Story = {
  args: {
    variant: 'loading',
    showProgress: true,
    progressValue: 60,
    progressMessage: '60% - Processing signature blocks',
  },
};

export const PDFView: Story = {
  args: {
    variant: 'pdf',
    showProgress: false,
  },
};

export const ErrorState: Story = {
  args: {
    variant: 'error',
    showProgress: false,
  },
};

export const SuccessState: Story = {
  args: {
    variant: 'success',
    showProgress: false,
  },
};

// Interactive User Flow Story
export const UserFlow: Story = {
  render: () => {
    const [step, setStep] = useState(0);
    const [progress, setProgress] = useState(0);

    const steps = [
      { variant: 'text' as const, showProgress: false, progressValue: 0, progressMessage: '' },
      { variant: 'loading' as const, showProgress: true, progressValue: 20, progressMessage: '20% - Parsing document structure' },
      { variant: 'loading' as const, showProgress: true, progressValue: 40, progressMessage: '40% - Extracting metadata' },
      { variant: 'loading' as const, showProgress: true, progressValue: 60, progressMessage: '60% - Processing signature blocks' },
      { variant: 'loading' as const, showProgress: true, progressValue: 80, progressMessage: '80% - Generating PDF layout' },
      { variant: 'loading' as const, showProgress: true, progressValue: 100, progressMessage: '100% - Finalizing document' },
      { variant: 'success' as const, showProgress: false, progressValue: 100, progressMessage: '' },
      { variant: 'pdf' as const, showProgress: false, progressValue: 0, progressMessage: '' },
    ];

    const currentStep = steps[step];

    return (
      <div className="space-y-4">
        <PDFFeatureMockup {...currentStep} />
        <div className="flex justify-center space-x-4">
          <Button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            Previous Step
          </Button>
          <span className="flex items-center">
            Step {step + 1} of {steps.length}
          </span>
          <Button
            onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
            disabled={step === steps.length - 1}
          >
            Next Step
          </Button>
        </div>
      </div>
    );
  },
};

// Error Flow Story
export const ErrorFlow: Story = {
  render: () => {
    const [showError, setShowError] = useState(false);

    return (
      <div className="space-y-4">
        <PDFFeatureMockup 
          variant={showError ? 'error' : 'loading'} 
          showProgress={!showError}
          progressValue={showError ? 0 : 60}
          progressMessage={showError ? '' : '60% - Processing signature blocks'}
        />
        <div className="flex justify-center">
          <Button onClick={() => setShowError(!showError)}>
            {showError ? 'Show Loading State' : 'Simulate Error'}
          </Button>
        </div>
      </div>
    );
  },
}; 