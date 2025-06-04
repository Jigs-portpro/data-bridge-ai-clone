
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, PlusCircle, GripVertical, Save, XCircle, Loader2, ListFilter } from 'lucide-react';
import type { ExportEntity, ExportEntityField, ExportConfig } from '@/config/exportEntities';
import { useAppContext } from '@/hooks/useAppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SetupExportEntityField extends ExportEntityField {
  internalId: string;
}

interface SetupExportEntity extends Omit<ExportEntity, 'fields'> {
  internalId: string;
  id: string;
  fields: SetupExportEntityField[];
}

const fieldTypes: Required<ExportEntityField>['type'][] = ['string', 'number', 'boolean', 'email', 'date'];

export default function SetupPage() {
  const { showToast, isAuthenticated, isAuthLoading } = useAppContext();
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [entities, setEntities] = useState<SetupExportEntity[]>([]);
  const [selectedEntityInternalId, setSelectedEntityInternalId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [initialConfigSnapshot, setInitialConfigSnapshot] = useState<string>('');


  const fetchConfig = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await fetch('/api/export-entities');
      if (!response.ok) throw new Error('Failed to fetch config');
      const config: ExportConfig = await response.json();
      setBaseUrl(config.baseUrl || 'https://api.example.com/v1');
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
      setInitialConfigSnapshot(JSON.stringify({ baseUrl: config.baseUrl || 'https://api.example.com/v1', entities: loadedEntities }));
      
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
      const defaultBaseUrl = 'https://api.example.com/v1';
      setBaseUrl(defaultBaseUrl);
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
    showToast({ title: 'Changes Discarded', description: 'Local changes have been discarded.'});
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
      <div className="flex flex-col h-full">
        <div className="p-6 flex-shrink-0">
          <div className="flex justify-between items-start mb-6">
            <div>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start">
            <div>
              <Label htmlFor="baseUrl" className="text-sm font-medium">Base API URL</Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="e.g., https://api.example.com/v1"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">This URL will prefix all entity endpoint paths.</p>
            </div>
            <div>
                <Label htmlFor="entity-selector" className="text-sm font-medium">Select Entity to Edit</Label>
                <Select 
                    value={selectedEntityInternalId || ""} 
                    onValueChange={(value) => setSelectedEntityInternalId(value || null)}
                    disabled={isFetching || entities.length === 0}
                >
                    <SelectTrigger id="entity-selector" className="mt-1">
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
                  <p key="select-prompt-key" className="text-xs text-muted-foreground mt-1">
                    Please select the entity to edit.
                  </p>
                )}
                 {entities.length === 0 && !isFetching && (
                  <p key="no-entities-prompt-key" className="text-xs text-muted-foreground mt-1">
                    No entities are configured yet. Click "Add New Entity" to start.
                  </p>
                )}
            </div>
          </div>
        </div>

        <Separator className="flex-shrink-0 my-2"/>
        
        <ScrollArea className="flex-grow min-h-0 p-6 pt-0">
          <div className="space-y-6 w-full">
            {isFetching && !currentEntity && <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />}
            {!isFetching && !currentEntity && entities.length > 0 && (
                <Card className="text-center py-10">
                    <CardContent>
                    <ListFilter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">Select an Entity</h3>
                    <p className="text-muted-foreground text-sm">Choose an entity from the dropdown above to view and edit its details.</p>
                    </CardContent>
                </Card>
            )}
             {!isFetching && entities.length === 0 && (
              <Card className="text-center py-10">
                <CardContent>
                  <h3 className="text-lg font-semibold">No Entities Configured</h3>
                  <p className="text-muted-foreground text-sm">Click "Add New Entity" to get started.</p>
                </CardContent>
              </Card>
            )}
            {currentEntity && (
              <Card key={currentEntity.internalId} className="overflow-hidden w-full">
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
                    <ScrollArea className="mt-1"> 
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
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 border-t bg-background flex-shrink-0">
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
      </div>
    </AppLayout>
  );
}

