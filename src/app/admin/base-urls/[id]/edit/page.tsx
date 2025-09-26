'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Globe, Save, X } from 'lucide-react';
import Link from 'next/link';
import { BaseUrl, UpdateBaseUrl, BaseUrlResponse } from '@/types/baseUrls';
import { AppLayout } from '@/components/AppLayout';
import { useAppContext } from '@/hooks/useAppContext';

interface EditBaseUrlPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditBaseUrlPage({ params }: EditBaseUrlPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { showToast } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState<UpdateBaseUrl>({
    id: parseInt(resolvedParams.id),
    name: '',
    url: '',
    description: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBaseUrl();
  }, [resolvedParams.id]);

  const fetchBaseUrl = async () => {
    try {
      setFetchLoading(true);
      const response = await fetch(`/api/admin/base-urls/${resolvedParams.id}`);
      const data: BaseUrlResponse = await response.json();

      if (data.success && data.data) {
        const baseUrl = data.data;
        setFormData({
          id: baseUrl.id,
          name: baseUrl.name,
          url: baseUrl.url,
          description: baseUrl.description || '',
          is_active: baseUrl.is_active,
        });
      } else {
        showToast({
          title: 'Error',
          description: data.error || 'Failed to fetch base URL',
          variant: 'destructive',
        });
        router.push('/admin/base-urls');
      }
    } catch (err) {
      showToast({
        title: 'Error',
        description: 'Failed to fetch base URL',
        variant: 'destructive',
      });
      router.push('/admin/base-urls');
      console.error('Error fetching base URL:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.url?.trim()) {
      newErrors.url = 'URL is required';
    } else {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { id, ...updateData } = formData;
      const response = await fetch(`/api/admin/base-urls/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data: BaseUrlResponse = await response.json();

      if (data.success) {
        showToast({
          title: 'Base URL Updated',
          description: 'Base URL has been updated successfully.',
          variant: 'success',
        });
        router.push('/admin/base-urls');
      } else {
        if (response.status === 409) {
          setErrors({ name: data.error || 'Name already exists' });
        } else {
          showToast({
            title: 'Error',
            description: data.error || 'Failed to update base URL',
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      showToast({
        title: 'Error',
        description: 'Failed to update base URL',
        variant: 'destructive',
      });
      console.error('Error updating base URL:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof UpdateBaseUrl, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  if (fetchLoading) {
    return (
      <AppLayout pageTitle="Edit Base URL">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Edit Base URL">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/base-urls">
            <Button variant="outline" size="sm" className="hover:bg-muted">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Base URLs
            </Button>
          </Link>
          <div className="h-4 w-px bg-border" />
          <p className="text-muted-foreground">
            Update the base URL configuration
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-gradient-to-b from-white to-slate-50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl">Edit Base URL Configuration</CardTitle>
            </div>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Development API"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                placeholder="https://api.example.com"
                className={errors.url ? 'border-red-500' : ''}
              />
              {errors.url && (
                <p className="text-sm text-red-500">{errors.url}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Optional description for this base URL"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Only one base URL can be active at a time. Setting this as active will deactivate all others.
              </p>
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Updating...' : 'Update Base URL'}
              </Button>
              <Link href="/admin/base-urls">
                <Button variant="outline" className="hover:bg-red-50 hover:text-red-600 hover:border-red-300">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}