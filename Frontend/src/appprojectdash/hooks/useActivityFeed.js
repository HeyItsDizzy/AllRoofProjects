/**
 * ACTIVITY FEED HOOK
 * Manages real-time activity updates
 */
import { useState, useEffect, useCallback } from 'react';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';

const USE_MOCK_DATA = false; // Set to true for development
const POLL_INTERVAL = 30000; // Poll for new activities every 30 seconds

export const useActivityFeed = (projectId) => {
  const [activities, setActivities] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const axiosSecure = useAxiosSecure();

  // Fetch activities from API
  const fetchActivities = useCallback(async () => {
    if (!projectId) return;

    try {
      if (USE_MOCK_DATA) {
        setActivities(getMockActivities());
        setLoading(false);
        return;
      }

      const response = await axiosSecure.get(`/projects/${projectId}/activity`, {
        params: { limit: 20, offset: 0 }
      });

      if (response.data.success) {
        const formattedActivities = response.data.data.map(activity => ({
          id: activity._id,
          type: activity.actionType,
          user: activity.actorName,
          action: activity.action,
          target: activity.entityName || activity.description,
          timestamp: activity.timestamp,
          description: activity.description,
          important: activity.important || false,
          icon: getActivityIcon(activity.actionType, activity.entityType),
          read: false, // Could be tracked in user preferences
        }));

        setActivities(formattedActivities);
        setUnreadCount(formattedActivities.filter(a => !a.read).length);
        setError(null);
      }
    } catch (err) {
      console.error('❌ Error fetching activity feed:', err);
      setError(err.message);
      
      // Fallback to mock data on error during development
      if (process.env.VITE_NODE_ENV === 'development') {
        console.warn('⚠️ Using mock activity data as fallback');
        setActivities(getMockActivities());
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, axiosSecure]);

  // Initial fetch and polling
  useEffect(() => {
    fetchActivities();

    // Set up polling for new activities
    const pollInterval = setInterval(() => {
      fetchActivities();
    }, POLL_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [fetchActivities]);

  const markAsRead = useCallback((activityId) => {
    setActivities((prev) =>
      prev.map((activity) =>
        activity.id === activityId ? { ...activity, read: true } : activity
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setActivities((prev) =>
      prev.map((activity) => ({ ...activity, read: true }))
    );
    setUnreadCount(0);
  }, []);

  const addActivity = useCallback((activity) => {
    const newActivity = {
      ...activity,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    setActivities((prev) => [newActivity, ...prev]);
    setUnreadCount((prev) => prev + 1);
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    addActivity,
    refresh,
  };
};

// Helper function to get icon based on activity type
function getActivityIcon(actionType, entityType) {
  const iconMap = {
    'create': {
      'file': '📄',
      'task': '✓',
      'quote': '💰',
      'order': '📦',
      'note': '📝',
      'default': '➕',
    },
    'update': {
      'file': '📝',
      'task': '🔄',
      'quote': '💱',
      'order': '🔄',
      'project': '🔄',
      'default': '✏️',
    },
    'delete': {
      'default': '🗑️',
    },
    'status_change': {
      'default': '🔄',
    },
    'upload': '⬆️',
    'download': '⬇️',
    'comment': '💬',
    'default': '📌',
  };

  const typeMap = iconMap[actionType] || iconMap.default;
  
  if (typeof typeMap === 'string') {
    return typeMap;
  }
  
  return typeMap[entityType] || typeMap.default;
}

// Mock activities for development
function getMockActivities() {
  return [
    {
      id: 1,
      type: 'create',
      user: 'John Smith',
      action: 'file_uploaded',
      target: 'roof_plan_v2.pdf',
      description: 'uploaded roof_plan_v2.pdf',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      icon: '📄',
      read: false,
      important: false,
    },
    {
      id: 2,
      type: 'create',
      user: 'Sarah Johnson',
      action: 'quote_created',
      target: 'Q-2024-001',
      description: 'created quote Q-2024-001',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      icon: '💰',
      read: false,
      important: true,
    },
    {
      id: 3,
      type: 'update',
      user: 'Rusty AI',
      action: 'rusty_insight',
      target: 'Missing wind zone',
      description: 'detected missing wind zone specification',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      icon: '🤖',
      read: true,
      important: true,
    },
  ];
}
