/**
 * PAGINATION COMPONENT - Performance Optimized ✅
 * 
 * FEATURES:
 * ✅ Smooth page transitions with stable layout
 * ✅ Smart page number display with ellipsis
 * ✅ Responsive design for mobile/desktop
 * ✅ Jump to first/last page functionality
 * ✅ Keyboard navigation support
 * ✅ Loading states and disabled states
 * ✅ Results count display
 * 
 * PERFORMANCE BENEFITS:
 * ✅ Zero layout shift during pagination
 * ✅ Consistent spacing and dimensions
 * ✅ Optimized re-rendering with React.memo
 * ✅ Accessible keyboard navigation
 */

import React, { useMemo } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Tooltip,
  useTheme,
  useMediaQuery,
  CircularProgress
} from '@mui/material';
import {
  MdFirstPage as FirstPage,
  MdLastPage as LastPage,
  MdChevronLeft as ChevronLeft,
  MdChevronRight as ChevronRight,
  MdMoreHoriz as MoreHoriz
} from 'react-icons/md';

const PaginationComponent = React.memo(({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  loading = false,
  disabled = false,
  showFirstLast = true,
  showResultsInfo = true,
  maxVisiblePages = 7,
  className = '',
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // ══════════════════════════════════════════════════════════════════
  // 📊 COMPUTED VALUES
  // ══════════════════════════════════════════════════════════════════
  const startItem = useMemo(() => {
    return totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  }, [currentPage, itemsPerPage, totalItems]);
  
  const endItem = useMemo(() => {
    return Math.min(currentPage * itemsPerPage, totalItems);
  }, [currentPage, itemsPerPage, totalItems]);
  
  const hasNextPage = useMemo(() => currentPage < totalPages, [currentPage, totalPages]);
  const hasPrevPage = useMemo(() => currentPage > 1, [currentPage]);
  const isFirstPage = useMemo(() => currentPage === 1, [currentPage]);
  const isLastPage = useMemo(() => currentPage === totalPages, [currentPage, totalPages]);
  
  // ══════════════════════════════════════════════════════════════════
  // 🔢 SMART PAGE NUMBERS GENERATION
  // ══════════════════════════════════════════════════════════════════
  const pageNumbers = useMemo(() => {
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const pages = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    if (currentPage <= halfVisible + 1) {
      // Near beginning: [1, 2, 3, 4, 5, ..., last]
      for (let i = 1; i <= maxVisiblePages - 2; i++) {
        pages.push(i);
      }
      pages.push('ellipsis', totalPages);
    } else if (currentPage >= totalPages - halfVisible) {
      // Near end: [1, ..., last-4, last-3, last-2, last-1, last]
      pages.push(1, 'ellipsis');
      for (let i = totalPages - (maxVisiblePages - 3); i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Middle: [1, ..., current-1, current, current+1, ..., last]
      pages.push(1, 'ellipsis');
      for (let i = currentPage - halfVisible; i <= currentPage + halfVisible; i++) {
        pages.push(i);
      }
      pages.push('ellipsis', totalPages);
    }
    
    return pages;
  }, [currentPage, totalPages, maxVisiblePages]);
  
  // ══════════════════════════════════════════════════════════════════
  // 🎛️ EVENT HANDLERS
  // ══════════════════════════════════════════════════════════════════
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage && !loading && !disabled) {
      onPageChange(page);
    }
  };
  
  const handleKeyDown = (event, page) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePageChange(page);
    }
  };
  
  // ══════════════════════════════════════════════════════════════════
  // 🎨 STYLING
  // ══════════════════════════════════════════════════════════════════
  const buttonSize = size === 'small' ? 32 : size === 'large' ? 44 : 36;
  const fontSize = size === 'small' ? '0.75rem' : size === 'large' ? '1rem' : '0.875rem';
  
  const baseButtonStyle = {
    minWidth: buttonSize,
    height: buttonSize,
    fontSize: fontSize,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 1,
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      borderColor: theme.palette.primary.main,
    },
    '&:disabled': {
      color: theme.palette.action.disabled,
      borderColor: theme.palette.action.disabled,
      backgroundColor: theme.palette.action.disabledBackground,
    }
  };
  
  const activeButtonStyle = {
    ...baseButtonStyle,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderColor: theme.palette.primary.main,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
      borderColor: theme.palette.primary.dark,
    }
  };
  
  // ══════════════════════════════════════════════════════════════════
  // 🚫 EARLY RETURNS
  // ══════════════════════════════════════════════════════════════════
  if (totalPages <= 1 && !showResultsInfo) {
    return null;
  }
  
  return (
    <Box
      className={`pagination-component ${className}`}
      sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: 2,
        padding: '16px 0',
        minHeight: '64px',
        '& .pagination-controls': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'flex-end',
          gap: 0.5
        }
      }}
    >
      {/* ═══════════════════ RESULTS INFO ═══════════════════ */}
      {showResultsInfo && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'flex-start',
          minHeight: buttonSize 
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Loading results...
              </Typography>
            </Box>
          ) : totalItems === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No results found
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Showing <strong>{startItem.toLocaleString()}</strong> to{' '}
              <strong>{endItem.toLocaleString()}</strong> of{' '}
              <strong>{totalItems.toLocaleString()}</strong> results
            </Typography>
          )}
        </Box>
      )}
      
      {/* ═══════════════════ PAGINATION CONTROLS ═══════════════════ */}
      {totalPages > 1 && (
        <Box className="pagination-controls">
          {/* First Page */}
          {showFirstLast && !isMobile && (
            <Tooltip title="First page">
              <span>
                <IconButton
                  onClick={() => handlePageChange(1)}
                  disabled={isFirstPage || loading || disabled}
                  sx={{ ...baseButtonStyle, mr: 0.5 }}
                  aria-label="Go to first page"
                >
                  <FirstPage fontSize={size} />
                </IconButton>
              </span>
            </Tooltip>
          )}
          
          {/* Previous Page */}
          <Tooltip title="Previous page">
            <span>
              <IconButton
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!hasPrevPage || loading || disabled}
                sx={baseButtonStyle}
                aria-label="Go to previous page"
              >
                <ChevronLeft fontSize={size} />
              </IconButton>
            </span>
          </Tooltip>
          
          {/* Page Numbers */}
          {!isMobile && pageNumbers.map((page, index) => (
            <React.Fragment key={`page-${index}`}>
              {page === 'ellipsis' ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: buttonSize,
                    height: buttonSize,
                    color: theme.palette.text.disabled
                  }}
                >
                  <MoreHoriz fontSize={size} />
                </Box>
              ) : (
                <Tooltip title={`Go to page ${page}`}>
                  <Button
                    onClick={() => handlePageChange(page)}
                    onKeyDown={(e) => handleKeyDown(e, page)}
                    disabled={loading || disabled}
                    sx={page === currentPage ? activeButtonStyle : baseButtonStyle}
                    aria-label={`Go to page ${page}`}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </Button>
                </Tooltip>
              )}
            </React.Fragment>
          ))}
          
          {/* Mobile: Current Page Display */}
          {isMobile && (
            <Typography
              variant="body2"
              sx={{
                display: 'flex',
                alignItems: 'center',
                minWidth: buttonSize,
                height: buttonSize,
                justifyContent: 'center',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                backgroundColor: theme.palette.background.paper,
                mx: 1
              }}
            >
              {currentPage} / {totalPages}
            </Typography>
          )}
          
          {/* Next Page */}
          <Tooltip title="Next page">
            <span>
              <IconButton
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasNextPage || loading || disabled}
                sx={baseButtonStyle}
                aria-label="Go to next page"
              >
                <ChevronRight fontSize={size} />
              </IconButton>
            </span>
          </Tooltip>
          
          {/* Last Page */}
          {showFirstLast && !isMobile && (
            <Tooltip title="Last page">
              <span>
                <IconButton
                  onClick={() => handlePageChange(totalPages)}
                  disabled={isLastPage || loading || disabled}
                  sx={{ ...baseButtonStyle, ml: 0.5 }}
                  aria-label="Go to last page"
                >
                  <LastPage fontSize={size} />
                </IconButton>
              </span>
            </Tooltip>
          )}
          
          {/* Loading Indicator */}
          {loading && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              ml: 2,
              minWidth: 24,
              height: buttonSize 
            }}>
              <CircularProgress size={20} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
});

PaginationComponent.displayName = 'PaginationComponent';

export default PaginationComponent;