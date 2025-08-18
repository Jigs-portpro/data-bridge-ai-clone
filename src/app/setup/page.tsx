"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, PlusCircle, GripVertical, Save, XCircle, Loader2, ListFilter, CheckCircle, ChevronDown } from 'lucide-react';
import type { ExportEntity, ExportEntityField, ExportConfig } from '@/config/exportEntities';
import { useAppContext } from '@/hooks/useAppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getEntity, storeEntity } from '@/utils/mongodb-helpers';

interface SetupExportEntityField extends ExportEntityField {
  internalId: string;
}

interface SetupExportEntity extends Omit<ExportEntity, 'fields'> {
  internalId: string;
  id: string;
  fields: SetupExportEntityField[];
}

const fieldTypes: Required<ExportEntityField>['type'][] = ['string', 'number', 'boolean', 'email', 'date', 'array'];

export default function SetupPage() {
  const { showToast, isAuthenticated, isAuthLoading, entityConfig, setEntityConfig, clearApiToken, clearCarrierId } = useAppContext();
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [entities, setEntities] = useState<SetupExportEntity[]>([]);
  const [selectedEntityInternalId, setSelectedEntityInternalId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingBaseUrl, setIsSettingBaseUrl] = useState(false);
  const [initialConfigSnapshot, setInitialConfigSnapshot] = useState<string>('');
  const [baseUrlInput, setBaseUrlInput] = useState<string>('');
  const [showUrlSetDialog, setShowUrlSetDialog] = useState(false);
  const [showUrlDropdown, setShowUrlDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Suggested URLs from environment variables and common patterns
  const suggestedUrls = useMemo(() => {
    const urls = [
      // Environment-based URLs
      process.env.NEXT_PUBLIC_BASE_URI,
      process.env.NEXT_PUBLIC_API_URL,
      process.env.NEXT_PUBLIC_BASE_URL,
      process.env.NEXT_PUBLIC_API_BASE_URL,
      process.env.NEXT_PUBLIC_SERVER_URL,
      // PortPro API endpoints
      'https://new-api.dev.portpro.io',
      'https://api.medlog.portpro.io',
      'https://api.axle.network',
      'https://api.forwardintermodal.portpro.io',
    ].filter(Boolean) as string[];

    // Remove duplicates and current baseUrl
    return [...new Set(urls)].filter(url => url !== baseUrl);
  }, [baseUrl]);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUrlDropdown(false);
      }
    };

    if (showUrlDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUrlDropdown]);


  const fetchConfig = useCallback(async () => {
    setIsFetching(true);
    try {
      let stringifyDbConfig = await getEntity();
      let config: ExportConfig = JSON.parse(stringifyDbConfig || '{}');

      if(!config) {
        const response = await fetch('/api/export-entities');
        if (!response.ok) throw new Error('Failed to fetch config');
        config = await response.json();
      }

      // Priority: localStorage (most recent) > config.baseUrl (database) > default
      const newBaseUrl = localStorage.getItem('baseApiUrl') || config.baseUrl || 'https://api.axle.network';
      setBaseUrl(newBaseUrl);
      setBaseUrlInput(newBaseUrl);
      
      // Check if the loaded baseUrl is different from the current entityConfig baseUrl
      if (entityConfig?.baseUrl && newBaseUrl !== entityConfig.baseUrl) {
        // Clear authentication data when loading a configuration with a different baseUrl
        clearApiToken();
        clearCarrierId();
        showToast({ 
          title: 'API Context Cleared', 
          description: 'Authentication data cleared due to different Base API URL in loaded configuration.', 
          variant: 'default',
          duration: 5000
        });
      }
      
      const loadedEntities = config.entities.map(e => ({
        ...e,
        id: e.id || `entity-${Math.random().toString(36).substring(2, 11)}`,
        internalId: `entity-internal-${e.id || 'new'}-${Math.random().toString(36).substring(2,9)}-${Date.now()}`,
        fields: e.fields.map(f => ({
          ...f,
          internalId: `field-internal-${Math.random().toString(36).substring(2, 9)}-${e.id || 'new'}-${f.name}-${Date.now()}`
        }))
      }));
      setEntities(loadedEntities);
      setInitialConfigSnapshot(JSON.stringify({ baseUrl: newBaseUrl, entities: loadedEntities }));
      
      if (loadedEntities.length > 0) {
        const currentSelectedIsValid = selectedEntityInternalId && loadedEntities.some(e => e.internalId === selectedEntityInternalId);
        if (!currentSelectedIsValid) {
            setSelectedEntityInternalId(loadedEntities[0].internalId);
        }
      } else {
        setSelectedEntityInternalId(null); 
      }

    } catch (error) {
      console.error('Failed to load entities config:', error);
      showToast({ title: 'Error', description: 'Could not load entity configurations. Using defaults.', variant: 'destructive' });
      // Priority: localStorage (most recent) > default
      const defaultBaseUrl = localStorage.getItem('baseApiUrl') || 'https://api.axle.network';
      setBaseUrl(defaultBaseUrl);
      setBaseUrlInput(defaultBaseUrl);
      setEntities([]);
      setSelectedEntityInternalId(null);
      setInitialConfigSnapshot(JSON.stringify({ baseUrl: defaultBaseUrl, entities: [] }));
    } finally {
      setIsFetching(false);
    }
  }, [showToast]); 

  useEffect(() => {
    if (isAuthLoading === false && isAuthenticated === false) {
      router.push('/login');
    } else if (isAuthenticated === true) {
      fetchConfig();
    }
  }, [isAuthenticated, isAuthLoading, router, fetchConfig]);


  

  const { totalEntities, totalFields, totalRequiredFields } = useMemo(() => {
    let fieldsCount = 0;
    let requiredFieldsCount = 0;
    entities.forEach(entity => {
      fieldsCount += entity.fields.length;
      entity.fields.forEach(field => {
        if (field.required) {
          requiredFieldsCount++;
        }
      });
    });
    return {
      totalEntities: entities.length,
      totalFields: fieldsCount,
      totalRequiredFields: requiredFieldsCount,
    };
  }, [entities]);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    const entitiesToSave: ExportEntity[] = entities.map(({ internalId, fields, ...rest }) => ({
      ...rest,
      id: rest.id,
      fields: fields.map(({ internalId: fieldInternalId, ...fieldRest }) => {
        const cleanedField: ExportEntityField = { ...fieldRest };
        if (cleanedField.minLength === undefined || cleanedField.minLength === null || isNaN(Number(cleanedField.minLength))) delete cleanedField.minLength;
        if (cleanedField.maxLength === undefined || cleanedField.maxLength === null || isNaN(Number(cleanedField.maxLength))) delete cleanedField.maxLength;
        if (cleanedField.minValue === undefined || cleanedField.minValue === null || isNaN(Number(cleanedField.minValue))) delete cleanedField.minValue;
        if (cleanedField.maxValue === undefined || cleanedField.maxValue === null || isNaN(Number(cleanedField.maxValue))) delete cleanedField.maxValue;
        if (cleanedField.pattern === '' || cleanedField.pattern === undefined) delete cleanedField.pattern;
        
        if (cleanedField.lookupValidation) {
          const lv = cleanedField.lookupValidation;
          const lookupIdIsEmpty = !lv.lookupId || String(lv.lookupId).trim() === '';
          
          if (lookupIdIsEmpty) { 
            delete cleanedField.lookupValidation;
          }
        }
        return cleanedField;
      })
    }));

    const configToSave: ExportConfig = { baseUrl, entities: entitiesToSave };

    try {
      const response = await fetch('/api/export-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave, null, 2),
      });

      const entityConfigId = entityConfig?._id;
      const updatedStringifyResponse = await storeEntity(entityConfigId || '', configToSave);
      const parseUpdateEntityConfig = JSON.parse(updatedStringifyResponse || '{}');

      if(parseUpdateEntityConfig) {
        setEntityConfig(parseUpdateEntityConfig);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to save configuration.' }));
        throw new Error(errorData.message);
      }

      showToast({ title: 'Success', description: 'Configuration saved successfully.' });
      setInitialConfigSnapshot(JSON.stringify(configToSave)); 
    } catch (error: any) {
      console.error('Failed to save entities config:', error);
      showToast({ title: 'Error Saving', description: error.message || 'Could not save entity configurations.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    fetchConfig(); 
    setBaseUrlInput(baseUrl); // Reset input to current baseUrl
    showToast({ title: 'Changes Discarded', description: 'Local changes have been discarded.'});
  };

  const handleSetBaseUrl = async () => {

    
    if (!baseUrlInput.trim()) {
      showToast({ 
        title: 'Invalid URL', 
        description: 'Please enter a valid Base API URL.', 
        variant: 'destructive' 
      });
      return;
    }

    setIsSettingBaseUrl(true);
    try {

      
      // Check if the baseUrl is actually changing
      if (baseUrlInput !== baseUrl) {
        // Clear authentication data when changing base URL
        clearApiToken();
        clearCarrierId();
        
        // Update the baseUrl state
        setBaseUrl(baseUrlInput);
        
        // Save to localStorage
        localStorage.setItem('baseApiUrl', baseUrlInput);
        
        // Save to database by updating the entity config
        try {
          const currentConfig = {
            baseUrl: baseUrlInput,
            entities: entities.map(({ internalId, fields, ...rest }) => ({
              ...rest,
              id: rest.id,
              fields: fields.map(({ internalId: fieldInternalId, ...fieldRest }) => {
                const cleanedField: ExportEntityField = { ...fieldRest };
                if (cleanedField.minLength === undefined || cleanedField.minLength === null || isNaN(Number(cleanedField.minLength))) delete cleanedField.minLength;
                if (cleanedField.maxLength === undefined || cleanedField.maxLength === null || isNaN(Number(cleanedField.maxLength))) delete cleanedField.maxLength;
                if (cleanedField.minValue === undefined || cleanedField.minValue === null || isNaN(Number(cleanedField.minValue))) delete cleanedField.minValue;
                if (cleanedField.maxValue === undefined || cleanedField.maxValue === null || isNaN(Number(cleanedField.maxValue))) delete cleanedField.maxValue;
                if (cleanedField.pattern === '' || cleanedField.pattern === undefined) delete cleanedField.pattern;
                
                if (cleanedField.lookupValidation) {
                  const lv = cleanedField.lookupValidation;
                  const lookupIdIsEmpty = !lv.lookupId || String(lv.lookupId).trim() === '';
                  
                  if (lookupIdIsEmpty) { 
                    delete cleanedField.lookupValidation;
                  }
                }
                return cleanedField;
              })
            }))
          };

          const response = await fetch('/api/export-entities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentConfig, null, 2),
          });

          const entityConfigId = entityConfig?._id;
          const updatedStringifyResponse = await storeEntity(entityConfigId || '', currentConfig);
          const parseUpdateEntityConfig = JSON.parse(updatedStringifyResponse || '{}');

          if(parseUpdateEntityConfig) {
            setEntityConfig(parseUpdateEntityConfig);
          }

          if (!response.ok) {
            throw new Error('Failed to save configuration to database');
          }
          

        } catch (dbError) {
          console.error('Failed to save to database:', dbError);
          showToast({ 
            title: 'Warning', 
            description: 'Base URL set locally but failed to save to database. Please try saving the configuration again.', 
            variant: 'destructive',
            duration: 5000
          });
        }
        

        
        showToast({ 
          title: 'Base API URL Set', 
          description: `Base API URL has been set to: ${baseUrlInput}.`, 
          duration: 3000
        });
        
        // Show popup dialog
        setShowUrlSetDialog(true);
      } else {

        showToast({ 
          title: 'URL Already Set', 
          description: `The Base API URL is already set to: ${baseUrlInput}`, 
          variant: 'default',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error setting base URL:', error);
      showToast({ 
        title: 'Error', 
        description: 'Failed to set Base API URL.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSettingBaseUrl(false);
    }
  };


  const handleAddEntity = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const newEntityInternalId = `entity-internal-${Date.now()}-${randomSuffix}`;
    const newEntityId = `new-entity-${entities.length + 1}-${randomSuffix}`;
    const newEntity: SetupExportEntity = {
        internalId: newEntityInternalId,
        id: newEntityId,
        name: `New Entity ${entities.length + 1}`,
        url: '/new-endpoint',
        fields: [],
    };
    setEntities([...entities, newEntity]);
    setSelectedEntityInternalId(newEntityInternalId); 
  };

  const handleRemoveEntity = (internalIdToRemove: string) => {
    const newEntities = entities.filter((e) => e.internalId !== internalIdToRemove);
    setEntities(newEntities);
    if (selectedEntityInternalId === internalIdToRemove) {
      setSelectedEntityInternalId(newEntities.length > 0 ? newEntities[0].internalId : null);
    }
  };

  const handleEntityChange = (internalId: string, field: keyof Omit<SetupExportEntity, 'fields' | 'internalId'>, value: any) => {
    setEntities(
      entities.map((e) => (e.internalId === internalId ? { ...e, [field]: value } : e))
    );
  };

  const handleAddField = (entityInternalId: string) => {
    setEntities(
      entities.map((e) =>
        e.internalId === entityInternalId
          ? {
              ...e,
              fields: [
                ...e.fields,
                {
                  internalId: `field-internal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  name: `newField${e.fields.length + 1}`,
                  type: 'string',
                },
              ],
            }
          : e
      )
    );
  };

  const handleRemoveField = (entityInternalId: string, fieldInternalId: string) => {
    setEntities(
      entities.map((e) =>
        e.internalId === entityInternalId
          ? { ...e, fields: e.fields.filter((f) => f.internalId !== fieldInternalId) }
          : e
      )
    );
  };

  const handleFieldChange = (
    entityInternalId: string,
    fieldInternalId: string,
    prop: keyof SetupExportEntityField | 'lookupId' | 'lookupField',
    value: any
  ) => {
    setEntities(
      entities.map((e) =>
        e.internalId === entityInternalId
          ? {
              ...e,
              fields: e.fields.map((f) => {
                if (f.internalId !== fieldInternalId) return f;

                if (prop === 'lookupId' || prop === 'lookupField') {
                  const currentLv = f.lookupValidation || { lookupId: '', lookupField: '' };
                  let newLv: SetupExportEntityField['lookupValidation'];

                  if (prop === 'lookupId') {
                    newLv = { ...currentLv, lookupId: value as string };
                  } else { 
                    newLv = { ...currentLv, lookupField: value as string };
                  }

                  if ((!newLv.lookupId || String(newLv.lookupId).trim() === '') && 
                      (!newLv.lookupField || String(newLv.lookupField).trim() === '')) {
                    const { lookupValidation, ...fieldWithoutLv } = f; 
                    return fieldWithoutLv; 
                  } else {
                    return { ...f, lookupValidation: newLv };
                  }
                } else {
                  return {
                    ...f,
                    [prop]: (prop === 'minLength' || prop === 'maxLength' || prop === 'minValue' || prop === 'maxValue')
                              ? (value === '' || isNaN(Number(value)) ? undefined : Number(value))
                              : (prop === 'pattern' && value === '')
                                ? undefined
                                : value
                  };
                }
              }),
            }
          : e
      )
    );
  };
  
  const currentEntity = useMemo(() => {
    return entities.find(e => e.internalId === selectedEntityInternalId);
  }, [entities, selectedEntityInternalId]);


  if (isAuthLoading === true || (isAuthenticated === false && isAuthLoading === false) || (isFetching === true && entities.length === 0 && isAuthenticated === true)) {
    return (
      <AppLayout pageTitle="Loading Setup...">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Target Entities">
      <div className="flex flex-col h-full gap-2 overflow-y-auto">
        <div className="flex-shrink-0">
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-2xl font-bold text-foreground">Target Entities</h1>
            <p className="text-muted-foreground">Manage your API entities and their field configurations.</p>
          </div>
          <Button onClick={handleAddEntity} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Entity
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{totalEntities}</p>
              <p className="text-sm text-muted-foreground">Total Entities</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{totalFields}</p>
              <p className="text-sm text-muted-foreground">Total Fields</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{totalRequiredFields}</p>
              <p className="text-sm text-muted-foreground">Required Fields</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          {/* Base API URL Section */}
          <div>
            <Label htmlFor="baseUrl" className="text-sm font-medium">Base API URL</Label>
            
            {/* Current Base URL Status with Input */}
            <div className="mt-2 p-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-xl border border-blue-200/50 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-blue-900">Currently Active</p>
                </div>
                {entityConfig?.baseUrl && baseUrl !== entityConfig.baseUrl && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full font-medium border border-amber-200 shadow-sm">
                    Modified
                  </span>
                )}
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-blue-300/30 p-4 mb-4 shadow-inner">
                <p className="text-sm font-mono text-blue-900 break-all">
                  {baseUrl || 'Not configured'}
                </p>
              </div>
              
              {entityConfig?.baseUrl && baseUrl !== entityConfig.baseUrl && (
                <div className="mb-4 p-3 bg-amber-50/80 border border-amber-200/50 rounded-lg">
                  <p className="text-xs text-amber-800 font-medium flex items-center gap-2">
                    <span className="text-amber-600">⚠️</span>
                    Original: <span className="font-mono">{entityConfig.baseUrl}</span>
                  </p>
                </div>
              )}
              
              {/* Base URL Input and Set Button */}
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="relative flex-1 group">
                    <Input
                      id="baseUrl"
                      value={baseUrlInput}
                      onChange={(e) => setBaseUrlInput(e.target.value)}
                      placeholder="Enter new Base API URL (e.g., https://api.example.com/v1)"
                      className="pr-12 h-12 text-base border-blue-300/50 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 group-hover:border-blue-400/70"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-10 w-10 px-0 hover:bg-blue-100/50 transition-all duration-200"
                      onClick={() => setShowUrlDropdown(!showUrlDropdown)}
                      disabled={suggestedUrls.length === 0}
                      title={suggestedUrls.length > 0 ? `${suggestedUrls.length} URL suggestions available` : 'No URL suggestions available'}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showUrlDropdown ? 'rotate-180' : ''}`} />
                      {suggestedUrls.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg">
                          {suggestedUrls.length}
                        </span>
                      )}
                    </Button>
                  </div>
                  <Button 
                    onClick={handleSetBaseUrl}
                    disabled={isSettingBaseUrl || !baseUrlInput.trim()}
                    size="default"
                    className="min-w-[120px] h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                    variant={baseUrlInput === baseUrl ? "outline" : "default"}
                  >
                    {isSettingBaseUrl ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : baseUrlInput === baseUrl ? (
                      'Already Set'
                    ) : (
                      'Set URL'
                    )}
                  </Button>
                </div>
                
                {/* Dropdown with suggested URLs */}
                {showUrlDropdown && suggestedUrls.length > 0 && (
                  <div className="relative" ref={dropdownRef}>
                    <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border border-blue-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                      <div className="px-4 py-3 text-sm font-semibold text-blue-900 border-b border-blue-200/50 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
                        <div className="flex items-center gap-2">
                          <span>💡</span>
                          Suggested URLs ({suggestedUrls.length})
                        </div>
                      </div>
                      {suggestedUrls.map((url, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50/80 focus:bg-blue-100/50 focus:outline-none border-b border-blue-100/50 last:border-b-0 transition-all duration-150 group"
                          onClick={() => {
                            setBaseUrlInput(url);
                            setShowUrlDropdown(false);
                          }}
                        >
                          <div className="font-mono text-sm text-blue-900 group-hover:text-blue-700 transition-colors">
                            {url}
                          </div>
                          <div className="text-xs text-blue-600/70 mt-1 font-medium">
                            {url.includes('localhost') || url.includes('127.0.0.1') ? '🏠 Local Development' :
                             url.includes('new-api.dev.portpro.io') ? '🚀 PortPro Development API' :
                             url.includes('api.medlog.portpro.io') ? '📋 PortPro MedLog API' :
                             url.includes('api.forwardintermodal.portpro.io') ? '🚛 PortPro Forward Intermodal API' :
                             url.includes('api.axle.network') ? '🔗 Production API' :
                             url.includes('NEXT_PUBLIC_') ? '⚙️ Environment Variable' :
                             '🔧 Common Pattern'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No suggestions message */}
                {showUrlDropdown && suggestedUrls.length === 0 && (
                  <div className="relative" ref={dropdownRef}>
                    <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border border-blue-200 rounded-xl shadow-2xl p-6">
                      <div className="text-center text-sm text-blue-700">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">💡</span>
                        </div>
                        <p className="font-medium">No URL suggestions available</p>
                        <p className="text-xs mt-2 text-blue-600/70">Try setting environment variables like NEXT_PUBLIC_BASE_URI</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Status indicator */}
                {baseUrlInput && (
                  <div className="flex items-center gap-2 p-3 rounded-lg transition-all duration-200">
                    {baseUrlInput === baseUrl ? (
                      <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">✓ URL matches current setting</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        <span className="text-sm font-medium">→ Will update to new URL</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Help text */}
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-lg border border-blue-200/30">
                  <span className="text-blue-600 text-lg">💡</span>
                  <div className="text-sm text-blue-800/80">
                    <p className="font-medium">Quick Setup Tips</p>
                    <p className="mt-1">Type a URL manually or use the dropdown to select from PortPro API endpoints and environment variables.</p>
                    <p className="mt-1">This URL will prefix all entity endpoint paths for API calls.</p>
                  </div>
                </div>

                {/* Warning when input differs from current */}
                {baseUrl && baseUrlInput !== baseUrl && (
                  <div className="p-4 bg-gradient-to-r from-amber-50/80 to-orange-50/80 border border-amber-300/50 rounded-lg shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-amber-600 text-sm">⚠️</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-800 mb-2">
                          Authentication Reset Required
                        </p>
                        <p className="text-xs text-amber-700 leading-relaxed">
                          Setting a new Base API URL will clear your current authentication token and target context. 
                          After setting the URL, you'll need to re-authenticate on the API Auth page.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Entity Selection Section */}
          <div>
            <Label htmlFor="entity-selector" className="text-sm font-medium">Select Entity to Edit</Label>
            <div className="mt-2">
              <Select 
                value={selectedEntityInternalId || ""} 
                onValueChange={(value) => setSelectedEntityInternalId(value || null)}
                disabled={isFetching || entities.length === 0}
              >
                <SelectTrigger id="entity-selector">
                  <SelectValue placeholder={entities.length === 0 ? "No entities configured" : "Select an entity..."} />
                </SelectTrigger>
                <SelectContent>
                  {entities.length === 0 && <SelectItem value="no-entities" disabled>No entities configured</SelectItem>}
                  {entities.map(entity => (
                    <SelectItem key={entity.internalId} value={entity.internalId}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {entities.length > 0 && !selectedEntityInternalId && !isFetching && (
                <p className="text-xs text-muted-foreground mt-2">
                  Please select the entity to edit.
                </p>
              )}
              {entities.length === 0 && !isFetching && (
                <p className="text-xs text-muted-foreground mt-2">
                  No entities are configured yet. Click "Add New Entity" to start.
                </p>
              )}
            </div>
          </div>
        </div>

        <Separator className="flex-shrink-0"/>
        
        {/* Entity Fields Container - Flexible and Scrollable */}
        <div className="flex-grow flex flex-col">
          {isFetching && !currentEntity && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {!isFetching && !currentEntity && entities.length > 0 && (
            <Card className="text-center py-10 flex-grow flex items-center justify-center">
              <CardContent>
                <ListFilter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Select an Entity</h3>
                <p className="text-muted-foreground text-sm">Choose an entity from the dropdown above to view and edit its details.</p>
              </CardContent>
            </Card>
          )}
          
          {!isFetching && entities.length === 0 && (
            <Card className="text-center py-10 flex-grow flex items-center justify-center">
              <CardContent>
                <h3 className="text-lg font-semibold">No Entities Configured</h3>
                <p className="text-muted-foreground text-sm">Click "Add New Entity" to get started.</p>
              </CardContent>
            </Card>
          )}
          
          {currentEntity && (
            <div className="w-full">
              <Card key={currentEntity.internalId} className="w-full">
                <CardHeader className="bg-muted/30 p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-grow">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab flex-shrink-0" />
                      <Input
                        value={currentEntity.name}
                        onChange={(e) => handleEntityChange(currentEntity.internalId, 'name', e.target.value)}
                        className="text-lg font-semibold border-0 shadow-none focus-visible:ring-0 bg-transparent p-0 h-auto flex-grow"
                        placeholder="Entity Name"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button onClick={() => handleAddField(currentEntity.internalId)} size="sm" variant="outline">
                        <PlusCircle className="mr-1.5 h-4 w-4" /> Add Field
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => handleRemoveEntity(currentEntity.internalId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`entity-id-${currentEntity.internalId}`} className="text-xs">Entity ID (API Key)</Label>
                      <Input
                        id={`entity-id-${currentEntity.internalId}`}
                        value={currentEntity.id}
                        onChange={(e) => handleEntityChange(currentEntity.internalId, 'id', e.target.value)}
                        placeholder="e.g., tmsCustomer"
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`entity-url-${currentEntity.internalId}`} className="text-xs">Endpoint Path</Label>
                      <Input
                        id={`entity-url-${currentEntity.internalId}`}
                        value={currentEntity.url}
                        onChange={(e) => handleEntityChange(currentEntity.internalId, 'url', e.target.value)}
                        placeholder="e.g., /customers"
                        className="mt-1 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="grid grid-cols-[minmax(180px,2fr)_minmax(120px,1fr)_auto_minmax(80px,0.5fr)_minmax(80px,0.5fr)_minmax(120px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto] gap-x-2 gap-y-1 items-center px-2 py-1.5 text-xs font-medium text-muted-foreground border-b">
                      <span>FIELD NAME</span>
                      <span>DATA TYPE</span>
                      <span className="text-center">REQUIRED</span>
                      <span>MIN</span>
                      <span>MAX</span>
                      <span>PATTERN (RegEx)</span>
                      <span>LOOKUP ID</span>
                      <span>LOOKUP FIELD</span>
                      <span className="text-right">ACTIONS</span>
                    </div>
                    
                    <div className="mt-1">
                      <div className="space-y-1 pr-2">
                        {currentEntity.fields.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No fields defined for this entity.</p>}
                        {currentEntity.fields.map((field) => (
                          <div key={field.internalId} className="grid grid-cols-[minmax(180px,2fr)_minmax(120px,1fr)_auto_minmax(80px,0.5fr)_minmax(80px,0.5fr)_minmax(120px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto] gap-x-2 gap-y-1 items-center p-2 border rounded-md hover:bg-muted/20">
                            <Input
                              value={field.name}
                              onChange={(e) => handleFieldChange(currentEntity.internalId, field.internalId, 'name', e.target.value)}
                              placeholder="Target API Field Name"
                              className="text-xs h-8"
                            />
                            <Select
                              value={field.type}
                              onValueChange={(value) => handleFieldChange(currentEntity.internalId, field.internalId, 'type', value)}
                            >
                              <SelectTrigger className="text-xs h-8">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldTypes.map((type) => (
                                  <SelectItem key={type} value={type || ''} className="text-xs">
                                    {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Any'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex justify-center">
                              <Checkbox
                                checked={!!field.required}
                                onCheckedChange={(checked) => handleFieldChange(currentEntity.internalId, field.internalId, 'required', !!checked)}
                                className="h-4 w-4"
                              />
                            </div>
                            
                            {(field.type === 'string' || field.type === 'email') ? (
                              <>
                                <Input type="number" placeholder="Min Len" title="Minimum Length" value={field.minLength ?? ''} onChange={(e) => handleFieldChange(currentEntity.internalId, field.internalId, 'minLength', e.target.value)} className="text-xs h-8"/>
                                <Input type="number" placeholder="Max Len" title="Maximum Length" value={field.maxLength ?? ''} onChange={(e) => handleFieldChange(currentEntity.internalId, field.internalId, 'maxLength', e.target.value)} className="text-xs h-8"/>
                                <Input placeholder="Regex Pattern" title="Regular Expression Pattern" value={field.pattern ?? ''} onChange={(e) => handleFieldChange(currentEntity.internalId, field.internalId, 'pattern', e.target.value)} className="text-xs h-8"/>
                              </>
                            ) : field.type === 'number' ? (
                              <>
                                <Input type="number" placeholder="Min Val" title="Minimum Value" value={field.minValue ?? ''} onChange={(e) => handleFieldChange(currentEntity.internalId, field.internalId, 'minValue', e.target.value)} className="text-xs h-8"/>
                                <Input type="number" placeholder="Max Val" title="Maximum Value" value={field.maxValue ?? ''} onChange={(e) => handleFieldChange(currentEntity.internalId, field.internalId, 'maxValue', e.target.value)} className="text-xs h-8"/>
                                <div className="w-full h-8 bg-muted/30 rounded-md"></div> 
                              </>
                            ) : ( 
                              <>
                                <div className="w-full h-8 bg-muted/30 rounded-md"></div>
                                <div className="w-full h-8 bg-muted/30 rounded-md"></div>
                                <div className="w-full h-8 bg-muted/30 rounded-md"></div>
                              </>
                            )}
                            
                            <Input 
                                placeholder="Lookup ID (e.g., chassisOwners)" 
                                title="Lookup ID (e.g., chassisOwners from Lookups page)"
                                value={field.lookupValidation?.lookupId ?? ''} 
                                onChange={(e) => handleFieldChange(currentEntity.internalId, field.internalId, 'lookupId', e.target.value)} 
                                className="text-xs h-8"
                            />
                            <Input 
                                placeholder="Field in Lookup Data (e.g., company_name)" 
                                title="Field in Lookup Data (e.g., company_name)"
                                value={field.lookupValidation?.lookupField ?? ''} 
                                onChange={(e) => handleFieldChange(currentEntity.internalId, field.internalId, 'lookupField', e.target.value)} 
                                className="text-xs h-8"
                            />

                            <div className="text-right">
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-7 w-7" onClick={() => handleRemoveField(currentEntity.internalId, field.internalId)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                {/* Action Buttons - Fixed at bottom of entity container */}
                <div className="p-4 border-t bg-muted/20">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCancel} disabled={isSaving || isFetching}>
                      <XCircle className="mr-2 h-4 w-4"/> Cancel
                    </Button>
                    <Button onClick={handleSaveConfig} disabled={isSaving || isFetching}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Warning message when baseUrl has changed */}
        {entityConfig?.baseUrl && baseUrl !== entityConfig.baseUrl && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 flex-shrink-0">
            <div className="flex items-start gap-2">
              <div className="text-amber-600 mt-0.5">⚠️</div>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Base API URL Change Detected
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  The Base API URL has been changed from "{entityConfig.baseUrl}" to "{baseUrl}". 
                  Your authentication token and target context have been cleared. 
                  You will need to re-authenticate with the new API server.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* URL Set Success Dialog */}
      <Dialog open={showUrlSetDialog} onOpenChange={setShowUrlSetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              URL Set Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your Base API URL has been configured successfully.
            </p>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">
                Please login to your carrier account in the API Auth page.
              </p>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => setShowUrlSetDialog(false)}
                variant="default"
                size="sm"
              >
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

