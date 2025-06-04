
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Cpu, Info, KeyRound, Save, Loader2, BookOpen, FileText } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type ModelInfo = {
  id: string; // This is the model_id part, e.g., "gpt4o" or "claude-3-opus-20240229"
  name: string; // User-friendly display name
  provider: 'googleai' | 'openai' | 'anthropic'; // This corresponds to the provider part, e.g., "openai"
};

const ALL_KNOWN_MODELS: ModelInfo[] = [
  // Google AI (Keep these as they are for the googleAI() plugin)
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "googleai" },
  { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash Exp.", provider: "googleai" }, // Primarily for images but can be used for text
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "googleai" },
  { id: "gemini-1.0-pro", name: "Gemini 1.0 Pro", provider: "googleai" },
  
  // OpenAI (for genkitx-openai plugin - IDs updated based on user feedback)
  { id: "gpt4o", name: "GPT-4o", provider: "openai" },
  { id: "gpt4oMini", name: "GPT-4o mini", provider: "openai" },
  { id: "gpt4Turbo", name: "GPT-4 Turbo", provider: "openai" },
  { id: "gpt4", name: "GPT-4", provider: "openai" },
  { id: "gpt35Turbo", name: "GPT-3.5 Turbo", provider: "openai" },

  // Anthropic (for genkitx-anthropic plugin)
  { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet", provider: "anthropic" },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus", provider: "anthropic" },
  { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", provider: "anthropic" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "anthropic" },
];

const PROVIDERS = [
  { id: 'googleai', name: 'Google AI (Gemini)' },
  { id: 'openai', name: 'OpenAI (GPT)' },
  { id: 'anthropic', name: 'Anthropic (Claude)' },
] as const;

type ProviderId = typeof PROVIDERS[number]['id'];

