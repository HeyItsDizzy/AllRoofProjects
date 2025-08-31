// src/appjobboard/hooks/useMonthGrouping.js

import { useMemo } from 'react';
import { parseISO, format, isValid } from 'date-fns';

/**
 * Enhanced Monthly Hook for Job Filtering
 * KISS & DRY implementation for month-based job organization
 * 
 * Returns:
 * - allMonths: Complete list of months with job data
 * - recentMonths: Last 3 months (for default tabs)
 * - olderMonths: All months before the recent 3 (for dropdown)
 * - getMonthById: Helper to get specific month data
 */
export function useMonthGrouping(jobs = []) {
  return useMemo(() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Helper function to format month tab ID in "25-08 Aug" format
    const formatMonthId = (year, month) => {
      const date = new Date(year, month);
      const shortYear = String(date.getFullYear()).slice(-2);
      const monthNum = String(date.getMonth() + 1).padStart(2, '0');
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      return `${shortYear}-${monthNum} ${monthName}`;
    };

    // Helper function to get projects for a specific month
    const getProjectsForMonth = (year, month) => {
      return jobs.filter(job => {
        // Try different date fields in order of preference for projects
        const dateFields = ['posting_date', 'dateReceived', 'estimateDate', 'created_at', 'createdAt'];
        
        for (const field of dateFields) {
          const dateValue = job[field];
          if (!dateValue) continue;
          
          let postingDate;
          if (typeof dateValue === 'string') {
            postingDate = parseISO(dateValue);
          } else if (dateValue instanceof Date) {
            postingDate = dateValue;
          } else {
            continue;
          }
          
          if (isValid(postingDate)) {
            return postingDate.getFullYear() === year && postingDate.getMonth() === month;
          }
        }
        return false;
      });
    };

    // Sort projects by project number (newest first)
    const sortJobsByProjectNumber = (jobs) => {
      return [...jobs].sort((a, b) => {
        const [yearA, restA] = (a.projectNumber || "0-00000").split("-");
        const [yearB, restB] = (b.projectNumber || "0-00000").split("-");
        
        const yearNumA = parseInt(yearA);
        const yearNumB = parseInt(yearB);
        
        if (yearNumA !== yearNumB) return yearNumB - yearNumA;
        
        const monthA = parseInt(restA.slice(0, 2));
        const monthB = parseInt(restB.slice(0, 2));
        
        if (monthA !== monthB) return monthB - monthA;
        
        const sequenceA = parseInt(restA.slice(2));
        const sequenceB = parseInt(restB.slice(2));
        
        return sequenceB - sequenceA;
      });
    };

    // Find earliest month with records
    let earliestDate = null;
    jobs.forEach(job => {
      const dateFields = ['posting_date', 'dateReceived', 'estimateDate', 'created_at'];
      
      for (const field of dateFields) {
        const dateValue = job[field];
        if (!dateValue) continue;
        
        let postingDate;
        if (typeof dateValue === 'string') {
          postingDate = parseISO(dateValue);
        } else if (dateValue instanceof Date) {
          postingDate = dateValue;
        } else {
          continue;
        }
        
        if (isValid(postingDate)) {
          if (!earliestDate || postingDate < earliestDate) {
            earliestDate = postingDate;
          }
          break;
        }
      }
    });

    // Generate all months from earliest to current
    const allMonths = [];
    
    if (earliestDate) {
      let iterDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0); // End of current month
      
      while (iterDate <= endDate) {
        const monthJobs = getProjectsForMonth(iterDate.getFullYear(), iterDate.getMonth());
        const monthId = formatMonthId(iterDate.getFullYear(), iterDate.getMonth());
        
        allMonths.push({
          id: monthId,
          label: monthId,
          year: iterDate.getFullYear(),
          month: iterDate.getMonth(),
          count: monthJobs.length,
          jobs: sortJobsByProjectNumber(monthJobs)
        });
        
        // Move to next month
        iterDate.setMonth(iterDate.getMonth() + 1);
      }
    }

    // Reverse to get newest first
    allMonths.reverse();

    // Split into recent (last 3 months) and older months
    const recentMonths = [];
    const olderMonths = [];

    allMonths.forEach(monthData => {
      const isRecent = (
        (monthData.year === currentYear && monthData.month >= currentMonth - 2) ||
        (monthData.year === currentYear - 1 && currentMonth < 2 && monthData.month >= 12 - (2 - currentMonth))
      );

      if (isRecent) {
        recentMonths.push(monthData);
      } else {
        olderMonths.push(monthData);
      }
    });

    // Helper function to get month data by ID
    const getMonthById = (monthId) => {
      return allMonths.find(month => month.id === monthId);
    };

    return {
      allMonths,
      recentMonths: recentMonths.slice(0, 3), // Ensure max 3
      olderMonths,
      getMonthById,
      totalJobCount: jobs.length
    };
  }, [jobs]);
}
