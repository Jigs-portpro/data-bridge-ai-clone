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
import {
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Globe,
  Search,
  Save,
  X,
  Filter,
  SortAsc,
  Server,
  Package
} from 'lucide-react';
import Link from 'next/link';
import { BaseUrl, BaseUrlListResponse, UpdateBaseUrl, BaseUrlResponse, CreateBaseUrl } from '@/types/baseUrls';
import { AppLayout } from '@/components/AppLayout';

export default function BaseUrlsPage() {
  const [baseUrls, setBaseUrls] = useState<BaseUrl[]>([]);
  const [filteredBaseUrls, setFilteredBaseUrls] = useState<BaseUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    // Filter base URLs based on search query
    if (!searchQuery.trim()) {
      setFilteredBaseUrls(baseUrls);
    } else {
      const filtered = baseUrls.filter(baseUrl =>
        baseUrl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        baseUrl.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (baseUrl.description && baseUrl.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredBaseUrls(filtered);
    }
  }, [baseUrls, searchQuery]);

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
      <AppLayout pageTitle="Base URL Management">
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <div className="text-lg text-muted-foreground">Loading base URLs...</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout pageTitle="Base URL Management">
        <div className="flex justify-center items-center h-64">
          <div className="text-center space-y-3">
            <div className="text-red-500 text-lg font-medium">Error: {error}</div>
            <Button onClick={fetchBaseUrls} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Base URL Management">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Base URL Management
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Manage API base URLs for different environments. Only one URL can be active at a time.
            </p>
          </div>
          <Button
            onClick={openAddModal}
            className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Base URL
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gradient-to-r from-blue-50/50 to-violet-50/50 rounded-xl border border-blue-100/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search base URLs by name, URL, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-0 bg-white/70 backdrop-blur-sm focus:bg-white transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>{filteredBaseUrls.length} base URLs</span>
          </div>
        </div>

        {/* Base URLs Grid */}
        {filteredBaseUrls.length === 0 ? (
          <Card className="border-2 border-dashed border-muted-foreground/25 bg-gradient-to-br from-blue-50/30 to-violet-50/30">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-violet-100 rounded-2xl flex items-center justify-center">
                  <Globe className="h-8 w-8 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {searchQuery ? 'No matching base URLs found' : 'No base URLs configured'}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-md">
                    {searchQuery
                      ? `No base URLs match your search "${searchQuery}". Try adjusting your search terms.`
                      : 'Get started by creating your first API base URL to manage different environments.'
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
                    Create Your First Base URL
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredBaseUrls.map((baseUrl) => (
              <Card
                key={baseUrl.id}
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
                          {baseUrl.name}
                        </CardTitle>
                      </div>
                      {baseUrl.is_active ? (
                        <Badge className="text-xs bg-green-100/60 text-green-700 hover:bg-green-100/80">
                          ✓ Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs font-mono bg-gray-100/60 text-gray-700">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(baseUrl)}
                        className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(baseUrl.id)}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* URL */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL</span>
                      <a
                        href={baseUrl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <code className="block w-full text-xs font-mono text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border break-all">
                      {baseUrl.url}
                    </code>
                  </div>

                  {/* Description */}
                  {baseUrl.description && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {baseUrl.description}
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  {!baseUrl.is_active && (
                    <div className="pt-2">
                      <Button
                        onClick={() => toggleActive(baseUrl)}
                        size="sm"
                        className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white transition-all duration-200"
                      >
                        Activate This URL
                      </Button>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pt-2 border-t border-gray-100">
                    <div className="space-y-1">
                      <div className="font-medium">Created</div>
                      <div>{new Date(baseUrl.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">Updated</div>
                      <div>{new Date(baseUrl.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add New Modal */}
      <Dialog open={addModal} onOpenChange={closeAddModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-violet-100 rounded-lg">
                <Plus className="h-5 w-5 text-blue-600" />
              </div>
              Create New Base URL
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="add-name" className="text-sm font-medium">Name *</Label>
              <Input
                id="add-name"
                value={addFormData.name}
                onChange={(e) => handleAddInputChange('name', e.target.value)}
                placeholder="e.g., Development API"
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
              <Label htmlFor="add-url" className="text-sm font-medium">URL *</Label>
              <Input
                id="add-url"
                type="url"
                value={addFormData.url}
                onChange={(e) => handleAddInputChange('url', e.target.value)}
                placeholder="https://api.example.com"
                className={addErrors.url ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
              />
              {addErrors.url && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {addErrors.url}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                The full API base URL for this environment.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="add-description"
                value={addFormData.description}
                onChange={(e) => handleAddInputChange('description', e.target.value)}
                placeholder="Optional description for this base URL"
                rows={2}
                className="focus:ring-blue-500"
              />
              <p className="text-xs text-muted-foreground">
                Optional description to help identify this environment.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="add-is_active"
                  checked={addFormData.is_active}
                  onCheckedChange={(checked) => handleAddInputChange('is_active', checked)}
                />
                <Label htmlFor="add-is_active" className="text-sm font-medium">Set as Active</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Only one base URL can be active at a time. Setting this as active will deactivate all others.
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleAddSubmit}
                disabled={addLoading}
                className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                {addLoading ? 'Creating...' : 'Create Base URL'}
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

      {/* Edit Modal */}
      <Dialog open={editModal.open} onOpenChange={closeEditModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-violet-100 rounded-lg">
                <Edit className="h-5 w-5 text-blue-600" />
              </div>
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