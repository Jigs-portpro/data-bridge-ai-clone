"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  User,
  Trash2,
  CornerDownLeft,
  Loader2,
  Zap,
  XSquare,
  X,
} from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";
import { chatInterfaceUpdatesFlow } from "@/ai/flows/chat-interface-updates/chat-flow";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";
import { ChatInterfaceUpdatesClientInput } from "@/ai/flows/chat-interface-updates/schemas";
import { streamFlow } from "@genkit-ai/next/client";
import { cn as classNames } from "@/lib/utils";
import { useEntityContext } from "@/contexts/EntityContext";
import { ENTITY_NAME_STORAGE_KEY } from "@/lib/constants";

export function ChatPane() {
  const {
    chatHistory,
    setChatHistory,
    addChatMessage,
    clearChatHistory,
    showToast,
    isLoading: appIsLoading,
    selectedAiProvider,
    selectedAiModelName,
    entityName,
    datatableEditedCells,
    error, // Use error state instead of data
    updateErrorState,
    refreshData,
    getApiToken,
    viewData,
    toggleChatPane,
    getCarrierId,
    currentPage,
    rowsPerPage,
  } = useAppContext();
  const { detectedEntity } = useEntityContext();
  const { data: session } = useSession();
  const [userInput, setUserInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamResponse, setStreamResponse] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, streamResponse]);

  const isSubmitDisabled =
    !userInput.trim() ||
    isChatLoading ||
    appIsLoading ||
    !selectedAiProvider ||
    !selectedAiModelName;

  const handleSendMessage = async () => {
    if (isSubmitDisabled) {
      return;
    }

    const currentMessage = userInput.trim();
    if (!currentMessage) return;

    setUserInput("");
    setIsChatLoading(true);
    setStreamResponse("");

    // Add user message to chat history
    addChatMessage({
      role: "user",
      content: currentMessage,
    });

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (!session?.user?.sessionId) {
        throw new Error("Session ID is not available. Please log in again.");
      }

      const storedEntityName =
        typeof window !== "undefined"
          ? localStorage.getItem(ENTITY_NAME_STORAGE_KEY)
          : null;
      const displayEntityName =
        detectedEntity?.entityName || entityName || storedEntityName;

      if (!displayEntityName) {
        throw new Error(
          "Entity has not been detected. Please upload a file first."
        );
      }

      const entity_session_id = Date.now().toString();

      const input: ChatInterfaceUpdatesClientInput = {
        carrierId: getCarrierId() || "",
        page: currentPage || 1,
        limit: rowsPerPage || 500,
        userQuery: currentMessage,
        aiProvider: selectedAiProvider,
        aiModelName: selectedAiModelName,
        chatHistory: chatHistory,
        apiToken: getApiToken() || undefined,
        enableLookupValidation: true,
        entityName: displayEntityName,
        sessionId: session.user.sessionId,
        entity_session_id: entity_session_id,
        datatableEditedCells: Array.from(datatableEditedCells),
      };

      const result = streamFlow<typeof chatInterfaceUpdatesFlow>({
        url: "/api/chat",
        input,
        abortSignal: abortControllerRef.current.signal,
      });

      for await (const chunk of result.stream) {
        setStreamResponse(chunk || "");
      }

      const finalResponse = await result.output;
      setStreamResponse(null);

      // Since the flow now returns a string, we just add it to chat history.
      // Error handling can be simplified as errors are also returned as strings.
      // A more robust solution might involve a different return schema for errors.
      addChatMessage({
        role: "model",
        content: finalResponse,
      });

      // You might want to show a toast on success.
      showToast({
        title: "AI Response Received",
        description: "The AI has processed your request.",
      });

      await refreshData();
    } catch (error: any) {
      console.error("Chat error:", error);
      if (error.name === "AbortError") {
        showToast({
          title: "Request Cancelled",
          description: "The chat request was cancelled.",
          variant: "destructive",
        });
      } else {
        showToast({
          title: "Chat Error",
          description: error.message || "An error occurred while processing your request.",
          variant: "destructive",
        });
      }
    } finally {
      setIsChatLoading(false);
      setStreamResponse(null);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort("User aborted the chat.");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Allow chat interface when there's data or entity is detected
  if (viewData.length === 0 && !detectedEntity?.entityName) {
    return null;
  }

  return (
    <Card className="shadow-lg h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-headline flex items-center">
            <Bot className="mr-2 h-6 w-6 text-primary" />
            Chat with Your Data
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleChatPane}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <Separator />

      <div className="flex flex-col grow overflow-hidden">
        <ScrollArea
          id="chat-pane-scroll-area"
          className="flex-grow px-4 py-4"
          ref={scrollAreaRef}
        >
          {chatHistory.length === 0 && (
            <div className="flex items-center justify-center h-full mt-4">
              <p className="text-muted-foreground">
                Ask questions or give commands about your data... (AI Settings
                must be configured)
              </p>
            </div>
          )}
          {chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start my-2 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "model" && (
                <Bot className="h-6 w-6 mr-2 text-primary flex-shrink-0" />
              )}
              <div
                className={classNames(
                  "p-3 rounded-lg max-w-[80%] break-words text-sm",
                  {
                    "bg-primary text-primary-foreground":
                      msg.role === "user" && !msg.isError,
                    "text-destructive bg-background": msg.isError,
                    "bg-muted text-muted-foreground":
                      msg.role === "model" && !msg.isError,
                  }
                )}
              >
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              {msg.role === "user" && (
                <User className="h-6 w-6 ml-2 text-accent flex-shrink-0" />
              )}
            </div>
          ))}
          {isChatLoading && (
            <div className="flex items-start justify-start mb-3">
              <Bot className="h-6 w-6 mr-2 text-primary flex-shrink-0" />
              <div className="p-3 rounded-lg bg-muted text-muted-foreground text-sm flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Thinking...
              </div>
            </div>
          )}
          {streamResponse && streamResponse.length > 0 && (
            <div className="flex items-start justify-start mb-3">
              <div className="h-6 w-6 mr-2 flex-shrink-0 flex items-center justify-center">
                <Zap className="h-4 w-4 text-blue-500 animate-pulse" />
              </div>
              <div className="p-3 rounded-lg bg-muted text-muted-foreground text-sm">
                <div className="flex items-start">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      Processing request...
                    </span>
                  </div>
                </div>
                <ReactMarkdown>{streamResponse}</ReactMarkdown>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="mt-10" />
        </ScrollArea>
        <Separator />
        <form
          onSubmit={handleSendMessage}
          className="p-4 flex items-center gap-2 border-t bg-background"
        >
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={
              !selectedAiProvider || !selectedAiModelName
                ? "Configure AI in Settings to use chat"
                : error.length > 0 
                  ? "Ask about your data or request changes... (Processing error data)"
                  : "Ask about your data or request changes..."
            }
            className="flex-grow resize-none h-10"
            disabled={
              isChatLoading ||
              appIsLoading ||
              !selectedAiProvider ||
              !selectedAiModelName
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          {isChatLoading ? (
            <Button
              type="button"
              onClick={handleStop}
              size="icon"
              variant="destructive"
            >
              <XSquare className="h-4 w-4" />
              <span className="sr-only">Stop</span>
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitDisabled} size="icon">
              <CornerDownLeft className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearChatHistory}
            disabled={isChatLoading || appIsLoading || chatHistory.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Clear Chat</span>
          </Button>
        </form>
      </div>
    </Card>
  );
}
