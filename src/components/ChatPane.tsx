"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Trash2, CornerDownLeft, Loader2, Zap } from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";
import { chatInterfaceUpdatesFlow } from "@/ai/flows/chat-interface-updates/chat-flow";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";
import { ChatInterfaceUpdatesClientInput } from "@/ai/flows/chat-interface-updates/schemas";
import { streamFlow } from "@genkit-ai/next/client";
import { cn as classNames } from "@/lib/utils";

export function ChatPane() {
  const {
    data,
    columns,
    entityName,
    setEntityName,
    setData,
    setColumns, // Added setColumns
    showToast,
    chatHistory,
    addChatMessage,
    clearChatHistory,
    setIsLoading: setAppIsLoading,
    isLoading: appIsLoading,
    selectedAiProvider,
    selectedAiModelName,
    getApiToken,
    setDatatableEditedCells,
  } = useAppContext();
  const [userInput, setUserInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [streamResponse, setStreamResponse] = useState<string | null>(null);

  useEffect(() => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
    }, 0);
  }, [chatHistory, streamResponse]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!userInput.trim() || isChatLoading || appIsLoading) return;

    const currentMessage = userInput;

    if (!selectedAiProvider || !selectedAiModelName) {
      showToast({
        title: "AI Not Configured",
        description:
          "Chat requires AI Provider & Model. Please set in AI Settings.",
        variant: "destructive",
        duration: 7000,
      });
      // We don't clear userInput here so user doesn't lose their message
      return;
    }

    addChatMessage({ role: "user", content: currentMessage });
    setUserInput("");
    setIsChatLoading(true);
    setAppIsLoading(true);

    try {
      const dataContextString = JSON.stringify({
        columns: columns, // Send current columns
        data: data,
      });

      const input: ChatInterfaceUpdatesClientInput = {
        dataContext: dataContextString,
        userQuery: currentMessage,
        aiProvider: selectedAiProvider,
        aiModelName: selectedAiModelName,
        chatHistory: chatHistory,
        apiToken: getApiToken() || undefined,
        enableLookupValidation: true,
        entityName: entityName || undefined,
      };

      const result = streamFlow<typeof chatInterfaceUpdatesFlow>({
        url: "/api/chat",
        input,
      });

      for await (const chunk of result.stream) {
        console.log(`Chunk: ${chunk}`);
        setStreamResponse(chunk || "");
      }

      const finalResponse = await result.output;
      setStreamResponse(null);

      addChatMessage({ role: "model", content: finalResponse.response, isError: finalResponse.isError || false });

      if (finalResponse.isError) {
        showToast({
          title: "Chat Error",
          description: finalResponse.response,
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      if (finalResponse.updatedDataContext) {
        try {
          const updatedContext = JSON.parse(finalResponse.updatedDataContext);
          setEntityName(updatedContext?.entityName || null);
          let newData: any[] = [];
          let newColumns: string[] = [];
          if (updatedContext.data && Array.isArray(updatedContext.data)) {
            newData = updatedContext.data;
            if (
              updatedContext.columns &&
              Array.isArray(updatedContext.columns)
            ) {
              newColumns = updatedContext.columns;
              setColumns(newColumns);
            } else if (updatedContext.data.length > 0) {
              newColumns = Object.keys(updatedContext.data[0]);
              setColumns(newColumns);
            } else {
              newColumns = [];
              setColumns([]);
            }
          } else if (Array.isArray(updatedContext)) {
            newData = updatedContext;
            if (updatedContext.length > 0) {
              newColumns = Object.keys(updatedContext[0]);
              setColumns(newColumns);
            } else {
              newColumns = [];
              setColumns([]);
            }
          }
          // Compare old and new data to find edited cells
          if (newData.length > 0 && newColumns.length > 0) {
            setDatatableEditedCells((prev) => {
              const updated = new Set(prev);
              for (
                let rowIndex = 0;
                rowIndex < Math.max(data.length, newData.length);
                rowIndex++
              ) {
                const oldRow = data[rowIndex] || {};
                const newRow = newData[rowIndex] || {};
                for (const col of newColumns) {
                  if (oldRow[col] !== newRow[col]) {
                    updated.add(`${rowIndex}:${col}`);
                  }
                }
              }
              return updated;
            });
          }
          setData(newData);
          showToast({
            title: "Data Updated",
            description: "Data has been updated based on chat interaction.",
          });
        } catch (parseError) {
          console.error("Error parsing updated data context:", parseError);
          showToast({
            title: "Chat Update Error",
            description:
              "Could not apply updates from chat. Invalid data format received.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Error in chat interface:", error);
      let description =
        "Sorry, I encountered an error processing your chat message.";
      const errorMessage = String(error?.message || error).toLowerCase();
      if (
        errorMessage.includes("api key") ||
        errorMessage.includes("authentication")
      ) {
        description =
          "Authentication failed with the AI provider. Check your API key.";
      } else if (errorMessage.includes("model not found")) {
        description = `The AI model ('${selectedAiProvider}/${selectedAiModelName}') was not found. Check AI Settings and key permissions.`;
      } else if (
        errorMessage.includes("503") ||
        errorMessage.includes("unavailable") ||
        errorMessage.includes("overloaded")
      ) {
        description =
          "The AI service is temporarily unavailable or overloaded. Please try again later.";
      }
      addChatMessage({ role: "model", content: description });
      showToast({
        title: "Chat Error",
        description,
        variant: "destructive",
        duration: 9000,
      });
    } finally {
      setIsChatLoading(false);
      setAppIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  if (data.length === 0) {
    return null;
  }

  const isSubmitDisabled =
    isChatLoading ||
    appIsLoading ||
    !userInput.trim() ||
    !selectedAiProvider ||
    !selectedAiModelName;

  return (
    <Card className="shadow-lg h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-headline flex items-center">
          <Bot className="mr-2 h-6 w-6 text-primary" />
          Chat with Your Data
        </CardTitle>
      </CardHeader>
      <Separator />

      <div className="flex flex-col grow overflow-hidden">
        <ScrollArea id="chat-pane-scroll-area" className="flex-grow px-4 py-4" ref={scrollAreaRef}>
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
          <Button type="submit" disabled={isSubmitDisabled} size="icon">
            <CornerDownLeft className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
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
