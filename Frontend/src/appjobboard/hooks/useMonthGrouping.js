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
        // PRIMARY METHOD: Parse project number (format: YY-MMSSS)
        // This is the most reliable way to determine project month
        if (job.projectNumber) {
          const parts = job.projectNumber.split('-');
          if (parts.length >= 2) {
            const yearPart = parts[0];
            const monthAndSeq = parts[1];
            
            // Extract year from project number (e.g., "25" -> 2025)
            const projectYear = 2000 + parseInt(yearPart);
            // Extract month from project number (e.g., "10" -> October = month 9)
            const projectMonth = parseInt(monthAndSeq.slice(0, 2)) - 1; // Convert to 0-indexed
            
            if (!isNaN(projectYear) && !isNaN(projectMonth)) {
              return projectYear === year && projectMonth === month;
            }
          }
        }
        
        // FALLBACK METHOD: Try date fields if project number parsing fails
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

    // Find earliest month with records (using project number first, then date fields)
    let earliestDate = null;
    jobs.forEach(job => {
      // PRIMARY: Extract date from project number
      if (job.projectNumber) {
        const parts = job.projectNumber.split('-');
        if (parts.length >= 2) {
          const yearPart = parts[0];
          const monthAndSeq = parts[1];
          const projectYear = 2000 + parseInt(yearPart);
          const projectMonth = parseInt(monthAndSeq.slice(0, 2)) - 1;
          
          if (!isNaN(projectYear) && !isNaN(projectMonth)) {
            const projectDate = new Date(projectYear, projectMonth, 1);
            if (!earliestDate || projectDate < earliestDate) {
              earliestDate = projectDate;
            }
            return; // Skip date field checking if project number worked
          }
        }
      }
      
      // FALLBACK: Check date fields
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
    
    // Determine start date: either earliest job date or 3 months ago (whichever is earlier)
    const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1);
    let startDate = earliestDate 
      ? new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1)
      : threeMonthsAgo;
    
    // Ensure we always include the last 3 months even if there's no data
    if (startDate > threeMonthsAgo) {
      startDate = threeMonthsAgo;
    }
    
    const endDate = new Date(currentYear, currentMonth + 1, 0); // End of current month
    let iterDate = new Date(startDate);
    
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

    // Reverse to get newest first
    allMonths.reverse();

    // Split into recent (last 3 months) and older months
    const recentMonths = [];
    const olderMonths = [];

    allMonths.forEach(monthData => {
      // Check if month is within the last 3 months (current month and 2 months before)
      const monthDiff = (currentYear - monthData.year) * 12 + (currentMonth - monthData.month);
      const isRecent = monthDiff >= 0 && monthDiff <= 2;

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
