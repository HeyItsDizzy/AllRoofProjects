// src/appjobboard/hooks/useMonthGrouping.js

import { useMemo } from 'react';
import { parseISO, format } from 'date-fns';

/**
 * Groups job entries by month using posting_date
 * Returns: [{ month: 'July 2025', jobs: [...] }, ...]
 */
export function useMonthGrouping(jobs = []) {
  return useMemo(() => {
    const grouped = {};

    jobs.forEach(job => {
      const date = job.posting_date;
      if (!date) return;

      const month = format(parseISO(date), 'MMMM yyyy');
      if (!grouped[month]) grouped[month] = [];

      grouped[month].push(job);
    });

    return Object.entries(grouped).map(([month, jobs]) => ({ month, jobs }));
  }, [jobs]);
}
