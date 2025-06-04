
"use client";

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Trash2, CornerDownLeft, Loader2 } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { chatInterfaceUpdates, type ChatInterfaceUpdatesClientInput } from '@/ai/flows/chat-interface-updates';
import { objectsToCsv, parseCSV } from '@/lib/csvUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function ChatPane() {
  const { 
    data, 
    columns, 
    setData, 
    showToast, 
    chatHistory, 
    addChatMessage, 
    clearChatHistory, 
    setIsLoading: setAppIsLoading, 
    isLoading: appIsLoading,
    selectedAiProvider,
    selectedAiModelName 
  } = useAppContext();
  const [userInput, setUserInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!userInput.trim() || isChatLoading || appIsLoading) return;

    const currentMessage = userInput;

    if (!selectedAiProvider || !selectedAiModelName) {
      showToast({ title: 'AI Not Configured', description: 'Chat requires AI Provider & Model. Please set in AI Settings.', variant: 'destructive', duration: 7000 });
      // We don't clear userInput here so user doesn't lose their message
      return;
    }
    
    addChatMessage({ role: 'user', content: currentMessage });
    setUserInput('');
    setIsChatLoading(true);
    setAppIsLoading(true);

    try {
      const dataContextString = JSON.stringify({
        columns: columns,
        data: data, 
      });

      const input: ChatInterfaceUpdatesClientInput = {
        dataContext: dataContextString,
        userQuery: currentMessage,
        aiProvider: selectedAiProvider,
        aiModelName: selectedAiModelName,
      };

      const response = await chatInterfaceUpdates(input);

      addChatMessage({ role: 'assistant', content: response.response });

      if (response.updatedDataContext) {
        try {
          const updatedContext = JSON.parse(response.updatedDataContext);
          if (updatedContext.data && Array.isArray(updatedContext.data)) {
            setData(updatedContext.data);
            if(updatedContext.columns && Array.isArray(updatedContext.columns)) {
              // This might not be needed if setData also updates columns
              // setColumns(updatedContext.columns);
            }
             showToast({
              title: 'Data Updated',
              description: 'Data has been updated based on chat interaction.',
            });
          } else if (Array.isArray(updatedContext)) { 
             setData(updatedContext);
             showToast({
              title: 'Data Updated',
              description: 'Data has been updated based on chat interaction.',
            });
          }
        } catch (parseError) {
          console.error('Error parsing updated data context:', parseError);
          showToast({
            title: 'Chat Update Error',
            description: 'Could not apply updates from chat. Invalid data format received.',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Error in chat interface:', error);
      let description = 'Sorry, I encountered an error processing your chat message.';
      const errorMessage = String(error?.message || error).toLowerCase();
      if (errorMessage.includes('api key') || errorMessage.includes('authentication')) {
        description = 'Authentication failed with the AI provider. Check your API key.';
      } else if (errorMessage.includes('model not found')) {
        description = `The AI model ('${selectedAiProvider}/${selectedAiModelName}') was not found. Check AI Settings and key permissions.`;
      } else if (errorMessage.includes('503') || errorMessage.includes('unavailable') || errorMessage.includes('overloaded')) {
        description = 'The AI service is temporarily unavailable or overloaded. Please try again later.';
      }
      addChatMessage({ role: 'assistant', content: description });
      showToast({ title: 'Chat Error', description, variant: 'destructive', duration: 9000 });
    } finally {
      setIsChatLoading(false);
      setAppIsLoading(false);
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };


  if (data.length === 0) {
    return null; 
  }

  const isSubmitDisabled = isChatLoading || appIsLoading || !userInput.trim() || (!selectedAiProvider || !selectedAiModelName);

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-headline flex items-center">
          <Bot className="mr-2 h-6 w-6 text-primary" />
          Chat with Your Data
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <div className="flex flex-col h-[400px]">
          <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
            {chatHistory.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Ask questions or give commands about your data... (AI Settings must be configured)</p>
              </div>
            )}
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`mb-3 flex items-start ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && <Bot className="h-6 w-6 mr-2 text-primary flex-shrink-0" />}
                <div
                  className={`p-3 rounded-lg max-w-[80%] break-words text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && <User className="h-6 w-6 ml-2 text-accent flex-shrink-0" />}
              </div>
            ))}
             {isChatLoading && (
              <div className="flex items-start justify-start mb-3">
                <Bot className="h-6 w-6 mr-2 text-primary flex-shrink-0" />
                <div className="p-3 rounded-lg bg-muted text-muted-foreground text-sm flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Typing...
                </div>
              </div>
            )}
          </ScrollArea>
          <Separator />
          <form onSubmit={handleSendMessage} className="p-4 flex items-center gap-2 border-t bg-background">
            <Input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={(!selectedAiProvider || !selectedAiModelName) ? "Configure AI in Settings to use chat" : "Ask about your data or request changes..."}
              className="flex-grow"
              disabled={isChatLoading || appIsLoading || (!selectedAiProvider || !selectedAiModelName)}
              onKeyDown={handleKeyDown}
            />
            <Button type="submit" disabled={isSubmitDisabled} size="icon">
              <CornerDownLeft className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={clearChatHistory} disabled={isChatLoading || appIsLoading || chatHistory.length === 0}>
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Clear Chat</span>
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
