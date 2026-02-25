// useTablePreferences.js
import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';
import { AuthContext } from '@/auth/AuthProvider';

/**
 * Manages load/save of table prefs: columnSizing, sorting, columnFilters.
 * @param {string} tableKey Unique key for this table's prefs.
 * @returns [
 *   prefs: { columnSizing, sorting, columnFilters },
 *   setters: { setColumnSizing, setSorting, setColumnFilters },
 *   loaded: boolean
 * ]
 */
export function useTablePreferences(tableKey) {
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const storageKey = `${tableKey}Preferences`;

  // Initialize from localStorage (or defaults)
  const [prefs, _setPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      columnSizing: {},
      sorting: [],
      columnFilters: [],
      zoomLevel: 100,
    };
  });

  const [loaded, setLoaded] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeTimeoutRef = useRef(null);

  // Helper to update prefs + cache
  const setPrefs = useCallback((updater) => {
    _setPrefs(old => {
      const next = typeof updater === 'function' ? updater(old) : updater;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [storageKey]);

  // Individual setters
  const setColumnSizing = useCallback(u => {
    // Detect start of resize operation
    if (!isResizing) {
      setIsResizing(true);
      console.log(`🎯 Column resize started for ${tableKey}`);
    }
    
    // Clear existing resize timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    // Update preferences immediately for UI responsiveness
    setPrefs(p => ({ ...p, columnSizing: typeof u==='function' ? u(p.columnSizing) : u }));
    
    // Set timeout to mark resize as complete (1 second after last change)
    resizeTimeoutRef.current = setTimeout(() => {
      setIsResizing(false);
      console.log(`🏁 Column resize completed for ${tableKey}`);
    }, 1000);
  }, [setPrefs, tableKey, isResizing]);
  
  const setSorting         = useCallback(u => setPrefs(p => ({ ...p, sorting:      typeof u==='function' ? u(p.sorting)      : u })), [setPrefs]);
  const setColumnFilters   = useCallback(u => setPrefs(p => ({ ...p, columnFilters:typeof u==='function' ? u(p.columnFilters): u })), [setPrefs]);
  const setZoomLevel       = useCallback(u => setPrefs(p => ({ ...p, zoomLevel:    typeof u==='function' ? u(p.zoomLevel)    : u })), [setPrefs]);

  // ── 1) Load from server (overwrite cache) ────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      const userId = user?._id || user?.userId || user?.id;
      if (userId) {
        try {
          console.log(`🔄 Loading table preferences for ${tableKey}...`);
          const { data } = await axiosSecure.get(
            '/users/table-preferences',
            { params: { tableKey } }
          );
          if (active && data?.preferences) {
            console.log(`✅ Loaded table preferences for ${tableKey}:`, data.preferences);
            localStorage.setItem(storageKey, JSON.stringify(data.preferences));
            _setPrefs(data.preferences);
          } else {
            console.log(`📝 No stored preferences found for ${tableKey}, using defaults`);
          }
        } catch (err) {
          console.warn(`❌ useTablePreferences: load failed for ${tableKey}:`, err);
        }
      } else {
        console.log('⏳ No user ID available yet, skipping preferences load');
      }
      if (active) setLoaded(true);
    })();
    return () => { active = false; };
  }, [user, axiosSecure, storageKey, tableKey]);

  // ── 2) Auto-save to server (debounced) + persist on unload ───────────────
  useEffect(() => {
    const userId = user?._id || user?.userId || user?.id;
    if (!userId || !loaded) return;

    // Skip auto-save during active resize operations
    if (isResizing) {
      console.log(`⏸️ Skipping auto-save during resize operation for ${tableKey}`);
      return;
    }

    // Debounced auto-save (2 seconds after changes when not resizing)
    const timeoutId = setTimeout(() => {
      console.log(`💾 Auto-saving table preferences for ${tableKey}...`, prefs);
      axiosSecure.post(
        '/users/table-preferences',
        { tableKey, preferences: prefs }
      ).then(() => {
        console.log(`✅ Successfully saved table preferences for ${tableKey}`);
      }).catch(err => {
        console.error(`❌ useTablePreferences: auto-save failed for ${tableKey}:`, err);
      });
    }, 2000); // Back to 2 seconds since we now properly handle resize timing

    // Also persist on window unload
    const persist = () => {
      if (userId) {
        console.log(`🚀 Persisting table preferences on unload for ${tableKey}`);
        // Use sendBeacon for reliability during page unload
        const blob = new Blob(
          [JSON.stringify({ tableKey, preferences: prefs })],
          { type: 'application/json' }
        );
        navigator.sendBeacon('/api/users/table-preferences', blob);
      }
    };
    
    window.addEventListener('beforeunload', persist);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('beforeunload', persist);
    };
  }, [user, axiosSecure, tableKey, prefs, loaded, isResizing]);

  // Cleanup resize timeout on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  return [
    prefs,
    { setColumnSizing, setSorting, setColumnFilters, setZoomLevel },
    loaded,
  ];
}
