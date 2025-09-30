# Phase 3: Entity Validation Management - Implementation Guide

## Overview

This document provides a step-by-step implementation guide for Phase 3 of the database-driven entity system: **Entity Validation Management**. This phase focuses on migrating MongoDB validation rules to PostgreSQL and creating a separate table structure and admin interface for managing all validation types.

⚠️ **Prerequisites**: Phase 1 (Entity Management) and Phase 2 (Entity Field Management) must be completed successfully before starting Phase 3.

## 🔑 **Critical Understanding: Column Mapping**

**MongoDB to PostgreSQL Column Mapping:**
```
MongoDB Field Structure    →    PostgreSQL Structure
┌─────────────────────────────────────────────────────────────┐
│ name: "Customer"         →    display_name (already exists) │
│ sourceColumn: "caller"   →    field_name (already exists)   │
│ pattern: "^[A-Za-z]+$"   →    entity_validations.pattern    │
│ enum: ["Import","Export"] →    entity_validations.enum_values │
│ lookupValidation: {...}  →    entity_validations.lookup_*   │
│ minLength/maxLength      →    entity_fields.min/max_length  │
└─────────────────────────────────────────────────────────────┘
```

**Key Point**: The PostgreSQL `field_name` column already contains what MongoDB calls `sourceColumn`. The `display_name` column contains what MongoDB calls `name`.

**🚨 IMPORTANT: We are NOT modifying the `entity_fields` table at all. It already has everything it needs. We only create the new `entity_validations` table for advanced validation rules.**

## Current System Status

Based on the investigation in `/docs/entity-field-validation.md`, the current validation system has critical gaps:

- ❌ **Pattern validation (regex) is not working** - database lacks `pattern` validation
- ❌ **Enum validation (allowed values) is not working** - database lacks `enum` validation
- ❌ **Lookup validation is not working** - database lacks `lookupValidation` configuration
- ✅ **Basic validation works**: `required`, `type`, `min_length`, `max_length` (from entity_fields table)

## Phase 3 Goals

1. **Create separate validation table** for advanced validation rules (regex, enum, lookup)
2. **Keep basic validation in entity_fields** (`required`, `min_length`, `max_length`)
3. **Build admin interface** for managing advanced validations
4. **Integrate validation system** with existing validation hook
5. **Maintain clear separation**: basic field properties vs advanced validation rules

## Implementation Tasks

### Task 3.1: Entity Validations Database Schema

#### Task 3.1.1: Create Entity Validations Table

**File**: `/sql/003_create_entity_validations_table.sql`

```sql
-- Entity Validations Table for Advanced Validation Rules
-- Basic validation (required, min_length, max_length) stays in entity_fields table
-- Advanced validation (regex, enum, lookup) goes in this separate table
CREATE TABLE entity_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_field_id UUID NOT NULL REFERENCES entity_fields(id) ON DELETE CASCADE,
    validation_type VARCHAR(50) NOT NULL CHECK (validation_type IN ('regex', 'enum', 'lookup')),
    pattern VARCHAR(1000), -- Regex pattern for validation (when validation_type = 'regex')
    enum_values JSONB, -- Array of allowed values (when validation_type = 'enum')
    lookup_id VARCHAR(100), -- Lookup data source ID (when validation_type = 'lookup')
    lookup_field VARCHAR(200), -- Field name in lookup data (when validation_type = 'lookup')
    error_message VARCHAR(500), -- Custom error message for validation failures
    is_active BOOLEAN DEFAULT true, -- Enable/disable validation rule
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure only ONE validation rule per field (no mixing validation types)
    UNIQUE(entity_field_id),

    -- Ensure appropriate fields are set based on validation type
    CHECK (
        (validation_type = 'regex' AND pattern IS NOT NULL) OR
        (validation_type = 'enum' AND enum_values IS NOT NULL) OR
        (validation_type = 'lookup' AND lookup_id IS NOT NULL AND lookup_field IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_entity_validations_entity_field_id ON entity_validations(entity_field_id);
CREATE INDEX idx_entity_validations_validation_type ON entity_validations(validation_type);
CREATE INDEX idx_entity_validations_active ON entity_validations(is_active);
CREATE INDEX idx_entity_validations_lookup_id ON entity_validations(lookup_id) WHERE lookup_id IS NOT NULL;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_entity_validations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_entity_validations_updated_at
    BEFORE UPDATE ON entity_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_validations_updated_at();

-- Comments for documentation
COMMENT ON TABLE entity_validations IS 'Advanced validation rules for entity fields (regex, enum, lookup)';
COMMENT ON COLUMN entity_validations.validation_type IS 'Type of validation: regex, enum, lookup';
COMMENT ON COLUMN entity_validations.pattern IS 'Regex pattern for string validation (when validation_type = regex)';
COMMENT ON COLUMN entity_validations.enum_values IS 'JSON array of allowed values (when validation_type = enum)';
COMMENT ON COLUMN entity_validations.lookup_id IS 'Lookup data source ID (when validation_type = lookup)';
COMMENT ON COLUMN entity_validations.lookup_field IS 'Field name within lookup data (when validation_type = lookup)';
```

