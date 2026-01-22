import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ConversationList } from '@/components/chat/ConversationList';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Scale, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; domain?: string }[];
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-chat`;

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      setConversations(data || []);
      if (data && data.length > 0 && !activeConversationId) {
        setActiveConversationId(data[0].id);
      }
    };

    fetchConversations();
  }, [user]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(
        (data || []).map((msg) => ({
          ...msg,
          role: msg.role as 'user' | 'assistant',
          sources: msg.sources as { title: string; domain?: string }[] | undefined,
        }))
      );
    };

    fetchMessages();
  }, [activeConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const createNewConversation = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: 'New Conversation' })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive',
      });
      return;
    }

    setConversations((prev) => [data, ...prev]);
    setActiveConversationId(data.id);
    setMessages([]);
  };

  const deleteConversation = async (id: string) => {
    const { error } = await supabase.from('conversations').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
      return;
    }

    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(conversations[0]?.id || null);
    }
  };

  const sendMessage = async (content: string) => {
    if (!user) return;

    let conversationId = activeConversationId;

    // Create a new conversation if none exists
    if (!conversationId) {
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: content.slice(0, 50) + '...' })
        .select()
        .single();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create conversation',
          variant: 'destructive',
        });
        return;
      }

      conversationId = data.id;
      setConversations((prev) => [data, ...prev]);
      setActiveConversationId(conversationId);
    }

    // Add user message optimistically
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message to database
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content,
    });

    // Update conversation title if first message
    if (messages.length === 0) {
      await supabase
        .from('conversations')
        .update({ title: content.slice(0, 50) + (content.length > 50 ? '...' : '') })
        .eq('id', conversationId);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, title: content.slice(0, 50) + (content.length > 50 ? '...' : '') }
            : c
        )
      );
    }

    // Stream AI response
    try {
      setIsStreaming(true);
      let assistantContent = '';

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          conversationId,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 402) {
          throw new Error('Payment required. Please add credits to continue.');
        }
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    role: 'assistant' as const,
                    content: assistantContent,
                    created_at: new Date().toISOString(),
                  },
                ];
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Save assistant message to database
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantContent,
      });
    } catch (error) {
      console.error('Error streaming response:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get AI response',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const sidebar = (
    <ConversationList
      conversations={conversations}
      activeConversationId={activeConversationId}
      onSelect={setActiveConversationId}
      onNew={createNewConversation}
      onDelete={deleteConversation}
    />
  );

  return (
    <AppLayout sidebar={sidebar}>
      <div className="flex flex-col h-full">
        {/* Chat messages */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-legal flex items-center justify-center mb-6 shadow-elegant">
                  <Scale className="h-10 w-10 text-secondary" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
                  Welcome to LexAdvisor
                </h2>
                <p className="text-muted-foreground max-w-md mb-8">
                  Ask any legal question and receive guidance grounded in verified legal documents
                  and case law.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {[
                    'What are my rights as a tenant?',
                    'How do I file a small claims case?',
                    'What is breach of contract?',
                    'Explain employment discrimination laws',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      className="flex items-start gap-2 p-4 text-left text-sm bg-card border border-border/50 rounded-xl hover:bg-muted transition-colors shadow-card"
                    >
                      <Sparkles className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  sources={message.sources}
                  isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                />
              ))
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Chat input */}
        <div className="border-t border-border bg-card p-4">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={sendMessage} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