export default function AiSettingsPage() {
  const { 
    isAuthenticated, 
    isAuthLoading, 
    selectedAiProvider, 
    setSelectedAiProvider,
    selectedAiModelName,
    setSelectedAiModelName,
    showToast,
    getEnvKeys,
  } = useAppContext();

  const [currentProvider, setCurrentProvider] = useState<ProviderId | ''>('');
  const [currentModel, setCurrentModel] = useState<string>('');
  const [availableModelsForProvider, setAvailableModelsForProvider] = useState<ModelInfo[]>([]);
  const [envApiKeys, setEnvApiKeys] = useState<Record<string,boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEnvApiKeys(getEnvKeys());
  }, [getEnvKeys]);
  
  useEffect(() => {
    if (selectedAiProvider) {
      setCurrentProvider(selectedAiProvider as ProviderId);
      const models = ALL_KNOWN_MODELS.filter(m => m.provider === selectedAiProvider);
      setAvailableModelsForProvider(models);
      if (selectedAiModelName && models.some(m => m.id === selectedAiModelName)) {
        setCurrentModel(selectedAiModelName);
      } else if (models.length > 0) {
        setCurrentModel(models[0].id); 
      } else {
        setCurrentModel('');
      }
    } else {
        // Fallback logic if no provider is selected but keys exist
        const firstAvailableProvider = PROVIDERS.find(p => envApiKeys[p.id.toUpperCase() + '_API_KEY']);
        if (firstAvailableProvider) {
            setCurrentProvider(firstAvailableProvider.id);
            const models = ALL_KNOWN_MODELS.filter(m => m.provider === firstAvailableProvider.id);
            setAvailableModelsForProvider(models);
            setCurrentModel(models.length > 0 ? models[0].id : '');
        } else {
            setCurrentProvider('');
            setAvailableModelsForProvider([]);
            setCurrentModel('');
        }
    }
  }, [selectedAiProvider, selectedAiModelName, envApiKeys]);


  const handleProviderChange = (providerId: string) => {
    const newProvider = providerId as ProviderId;
    if (providerId && !envApiKeys[newProvider.toUpperCase() + '_API_KEY']) {
      showToast({
        title: "API Key Missing",
        description: `The API key for ${PROVIDERS.find(p=>p.id === newProvider)?.name} is not set in your .env file (or .env.local). This provider may not work. Remember to restart the server after changing .env files.`,
        variant: "destructive",
        duration: 9000,
      });
    }
    setCurrentProvider(newProvider);
    const models = ALL_KNOWN_MODELS.filter(m => m.provider === newProvider);
    setAvailableModelsForProvider(models);
    if (models.length > 0) {
      setCurrentModel(models[0].id); 
    } else {
      setCurrentModel('');
    }
  };
  
  const handleSaveSettings = () => {
    if (!currentProvider || !currentModel) {
      showToast({ title: "Incomplete Selection", description: "Please select both an AI provider and a model.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    setSelectedAiProvider(currentProvider);
    setSelectedAiModelName(currentModel);
    
    setTimeout(() => {
        showToast({ title: "Settings Saved", description: `AI Provider set to ${PROVIDERS.find(p=>p.id === currentProvider)?.name}, Model set to ${ALL_KNOWN_MODELS.find(m=>m.id === currentModel)?.name}.` });
        setIsSaving(false);
    }, 300);
  };


  if (isAuthLoading || !isAuthenticated) {
    return (
      <AppLayout pageTitle="Loading AI Settings...">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const getApiKeyStatus = (providerId: ProviderId) => {
    const keyName = providerId.toUpperCase() + '_API_KEY'; // e.g., GOOGLEAI_API_KEY
    return envApiKeys[keyName] ? 'Set' : 'Not Set';
  };
  
  const providerHasNoKey = currentProvider && !envApiKeys[currentProvider.toUpperCase() + '_API_KEY'];
  const noKeysConfiguredAtAll = !envApiKeys.GOOGLEAI_API_KEY && !envApiKeys.OPENAI_API_KEY && !envApiKeys.ANTHROPIC_API_KEY;


  return (
    <AppLayout pageTitle="AI Provider & Model Settings">
      <ScrollArea className="flex-grow h-full">
        <div className="space-y-6 p-1">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>AI Configuration</AlertTitle>
            <AlertDescription>
              Select your preferred AI provider and model for generative features. 
              The corresponding API key must be set in your <code className="font-mono text-sm bg-muted p-0.5 rounded">.env</code> or <code className="font-mono text-sm bg-muted p-0.5 rounded">.env.local</code> file (and the server restarted) for the selected provider to function. 
              Changes made here are saved locally in your browser and apply to new AI operations.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Cpu className="mr-2 h-5 w-5 text-primary"/>Select AI Provider & Model</CardTitle>
              <CardDescription>
                Choose the AI service and model you want the application to use for text generation tasks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="ai-provider-select">AI Provider</Label>
                <Select value={currentProvider} onValueChange={handleProviderChange} disabled={isSaving || noKeysConfiguredAtAll}>
                  <SelectTrigger id="ai-provider-select">
                    <SelectValue placeholder={noKeysConfiguredAtAll ? "No API keys found in .env" : "Select a provider"} />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(provider => (
                      <SelectItem 
                        key={provider.id} 
                        value={provider.id}
                        disabled={!envApiKeys[provider.id.toUpperCase() + '_API_KEY']}
                      >
                        {provider.name} {!envApiKeys[provider.id.toUpperCase() + '_API_KEY'] && "(API Key Missing)"}
                      </SelectItem>
                    ))}
                     {noKeysConfiguredAtAll && (
                         <SelectItem value="no-keys-found" disabled>No API keys found in .env</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {noKeysConfiguredAtAll && (
                    <p className="text-xs text-destructive mt-1">
                        No API keys detected in your <code className="font-mono text-xs">.env</code> or <code className="font-mono text-xs">.env.local</code> files. Please set GOOGLEAI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY and restart the server.
                    </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-model-select">Model Name</Label>
                <Select value={currentModel} onValueChange={setCurrentModel} disabled={isSaving || !currentProvider || availableModelsForProvider.length === 0}>
                  <SelectTrigger id="ai-model-select">
                    <SelectValue placeholder={!currentProvider ? "Select a provider first" : (availableModelsForProvider.length === 0 ? "No models for provider" : "Select a model")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModelsForProvider.length === 0 && currentProvider && (
                         <SelectItem value="no-models" disabled>No models listed for {PROVIDERS.find(p=>p.id === currentProvider)?.name} or provider not supported/key missing.</SelectItem>
                    )}
                    {availableModelsForProvider.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 {providerHasNoKey && currentProvider && (
                    <p className="text-xs text-destructive mt-1">
                        Warning: The API key for {PROVIDERS.find(p=>p.id === currentProvider)?.name} is not set. This selection may not work.
                    </p>
                 )}
              </div>
              <Button onClick={handleSaveSettings} disabled={isSaving || !currentProvider || !currentModel || noKeysConfiguredAtAll} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                Save AI Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>API Key Status</CardTitle>
              <CardDescription>
                Status of API keys detected from your <code className="font-mono text-sm bg-muted p-0.5 rounded">.env</code> or <code className="font-mono text-sm bg-muted p-0.5 rounded">.env.local</code> file by the server.
                Restart the application server if you change these files. This status is fetched via an API call.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.keys(envApiKeys).length === 0 && <p className="text-sm text-muted-foreground">Loading API key status...</p>}
              {PROVIDERS.map(provider => (
                <div key={provider.id} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-md">
                  <span>{provider.name} Key (<code className="text-xs">{provider.id.toUpperCase()}_API_KEY</code>):</span>
                  <span className={`font-semibold ${getApiKeyStatus(provider.id) === 'Set' ? 'text-green-600' : 'text-red-600'}`}>
                    {getApiKeyStatus(provider.id)}
                  </span>
                </div>
              ))}
               <p className="text-xs text-muted-foreground pt-2">
                  Image generation models (like <code className="text-xs">googleai/gemini-2.0-flash-exp</code>) are typically specified directly in image generation flows and are not configured by these global settings.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><BookOpen className="mr-2 h-5 w-5 text-primary"/>Model Selection Guide</CardTitle>
                <CardDescription>
                    Understanding different AI models can help you choose the best one for your needs.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="general-tips">
                        <AccordionTrigger className="text-base">General Tips for Choosing a Model</AccordionTrigger>
                        <AccordionContent className="text-sm space-y-2">
                            <p>Choosing the right model depends on your specific needs: cost, speed, and the complexity of the task. Models are constantly evolving, so it's good to stay updated with provider documentation.</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>"Flash / Haiku / Mini" Models:</strong> Generally the fastest and most cost-effective. Best for simpler tasks, high-volume requests, quick interactions, or when budget is a primary concern.</li>
                                <li><strong>"Pro / Sonnet / Turbo (standard)" Models:</strong> Offer a good balance of performance, capability, and cost. Suitable for a wide range of tasks including complex reasoning, detailed content generation, and coding assistance.</li>
                                <li><strong>"Ultra / Opus / Advanced Turbo / GPT-4 (full)" Models:</strong> The most powerful and capable models, excelling at highly complex tasks, nuanced understanding, and advanced reasoning. They are typically slower and more expensive.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="google-gemini">
                        <AccordionTrigger className="text-base">Google AI (Gemini) Models</AccordionTrigger>
                        <AccordionContent className="text-sm space-y-2">
                            <p>Gemini is a family of multimodal models from Google.</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Gemini 1.5 Flash:</strong> Optimized for speed, efficiency, and cost. Excellent for high-volume tasks, summarization, chat applications, and when low latency is critical. Supports a large context window.</li>
                                <li><strong>Gemini 2.0 Flash Exp.:</strong> An experimental, highly efficient model, often used for tasks including image generation (when specified in the flow). Good for quick responses and diverse tasks.</li>
                                <li><strong>Gemini 1.5 Pro:</strong> A highly capable multimodal model that balances performance with a very large context window (up to 1 million tokens). Excels at long-context reasoning, complex instruction following, coding, and advanced analysis.</li>
                                <li><strong>Gemini 1.0 Pro:</strong> A well-rounded earlier Pro model, good for a variety of tasks if 1.5 Pro's features aren't strictly needed.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="openai-gpt">
                        <AccordionTrigger className="text-base">OpenAI (GPT) Models</AccordionTrigger>
                        <AccordionContent className="text-sm space-y-2">
                            <p>GPT (Generative Pre-trained Transformer) models from OpenAI are known for their strong language understanding and generation capabilities. These models are typically accessed via the `genkitx-openai` plugin.</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>GPT-4o (`gpt4o`):</strong> OpenAI's flagship multimodal model, designed for speed, cost-effectiveness, and strong capabilities in text, vision, and audio.</li>
                                <li><strong>GPT-4o mini (`gpt4oMini`):</strong> A smaller, faster, and more affordable version of GPT-4o, providing strong intelligence for applications where speed and cost are critical.</li>
                                <li><strong>GPT-4 Turbo (`gpt4Turbo`):</strong> Advanced reasoning, creativity, and instruction following. Supports a large context window (often refers to models like `gpt-4-turbo-2024-04-09`).</li>
                                <li><strong>GPT-4 (`gpt4`):</strong> The base GPT-4 model, known for its powerful general capabilities.</li>
                                <li><strong>GPT-3.5 Turbo (`gpt35Turbo`):</strong> Fast and affordable, a workhorse for many general-purpose tasks, chatbots, and content generation (e.g., `gpt-3.5-turbo-0125`).</li>
                            </ul>
                             <p className="text-xs">Note: Model IDs like `gpt4oMini` (without hyphens) are used internally by the plugin.</p>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="anthropic-claude">
                        <AccordionTrigger className="text-base">Anthropic (Claude) Models</AccordionTrigger>
                        <AccordionContent className="text-sm space-y-2">
                            <p>Claude models from Anthropic are designed with a focus on helpfulness, harmlessness, and honesty, with strong performance in conversational AI and complex reasoning. These models are typically accessed via the `genkitx-anthropic` plugin.</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Claude 3.5 Sonnet (`claude-3-5-sonnet-20240620`):</strong> Anthropic's latest and most intelligent model in the Sonnet family, offering top-tier speed and cost-effectiveness for its capability class. Excels at complex reasoning, content generation, and coding tasks.</li>
                                <li><strong>Claude 3 Opus (`claude-3-opus-20240229`):</strong> The most powerful model in the Claude 3 family, delivering top-tier performance on highly complex tasks, excelling at complex analysis, research, and strategic planning.</li>
                                <li><strong>Claude 3 Sonnet (`claude-3-sonnet-20240229`):</strong> Offers an ideal balance of intelligence and speed for enterprise workloads. Strong for data processing, RAG over large datasets, and product recommendations.</li>
                                <li><strong>Claude 3 Haiku (`claude-3-haiku-20240307`):</strong> The fastest and most compact model in the Claude 3 family, designed for near-instant responsiveness. Ideal for customer interactions, content moderation, and cost-saving tasks.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
          </Card>

        </div>
      </ScrollArea>
    </AppLayout>
  );
}

