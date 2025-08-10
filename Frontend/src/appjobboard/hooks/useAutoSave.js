// useAutoSave.js - Excel-like auto-save functionality
import { useState, useCallback, useRef, useEffect } from 'react';

const AUTOSAVE_DELAY = 2000; // 2 seconds delay after last change

export function useAutoSave(onSave) {
  const [pendingChanges, setPendingChanges] = useState(new Map());
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const timeoutRefs = useRef(new Map());

  // Queue a change for a specific project
  const queueChange = useCallback((projectId, field, value) => {
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      const projectChanges = newMap.get(projectId) || {};
      newMap.set(projectId, {
        ...projectChanges,
        [field]: value,
        _lastModified: Date.now()
      });
      return newMap;
    });

    // Clear existing timeout for this project
    if (timeoutRefs.current.has(projectId)) {
      clearTimeout(timeoutRefs.current.get(projectId));
    }

    // Set new timeout for auto-save
    const timeoutId = setTimeout(async () => {
      await saveProject(projectId);
    }, AUTOSAVE_DELAY);

    timeoutRefs.current.set(projectId, timeoutId);
  }, []);

  // Save a specific project's changes
  const saveProject = useCallback(async (projectId) => {
    const changes = pendingChanges.get(projectId);
    if (!changes) return;

    setIsAutoSaving(true);
    try {
      // Remove metadata before saving
      const { _lastModified, ...saveData } = changes;
      await onSave(projectId, saveData);
      
      // Remove from pending changes
      setPendingChanges(prev => {
        const newMap = new Map(prev);
        newMap.delete(projectId);
        return newMap;
      });

      // Clear timeout
      if (timeoutRefs.current.has(projectId)) {
        clearTimeout(timeoutRefs.current.get(projectId));
        timeoutRefs.current.delete(projectId);
      }
    } catch (error) {
      console.error('Auto-save failed for project:', projectId, error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [pendingChanges, onSave]);

  // Save all pending changes immediately
  const saveAll = useCallback(async () => {
    if (pendingChanges.size === 0) return;

    setIsAutoSaving(true);
    const savePromises = Array.from(pendingChanges.keys()).map(projectId => 
      saveProject(projectId)
    );

    try {
      await Promise.all(savePromises);
    } catch (error) {
      console.error('Failed to save all changes:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [pendingChanges, saveProject]);

  // Get pending status for a project
  const hasPendingChanges = useCallback((projectId) => {
    return pendingChanges.has(projectId);
  }, [pendingChanges]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, []);

  return {
    queueChange,
    saveProject,
    saveAll,
    hasPendingChanges,
    isAutoSaving,
    pendingProjectsCount: pendingChanges.size,
    pendingProjects: Array.from(pendingChanges.keys())
  };
}