**Success Criteria**:
- ✅ Entity validations table created with proper relationships to entity_fields
- ✅ Support for regex, enum, and lookup validation (NOT basic field validation)
- ✅ **ONE validation rule per field** (no mixing validation types)
- ✅ Proper indexes and constraints for data integrity
- ✅ Clear separation: basic validation stays in entity_fields, advanced validation in entity_validations

### Task 3.2: Update Entity Fields API Routes

#### Task 3.2.1: Extend Entity Fields API to Support New Validation Columns

**File**: `/src/app/api/entity-fields/route.ts` (Update existing)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query, queryRows } from '@/lib/db';
import { z } from 'zod';

// Validation schema for entity validation creation
const CreateEntityValidationSchema = z.object({
  entity_field_id: z.string().uuid(),
  validation_type: z.enum(['regex', 'enum', 'numeric_range', 'custom']),
  pattern: z.string().optional(),
  enum_values: z.array(z.string()).optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  error_message: z.string().max(500).optional(),
  is_active: z.boolean().default(true)
});

// GET /api/entity-validations - List all validations with field details
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityFieldId = searchParams.get('entity_field_id');
    const validationType = searchParams.get('validation_type');
    const isActive = searchParams.get('is_active');

    let sql = `
      SELECT
        ev.*,
        ef.field_name,
        ef.display_name,
        e.name as entity_name,
        e.entity_key
      FROM entity_validations ev
      JOIN entity_fields ef ON ev.entity_field_id = ef.id
      JOIN entities e ON ef.entity_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (entityFieldId) {
      sql += ` AND ev.entity_field_id = $${paramIndex}`;
      params.push(entityFieldId);
      paramIndex++;
    }

    if (validationType) {
      sql += ` AND ev.validation_type = $${paramIndex}`;
      params.push(validationType);
      paramIndex++;
    }

    if (isActive !== null) {
      sql += ` AND ev.is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    sql += ` ORDER BY e.name, ef.field_name, ev.validation_type`;

    const validations = await queryRows(sql, params);

    return NextResponse.json({
      success: true,
      data: validations
    });

  } catch (error: any) {
    console.error('Error fetching entity validations:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to fetch entity validations',
        status: 500
      }
    }, { status: 500 });
  }
}

// POST /api/entity-validations - Create new validation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = CreateEntityValidationSchema.parse(body);

    // Check if entity field exists
    const fieldExists = await query(
      'SELECT id FROM entity_fields WHERE id = $1',
      [validatedData.entity_field_id]
    );

    if (!fieldExists) {
      return NextResponse.json({
        error: {
          message: 'Entity field not found',
          status: 404
        }
      }, { status: 404 });
    }

    const sql = `
      INSERT INTO entity_validations (
        entity_field_id, validation_type, pattern, enum_values,
        min_value, max_value, error_message, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const params = [
      validatedData.entity_field_id,
      validatedData.validation_type,
      validatedData.pattern || null,
      validatedData.enum_values ? JSON.stringify(validatedData.enum_values) : null,
      validatedData.min_value || null,
      validatedData.max_value || null,
      validatedData.error_message || null,
      validatedData.is_active
    ];

    const newValidation = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: newValidation,
      message: 'Entity validation created successfully'
    }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: {
          message: 'Validation failed',
          details: error.errors,
          status: 400
        }
      }, { status: 400 });
    }

    console.error('Error creating entity validation:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to create entity validation',
        status: 500
      }
    }, { status: 500 });
  }
}
```

