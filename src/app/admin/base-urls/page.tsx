'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, ExternalLink, Globe, Clock, Save, X } from 'lucide-react';
import Link from 'next/link';
import { BaseUrl, BaseUrlListResponse, UpdateBaseUrl, BaseUrlResponse, CreateBaseUrl } from '@/types/baseUrls';
import { AppLayout } from '@/components/AppLayout';

export default function BaseUrlsPage() {
  const [baseUrls, setBaseUrls] = useState<BaseUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ open: boolean; baseUrl: BaseUrl | null }>({ open: false, baseUrl: null });
  const [editLoading, setEditLoading] = useState(false);
  const [editFormData, setEditFormData] = useState<UpdateBaseUrl>({ id: 0, name: '', url: '', description: '', is_active: false });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [addModal, setAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addFormData, setAddFormData] = useState({ name: '', url: '', description: '', is_active: true });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBaseUrls();
  }, []);

  const fetchBaseUrls = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/base-urls');
      const data: BaseUrlListResponse = await response.json();

      if (data.success && data.data) {
        setBaseUrls(data.data);
      } else {
        setError(data.error || 'Failed to fetch base URLs');
      }
    } catch (err) {
      setError('Failed to fetch base URLs');
      console.error('Error fetching base URLs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this base URL?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/base-urls/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchBaseUrls(); // Refresh the list
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete base URL');
      }
    } catch (err) {
      alert('Failed to delete base URL');
      console.error('Error deleting base URL:', err);
    }
  };

  const toggleActive = async (baseUrl: BaseUrl) => {
    // Only allow activating inactive URLs (not deactivating active ones)
    if (baseUrl.is_active) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/base-urls/${baseUrl.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: true,
        }),
      });

      if (response.ok) {
        await fetchBaseUrls(); // Refresh the list
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to activate base URL');
      }
    } catch (err) {
      alert('Failed to activate base URL');
      console.error('Error activating base URL:', err);
    }
  };

  const openEditModal = (baseUrl: BaseUrl) => {
    setEditFormData({
      id: baseUrl.id,
      name: baseUrl.name,
      url: baseUrl.url,
      description: baseUrl.description || '',
      is_active: baseUrl.is_active,
    });
    setEditModal({ open: true, baseUrl });
    setEditErrors({});
  };

  const closeEditModal = () => {
    setEditModal({ open: false, baseUrl: null });
    setEditFormData({ id: 0, name: '', url: '', description: '', is_active: false });
    setEditErrors({});
  };

  const validateEditForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!editFormData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!editFormData.url?.trim()) {
      newErrors.url = 'URL is required';
    } else {
      try {
        new URL(editFormData.url);
      } catch {
        newErrors.url = 'Please enter a valid URL';
      }
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditSubmit = async () => {
    if (!validateEditForm() || !editModal.baseUrl) {
      return;
    }

    setEditLoading(true);

    try {
      const { id, ...updateData } = editFormData;
      const response = await fetch(`/api/admin/base-urls/${editModal.baseUrl.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data: BaseUrlResponse = await response.json();

      if (data.success) {
        await fetchBaseUrls();
        closeEditModal();
      } else {
        if (response.status === 409) {
          setEditErrors({ name: data.error || 'Name already exists' });
        } else {
          alert(data.error || 'Failed to update base URL');
        }
      }
    } catch (err) {
      alert('Failed to update base URL');
      console.error('Error updating base URL:', err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditInputChange = (field: keyof UpdateBaseUrl, value: string | boolean) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    if (editErrors[field as string]) {
      setEditErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  const openAddModal = () => {
    setAddFormData({ name: '', url: '', description: '', is_active: true });
    setAddModal(true);
    setAddErrors({});
  };

  const closeAddModal = () => {
    setAddModal(false);
    setAddFormData({ name: '', url: '', description: '', is_active: true });
    setAddErrors({});
  };

  const validateAddForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!addFormData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!addFormData.url.trim()) {
      newErrors.url = 'URL is required';
    } else {
      try {
        new URL(addFormData.url);
      } catch {
        newErrors.url = 'Please enter a valid URL';
      }
    }

    setAddErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddSubmit = async () => {
    if (!validateAddForm()) {
      return;
    }

    setAddLoading(true);

    try {
      const response = await fetch('/api/admin/base-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addFormData),
      });

      const data: BaseUrlResponse = await response.json();

      if (data.success) {
        await fetchBaseUrls();
        closeAddModal();
      } else {
        if (response.status === 409) {
          setAddErrors({ name: data.error || 'Name already exists' });
        } else {
          alert(data.error || 'Failed to create base URL');
        }
      }
    } catch (err) {
      alert('Failed to create base URL');
      console.error('Error creating base URL:', err);
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddInputChange = (field: keyof CreateBaseUrl, value: string | boolean) => {
    setAddFormData(prev => ({ ...prev, [field]: value }));
    if (addErrors[field as string]) {
      setAddErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  if (loading) {
    return (
      <AppLayout pageTitle="Base URLs">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout pageTitle="Base URLs">
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Base URLs">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-muted-foreground text-sm">
              Manage API base URLs for different environments. Only one URL can be active at a time.
            </p>
          </div>
          <Button
            onClick={openAddModal}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Base URL
          </Button>
        </div>

        {baseUrls.length === 0 ? (
          <Card className="border-2 border-dashed border-muted-foreground/25">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <Globe className="h-6 w-6 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">No base URLs configured</h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    Add your first API base URL to start managing different environments
                  </p>
                </div>
                <Button
                  onClick={openAddModal}
                  className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Base URL
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {baseUrls.map((baseUrl) => (
              <Card key={baseUrl.id} className={`relative border-2 ${baseUrl.is_active ? 'border-green-500' : 'border-gray-200'}`}>
                <CardContent className="p-4">
                  {/* Header with name and actions */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{baseUrl.name}</h3>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(baseUrl)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(baseUrl.id)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* URL with copy button */}
                  <div className="flex items-center gap-2 mb-2">
                    <code className="w-3/5 text-sm font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded border">
                      {baseUrl.url}
                    </code>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                      <a
                        href={baseUrl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>

                  {/* Description and Status on same line to save space */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      {baseUrl.description && (
                        <p className="text-gray-600 text-sm">
                          {baseUrl.description}
                        </p>
                      )}
                    </div>
                    <div className="w-32 flex justify-center">
                      {baseUrl.is_active ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded text-xs font-medium min-w-fit">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          Active
                        </div>
                      ) : (
                        <Button
                          onClick={() => toggleActive(baseUrl)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs whitespace-nowrap"
                        >
                          👆 Click to Activate
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Dates at bottom - more compact */}
                  <div className="text-xs text-gray-500">
                    <span>Created: {new Date(baseUrl.created_at).toLocaleDateString()}</span>
                    <span className="ml-3">Updated: {new Date(baseUrl.updated_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add New Modal */}
      <Dialog open={addModal} onOpenChange={closeAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Add New Base URL
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name *</Label>
              <Input
                id="add-name"
                value={addFormData.name}
                onChange={(e) => handleAddInputChange('name', e.target.value)}
                placeholder="e.g., Development API"
                className={addErrors.name ? 'border-red-500' : ''}
              />
              {addErrors.name && (
                <p className="text-sm text-red-500">{addErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-url">URL *</Label>
              <Input
                id="add-url"
                type="url"
                value={addFormData.url}
                onChange={(e) => handleAddInputChange('url', e.target.value)}
                placeholder="https://api.example.com"
                className={addErrors.url ? 'border-red-500' : ''}
              />
              {addErrors.url && (
                <p className="text-sm text-red-500">{addErrors.url}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-description">Description</Label>
              <Textarea
                id="add-description"
                value={addFormData.description}
                onChange={(e) => handleAddInputChange('description', e.target.value)}
                placeholder="Optional description for this base URL"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="add-is_active"
                  checked={addFormData.is_active}
                  onCheckedChange={(checked) => handleAddInputChange('is_active', checked)}
                />
                <Label htmlFor="add-is_active">Active</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Only one base URL can be active at a time. Setting this as active will deactivate all others.
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleAddSubmit}
                disabled={addLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex-1"
              >
                <Plus className="mr-2 h-4 w-4" />
                {addLoading ? 'Creating...' : 'Create Base URL'}
              </Button>
              <Button
                variant="outline"
                onClick={closeAddModal}
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModal.open} onOpenChange={closeEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              Edit Base URL
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => handleEditInputChange('name', e.target.value)}
                placeholder="e.g., Development API"
                className={editErrors.name ? 'border-red-500' : ''}
              />
              {editErrors.name && (
                <p className="text-sm text-red-500">{editErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-url">URL *</Label>
              <Input
                id="edit-url"
                type="url"
                value={editFormData.url}
                onChange={(e) => handleEditInputChange('url', e.target.value)}
                placeholder="https://api.example.com"
                className={editErrors.url ? 'border-red-500' : ''}
              />
              {editErrors.url && (
                <p className="text-sm text-red-500">{editErrors.url}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => handleEditInputChange('description', e.target.value)}
                placeholder="Optional description for this base URL"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_active"
                  checked={editFormData.is_active}
                  onCheckedChange={(checked) => handleEditInputChange('is_active', checked)}
                />
                <Label htmlFor="edit-is_active">Active</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Only one base URL can be active at a time. Setting this as active will deactivate all others.
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleEditSubmit}
                disabled={editLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                {editLoading ? 'Updating...' : 'Update Base URL'}
              </Button>
              <Button
                variant="outline"
                onClick={closeEditModal}
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}