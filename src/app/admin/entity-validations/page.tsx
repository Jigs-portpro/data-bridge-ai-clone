'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, TestTube, AlertCircle, CheckCircle, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/AppLayout';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface EntityValidation {
  id: string;
  entity_field_id: string;
  validation_type: 'regex' | 'enum' | 'lookup';
  pattern?: string;
  enum_values?: string[];
  lookup_id?: string;
  lookup_field?: string;
  error_message?: string;
  is_active: boolean;
  field_name: string;
  display_name: string;
  entity_name: string;
  entity_key: string;
  created_at: string;
  updated_at: string;
}

interface EntityField {
  id: string;
  entity_id: string;
  field_name: string;
  display_name: string;
  field_type: string;
  entity_name: string;
}

const ValidationTypeBadges = {
  regex: 'bg-blue-100 text-blue-800',
  enum: 'bg-green-100 text-green-800',
  lookup: 'bg-purple-100 text-purple-800'
};

export default function EntityValidationsPage() {
  const [validations, setValidations] = useState<EntityValidation[]>([]);
  const [filteredValidations, setFilteredValidations] = useState<EntityValidation[]>([]);
  const [entityFields, setEntityFields] = useState<EntityField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<'entity_name' | 'display_name' | 'validation_type' | 'created_at'>('entity_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingValidation, setEditingValidation] = useState<EntityValidation | null>(null);
  const [testPattern, setTestPattern] = useState('');
  const [testValue, setTestValue] = useState('');
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    entity_field_id: '',
    validation_type: 'regex' as 'regex' | 'enum' | 'lookup',
    pattern: '',
    enum_values: [] as string[],
    lookup_id: '',
    lookup_field: '',
    error_message: '',
    is_active: true
  });

  useEffect(() => {
    fetchValidations();
    fetchEntityFields();
  }, []);

  // Filter and sort validations
  useEffect(() => {
    let filtered = [...validations];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(validation =>
        validation.entity_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        validation.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        validation.validation_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (validation.pattern && validation.pattern.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (validation.error_message && validation.error_message.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply entity filter
    if (entityFilter !== 'all') {
      filtered = filtered.filter(validation => validation.entity_key === entityFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(validation => validation.validation_type === typeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(validation => validation.is_active === isActive);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'entity_name':
          aVal = a.entity_name;
          bVal = b.entity_name;
          break;
        case 'display_name':
          aVal = a.display_name;
          bVal = b.display_name;
          break;
        case 'validation_type':
          aVal = a.validation_type;
          bVal = b.validation_type;
          break;
        case 'created_at':
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredValidations(filtered);
  }, [validations, searchQuery, entityFilter, typeFilter, statusFilter, sortField, sortDirection]);

  const fetchValidations = async () => {
    try {
      const response = await fetch('/api/entity-validations');
      const result = await response.json();

      if (result.success) {
        setValidations(result.data);
        setError(null);
      } else {
        setError("Failed to fetch validations");
        toast({
          title: "Error",
          description: "Failed to fetch validations",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching validations:', error);
      setError("Failed to fetch validations");
      toast({
        title: "Error",
        description: "Failed to fetch validations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEntityFields = async () => {
    try {
      const response = await fetch('/api/entity-fields');
      const result = await response.json();

      if (result.success) {
        setEntityFields(result.data);
      }
    } catch (error) {
      console.error('Error fetching entity fields:', error);
    }
  };

  const handleSaveValidation = async () => {
    try {
      const url = editingValidation
        ? `/api/entity-validations/${editingValidation.id}`
        : '/api/entity-validations';

      const method = editingValidation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: editingValidation ? "Validation updated" : "Validation created",
          variant: "success",
        });

        setDialogOpen(false);
        resetForm();
        fetchValidations();
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to save validation",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving validation:', error);
      toast({
        title: "Error",
        description: "Failed to save validation",
        variant: "destructive",
      });
    }
  };

  const handleDeleteValidation = async (id: string) => {
    try {
      const response = await fetch(`/api/entity-validations/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Validation deleted successfully",
          variant: "success",
        });
        fetchValidations();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete validation",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting validation:', error);
      toast({
        title: "Error",
        description: "Failed to delete validation",
        variant: "destructive",
      });
    }
  };

  const testRegexPattern = () => {
    if (!testPattern || !testValue) {
      setTestResult({ valid: false, message: 'Please enter both pattern and test value' });
      return;
    }

    try {
      const regex = new RegExp(testPattern);
      const isValid = regex.test(testValue);

      setTestResult({
        valid: isValid,
        message: isValid ? 'Pattern matches successfully!' : 'Pattern does not match'
      });
    } catch (error) {
      setTestResult({ valid: false, message: 'Invalid regex pattern' });
    }
  };

  const openEditDialog = (validation: EntityValidation) => {
    setEditingValidation(validation);
    setFormData({
      entity_field_id: validation.entity_field_id,
      validation_type: validation.validation_type,
      pattern: validation.pattern || '',
      enum_values: validation.enum_values || [],
      lookup_id: validation.lookup_id || '',
      lookup_field: validation.lookup_field || '',
      error_message: validation.error_message || '',
      is_active: validation.is_active
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingValidation(null);
    setFormData({
      entity_field_id: '',
      validation_type: 'regex',
      pattern: '',
      enum_values: [],
      lookup_id: '',
      lookup_field: '',
      error_message: '',
      is_active: true
    });
  };

  const handleSort = (field: 'entity_name' | 'display_name' | 'validation_type' | 'created_at') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'entity_name' | 'display_name' | 'validation_type' | 'created_at') => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Get unique entities for filter dropdown
  const uniqueEntities = Array.from(new Set(validations.map(v => ({ key: v.entity_key, name: v.entity_name }))))
    .reduce((acc: { key: string; name: string }[], entity) => {
      if (!acc.find(e => e.key === entity.key)) {
        acc.push(entity);
      }
      return acc;
    }, [])
    .sort((a, b) => a.name.localeCompare(b.name));

  const renderValidationDetails = (validation: EntityValidation) => {
    switch (validation.validation_type) {
      case 'regex':
        return <code className="text-sm bg-gray-100 px-2 py-1 rounded">{validation.pattern}</code>;
      case 'enum':
        return (
          <div className="flex flex-wrap gap-1">
            {validation.enum_values?.map((value, index) => (
              <Badge key={index} variant="outline" className="text-xs">{value}</Badge>
            ))}
          </div>
        );
      case 'lookup':
        return (
          <span className="text-sm">
            {validation.lookup_id} → {validation.lookup_field}
          </span>
        );
      default:
        return <span className="text-sm text-gray-500">Unknown validation</span>;
    }
  };

  if (loading) {
    return (
      <AppLayout pageTitle="Entity Validations">
        <div className="p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-lg">Loading entity validations...</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout pageTitle="Entity Validations">
        <div className="p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-red-500 text-lg">{error}</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Entity Validations">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Entity Validations Management
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-slate-600">
                  Manage validation rules for entity fields including regex patterns, enum values, and lookup validations
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-500 font-medium">
                    {validations.length} rules loaded
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Validation
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingValidation ? 'Edit Validation' : 'Add New Validation'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Entity Field Selection */}
              <div className="space-y-2">
                <Label htmlFor="entity_field_id">Entity Field</Label>
                <Select
                  value={formData.entity_field_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, entity_field_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity field" />
                  </SelectTrigger>
                  <SelectContent>
                    {entityFields.map((field) => (
                      <SelectItem key={field.id} value={field.id}>
                        {field.entity_name} - {field.display_name} ({field.field_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Validation Type */}
              <div className="space-y-2">
                <Label htmlFor="validation_type">Validation Type</Label>
                <Select
                  value={formData.validation_type}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, validation_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regex">Regex Pattern</SelectItem>
                    <SelectItem value="enum">Enum Values</SelectItem>
                    <SelectItem value="lookup">Lookup Validation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Regex Pattern */}
              {formData.validation_type === 'regex' && (
                <div className="space-y-2">
                  <Label htmlFor="pattern">Regex Pattern</Label>
                  <Input
                    id="pattern"
                    value={formData.pattern}
                    onChange={(e) => setFormData(prev => ({ ...prev, pattern: e.target.value }))}
                    placeholder="e.g., ^[A-Za-z0-9]+$"
                  />

                  {/* Pattern Tester */}
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                    <h4 className="font-medium text-sm">Test Pattern</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Pattern to test"
                        value={testPattern}
                        onChange={(e) => setTestPattern(e.target.value)}
                      />
                      <Input
                        placeholder="Test value"
                        value={testValue}
                        onChange={(e) => setTestValue(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={testRegexPattern}
                      className="w-full"
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      Test Pattern
                    </Button>
                    {testResult && (
                      <div className={`flex items-center space-x-2 text-sm ${testResult.valid ? 'text-green-600' : 'text-red-600'}`}>
                        {testResult.valid ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Enum Values */}
              {formData.validation_type === 'enum' && (
                <div className="space-y-2">
                  <Label>Enum Values</Label>
                  <Textarea
                    placeholder="Enter values separated by commas (e.g., value1, value2, value3)"
                    value={formData.enum_values.join(', ')}
                    onChange={(e) => {
                      const values = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                      setFormData(prev => ({ ...prev, enum_values: values }));
                    }}
                  />
                  {formData.enum_values.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {formData.enum_values.map((value, index) => (
                        <Badge key={index} variant="outline">{value}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Lookup Configuration */}
              {formData.validation_type === 'lookup' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lookup_id">Lookup ID</Label>
                    <Input
                      id="lookup_id"
                      value={formData.lookup_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, lookup_id: e.target.value }))}
                      placeholder="e.g., tmsCustomers"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lookup_field">Lookup Field</Label>
                    <Input
                      id="lookup_field"
                      value={formData.lookup_field}
                      onChange={(e) => setFormData(prev => ({ ...prev, lookup_field: e.target.value }))}
                      placeholder="e.g., company_name"
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              <div className="space-y-2">
                <Label htmlFor="error_message">Custom Error Message</Label>
                <Textarea
                  id="error_message"
                  value={formData.error_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, error_message: e.target.value }))}
                  placeholder="Custom error message for validation failure"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveValidation}>
                  {editingValidation ? 'Update' : 'Create'} Validation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search validations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Entity Filter */}
              <div className="space-y-2">
                <Label htmlFor="entity-filter">Entity</Label>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {uniqueEntities.map((entity) => (
                      <SelectItem key={entity.key} value={entity.key}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="type-filter">Validation Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="regex">Regex</SelectItem>
                    <SelectItem value="enum">Enum</SelectItem>
                    <SelectItem value="lookup">Lookup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {filteredValidations.length} of {validations.length} validation rules
                {(searchQuery || entityFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setEntityFilter('all');
                      setTypeFilter('all');
                      setStatusFilter('all');
                    }}
                    className="ml-2"
                  >
                    Clear filters
                  </Button>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Validations Table */}
        <Card>
        <CardHeader>
          <CardTitle>Validation Rules ({filteredValidations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredValidations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {validations.length === 0
                ? "No validation rules found. Create your first validation rule to get started."
                : "No validation rules match your current filters."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('entity_name')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Entity {getSortIcon('entity_name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('display_name')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Field {getSortIcon('display_name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('validation_type')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Type {getSortIcon('validation_type')}
                      </Button>
                    </TableHead>
                    <TableHead>Rule Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('created_at')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Created {getSortIcon('created_at')}
                      </Button>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredValidations.map((validation) => (
                    <TableRow key={validation.id}>
                      <TableCell className="font-medium">
                        {validation.entity_name}
                      </TableCell>
                      <TableCell>{validation.display_name}</TableCell>
                      <TableCell>
                        <Badge className={ValidationTypeBadges[validation.validation_type]}>
                          {validation.validation_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {renderValidationDetails(validation)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={validation.is_active ? "default" : "secondary"}>
                          {validation.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(validation.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(validation)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Validation</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this validation rule? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteValidation(validation.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AppLayout>
  );
}