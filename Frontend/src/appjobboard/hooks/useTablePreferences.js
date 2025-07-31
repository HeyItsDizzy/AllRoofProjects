// useTablePreferences.js
import { useState, useEffect, useContext, useCallback } from 'react';
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
    };
  });

  const [loaded, setLoaded] = useState(false);

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
  const setColumnSizing    = useCallback(u => setPrefs(p => ({ ...p, columnSizing: typeof u==='function' ? u(p.columnSizing) : u })), [setPrefs]);
  const setSorting         = useCallback(u => setPrefs(p => ({ ...p, sorting:      typeof u==='function' ? u(p.sorting)      : u })), [setPrefs]);
  const setColumnFilters   = useCallback(u => setPrefs(p => ({ ...p, columnFilters:typeof u==='function' ? u(p.columnFilters): u })), [setPrefs]);

  // ── 1) Load from server (overwrite cache) ────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      if (user?.id) {
        try {
          const { data } = await axiosSecure.get(
            '/api/user/table-preferences',
            { params: { tableKey } }
          );
          if (active && data?.preferences) {
            localStorage.setItem(storageKey, JSON.stringify(data.preferences));
            _setPrefs(data.preferences);
          }
        } catch (err) {
          console.warn('useTablePreferences: load failed', err);
        }
      }
      if (active) setLoaded(true);
    })();
    return () => { active = false; };
  }, [user, axiosSecure, storageKey, tableKey]);

  // ── 2) Persist to server once on unload ──────────────────────────────────
  useEffect(() => {
    const persist = () => {
      if (user?.id) {
        axiosSecure.post(
          '/api/user/table-preferences',
          { tableKey, preferences: prefs }
        ).catch(err =>
          console.warn('useTablePreferences: save failed', err)
        );
      }
    };
    window.addEventListener('beforeunload', persist);
    return () => {
      persist();
      window.removeEventListener('beforeunload', persist);
    };
  }, [user, axiosSecure, tableKey, prefs]);

  return [
    prefs,
    { setColumnSizing, setSorting, setColumnFilters },
    loaded,
  ];
}
