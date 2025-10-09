// ProjectDataSync.js - Cross-component project data synchronization
// This module provides a way for components to notify each other about project data changes

import { useEffect, useRef } from 'react';

const PROJECT_DATA_SYNC_KEY = 'project-data-updated';
const PROJECT_UPDATE_EVENT = 'project-data-update';

/**
 * Notify all listening components that project data has been updated
 * @param {string} projectId - ID of the updated project
 * @param {object} changes - Changes that were made
 * @param {string} source - Source component that made the change
 */
export function notifyProjectDataUpdate(projectId, changes = {}, source = 'unknown') {
  const updateEvent = {
    projectId,
    changes,
    source,
    timestamp: Date.now()
  };
  
  // 1. Use custom event for same-tab/window communication
  const customEvent = new CustomEvent(PROJECT_UPDATE_EVENT, {
    detail: updateEvent
  });
  window.dispatchEvent(customEvent);
  
  // 2. Use localStorage for cross-tab communication
  localStorage.setItem(PROJECT_DATA_SYNC_KEY, JSON.stringify(updateEvent));
  
  // Remove the item immediately so subsequent updates still trigger events
  setTimeout(() => {
    localStorage.removeItem(PROJECT_DATA_SYNC_KEY);
  }, 100);
  
  console.log(`🔄 Project data sync notification sent:`, updateEvent);
}
 * @param {object} changes - Changes that were made
 * @param {string} source - Source component that made the change
 */
export function notifyProjectDataUpdate(projectId, changes = {}, source = 'unknown') {
  const updateEvent = {
    projectId,
    changes,
    source,
    timestamp: Date.now()
  };
  
  // Use localStorage to trigger storage events across components
  localStorage.setItem(PROJECT_DATA_SYNC_KEY, JSON.stringify(updateEvent));
  
  // Remove the item immediately so subsequent updates still trigger events
  setTimeout(() => {
    localStorage.removeItem(PROJECT_DATA_SYNC_KEY);
  }, 100);
  
  console.log(`🔄 Project data sync notification sent:`, updateEvent);
}

// ProjectDataSync.js - Cross-component project data synchronization
// This module provides a way for components to notify each other about project data changes

import { useEffect, useRef } from 'react';

const PROJECT_DATA_SYNC_KEY = 'project-data-updated';
const PROJECT_UPDATE_EVENT = 'project-data-update';

/**
 * Notify all listening components that project data has been updated
 * @param {string} projectId - ID of the updated project
 * @param {object} changes - Changes that were made
 * @param {string} source - Source component that made the change
 */
export function notifyProjectDataUpdate(projectId, changes = {}, source = 'unknown') {
  const updateEvent = {
    projectId,
    changes,
    source,
    timestamp: Date.now()
  };
  
  // 1. Use custom event for same-tab/window communication
  const customEvent = new CustomEvent(PROJECT_UPDATE_EVENT, {
    detail: updateEvent
  });
  window.dispatchEvent(customEvent);
  
  // 2. Use localStorage for cross-tab communication
  localStorage.setItem(PROJECT_DATA_SYNC_KEY, JSON.stringify(updateEvent));
  
  // Remove the item immediately so subsequent updates still trigger events
  setTimeout(() => {
    localStorage.removeItem(PROJECT_DATA_SYNC_KEY);
  }, 100);
  
  console.log(`🔄 Project data sync notification sent:`, updateEvent);
}

/**
 * Listen for project data updates from other components
 * @param {function} callback - Function to call when data updates occur
 * @returns {function} - Cleanup function to remove the listener
 */
export function subscribeToProjectDataUpdates(callback) {
  // Handle custom events (same tab/window)
  const handleCustomEvent = (event) => {
    const updateEvent = event.detail;
    console.log(`📨 Project data sync notification received (custom event):`, updateEvent);
    callback(updateEvent);
  };

  // Handle storage events (cross-tab)
  const handleStorageChange = (event) => {
    if (event.key === PROJECT_DATA_SYNC_KEY && event.newValue) {
      try {
        const updateEvent = JSON.parse(event.newValue);
        console.log(`📨 Project data sync notification received (storage event):`, updateEvent);
        callback(updateEvent);
      } catch (error) {
        console.error('Failed to parse project data sync event:', error);
      }
    }
  };
  
  // Listen for both types of events
  window.addEventListener(PROJECT_UPDATE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageChange);
  
  // Return cleanup function
  return () => {
    window.removeEventListener(PROJECT_UPDATE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageChange);
  };
}

/**
 * Custom hook for project data synchronization
 */
export function useProjectDataSync(onUpdate) {
  const subscribeRef = useRef(null);
  
  useEffect(() => {
    if (onUpdate) {
      subscribeRef.current = subscribeToProjectDataUpdates(onUpdate);
    }
    
    return () => {
      if (subscribeRef.current) {
        subscribeRef.current();
      }
    };
  }, [onUpdate]);
  
  return { notifyUpdate: notifyProjectDataUpdate };
}