#### Task 3.2.2: Individual Validation Management API Routes

**File**: `/src/app/api/entity-validations/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

const UpdateEntityValidationSchema = z.object({
  validation_type: z.enum(['regex', 'enum', 'numeric_range', 'custom']).optional(),
  pattern: z.string().optional(),
  enum_values: z.array(z.string()).optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  error_message: z.string().max(500).optional(),
  is_active: z.boolean().optional()
});

// GET /api/entity-validations/[id] - Get single validation
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sql = `
      SELECT
        ev.*,
        ef.field_name,
        ef.display_name,
        ef.field_type,
        e.name as entity_name,
        e.entity_key
      FROM entity_validations ev
      JOIN entity_fields ef ON ev.entity_field_id = ef.id
      JOIN entities e ON ef.entity_id = e.id
      WHERE ev.id = $1
    `;

    const validation = await query(sql, [params.id]);

    if (!validation) {
      return NextResponse.json({
        error: {
          message: 'Entity validation not found',
          status: 404
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: validation
    });

  } catch (error: any) {
    console.error('Error fetching entity validation:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to fetch entity validation',
        status: 500
      }
    }, { status: 500 });
  }
}

// PUT /api/entity-validations/[id] - Update validation
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validatedData = UpdateEntityValidationSchema.parse(body);

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'enum_values') {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(value);
        }
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json({
        error: {
          message: 'No fields to update',
          status: 400
        }
      }, { status: 400 });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(params.id);

    const sql = `
      UPDATE entity_validations
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updatedValidation = await query(sql, updateValues);

    if (!updatedValidation) {
      return NextResponse.json({
        error: {
          message: 'Entity validation not found',
          status: 404
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedValidation,
      message: 'Entity validation updated successfully'
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: {
          message: 'Validation failed',
          details: error.errors,
          status: 400
        }
      }, { status: 400 });
    }

    console.error('Error updating entity validation:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to update entity validation',
        status: 500
      }
    }, { status: 500 });
  }
}

// DELETE /api/entity-validations/[id] - Delete validation
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deletedValidation = await query(
      'DELETE FROM entity_validations WHERE id = $1 RETURNING *',
      [params.id]
    );

    if (!deletedValidation) {
      return NextResponse.json({
        error: {
          message: 'Entity validation not found',
          status: 404
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Entity validation deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting entity validation:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to delete entity validation',
        status: 500
      }
    }, { status: 500 });
  }
}
```

#### Task 3.2.3: Field-Specific Validation API Routes

**File**: `/src/app/api/entity-fields/[field_id]/validations/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query, queryRows } from '@/lib/db';

// GET /api/entity-fields/[field_id]/validations - Get all validations for a field
export async function GET(
  req: NextRequest,
  { params }: { params: { field_id: string } }
) {
  try {
    const sql = `
      SELECT * FROM entity_validations
      WHERE entity_field_id = $1
      ORDER BY validation_type, created_at
    `;

    const validations = await queryRows(sql, [params.field_id]);

    return NextResponse.json({
      success: true,
      data: validations
    });

  } catch (error: any) {
    console.error('Error fetching field validations:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to fetch field validations',
        status: 500
      }
    }, { status: 500 });
  }
}
```

### Task 3.3: Entity Validations Admin Page

#### Task 3.3.1: Admin Interface for Validation Management

**File**: `/src/app/admin/entity-validations/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, TestTube, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
  validation_type: 'regex' | 'enum' | 'numeric_range' | 'custom';
  pattern?: string;
  enum_values?: string[];
  min_value?: number;
  max_value?: number;
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
  numeric_range: 'bg-yellow-100 text-yellow-800',
  custom: 'bg-purple-100 text-purple-800'
};

