'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  X,
  Package,
  Hash,
  Type,
  Calendar,
  Mail,
  Clock,
  List,
  CheckSquare,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';

interface Entity {
  id: string;
  entity_key: string;
  name: string;
  api_endpoint: string;
}

interface EntityField {
  id: string;
  entity_id: string;
  field_name: string;
  display_name: string;
  field_type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'time' | 'array';
  is_required: boolean;
  min_length?: number;
  max_length?: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  entity_name?: string;
  entity_key?: string;
}

interface CreateFormData {
  entity_id: string;
  field_name: string;
  display_name: string;
  field_type: string;
  is_required: boolean;
  min_length: string;
  max_length: string;
}

interface EditFormData {
  entity_id: string;
  field_name: string;
  display_name: string;
  field_type: string;
  is_required: boolean;
  min_length: string;
  max_length: string;
}

export default function EntityFieldsPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityFields, setEntityFields] = useState<EntityField[]>([]);
  const [filteredFields, setFilteredFields] = useState<EntityField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedEntityId, setSelectedEntityId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [fieldTypeFilter, setFieldTypeFilter] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<'display_name' | 'field_name' | 'entity_name' | 'field_type' | 'sort_order' | 'created_at'>('entity_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; field: EntityField | null }>({ open: false, field: null });

  // Form data
  const [createFormData, setCreateFormData] = useState<CreateFormData>({
    entity_id: '',
    field_name: '',
    display_name: '',
    field_type: '',
    is_required: false,
    min_length: '',
    max_length: '',
  });

  const [editFormData, setEditFormData] = useState<EditFormData>({
    entity_id: '',
    field_name: '',
    display_name: '',
    field_type: '',
    is_required: false,
    min_length: '',
    max_length: '',
  });

  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const fieldTypeIcons = {
    string: <Type className="h-4 w-4" />,
    number: <Hash className="h-4 w-4" />,
    date: <Calendar className="h-4 w-4" />,
    boolean: <CheckSquare className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
    time: <Clock className="h-4 w-4" />,
    array: <List className="h-4 w-4" />
  };

  const fieldTypes = ['string', 'number', 'date', 'boolean', 'email', 'time', 'array'];

  useEffect(() => {
    fetchEntities();
    fetchEntityFields();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [entityFields, selectedEntityId, searchQuery, fieldTypeFilter, sortField, sortDirection]);

  const applyFiltersAndSort = () => {
    let filtered = [...entityFields];

    // Entity filter
    if (selectedEntityId !== 'all') {
      filtered = filtered.filter(field => field.entity_id === selectedEntityId);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(field =>
        field.display_name.toLowerCase().includes(query) ||
        field.field_name.toLowerCase().includes(query) ||
        field.entity_name?.toLowerCase().includes(query)
      );
    }

    // Field type filter
    if (fieldTypeFilter !== 'all') {
      filtered = filtered.filter(field => field.field_type === fieldTypeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (sortField) {
        case 'display_name':
          valueA = a.display_name.toLowerCase();
          valueB = b.display_name.toLowerCase();
          break;
        case 'field_name':
          valueA = a.field_name.toLowerCase();
          valueB = b.field_name.toLowerCase();
          break;
        case 'entity_name':
          valueA = (a.entity_name || '').toLowerCase();
          valueB = (b.entity_name || '').toLowerCase();
          break;
        case 'field_type':
          valueA = a.field_type;
          valueB = b.field_type;
          break;
        case 'sort_order':
          valueA = a.sort_order;
          valueB = b.sort_order;
          break;
        case 'created_at':
          valueA = new Date(a.created_at).getTime();
          valueB = new Date(b.created_at).getTime();
          break;
        default:
          valueA = (a.entity_name || '').toLowerCase();
          valueB = (b.entity_name || '').toLowerCase();
      }

      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;

      // Secondary sort: by entity name, then by sort_order
      if (sortField !== 'entity_name') {
        const entityCompare = (a.entity_name || '').localeCompare(b.entity_name || '');
        if (entityCompare !== 0) return entityCompare;
      }

      if (sortField !== 'sort_order') {
        return a.sort_order - b.sort_order;
      }

      return 0;
    });

    setFilteredFields(filtered);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  const fetchEntities = async () => {
    try {
      const response = await fetch('/api/entities');
      if (response.ok) {
        const data = await response.json();
        setEntities(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching entities:', err);
    }
  };

  const fetchEntityFields = async () => {
    try {
      const response = await fetch('/api/entity-fields');
      if (response.ok) {
        const data = await response.json();
        setEntityFields(data.data || []);
      } else {
        setError('Failed to fetch entity fields');
      }
    } catch (err) {
      setError('Failed to fetch entity fields');
      console.error('Error fetching entity fields:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (field: EntityField) => {
    if (!confirm(`Are you sure you want to delete the field "${field.display_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/entity-fields/${field.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchEntityFields();
      } else {
        const data = await response.json();
        alert(data.error?.message || 'Failed to delete field');
      }
    } catch (err) {
      alert('Failed to delete field');
      console.error('Error deleting field:', err);
    }
  };

  const openCreateModal = () => {
    setCreateFormData({
      entity_id: selectedEntityId !== 'all' ? selectedEntityId : '',
      field_name: '',
      display_name: '',
      field_type: '',
      is_required: false,
      min_length: '',
      max_length: '',
    });
    setCreateModalOpen(true);
    setCreateErrors({});
  };

  const openEditModal = (field: EntityField) => {
    setEditFormData({
      entity_id: field.entity_id,
      field_name: field.field_name,
      display_name: field.display_name,
      field_type: field.field_type,
      is_required: field.is_required,
      min_length: field.min_length?.toString() || '',
      max_length: field.max_length?.toString() || '',
    });
    setEditModal({ open: true, field });
    setEditErrors({});
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateFormData({ entity_id: '', field_name: '', display_name: '', field_type: '', is_required: false, min_length: '', max_length: '' });
    setCreateErrors({});
  };

  const closeEditModal = () => {
    setEditModal({ open: false, field: null });
    setEditFormData({ entity_id: '', field_name: '', display_name: '', field_type: '', is_required: false, min_length: '', max_length: '' });
    setEditErrors({});
  };

  const handleCreate = async () => {
    try {
      const payload = {
        ...createFormData,
        min_length: createFormData.min_length ? parseInt(createFormData.min_length) : null,
        max_length: createFormData.max_length ? parseInt(createFormData.max_length) : null,
      };

      const response = await fetch('/api/entity-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchEntityFields();
        closeCreateModal();
      } else {
        const data = await response.json();
        if (data.error?.details) {
          const errors: Record<string, string> = {};
          data.error.details.forEach((detail: any) => {
            errors[detail.path[0]] = detail.message;
          });
          setCreateErrors(errors);
        } else {
          alert(data.error?.message || 'Failed to create field');
        }
      }
    } catch (err) {
      alert('Failed to create field');
      console.error('Error creating field:', err);
    }
  };

  const handleEdit = async () => {
    if (!editModal.field) return;

    try {
      const payload = {
        ...editFormData,
        min_length: editFormData.min_length ? parseInt(editFormData.min_length) : null,
        max_length: editFormData.max_length ? parseInt(editFormData.max_length) : null,
      };

      const response = await fetch(`/api/entity-fields/${editModal.field.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchEntityFields();
        closeEditModal();
      } else {
        const data = await response.json();
        if (data.error?.details) {
          const errors: Record<string, string> = {};
          data.error.details.forEach((detail: any) => {
            errors[detail.path[0]] = detail.message;
          });
          setEditErrors(errors);
        } else {
          alert(data.error?.message || 'Failed to update field');
        }
      }
    } catch (err) {
      alert('Failed to update field');
      console.error('Error updating field:', err);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-lg">Loading entity fields...</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-red-500 text-lg">{error}</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Entity Fields Management
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-slate-600">
                  Configure and manage field definitions for your entities
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-500 font-medium">
                    {entityFields.length} fields loaded
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Add New Field</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border p-4 mb-5 shadow-sm">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Filter className="h-5 w-5 text-blue-600" />
              </div>
              <Label className="font-semibold text-slate-700">Filters & Search</Label>
            </div>

            {/* Entity Filter */}
            <div className="flex items-center gap-3">
              <Label htmlFor="entity-filter" className="text-sm font-medium text-slate-600">Entity:</Label>
              <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                <SelectTrigger className="w-52 bg-white border-slate-200 shadow-sm">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🔍 All Entities</SelectItem>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {entity.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Filter */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <Input
                  placeholder="Search fields and names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 bg-white border-slate-200 shadow-sm"
                />
              </div>
            </div>

            {/* Field Type Filter */}
            <div className="flex items-center gap-3">
              <Label htmlFor="type-filter" className="text-sm font-medium text-slate-600">Type:</Label>
              <Select value={fieldTypeFilter} onValueChange={setFieldTypeFilter}>
                <SelectTrigger className="w-40 bg-white border-slate-200 shadow-sm">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {fieldTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {fieldTypeIcons[type as keyof typeof fieldTypeIcons]}
                        <span className="capitalize">{type}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {(selectedEntityId !== 'all' || searchQuery || fieldTypeFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedEntityId('all');
                  setSearchQuery('');
                  setFieldTypeFilter('all');
                }}
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Current Selection Info */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedEntity ? (
                  <>
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm text-slate-600">
                      Viewing: <span className="font-semibold text-slate-800">{selectedEntity.name}</span>
                    </span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {filteredFields.length} fields
                    </Badge>
                  </>
                ) : (
                  <>
                    <div className="p-1.5 bg-slate-100 rounded-lg">
                      <Eye className="h-4 w-4 text-slate-500" />
                    </div>
                    <span className="text-sm text-slate-600">
                      Viewing: <span className="font-semibold text-slate-800">All Entities</span>
                    </span>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-800">
                      {filteredFields.length} of {entityFields.length} fields
                    </Badge>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Sorted by:</span>
                <Badge variant="outline" className="text-xs">
                  {sortField.replace('_', ' ')} {sortDirection === 'asc' ? '↑' : '↓'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 border-b border-slate-200">
                  <TableHead className="w-20 px-4 py-3 font-semibold text-slate-700 text-center">Actions</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-slate-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('display_name')}
                      className="h-8 px-2 hover:bg-slate-100 -ml-2"
                    >
                      <span className="font-semibold">Display Name</span>
                      {getSortIcon('display_name')}
                    </Button>
                  </TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-slate-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('field_name')}
                      className="h-8 px-2 hover:bg-slate-100 -ml-2"
                    >
                      <span className="font-semibold">Field Name</span>
                      {getSortIcon('field_name')}
                    </Button>
                  </TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-slate-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('entity_name')}
                      className="h-8 px-2 hover:bg-slate-100 -ml-2"
                    >
                      <span className="font-semibold">Entity</span>
                      {getSortIcon('entity_name')}
                    </Button>
                  </TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-slate-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('field_type')}
                      className="h-8 px-2 hover:bg-slate-100 -ml-2"
                    >
                      <span className="font-semibold">Type</span>
                      {getSortIcon('field_type')}
                    </Button>
                  </TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-slate-700">Required</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-slate-700">Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-slate-100 rounded-full">
                          <Search className="h-6 w-6 text-slate-400" />
                        </div>
                        <div className="text-slate-600 font-medium">
                          {searchQuery || selectedEntityId !== 'all' || fieldTypeFilter !== 'all'
                            ? 'No fields match your filters'
                            : 'No entity fields found'
                          }
                        </div>
                        <p className="text-sm text-slate-400">
                          {searchQuery || selectedEntityId !== 'all' || fieldTypeFilter !== 'all'
                            ? 'Try adjusting your search criteria or clearing filters'
                            : 'Create your first entity field to get started'
                          }
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFields.map((field, index) => (
                    <TableRow
                      key={field.id}
                      className="hover:bg-slate-50/50 transition-colors border-b border-slate-100"
                    >
                      {/* Actions - moved to first column */}
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(field)}
                            className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(field)}
                            className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Display Name */}
                      <TableCell className="px-4 py-3">
                        <div className="font-medium text-slate-800">{field.display_name}</div>
                      </TableCell>

                      {/* Field Name */}
                      <TableCell className="px-4 py-3">
                        <div className="font-mono text-sm bg-slate-50 px-2 py-1 rounded border inline-block">
                          {field.field_name}
                        </div>
                      </TableCell>

                      {/* Entity */}
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
                        >
                          <Package className="h-3 w-3 mr-1" />
                          {field.entity_name}
                        </Badge>
                      </TableCell>

                      {/* Type */}
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-purple-100 rounded">
                            {fieldTypeIcons[field.field_type]}
                          </div>
                          <span className="text-sm font-medium capitalize text-slate-700">
                            {field.field_type}
                          </span>
                        </div>
                      </TableCell>

                      {/* Required */}
                      <TableCell className="px-4 py-3">
                        {field.is_required ? (
                          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                            <span className="font-medium">Required</span>
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">
                            Optional
                          </Badge>
                        )}
                      </TableCell>

                      {/* Validation */}
                      <TableCell className="px-4 py-3">
                        <div className="text-sm text-slate-500">
                          {field.min_length || field.max_length ? (
                            <div className="bg-green-50 px-2 py-1 rounded border border-green-200 text-green-700 inline-block">
                              Length: {field.min_length || 0}–{field.max_length || '∞'}
                            </div>
                          ) : (
                            <span className="text-slate-400">No limits</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Create Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Entity Field</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="create-entity">Entity</Label>
                <Select value={createFormData.entity_id} onValueChange={(value) => setCreateFormData({ ...createFormData, entity_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createErrors.entity_id && <p className="text-sm text-red-500 mt-1">{createErrors.entity_id}</p>}
              </div>

              <div>
                <Label htmlFor="create-display-name">Display Name</Label>
                <Input
                  id="create-display-name"
                  value={createFormData.display_name}
                  onChange={(e) => setCreateFormData({ ...createFormData, display_name: e.target.value })}
                  placeholder="e.g., Customer Name"
                />
                {createErrors.display_name && <p className="text-sm text-red-500 mt-1">{createErrors.display_name}</p>}
              </div>

              <div>
                <Label htmlFor="create-field-name">Field Name</Label>
                <Input
                  id="create-field-name"
                  value={createFormData.field_name}
                  onChange={(e) => setCreateFormData({ ...createFormData, field_name: e.target.value })}
                  placeholder="e.g., customer_name"
                />
                {createErrors.field_name && <p className="text-sm text-red-500 mt-1">{createErrors.field_name}</p>}
              </div>


              <div>
                <Label htmlFor="create-field-type">Field Type</Label>
                <Select value={createFormData.field_type} onValueChange={(value) => setCreateFormData({ ...createFormData, field_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {fieldTypeIcons[type as keyof typeof fieldTypeIcons]}
                          {type}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createErrors.field_type && <p className="text-sm text-red-500 mt-1">{createErrors.field_type}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create-required"
                  checked={createFormData.is_required}
                  onCheckedChange={(checked) => setCreateFormData({ ...createFormData, is_required: checked === true })}
                />
                <Label htmlFor="create-required">Required field</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-min-length">Min Length</Label>
                  <Input
                    id="create-min-length"
                    type="number"
                    value={createFormData.min_length}
                    onChange={(e) => setCreateFormData({ ...createFormData, min_length: e.target.value })}
                    placeholder="0"
                  />
                  {createErrors.min_length && <p className="text-sm text-red-500 mt-1">{createErrors.min_length}</p>}
                </div>
                <div>
                  <Label htmlFor="create-max-length">Max Length</Label>
                  <Input
                    id="create-max-length"
                    type="number"
                    value={createFormData.max_length}
                    onChange={(e) => setCreateFormData({ ...createFormData, max_length: e.target.value })}
                    placeholder="100"
                  />
                  {createErrors.max_length && <p className="text-sm text-red-500 mt-1">{createErrors.max_length}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={closeCreateModal}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleCreate}>
                  <Save className="h-4 w-4 mr-2" />
                  Create Field
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={editModal.open} onOpenChange={(open) => !open && closeEditModal()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Entity Field</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-entity">Entity</Label>
                <Select value={editFormData.entity_id} onValueChange={(value) => setEditFormData({ ...editFormData, entity_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editErrors.entity_id && <p className="text-sm text-red-500 mt-1">{editErrors.entity_id}</p>}
              </div>

              <div>
                <Label htmlFor="edit-display-name">Display Name</Label>
                <Input
                  id="edit-display-name"
                  value={editFormData.display_name}
                  onChange={(e) => setEditFormData({ ...editFormData, display_name: e.target.value })}
                  placeholder="e.g., Customer Name"
                />
                {editErrors.display_name && <p className="text-sm text-red-500 mt-1">{editErrors.display_name}</p>}
              </div>

              <div>
                <Label htmlFor="edit-field-name">Field Name</Label>
                <Input
                  id="edit-field-name"
                  value={editFormData.field_name}
                  onChange={(e) => setEditFormData({ ...editFormData, field_name: e.target.value })}
                  placeholder="e.g., customer_name"
                />
                {editErrors.field_name && <p className="text-sm text-red-500 mt-1">{editErrors.field_name}</p>}
              </div>


              <div>
                <Label htmlFor="edit-field-type">Field Type</Label>
                <Select value={editFormData.field_type} onValueChange={(value) => setEditFormData({ ...editFormData, field_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {fieldTypeIcons[type as keyof typeof fieldTypeIcons]}
                          {type}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editErrors.field_type && <p className="text-sm text-red-500 mt-1">{editErrors.field_type}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-required"
                  checked={editFormData.is_required}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_required: checked === true })}
                />
                <Label htmlFor="edit-required">Required field</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-min-length">Min Length</Label>
                  <Input
                    id="edit-min-length"
                    type="number"
                    value={editFormData.min_length}
                    onChange={(e) => setEditFormData({ ...editFormData, min_length: e.target.value })}
                    placeholder="0"
                  />
                  {editErrors.min_length && <p className="text-sm text-red-500 mt-1">{editErrors.min_length}</p>}
                </div>
                <div>
                  <Label htmlFor="edit-max-length">Max Length</Label>
                  <Input
                    id="edit-max-length"
                    type="number"
                    value={editFormData.max_length}
                    onChange={(e) => setEditFormData({ ...editFormData, max_length: e.target.value })}
                    placeholder="100"
                  />
                  {editErrors.max_length && <p className="text-sm text-red-500 mt-1">{editErrors.max_length}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={closeEditModal}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleEdit}>
                  <Save className="h-4 w-4 mr-2" />
                  Update Field
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}