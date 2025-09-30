'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus,
  Edit,
  Trash2,
  Database,
  Server,
  Search,
  Save,
  X,
  Filter,
  SortAsc,
  ExternalLink,
  Package
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';

interface Entity {
  id: string;
  entity_key: string;
  name: string;
  api_endpoint: string;
  upload_type: 'BULK_UPLOAD' | 'SINGLE_ROW_UPLOAD';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EntityFormData {
  entity_key: string;
  name: string;
  api_endpoint: string;
  upload_type: 'BULK_UPLOAD' | 'SINGLE_ROW_UPLOAD';
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [editModal, setEditModal] = useState<{ open: boolean; entity: Entity | null }>({ open: false, entity: null });
  const [addModal, setAddModal] = useState(false);

  // Form state
  const [editLoading, setEditLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [editFormData, setEditFormData] = useState<EntityFormData>({ entity_key: '', name: '', api_endpoint: '', upload_type: 'SINGLE_ROW_UPLOAD' });
  const [addFormData, setAddFormData] = useState<EntityFormData>({ entity_key: '', name: '', api_endpoint: '', upload_type: 'SINGLE_ROW_UPLOAD' });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEntities();
  }, []);

  useEffect(() => {
    // Filter entities based on search query
    if (!searchQuery.trim()) {
      setFilteredEntities(entities);
    } else {
      const filtered = entities.filter(entity =>
        entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.entity_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.api_endpoint.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEntities(filtered);
    }
  }, [entities, searchQuery]);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/entities');
      const data = await response.json();

      if (data.success && data.data) {
        setEntities(data.data);
      } else {
        setError(data.error?.message || 'Failed to fetch entities');
      }
    } catch (err) {
      setError('Failed to fetch entities');
      console.error('Error fetching entities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (entity: Entity) => {
    if (!confirm(`Are you sure you want to delete the entity "${entity.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/entities/${entity.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchEntities();
      } else {
        const data = await response.json();
        alert(data.error?.message || 'Failed to delete entity');
      }
    } catch (err) {
      alert('Failed to delete entity');
      console.error('Error deleting entity:', err);
    }
  };

  const openEditModal = (entity: Entity) => {
    setEditFormData({
      entity_key: entity.entity_key,
      name: entity.name,
      api_endpoint: entity.api_endpoint,
      upload_type: entity.upload_type,
    });
    setEditModal({ open: true, entity });
    setEditErrors({});
  };

  const closeEditModal = () => {
    setEditModal({ open: false, entity: null });
    setEditFormData({ entity_key: '', name: '', api_endpoint: '', upload_type: 'SINGLE_ROW_UPLOAD' });
    setEditErrors({});
  };

  const openAddModal = () => {
    setAddFormData({ entity_key: '', name: '', api_endpoint: '', upload_type: 'SINGLE_ROW_UPLOAD' });
    setAddModal(true);
    setAddErrors({});
  };

  const closeAddModal = () => {
    setAddModal(false);
    setAddFormData({ entity_key: '', name: '', api_endpoint: '', upload_type: 'SINGLE_ROW_UPLOAD' });
    setAddErrors({});
  };

  const validateForm = (formData: EntityFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.entity_key?.trim()) {
      errors.entity_key = 'Entity key is required';
    } else if (!/^[a-z0-9_-]+$/i.test(formData.entity_key)) {
      errors.entity_key = 'Entity key can only contain letters, numbers, hyphens, and underscores';
    }

    if (!formData.name?.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.api_endpoint?.trim()) {
      errors.api_endpoint = 'API endpoint is required';
    } else if (!formData.api_endpoint.startsWith('/')) {
      errors.api_endpoint = 'API endpoint must start with /';
    }

    return errors;
  };

  const handleEditSubmit = async () => {
    const errors = validateForm(editFormData);
    setEditErrors(errors);

    if (Object.keys(errors).length > 0 || !editModal.entity) {
      return;
    }

    setEditLoading(true);

    try {
      const response = await fetch(`/api/entities/${editModal.entity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchEntities();
        closeEditModal();
      } else {
        if (response.status === 400 && data.error?.message?.includes('already exists')) {
          setEditErrors({ entity_key: data.error.message });
        } else {
          alert(data.error?.message || 'Failed to update entity');
        }
      }
    } catch (err) {
      alert('Failed to update entity');
      console.error('Error updating entity:', err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddSubmit = async () => {
    const errors = validateForm(addFormData);
    setAddErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setAddLoading(true);

    try {
      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addFormData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchEntities();
        closeAddModal();
      } else {
        if (response.status === 400 && data.error?.message?.includes('already exists')) {
          setAddErrors({ entity_key: data.error.message });
        } else {
          alert(data.error?.message || 'Failed to create entity');
        }
      }
    } catch (err) {
      alert('Failed to create entity');
      console.error('Error creating entity:', err);
    } finally {
      setAddLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout pageTitle="Entity Management">
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <div className="text-lg text-muted-foreground">Loading entities...</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout pageTitle="Entity Management">
        <div className="flex justify-center items-center h-64">
          <div className="text-center space-y-3">
            <div className="text-red-500 text-lg font-medium">Error: {error}</div>
            <Button onClick={fetchEntities} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Entity Management">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Entity Management
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Manage your data entities and their API endpoints. Create, edit, and organize your data structures.
            </p>
          </div>
          <Button
            onClick={openAddModal}
            className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Entity
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gradient-to-r from-blue-50/50 to-violet-50/50 rounded-xl border border-blue-100/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entities by name, key, or endpoint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-0 bg-white/70 backdrop-blur-sm focus:bg-white transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>{filteredEntities.length} entities</span>
          </div>
        </div>

        {/* Entities Grid */}
        {filteredEntities.length === 0 ? (
          <Card className="border-2 border-dashed border-muted-foreground/25 bg-gradient-to-br from-blue-50/30 to-violet-50/30">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-violet-100 rounded-2xl flex items-center justify-center">
                  <Database className="h-8 w-8 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {searchQuery ? 'No matching entities found' : 'No entities configured'}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-md">
                    {searchQuery
                      ? `No entities match your search "${searchQuery}". Try adjusting your search terms.`
                      : 'Get started by creating your first data entity to organize and manage your data structures.'
                    }
                  </p>
                </div>
                {!searchQuery && (
                  <Button
                    onClick={openAddModal}
                    className="mt-6 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
                    size="lg"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create Your First Entity
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredEntities.map((entity) => (
              <Card
                key={entity.id}
                className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-200 bg-gradient-to-br from-white to-blue-50/20 border-blue-100/50"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-blue-100 to-violet-100 rounded-lg">
                          <Server className="h-4 w-4 text-blue-600" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                          {entity.name}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs font-mono bg-blue-100/60 text-blue-700">
                        {entity.entity_key}
                      </Badge>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(entity)}
                        className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entity)}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* API Endpoint */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Endpoint</span>
                    </div>
                    <code className="block w-full text-xs font-mono text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border">
                      {entity.api_endpoint}
                    </code>
                  </div>

                  {/* Upload Type */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upload Type</span>
                    </div>
                    <Badge
                      variant={entity.upload_type === 'BULK_UPLOAD' ? 'default' : 'secondary'}
                      className={`text-xs ${entity.upload_type === 'BULK_UPLOAD'
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      }`}
                    >
                      {entity.upload_type === 'BULK_UPLOAD' ? 'Bulk Upload' : 'Single Row'}
                    </Badge>
                  </div>

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pt-2 border-t border-gray-100">
                    <div className="space-y-1">
                      <div className="font-medium">Created</div>
                      <div>{new Date(entity.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">Updated</div>
                      <div>{new Date(entity.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Entity Modal */}
      <Dialog open={addModal} onOpenChange={closeAddModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-violet-100 rounded-lg">
                <Plus className="h-5 w-5 text-blue-600" />
              </div>
              Create New Entity
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="add-entity-key" className="text-sm font-medium">Entity Key *</Label>
              <Input
                id="add-entity-key"
                value={addFormData.entity_key}
                onChange={(e) => setAddFormData(prev => ({ ...prev, entity_key: e.target.value }))}
                placeholder="e.g., load, carrier, customer"
                className={addErrors.entity_key ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
              />
              {addErrors.entity_key && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {addErrors.entity_key}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Unique identifier for this entity. Use lowercase letters, numbers, hyphens, and underscores only.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-name" className="text-sm font-medium">Display Name *</Label>
              <Input
                id="add-name"
                value={addFormData.name}
                onChange={(e) => setAddFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Load Management, Carrier Information"
                className={addErrors.name ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
              />
              {addErrors.name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {addErrors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-api-endpoint" className="text-sm font-medium">API Endpoint *</Label>
              <Input
                id="add-api-endpoint"
                value={addFormData.api_endpoint}
                onChange={(e) => setAddFormData(prev => ({ ...prev, api_endpoint: e.target.value }))}
                placeholder="/api/loads"
                className={addErrors.api_endpoint ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
              />
              {addErrors.api_endpoint && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {addErrors.api_endpoint}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                The API endpoint path where this entity's data will be submitted.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-upload-type" className="text-sm font-medium">Upload Type</Label>
              <Select
                value={addFormData.upload_type}
                onValueChange={(value: 'BULK_UPLOAD' | 'SINGLE_ROW_UPLOAD') => setAddFormData(prev => ({ ...prev, upload_type: value }))}
              >
                <SelectTrigger className="focus:ring-blue-500">
                  <SelectValue placeholder="Select upload type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE_ROW_UPLOAD">Single Row Upload</SelectItem>
                  <SelectItem value="BULK_UPLOAD">Bulk Upload</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How data will be processed: single rows one-by-one or bulk batches.
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleAddSubmit}
                disabled={addLoading}
                className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                {addLoading ? 'Creating...' : 'Create Entity'}
              </Button>
              <Button
                variant="outline"
                onClick={closeAddModal}
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Entity Modal */}
      <Dialog open={editModal.open} onOpenChange={closeEditModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-violet-100 rounded-lg">
                <Edit className="h-5 w-5 text-blue-600" />
              </div>
              Edit Entity
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="edit-entity-key" className="text-sm font-medium">Entity Key *</Label>
              <Input
                id="edit-entity-key"
                value={editFormData.entity_key}
                onChange={(e) => setEditFormData(prev => ({ ...prev, entity_key: e.target.value }))}
                placeholder="e.g., load, carrier, customer"
                className={editErrors.entity_key ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
              />
              {editErrors.entity_key && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {editErrors.entity_key}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-medium">Display Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Load Management, Carrier Information"
                className={editErrors.name ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
              />
              {editErrors.name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {editErrors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-api-endpoint" className="text-sm font-medium">API Endpoint *</Label>
              <Input
                id="edit-api-endpoint"
                value={editFormData.api_endpoint}
                onChange={(e) => setEditFormData(prev => ({ ...prev, api_endpoint: e.target.value }))}
                placeholder="/api/loads"
                className={editErrors.api_endpoint ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
              />
              {editErrors.api_endpoint && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {editErrors.api_endpoint}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-upload-type" className="text-sm font-medium">Upload Type</Label>
              <Select
                value={editFormData.upload_type}
                onValueChange={(value: 'BULK_UPLOAD' | 'SINGLE_ROW_UPLOAD') => setEditFormData(prev => ({ ...prev, upload_type: value }))}
              >
                <SelectTrigger className="focus:ring-blue-500">
                  <SelectValue placeholder="Select upload type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE_ROW_UPLOAD">Single Row Upload</SelectItem>
                  <SelectItem value="BULK_UPLOAD">Bulk Upload</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How data will be processed: single rows one-by-one or bulk batches.
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleEditSubmit}
                disabled={editLoading}
                className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                {editLoading ? 'Updating...' : 'Update Entity'}
              </Button>
              <Button
                variant="outline"
                onClick={closeEditModal}
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}