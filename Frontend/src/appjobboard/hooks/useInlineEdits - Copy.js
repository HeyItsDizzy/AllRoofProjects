import { useState, useCallback, useRef } from 'react';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';

export function useInlineEdits(setData, onFlushCallback = null) {
  const [pending, setPending] = useState({});
  const axiosSecure = useAxiosSecure();
  const timers = useRef({}); // rowId: timeout ID

  const updateLocal = useCallback((rowId, key, value) => {
    setData(old =>
      old.map(r => (r._id === rowId ? { ...r, [key]: value } : r))
    );
    setPending(prev => ({
      ...prev,
      [rowId]: { ...prev[rowId], [key]: value }
    }));
  }, [setData]);

  const flush = useCallback(async (rowId) => {
    const edits = pending[rowId];
    if (!edits) return;

    try {
      if (onFlushCallback) {
        await onFlushCallback(rowId, edits); // Custom JobBoard logic
      } else {
        await axiosSecure.patch(`/projects/${rowId}`, edits);
      }

      // Remove this row from pending edits
      setPending(prev => {
        const { [rowId]: _, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      console.error("Flush failed:", err);
    }
  }, [pending, onFlushCallback, axiosSecure]);

  // 🔁 Debounced version of flush using setTimeout
  const debouncedFlush = useCallback((rowId) => {
    if (timers.current[rowId]) clearTimeout(timers.current[rowId]);

    timers.current[rowId] = setTimeout(() => {
      flush(rowId);
    }, 500); // ← debounce delay
  }, [flush]);

  return { pendingEdits: pending, updateLocal, flushEdits: debouncedFlush };
}
