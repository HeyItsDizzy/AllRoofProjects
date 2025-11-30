/**
 * TABLE SKELETON LOADER - CLS Prevention ✅
 * 
 * PURPOSE: 
 * ✅ Prevent Cumulative Layout Shift (CLS) during data loading
 * ✅ Maintain stable table structure while projects load
 * ✅ Provide smooth loading experience
 * ✅ Match exact dimensions of actual table rows
 * 
 * PERFORMANCE BENEFITS:
 * ✅ Zero layout shift (CLS = 0)
 * ✅ Instant visual feedback
 * ✅ Consistent spacing and structure
 * ✅ Professional loading experience
 */

import React from 'react';
import { Box, Skeleton, Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';

const TableSkeleton = ({ 
  rows = 10, 
  columns = 8, 
  showHeader = true,
  height = '400px',
  className = ''
}) => {
  return (
    <Paper 
      elevation={1} 
      className={`table-skeleton ${className}`}
      sx={{ 
        height: height,
        overflow: 'hidden',
        borderRadius: 2,
        '& .MuiSkeleton-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          '&::after': {
            background: 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.02), transparent)',
          }
        }
      }}
    >
      <Table stickyHeader>
        {/* HEADER SKELETON */}
        {showHeader && (
          <TableHead>
            <TableRow>
              {Array.from({ length: columns }).map((_, index) => (
                <TableCell key={`header-${index}`} sx={{ padding: '12px' }}>
                  <Skeleton 
                    variant="text" 
                    width={index === 0 ? '60%' : index === 1 ? '80%' : '70%'}
                    height={24}
                    sx={{ borderRadius: 1 }}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}
        
        {/* BODY SKELETON */}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow 
              key={`row-${rowIndex}`}
              sx={{ 
                height: '73px', // Match actual table row height
                '&:nth-of-type(odd)': {
                  backgroundColor: 'rgba(0, 0, 0, 0.01)',
                }
              }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={`cell-${rowIndex}-${colIndex}`} sx={{ padding: '12px' }}>
                  {colIndex === 0 ? (
                    // Project Number/ID - Shorter width
                    <Skeleton 
                      variant="text" 
                      width="80px" 
                      height={20}
                      sx={{ borderRadius: 1 }}
                    />
                  ) : colIndex === 1 ? (
                    // Project Title/Name - Longer width
                    <Skeleton 
                      variant="text" 
                      width="180px" 
                      height={20}
                      sx={{ borderRadius: 1 }}
                    />
                  ) : colIndex === 2 ? (
                    // Status Badge - Rounded rectangle
                    <Skeleton 
                      variant="rounded" 
                      width="90px" 
                      height={28}
                      sx={{ borderRadius: 4 }}
                    />
                  ) : colIndex === 3 ? (
                    // Date - Medium width
                    <Skeleton 
                      variant="text" 
                      width="100px" 
                      height={20}
                      sx={{ borderRadius: 1 }}
                    />
                  ) : colIndex === columns - 1 ? (
                    // Actions - Circular buttons
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Skeleton variant="circular" width={32} height={32} />
                      <Skeleton variant="circular" width={32} height={32} />
                      <Skeleton variant="circular" width={32} height={32} />
                    </Box>
                  ) : (
                    // Regular text cells
                    <Skeleton 
                      variant="text" 
                      width={`${60 + Math.random() * 40}%`} 
                      height={20}
                      sx={{ borderRadius: 1 }}
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

// ══════════════════════════════════════════════════════════════════
// 📊 PROJECT TABLE SPECIFIC SKELETON
// ══════════════════════════════════════════════════════════════════
export const ProjectTableSkeleton = ({ rows = 10, className = '' }) => {
  return (
    <TableSkeleton
      rows={rows}
      columns={8} // Project Number, Title, Status, Date Created, Client, Estimator, Stage, Actions
      showHeader={true}
      height="500px"
      className={`project-table-skeleton ${className}`}
    />
  );
};

// ══════════════════════════════════════════════════════════════════
// 📋 JOB TABLE SPECIFIC SKELETON  
// ══════════════════════════════════════════════════════════════════
export const JobTableSkeleton = ({ rows = 10, className = '' }) => {
  return (
    <TableSkeleton
      rows={rows}
      columns={9} // Job Number, Description, Type, Status, Priority, Assigned, Due Date, Progress, Actions
      showHeader={true}
      height="500px"
      className={`job-table-skeleton ${className}`}
    />
  );
};

// ══════════════════════════════════════════════════════════════════
// 🎯 PAGINATION SKELETON
// ══════════════════════════════════════════════════════════════════
export const PaginationSkeleton = ({ className = '' }) => {
  return (
    <Box 
      className={`pagination-skeleton ${className}`}
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '16px 0',
        minHeight: '64px'
      }}
    >
      {/* Results count */}
      <Skeleton 
        variant="text" 
        width="200px" 
        height={24}
        sx={{ borderRadius: 1 }}
      />
      
      {/* Pagination controls */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1 }} />
        <Skeleton variant="text" width={20} height={24} sx={{ mx: 1 }} />
        <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1 }} />
      </Box>
    </Box>
  );
};

// ══════════════════════════════════════════════════════════════════
// 📱 FILTER BAR SKELETON
// ══════════════════════════════════════════════════════════════════
export const FilterBarSkeleton = ({ className = '' }) => {
  return (
    <Box 
      className={`filter-bar-skeleton ${className}`}
      sx={{ 
        display: 'flex', 
        gap: 2, 
        alignItems: 'center',
        padding: '16px 0',
        minHeight: '72px',
        flexWrap: 'wrap'
      }}
    >
      {/* Search box */}
      <Skeleton 
        variant="rectangular" 
        width="300px" 
        height={48}
        sx={{ borderRadius: 2 }}
      />
      
      {/* Filter dropdowns */}
      <Skeleton 
        variant="rectangular" 
        width="140px" 
        height={48}
        sx={{ borderRadius: 2 }}
      />
      <Skeleton 
        variant="rectangular" 
        width="140px" 
        height={48}
        sx={{ borderRadius: 2 }}
      />
      <Skeleton 
        variant="rectangular" 
        width="140px" 
        height={48}
        sx={{ borderRadius: 2 }}
      />
      
      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
        <Skeleton 
          variant="rectangular" 
          width="100px" 
          height={40}
          sx={{ borderRadius: 2 }}
        />
        <Skeleton 
          variant="rectangular" 
          width="120px" 
          height={40}
          sx={{ borderRadius: 2 }}
        />
      </Box>
    </Box>
  );
};

// ══════════════════════════════════════════════════════════════════
// 🎯 COMPLETE PAGE SKELETON (Table + Filters + Pagination)
// ══════════════════════════════════════════════════════════════════
export const ProjectPageSkeleton = () => {
  return (
    <Box sx={{ width: '100%', padding: 2 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Skeleton 
          variant="text" 
          width="300px" 
          height={40}
          sx={{ mb: 1, borderRadius: 1 }}
        />
        <Skeleton 
          variant="text" 
          width="500px" 
          height={24}
          sx={{ borderRadius: 1 }}
        />
      </Box>
      
      {/* Filter Bar */}
      <FilterBarSkeleton />
      
      {/* Main Table */}
      <ProjectTableSkeleton rows={15} />
      
      {/* Pagination */}
      <PaginationSkeleton />
    </Box>
  );
};

export default TableSkeleton;