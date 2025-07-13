import React, { useState, useEffect, useRef } from 'react';
import { 
  Button, 
  Card, 
  CardBody, 
  CardHeader,
  Input,
  Textarea,
  Spinner,
  Chip,
  Avatar,
  ScrollShadow,
  addToast
} from '@heroui/react';
// Using inline SVG components for icons (project doesn't use lucide-react)
const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const BotIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const FileTextIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 18.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

interface AIAssistantProps {
  documentContent: string;
  documentName: string;
  documentPath: string;
  onDocumentUpdate: (newContent: string) => void;
  isVisible: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface DocumentContext {
  documentType: string;
  contentPreview: string;
  legalContext: string[];
  keyTerms: string[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  documentContent,
  documentName,
  documentPath,
  onDocumentUpdate,
  isVisible
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documentContext, setDocumentContext] = useState<DocumentContext | null>(null);
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm your AI legal assistant. I can help you rewrite, refine, or improve your legal documents while respecting legal context and firm precedents.\n\nTo get started, I'll analyze your current document and suggest improvements. What would you like me to help you with?`,
        timestamp: new Date()
      }]);
    }
  }, []);

  // Extract document context when document changes
  useEffect(() => {
    if (documentContent && isVisible) {
      extractDocumentContext();
    }
  }, [documentContent, isVisible]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const extractDocumentContext = () => {
    try {
      // Extract key information from the document
      const lines = documentContent.split('\n').filter(line => line.trim());
      const headers = lines.filter(line => line.startsWith('#'));
      const contentPreview = lines.slice(0, 3).join('\n');
      
      // Identify document type from headers or content
      let documentType = 'Legal Document';
      if (documentContent.includes('Patent')) documentType = 'Patent Document';
      else if (documentContent.includes('Trademark')) documentType = 'Trademark Document';
      else if (documentContent.includes('License')) documentType = 'License Agreement';
      else if (documentContent.includes('Assignment')) documentType = 'Assignment Agreement';
      else if (documentContent.includes('NDA') || documentContent.includes('Non-Disclosure')) documentType = 'Non-Disclosure Agreement';

      // Extract legal terms (simple heuristic)
      const legalTerms = [
        'whereas', 'hereby', 'heretofore', 'pursuant', 'notwithstanding',
        'intellectual property', 'confidential', 'proprietary', 'exclusive',
        'non-exclusive', 'indemnify', 'liability', 'jurisdiction'
      ];
      
      const keyTerms = legalTerms.filter(term => 
        documentContent.toLowerCase().includes(term.toLowerCase())
      );

      setDocumentContext({
        documentType,
        contentPreview,
        legalContext: headers,
        keyTerms
      });
    } catch (error) {
      console.error('Error extracting document context:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Create AI response using existing OpenAI integration
      const assistantMessage = await generateAIResponse(inputText, documentContent, documentContext);
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date()
      }]);

      // Check if the response includes document changes
      if (assistantMessage.includes('```')) {
        const updatedContent = extractUpdatedDocument(assistantMessage);
        if (updatedContent) {
          onDocumentUpdate(updatedContent);
          addToast({
            title: 'Document Changes Available',
            description: 'The AI assistant has suggested changes to your document. View the diff to see what changed.',
            color: 'primary',
            timeout: 5000
          });
        }
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.',
        timestamp: new Date()
      }]);
      
      addToast({
        title: 'AI Assistant Error',
        description: 'Failed to generate response. Please try again.',
        color: 'danger',
        timeout: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = async (userInput: string, documentContent: string, context: DocumentContext | null): Promise<string> => {
    // This will use the existing OpenAI integration through IPC
    try {
      const prompt = buildAssistantPrompt(userInput, documentContent, context);
      const result = await window.electronAPI.callAIAssistant(prompt);
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to generate AI response');
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      throw error;
    }
  };

  const buildAssistantPrompt = (userInput: string, documentContent: string, context: DocumentContext | null): string => {
    const contextInfo = context ? `
Document Type: ${context.documentType}
Document Structure: ${context.legalContext.join(', ')}
Key Legal Terms: ${context.keyTerms.join(', ')}
` : '';

    return `You are a professional legal AI assistant specializing in EXTREMELY MINIMAL, CONSERVATIVE improvements to existing legal documents, with a strong focus on grammar and spelling corrections. Your role is to help polish documents with the lightest possible touch, preserving nearly all existing content while ensuring grammatical accuracy.

CURRENT DOCUMENT:
${documentContent}

DOCUMENT CONTEXT:
${contextInfo}

USER REQUEST:
${userInput}

CRITICAL LIMITATIONS - YOU MUST FOLLOW THESE:
• PRESERVE 95%+ OF ORIGINAL TEXT: Make only essential grammar/spelling fixes
• NO STRUCTURAL CHANGES: Do not reorganize, remove, or add sections
• KEEP ORIGINAL WORDING: Only change words if they have clear spelling/grammar errors
• MINIMAL TOUCH POLICY: When in doubt, leave text unchanged
• REJECT MAJOR CHANGES: If user requests significant rewrites, explain that you only make minimal refinements

REQUIRED CHECKS (ALWAYS DO THESE):
• Spelling errors (e.g., "recieved" → "received")
• Subject-verb agreement (e.g., "The parties agrees" → "The parties agree")
• Verb tense consistency
• Article usage (a/an/the)
• Plural/singular consistency
• Basic punctuation (periods, commas, semicolons)

APPROPRIATE IMPROVEMENTS (ONLY THESE):
1. Grammar fixes:
   • Fix incorrect verb forms
   • Correct pronoun usage
   • Fix article mistakes
   • Correct plural/singular mismatches

2. Spelling corrections:
   • Fix misspelled words
   • Correct commonly confused words (their/there/they're, its/it's)
   • Fix typos in legal terms

3. Essential punctuation:
   • Add missing periods
   • Fix obvious comma errors
   • Correct semicolon/colon usage

ABSOLUTELY FORBIDDEN:
• Adding new clauses or sections
• Removing any existing content
• Rewriting sentences from scratch
• Changing defined terms
• Altering document structure
• Making stylistic improvements
• "Enhancing" grammatically correct text

INSTRUCTIONS:
1. First, scan the entire document for spelling and grammar issues
2. Mark each potential correction and verify it's absolutely necessary
3. Only fix clear, unambiguous errors
4. When providing revised content, wrap it in a code block using triple backticks
5. Explain each grammar/spelling correction specifically
6. Remind users that all legal work requires attorney review

Remember: You are a GRAMMAR AND SPELLING correction tool first. Your primary goal is to fix clear grammatical and spelling errors while preserving 95%+ of the original text. When in doubt, make NO changes.

Please provide your response:`;
  };

  const extractUpdatedDocument = (response: string): string | null => {
    // Try to match code block with UPDATED_DOCUMENT marker
    const updatedDocMatch = response.match(/UPDATED_DOCUMENT\s*```(?:markdown|md)?\s*([\s\S]*?)```/);
    if (updatedDocMatch && updatedDocMatch[1]) {
      return updatedDocMatch[1].trim();
    }
    
    // Try to match any markdown code block
    const codeBlockMatch = response.match(/```(?:markdown|md|plaintext)?\s*([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }
    
    return null;
  };

  const filterDocumentCodeBlocks = (content: string): string => {
    // Remove large code blocks that contain document content
    // This prevents showing the full document in the chat while still extracting it for diffs
    return content.replace(/```(?:markdown|md|plaintext)?\s*([\s\S]*?)```/g, (match, codeContent) => {
      // If the code block is longer than 500 characters, likely contains document content
      if (codeContent.trim().length > 500) {
        return '📄 **Document content has been extracted and is available in the diff viewer above**\n\n*Click "Show Changes" to see the word-by-word comparison of the AI\'s suggestions.*';
      }
      // Keep shorter code blocks (likely code snippets or examples)
      return match;
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    { 
      label: 'Improve clarity', 
      action: () => setInputText('Please review this document and suggest improvements for clarity and readability while maintaining legal accuracy.')
    },
    { 
      label: 'Check compliance', 
      action: () => setInputText('Please review this document for legal compliance and suggest any necessary improvements.')
    },
    { 
      label: 'Enhance structure', 
      action: () => setInputText('Please suggest improvements to the document structure and organization.')
    },
    { 
      label: 'Simplify language', 
      action: () => setInputText('Please help simplify the language in this document while maintaining legal precision.')
    }
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollShadow 
          ref={chatContainerRef}
          className="h-full p-4 space-y-4"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                 <Avatar
                   size="sm"
                   className={`${message.role === 'user' ? 'ml-2' : 'mr-2'} flex-shrink-0`}
                   icon={message.role === 'user' ? <UserIcon /> : <BotIcon />}
                 />
                <div
                  className={`rounded-lg px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border-2 border-gray-500 dark:border-gray-400'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {message.role === 'assistant' 
                      ? filterDocumentCodeBlocks(message.content) 
                      : message.content
                    }
                  </div>
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex max-w-[80%]">
                                 <Avatar
                   size="sm"
                   className="mr-2 flex-shrink-0"
                   icon={<BotIcon />}
                 />
                <div className="rounded-lg px-3 py-2 bg-card border-2 border-gray-500 dark:border-gray-400">
                  <div className="flex items-center space-x-2">
                    <Spinner size="sm" />
                    <span className="text-sm text-foreground/60">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </ScrollShadow>
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="p-4 border-t-2 border-gray-500 dark:border-gray-400">
          <div className="mb-3">
            <h4 className="text-sm font-medium text-foreground mb-2">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                                 <Button
                   key={index}
                   variant="flat"
                   size="sm"
                   onClick={action.action}
                   className="text-xs"
                 >
                   <SparklesIcon />
                   {action.label}
                 </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t-2 border-gray-500 dark:border-gray-400 bg-background/50 backdrop-blur-sm">
        <div className="flex space-x-2">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to help improve your document..."
            minRows={1}
            maxRows={3}
            className="flex-1"
            disabled={isLoading}
          />
                     <Button
             isIconOnly
             color="primary"
             onClick={handleSendMessage}
             disabled={!inputText.trim() || isLoading}
             className="self-end"
           >
             <SendIcon />
           </Button>
         </div>
         
         {!documentContent && (
           <div className="flex items-center space-x-2 mt-2 text-xs text-foreground/60">
             <AlertCircleIcon />
             <span>Select a document to get context-aware assistance</span>
           </div>
         )}
      </div>
    </div>
  );
};

export default AIAssistant; 