export default function EntityValidationsPage() {
  const [validations, setValidations] = useState<EntityValidation[]>([]);
  const [entityFields, setEntityFields] = useState<EntityField[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingValidation, setEditingValidation] = useState<EntityValidation | null>(null);
  const [testPattern, setTestPattern] = useState('');
  const [testValue, setTestValue] = useState('');
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    entity_field_id: '',
    validation_type: 'regex' as const,
    pattern: '',
    enum_values: [] as string[],
    min_value: undefined as number | undefined,
    max_value: undefined as number | undefined,
    error_message: '',
    is_active: true
  });

  useEffect(() => {
    fetchValidations();
    fetchEntityFields();
  }, []);

  const fetchValidations = async () => {
    try {
      const response = await fetch('/api/entity-validations');
      const result = await response.json();

      if (result.success) {
        setValidations(result.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch validations",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching validations:', error);
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
      min_value: validation.min_value,
      max_value: validation.max_value,
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
      min_value: undefined,
      max_value: undefined,
      error_message: '',
      is_active: true
    });
  };

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
      case 'numeric_range':
        return (
          <span className="text-sm">
            {validation.min_value !== undefined ? `Min: ${validation.min_value}` : ''}
            {validation.min_value !== undefined && validation.max_value !== undefined ? ', ' : ''}
            {validation.max_value !== undefined ? `Max: ${validation.max_value}` : ''}
          </span>
        );
      default:
        return <span className="text-sm text-gray-500">Custom validation</span>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entity Validations</h1>
          <p className="text-muted-foreground">
            Manage validation rules for entity fields including regex patterns, enum values, and numeric ranges.
          </p>
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
                    <SelectItem value="numeric_range">Numeric Range</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
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

              {/* Numeric Range */}
              {formData.validation_type === 'numeric_range' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_value">Minimum Value</Label>
                    <Input
                      id="min_value"
                      type="number"
                      value={formData.min_value || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        min_value: e.target.value ? Number(e.target.value) : undefined
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_value">Maximum Value</Label>
                    <Input
                      id="max_value"
                      type="number"
                      value={formData.max_value || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        max_value: e.target.value ? Number(e.target.value) : undefined
                      }))}
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

      {/* Validations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Rules ({validations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {validations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No validation rules found. Create your first validation rule to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rule Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validations.map((validation) => (
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
  );
}
```

### Task 3.4: Integration with Validation System

#### Task 3.4.1: Update Export Entities API to Include Validations

**File**: `/src/app/api/export-entities/route.ts` (Update existing)

Add validation data to the existing API response:

```typescript
// In the GET function, update the query to include validation data
const result = await pool.query(`
  SELECT
    e.id,
    e.entity_key,
    e.name,
    e.api_endpoint as url,
    json_agg(
      json_build_object(
        'name', ef.field_name,
        'required', ef.is_required,
        'type', ef.field_type,
        'minLength', ef.min_length,
        'maxLength', ef.max_length,
        -- NOTE: Source column mapping handled via field_name
        -- MongoDB sourceColumn -> PostgreSQL field_name (already populated)

        -- Add validation data
        'pattern', ev_regex.pattern,
        'enum', ev_enum.enum_values,
        'minValue', ev_range.min_value,
        'maxValue', ev_range.max_value,
        'validationErrorMessage', COALESCE(ev_regex.error_message, ev_enum.error_message, ev_range.error_message)
      ) ORDER BY ef.sort_order
    ) as fields
  FROM entities e
  LEFT JOIN entity_fields ef ON e.id = ef.entity_id
  -- Join validation tables
  LEFT JOIN entity_validations ev_regex ON ef.id = ev_regex.entity_field_id AND ev_regex.validation_type = 'regex' AND ev_regex.is_active = true
  LEFT JOIN entity_validations ev_enum ON ef.id = ev_enum.entity_field_id AND ev_enum.validation_type = 'enum' AND ev_enum.is_active = true
  LEFT JOIN entity_validations ev_range ON ef.id = ev_range.entity_field_id AND ev_range.validation_type = 'numeric_range' AND ev_range.is_active = true
  GROUP BY e.id, e.entity_key, e.name, e.api_endpoint
  ORDER BY e.name;
`);
```

#### Task 3.4.2: Add Navigation to Admin Layout

**File**: `/src/components/layout/AdminNavigation.tsx` (or similar)

Add the new admin page to navigation:

```typescript
const adminNavigationItems = [
  { name: 'Base URLs', href: '/admin/base-urls' },
  { name: 'Entities', href: '/admin/entities' },
  { name: 'Entity Fields', href: '/admin/entity-fields' }, // Phase 2
  { name: 'Entity Validations', href: '/admin/entity-validations' }, // Phase 3 - NEW
  { name: 'Lookups', href: '/admin/lookups' }, // Phase 4
];
```

### Task 3.5: Data Seeding and Migration

#### Task 3.5.1: Create Validation Data Seeding Script

**File**: `/sql/004_seed_entity_validations.sql`

Since `exportEntities.json` may be outdated, we need to extract validation rules from the **currently working validation system**. The `useValidation.ts` hook shows what validation rules are actually being applied:

```sql
-- Seed validation rules from exportEntities.json
-- This populates the entity_validations table with existing validation rules

-- First, ensure we have entity_field_id mappings
-- We'll need to match fields by entity_key + field_name

-- Example: Load Type field with regex pattern validation
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT
    ef.id,
    'regex',
    '^(Import|Export|Road)$',
    'Load Type must be Import, Export, or Road'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load'
  AND ef.field_name = 'Load Type';

-- Example: Customer field with lookup validation
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT
    ef.id,
    'lookup',
    'tmsCustomers',
    'company_name',
    'Customer must be a valid TMS customer'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load'
  AND ef.field_name = 'Customer';

-- Add all other validation rules from exportEntities.json
-- This would be a comprehensive migration of all existing validation rules
```

#### Task 3.5.2: Investigation - Find Current Validation Rules

**BEFORE creating any seeding scripts**, we need to determine where the current working validation rules come from:

**Questions to investigate:**
1. Where does `entityConfig` get loaded from in the current system?
2. What provides `targetField.pattern`, `targetField.enum`, `targetField.lookupValidation`?
3. Are validation rules hardcoded somewhere, or dynamically loaded?

**Investigation Steps:**
1. **Check how `entityConfig` is passed to `useValidation.ts`**
2. **Find the current source of validation data that works**
3. **Determine if rules are in code, database, or config files**

#### Task 3.5.3: Create Migration Helper Script

**File**: `/scripts/extract-current-validation-rules.js`

Create a script to extract validation rules from the **current working system**:

```javascript
const fs = require('fs');
const path = require('path');

// Read the exportEntities.json file
const exportEntitiesPath = path.join(__dirname, '../exportEntities.json');
const exportData = JSON.parse(fs.readFileSync(exportEntitiesPath, 'utf8'));

let sql = `-- Auto-generated validation rules migration from exportEntities.json\n\n`;

exportData.entities.forEach(entity => {
    entity.fields.forEach(field => {
        // Generate regex validation rules
        if (field.pattern) {
            sql += `INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '${field.pattern}', 'Invalid format for ${field.name}'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = '${entity.id}' AND ef.field_name = '${field.name}';\n\n`;
        }

        // Generate enum validation rules
        if (field.enum) {
            sql += `INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '${JSON.stringify(field.enum)}', '${field.name} must be one of: ${field.enum.join(', ')}'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = '${entity.id}' AND ef.field_name = '${field.name}';\n\n`;
        }

        // Generate lookup validation rules
        if (field.lookupValidation) {
            sql += `INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', '${field.lookupValidation.lookupId}', '${field.lookupValidation.lookupField}', '${field.name} must be a valid ${field.lookupValidation.lookupId} entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = '${entity.id}' AND ef.field_name = '${field.name}';\n\n`;
        }
    });
});

// Write the generated SQL to a file
fs.writeFileSync(path.join(__dirname, '../sql/004_seed_entity_validations.sql'), sql);
console.log('✅ Generated validation rules migration SQL from exportEntities.json');
```

Run this script: `node scripts/migrate-validation-rules.js`

### Task 3.6: System Integration Timeline

#### Task 3.6.1: Integration Strategy

**Phase 3A: Parallel Implementation (No Breaking Changes)**
1. **Build validation system alongside existing system** - don't replace anything yet
2. **Populate validation rules** from `exportEntities.json`
3. **Test validation admin interface** independently
4. **Verify validation data loads correctly** via `/api/export-entities`

**Phase 3B: Gradual Integration (Safe Transition)**
1. **Update `/api/export-entities`** to include validation data from PostgreSQL
2. **Test with existing validation hook** (`useValidation.ts`) - should work without changes
3. **Verify all validation features work**: regex, enum, lookup validation
4. **Compare results** with current system to ensure no regressions

**Phase 3C: Full Integration (Replace JSON Dependency)**
1. **Confirm validation system is working perfectly**
2. **Remove dependency** on `exportEntities.json` from validation logic
3. **Keep JSON file as backup** until system is proven stable
4. **Update documentation** to reflect PostgreSQL as source of truth

#### Task 3.6.2: Integration Points

The key integration happens in **Task 3.4.1** where we modify `/src/app/api/export-entities/route.ts`:

```typescript
// UPDATED: Complete validation data query to match MongoDB structure
const result = await pool.query(`
  SELECT
    e.id,
    e.entity_key,
    e.name,
    e.api_endpoint as url,
    json_agg(
      json_build_object(
        'name', ef.field_name,
        'required', ef.is_required,
        'type', ef.field_type,
        'minLength', ef.min_length,
        'maxLength', ef.max_length,

        -- NOTE: Source column mapping already handled
        -- MongoDB sourceColumn -> PostgreSQL field_name (already populated)
        -- MongoDB name -> PostgreSQL display_name (already populated)

        -- NEW: Pattern validation (from entity_validations)
        'pattern', ev_regex.pattern,

        -- NEW: Enum validation (from entity_validations)
        'enum', ev_enum.enum_values,

        -- NEW: Lookup validation (from entity_validations)
        'lookupValidation', CASE
          WHEN ev_lookup.validation_type = 'lookup' THEN json_build_object(
            'lookupId', ev_lookup.lookup_id,
            'lookupField', ev_lookup.lookup_field
          )
          ELSE NULL
        END,

        -- NEW: Numeric range validation (from entity_validations)
        'minValue', ev_range.min_value,
        'maxValue', ev_range.max_value,

        -- NEW: Multi-value field support
        'isMulti', ef.is_multi

      ) ORDER BY ef.sort_order
    ) as fields
  FROM entities e
  LEFT JOIN entity_fields ef ON e.id = ef.entity_id

  -- Join all validation types separately to avoid conflicts
  LEFT JOIN entity_validations ev_regex ON ef.id = ev_regex.entity_field_id
    AND ev_regex.validation_type = 'regex' AND ev_regex.is_active = true
  LEFT JOIN entity_validations ev_enum ON ef.id = ev_enum.entity_field_id
    AND ev_enum.validation_type = 'enum' AND ev_enum.is_active = true
  LEFT JOIN entity_validations ev_lookup ON ef.id = ev_lookup.entity_field_id
    AND ev_lookup.validation_type = 'lookup' AND ev_lookup.is_active = true
  LEFT JOIN entity_validations ev_range ON ef.id = ev_range.entity_field_id
    AND ev_range.validation_type = 'numeric_range' AND ev_range.is_active = true

  GROUP BY e.id, e.entity_key, e.name, e.api_endpoint
  ORDER BY e.name;
`);

// This query structure ensures:
// 1. All MongoDB validation features are preserved
// 2. Multiple validation types can exist per field
// 3. Source column mapping is included
// 4. The useValidation hook receives expected data structure
```

This ensures the existing validation system gets the validation data it expects, restoring the broken validation features.

### Task 3.7: Testing and Verification

```sql
-- Test data for verification
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT
  ef.id,
  'regex',
  '^[A-Za-z0-9]+$',
  'Field must contain only letters and numbers'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.field_name = 'Container'
LIMIT 1;

-- Verify validation data is loaded in API
SELECT
  e.name as entity_name,
  ef.field_name,
  ev.validation_type,
  ev.pattern,
  ev.enum_values,
  ev.is_active
FROM entity_validations ev
JOIN entity_fields ef ON ev.entity_field_id = ef.id
JOIN entities e ON ef.entity_id = e.id
ORDER BY e.name, ef.field_name;
```

#### Task 3.5.2: Integration Testing

1. **API Testing**: Test all validation endpoints with various scenarios
2. **UI Testing**: Test the admin interface for creating/editing/deleting validations
3. **Validation Testing**: Verify that new validation rules work in the main validation system
4. **Performance Testing**: Ensure validation queries don't impact system performance

## Success Criteria

### Phase 3 Complete When:

- ✅ **Database Schema**: `entity_validations` table created with proper relationships
- ✅ **API Endpoints**: All validation CRUD operations working
- ✅ **Admin Interface**: Full UI for managing validation rules
- ✅ **Pattern Testing**: Regex pattern testing functionality works
- ✅ **Integration**: Export entities API includes validation data
- ✅ **Navigation**: Admin navigation includes validation management
- ✅ **Testing**: All validation types (regex, enum, numeric) work correctly
- ✅ **Performance**: Validation queries execute within acceptable timeframes

### Validation Features Now Working:

- ✅ **Regex pattern validation** for string fields
- ✅ **Enum validation** for predefined value lists
- ✅ **Numeric range validation** for min/max values
- ✅ **Custom validation** support for future extensions
- ✅ **Error message customization** for user-friendly feedback

## Next Steps

After Phase 3 completion:

1. **Verify validation system integration** - Test that `useValidation.ts` hook properly uses new validation data
2. **Update validation documentation** - Correct `/docs/entity-field-validation.md` to reflect working system
3. **Performance optimization** - Add database indexes for validation queries if needed
4. **Prepare for Phase 4** - Plan lookup management system implementation

## Notes and Considerations

### Architecture Benefits

- **Separation of concerns**: Validation rules separate from field definitions
- **Flexibility**: Support for multiple validation types per field
- **Extensibility**: Easy to add new validation types in the future
- **Performance**: Indexed queries for efficient validation lookups
- **User experience**: Pattern testing and clear error messages

### Potential Issues to Watch

- **Complex validation queries**: Monitor performance as validation rules grow
- **Validation precedence**: Define order when multiple validations exist for one field
- **Migration complexity**: Ensure existing validation logic doesn't break during transition

This implementation guide provides a complete roadmap for Phase 3, ensuring the validation system gaps identified in the current system are properly addressed.

## 📝 **Final Implementation Scope Clarification**

Based on analysis of actual MongoDB data, Phase 3 will implement:

### **3 Validation Types Required:**
- ✅ **~60 Regex Pattern Rules** - Complex string validation (phone formats, complex patterns)
- ✅ **~50 Enum Validation Rules** - Convert regex patterns like `^(Import|Export|Road)$` to proper enum arrays
- ✅ **76 Lookup Validation Rules** - External data validation (`tmsCustomers`, `branches`, `containerTypes`, etc.)
- ❌ **No Numeric Range Rules** - Already handled by `entity_fields.min_length` and `entity_fields.max_length`

**Critical Discovery**: Many current "regex" patterns are actually enum validations in disguise and should be converted for better UX and data quality.

### **What's NOT Being Migrated:**
- Length constraints → Already in `entity_fields` table
- Required field validation → Already in `entity_fields.is_required`
- Basic type validation → Already in `entity_fields.field_type`

**Total Implementation Scope**: 187 validation rules across 12 entity types, using a simplified 2-column validation table focused on the advanced validation types actually used by the system.