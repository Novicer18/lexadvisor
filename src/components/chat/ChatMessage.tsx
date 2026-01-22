import { cn } from '@/lib/utils';
import { Scale, User, ExternalLink, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Source {
  title: string;
  domain?: string;
  excerpt?: string;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, sources, isStreaming }: ChatMessageProps) {
  const isAssistant = role === 'assistant';

  return (
    <div className={cn(
      'flex gap-4 animate-fade-in',
      isAssistant ? 'justify-start' : 'justify-end'
    )}>
      {isAssistant && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-legal flex items-center justify-center shadow-elegant">
          <Scale className="h-5 w-5 text-secondary" />
        </div>
      )}

      <div className={cn(
        'max-w-[80%] space-y-3',
        isAssistant ? '' : 'order-first'
      )}>
        <div className={cn(
          'rounded-2xl px-5 py-4',
          isAssistant 
            ? 'bg-card shadow-card border border-border/50 rounded-tl-sm' 
            : 'bg-primary text-primary-foreground rounded-tr-sm'
        )}>
          <div className={cn(
            'prose prose-sm max-w-none',
            isAssistant ? 'text-foreground' : 'text-primary-foreground prose-invert'
          )}>
            <p className="whitespace-pre-wrap leading-relaxed m-0">
              {content}
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse-soft" />
              )}
            </p>
          </div>
        </div>

        {isAssistant && sources && sources.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              <span>Sources referenced:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((source, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="gap-1 bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                >
                  <span className="max-w-[200px] truncate">{source.title}</span>
                  {source.domain && (
                    <span className="text-muted-foreground">• {source.domain}</span>
                  )}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {isAssistant && !isStreaming && (
          <p className="text-xs text-muted-foreground italic px-1">
            This is informational guidance only, not legal advice. Consult a qualified attorney for legal matters.
          </p>
        )}
      </div>

      {!isAssistant && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
