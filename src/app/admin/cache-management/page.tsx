"use client";

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useUserCache } from '@/contexts/UserCacheContext';
import {
  Trash2,
  RefreshCw,
  Database,
  HardDrive,
  Globe,
  Timer,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Server,
  Monitor,
  FileJson,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';

interface CacheEntry {
  id: string;
  name: string;
  location: string;
  type: 'memory' | 'localStorage' | 'sessionStorage' | 'mongodb' | 'redis';
  ttl: string;
  status: 'active' | 'expired' | 'empty';
  size?: string;
  lastAccessed?: Date;
  expiresAt?: Date;
  filePath?: string;
  lineNumber?: number;
  description: string;
}

const CACHE_LOCATIONS: CacheEntry[] = [
  // Validation System Caches
  {
    id: 'entities_cache',
    name: 'Entities Cache',
    location: 'Browser Memory',
    type: 'memory',
    ttl: '5 minutes',
    status: 'active',
    filePath: 'src/hooks/useValidation.ts',
    lineNumber: 48,
    description: 'Caches entity definitions fetched from /api/entities'
  },
  {
    id: 'validation_fields_cache',
    name: 'Entity Fields Cache',
    location: 'ValidationService Memory',
    type: 'memory',
    ttl: '5 minutes',
    status: 'active',
    filePath: 'src/lib/validation/ValidationService.ts',
    lineNumber: 45,
    description: 'Caches entity field definitions for validation'
  },
  {
    id: 'validation_rules_cache',
    name: 'Validation Rules Cache',
    location: 'ValidationService Memory',
    type: 'memory',
    ttl: '5 minutes',
    status: 'active',
    filePath: 'src/lib/validation/ValidationService.ts',
    lineNumber: 46,
    description: 'Caches validation rules (regex, enum, lookup) for entities'
  },

  // Lookup Data Caches
  {
    id: 'lookup_cache_global',
    name: 'Global Lookup Cache',
    location: 'Browser Memory',
    type: 'memory',
    ttl: '30 minutes',
    status: 'active',
    filePath: 'src/lib/lookupCache.ts',
    lineNumber: 486,
    description: 'Caches 24+ lookup types (chassis, containers, branches, etc.)'
  },
  {
    id: 'app_context_lookups',
    name: 'AppContext Lookup Data',
    location: 'React Context Memory',
    type: 'memory',
    ttl: 'Session',
    status: 'active',
    filePath: 'src/contexts/AppContext.tsx',
    lineNumber: 100,
    description: 'In-memory storage for fetched lookup data across components'
  },

  // Browser Storage Caches
  {
    id: 'auth_token',
    name: 'Authentication Token',
    location: 'Browser LocalStorage',
    type: 'localStorage',
    ttl: 'Persistent',
    status: 'active',
    filePath: 'src/lib/constants.ts',
    lineNumber: 12,
    description: 'Stores API authentication token'
  },
  {
    id: 'base_url',
    name: 'Base URL Config',
    location: 'Browser LocalStorage',
    type: 'localStorage',
    ttl: 'Persistent',
    status: 'active',
    filePath: 'src/lib/constants.ts',
    lineNumber: 13,
    description: 'Stores API base URL configuration'
  },
  {
    id: 'ai_provider',
    name: 'AI Provider Settings',
    location: 'Browser LocalStorage',
    type: 'localStorage',
    ttl: 'Persistent',
    status: 'active',
    filePath: 'src/lib/constants.ts',
    lineNumber: 15,
    description: 'Stores selected AI provider and model settings'
  },
  {
    id: 'entity_name',
    name: 'Selected Entity Name',
    location: 'Browser LocalStorage',
    type: 'localStorage',
    ttl: 'Persistent',
    status: 'active',
    filePath: 'src/lib/constants.ts',
    lineNumber: 18,
    description: 'Stores currently selected entity name'
  },
  {
    id: 'field_mappings',
    name: 'Column Field Mappings',
    location: 'Browser LocalStorage',
    type: 'localStorage',
    ttl: 'Persistent',
    status: 'active',
    filePath: 'src/components/ColumnMapperIcon.tsx',
    lineNumber: 17,
    description: 'Stores column to field mapping configurations'
  },
  {
    id: 'chat_history',
    name: 'Chat History',
    location: 'Browser SessionStorage',
    type: 'sessionStorage',
    ttl: 'Session',
    status: 'active',
    filePath: 'src/lib/constants.ts',
    lineNumber: 21,
    description: 'Stores chat conversation history'
  },
  {
    id: 'datatable_data',
    name: 'DataTable Cache',
    location: 'Browser SessionStorage',
    type: 'sessionStorage',
    ttl: 'Session',
    status: 'active',
    filePath: 'src/lib/constants.ts',
    lineNumber: 19,
    description: 'Stores uploaded data and edited cells'
  },

  // MongoDB Caches
  {
    id: 'mongodb_session_data',
    name: 'Session Data Cache',
    location: 'MongoDB Collection',
    type: 'mongodb',
    ttl: '24 hours',
    status: 'active',
    filePath: 'src/utils/mongodb-helpers.ts',
    lineNumber: 24,
    description: 'Stores user session data and uploaded files'
  },
  {
    id: 'mongodb_lookup_cache',
    name: 'MongoDB Lookup Cache',
    location: 'MongoDB Collection',
    type: 'mongodb',
    ttl: '24 hours',
    status: 'active',
    filePath: 'src/utils/mongodb-helpers.ts',
    lineNumber: 507,
    description: 'Persistent storage for lookup data'
  },
  {
    id: 'mongodb_metadata',
    name: 'Metadata Cache',
    location: 'MongoDB Collection',
    type: 'mongodb',
    ttl: '24 hours',
    status: 'active',
    filePath: 'src/utils/mongodb-helpers.ts',
    lineNumber: 293,
    description: 'Stores validation metadata and error states'
  },

  // Redux Persist
  {
    id: 'redux_export_state',
    name: 'Export State Cache',
    location: 'Browser LocalStorage (Redux)',
    type: 'localStorage',
    ttl: 'Persistent',
    status: 'active',
    filePath: 'src/store/index.ts',
    lineNumber: 20,
    description: 'Persists export data state across browser sessions'
  }
];

export default function CacheManagementPage() {
  const { toast } = useToast();
  const { userContext, clearAllUserCaches, clearUserCache, getCacheStats, isUserIdentified } = useUserCache();
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>(CACHE_LOCATIONS);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const getLocationIcon = (type: CacheEntry['type']) => {
    switch (type) {
      case 'memory': return <Monitor className="h-4 w-4" />;
      case 'localStorage': return <HardDrive className="h-4 w-4" />;
      case 'sessionStorage': return <Globe className="h-4 w-4" />;
      case 'mongodb': return <Database className="h-4 w-4" />;
      case 'redis': return <Server className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: CacheEntry['status']) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'empty': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Timer className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleClearCache = async (cacheId: string) => {
    setIsLoading(prev => ({ ...prev, [cacheId]: true }));

    try {
      const response = await fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheId })
      });

      if (response.ok) {
        toast({
          title: "Cache Cleared",
          description: `Successfully cleared ${cacheEntries.find(c => c.id === cacheId)?.name}`,
        });

        // Update status
        setCacheEntries(prev =>
          prev.map(cache =>
            cache.id === cacheId
              ? { ...cache, status: 'empty' as const }
              : cache
          )
        );
      } else {
        throw new Error('Failed to clear cache');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to clear cache: ${error}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, [cacheId]: false }));
    }
  };

  const handleClearAllCaches = async () => {
    setIsLoading(prev => ({ ...prev, 'all': true }));

    try {
      if (isUserIdentified && userContext) {
        // User-aware cache clearing
        await clearAllUserCaches();

        toast({
          title: "User Caches Cleared",
          description: `Successfully cleared all caches for user: ${userContext.userId}`,
        });
      } else {
        // Legacy global cache clearing
        const response = await fetch('/api/cache/invalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cacheType: 'all' })
        });

        if (response.ok) {
          toast({
            title: "All Caches Cleared",
            description: "Successfully cleared all cache systems (global)",
          });
        } else {
          throw new Error('Failed to clear all caches');
        }
      }

      // Update all statuses
      setCacheEntries(prev =>
        prev.map(cache => ({ ...cache, status: 'empty' as const }))
      );
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to clear all caches: ${error}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, 'all': false }));
    }
  };

  const groupedCaches = {
    'Validation System': cacheEntries.filter(c => c.id.includes('validation') || c.id.includes('entities')),
    'Lookup Data': cacheEntries.filter(c => c.id.includes('lookup') || c.id.includes('app_context')),
    'Browser Storage': cacheEntries.filter(c => c.type === 'localStorage' || c.type === 'sessionStorage'),
    'Database Storage': cacheEntries.filter(c => c.type === 'mongodb' || c.type === 'redis'),
  };

  return (
    <AppLayout pageTitle="Cache Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cache Management</h1>
            <p className="text-muted-foreground mt-2">
              Monitor and manage all caching systems across the application
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLastRefresh(new Date())}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAllCaches}
              disabled={isLoading['all']}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Caches
            </Button>
          </div>
        </div>

        {/* User Context Info */}
        {isUserIdentified && userContext ? (
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                User-Aware Cache Management Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>User ID:</strong> {userContext.userId.substring(0, 12)}...
                </div>
                <div>
                  <strong>Carrier:</strong> {userContext.carrierId}
                </div>
                <div>
                  <strong>Email:</strong> {userContext.email || 'Anonymous'}
                </div>
                <div>
                  <strong>Session:</strong> {userContext.sessionId.substring(0, 12)}...
                </div>
              </div>
              <div className="mt-3 text-xs text-green-700">
                ✅ All cache operations are scoped to your user account
              </div>
            </CardContent>
          </Card>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Legacy Cache Mode</AlertTitle>
            <AlertDescription>
              User identification not available. Cache operations will affect all users (legacy mode).
            </AlertDescription>
          </Alert>
        )}

        {/* Cache Issues Alert */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Multiple Cache Infrastructure Issues</AlertTitle>
          <AlertDescription>
            <div className="space-y-2 mt-2">
              <p><strong>Current Problems:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>4 different cache systems with different TTLs (5min, 30min, 24h, persistent)</li>
                <li>No automatic invalidation when entities/lookups are modified</li>
                <li>Changes may take up to 30 minutes to appear due to cache layers</li>
                <li>Cache inconsistency between Memory → MongoDB → Browser storage</li>
              </ul>
              <p className="text-sm mt-2">
                <strong>Recommendation:</strong> Migrate to unified Redis cache with consistent TTL and automatic invalidation
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Last Refresh Info */}
        <div className="text-sm text-muted-foreground">
          Last refreshed: {format(lastRefresh, 'MMM d, yyyy HH:mm:ss')}
        </div>

        {/* Cache Groups */}
        {Object.entries(groupedCaches).map(([groupName, caches]) => (
          <Card key={groupName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {groupName === 'Validation System' && <Settings className="h-5 w-5" />}
                {groupName === 'Lookup Data' && <Database className="h-5 w-5" />}
                {groupName === 'Browser Storage' && <Monitor className="h-5 w-5" />}
                {groupName === 'Database Storage' && <Server className="h-5 w-5" />}
                {groupName}
              </CardTitle>
              <CardDescription>
                {groupName === 'Validation System' && 'Entity and validation rule caches'}
                {groupName === 'Lookup Data' && 'Lookup data and reference caches'}
                {groupName === 'Browser Storage' && 'Client-side persistent and session storage'}
                {groupName === 'Database Storage' && 'Server-side persistent storage'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cache Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>TTL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>File Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {caches.map((cache) => (
                    <TableRow key={cache.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{cache.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {cache.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getLocationIcon(cache.type)}
                          <span className="text-sm">{cache.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cache.ttl}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(cache.status)}
                          <span className="text-sm capitalize">{cache.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono">
                          <div>{cache.filePath}</div>
                          {cache.lineNumber && (
                            <div className="text-muted-foreground">
                              Line {cache.lineNumber}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClearCache(cache.id)}
                          disabled={isLoading[cache.id] || cache.status === 'empty'}
                        >
                          {isLoading[cache.id] ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

        {/* Cache Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Cache Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {cacheEntries.filter(c => c.status === 'active').length}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {cacheEntries.filter(c => c.status === 'expired').length}
                </div>
                <div className="text-sm text-muted-foreground">Expired</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {cacheEntries.filter(c => c.status === 'empty').length}
                </div>
                <div className="text-sm text-muted-foreground">Empty</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {new Set(cacheEntries.map(c => c.type)).size}
                </div>
                <div className="text-sm text-muted-foreground">Cache Types</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}