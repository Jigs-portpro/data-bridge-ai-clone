"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface EntityProcessingResult {
  entityName: string;
  confidence: number;
  explanation?: string;
}

interface EntityContextType {
  detectedEntity: EntityProcessingResult | null;
  setDetectedEntity: (entity: EntityProcessingResult | null) => void;
  fetchedLookups: Set<string>;
  setFetchedLookups: (lookups: Set<string>) => void;
  fileHash: string | null;
  setFileHash: (hash: string | null) => void;
  clearEntityState: () => void;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

// Storage keys
export const STORAGE_KEYS = {
  DETECTED_ENTITY: 'portpro-detected-entity',
  FETCHED_LOOKUPS: 'portpro-fetched-lookups',
  FILE_HASH: 'portpro-file-hash'
};

export function EntityProvider({ children }: { children: React.ReactNode }) {
  const [detectedEntity, setDetectedEntity] = useState<EntityProcessingResult | null>(null);
  const [fetchedLookups, setFetchedLookups] = useState<Set<string>>(new Set());
  const [fileHash, setFileHash] = useState<string | null>(null);

  // Load state from storage on mount
  useEffect(() => {
    const loadState = () => {
      try {
        const savedEntity = sessionStorage.getItem(STORAGE_KEYS.DETECTED_ENTITY);
        const savedLookups = sessionStorage.getItem(STORAGE_KEYS.FETCHED_LOOKUPS);
        const savedHash = sessionStorage.getItem(STORAGE_KEYS.FILE_HASH);

        if (savedEntity) {
          setDetectedEntity(JSON.parse(savedEntity));
        }
        if (savedLookups) {
          setFetchedLookups(new Set(JSON.parse(savedLookups)));
        }
        if (savedHash) {
          setFileHash(savedHash);
        }
      } catch (error) {
        console.error('Error loading entity state:', error);
      }
    };

    loadState();
  }, []);

  // Save state to storage when it changes
  useEffect(() => {
    if (detectedEntity) {
      sessionStorage.setItem(STORAGE_KEYS.DETECTED_ENTITY, JSON.stringify(detectedEntity));
    }
  }, [detectedEntity]);

  useEffect(() => {
    if (fetchedLookups.size > 0) {
      sessionStorage.setItem(STORAGE_KEYS.FETCHED_LOOKUPS, JSON.stringify([...fetchedLookups]));
    }
  }, [fetchedLookups]);

  useEffect(() => {
    if (fileHash) {
      sessionStorage.setItem(STORAGE_KEYS.FILE_HASH, fileHash);
    }
  }, [fileHash]);

  const clearEntityState = () => {
    setDetectedEntity(null);
    setFetchedLookups(new Set());
    setFileHash(null);
    sessionStorage.removeItem(STORAGE_KEYS.DETECTED_ENTITY);
    sessionStorage.removeItem(STORAGE_KEYS.FETCHED_LOOKUPS);
    sessionStorage.removeItem(STORAGE_KEYS.FILE_HASH);
  };

  return (
    <EntityContext.Provider
      value={{
        detectedEntity,
        setDetectedEntity,
        fetchedLookups,
        setFetchedLookups,
        fileHash,
        setFileHash,
        clearEntityState
      }}
    >
      {children}
    </EntityContext.Provider>
  );
}

export function useEntityContext() {
  const context = useContext(EntityContext);
  if (context === undefined) {
    throw new Error('useEntityContext must be used within an EntityProvider');
  }
  return context;
} 