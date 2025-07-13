// useColumnSizing.js
import { useEffect, useState, useContext } from 'react';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';
import { AuthContext } from '@/auth/AuthProvider';

export function useColumnSizing(tableKey) {
  const { user } = useContext(AuthContext);
  const [columnSizing, setColumnSizing] = useState({});
  const axiosSecure = useAxiosSecure();

  // Load saved layout on mount
  useEffect(() => {
    if (user?.id) {
      axiosSecure
        .get(`/api/user/column-sizing?tableKey=${tableKey}`)
        .then((res) => {
          if (res.data?.success) {
            setColumnSizing(res.data.columnSizing || {});
            localStorage.setItem(
              `columnSizing_${tableKey}`,
              JSON.stringify(res.data.columnSizing || {})
            );
          }
        })
        .catch(() => {
          // fallback to cached version
          const cached = localStorage.getItem(`columnSizing_${tableKey}`);
          if (cached) setColumnSizing(JSON.parse(cached));
        });
    }
  }, [user, tableKey]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (user?.id && Object.keys(columnSizing).length > 0) {
        localStorage.setItem(`columnSizing_${tableKey}`, JSON.stringify(columnSizing));
        axiosSecure.post(`/api/user/column-sizing`, {
          userId: user.id,
          tableKey,
          columnSizing,
        });
      }
    };
  }, [columnSizing, tableKey, user]);

  return [columnSizing, setColumnSizing];
}
