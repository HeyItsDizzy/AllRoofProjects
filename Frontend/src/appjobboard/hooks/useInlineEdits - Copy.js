// src/appjobboard/hooks/useInlineEdits.js
import { useState, useCallback } from 'react';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';

export function useInlineEdits(setData) {
  const [pending, setPending] = useState({});
  const axiosSecure = useAxiosSecure();

  const updateLocal = useCallback((rowId, key, value) => {
    console.log("queue edit", {rowId, key, value});
    setData(old =>
      old.map(r => r._id === rowId ? {...r, [key]: value} : r)
    );
    setPending(prev => ({ ...prev, [rowId]: {...prev[rowId], [key]:value} }));
  }, [setData]);

  const flush = useCallback(async (rowId) => {
    const edits = pending[rowId];
    console.log(`[useInlineEdits] flush`, { rowId, edits });
    if (!edits) return;
    try {
      await axiosSecure.patch(`/projects/${rowId}`, edits);
      console.log(`[useInlineEdits] flush success`, rowId);
      setPending(prev => {
        const { [rowId]:_, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      console.error(`[useInlineEdits] flush FAILED`, rowId, err);
    }
  }, [pending, axiosSecure]);

  return { pendingEdits: pending, updateLocal, flushEdits: flush };
}
