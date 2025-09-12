import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Swal from '@/shared/swalConfig';

/**
 * Beautiful Circular DatePicker Component
 * 
 * Features:
 * - Staged editing (only commits on blur/Enter, not on month navigation)
 * - Beautiful circular calendar with green primary colors
 * - Hover effects and animations
 * - Read-only mode support
 * - Today/Clear buttons
 * - Keyboard navigation support
 * - Click outside to close
 * - Customizable year range for different use cases
 * 
 * @param {string} value - The date value in ISO format (YYYY-MM-DD)
 * @param {function} onChange - Callback when date changes (value) => void
 * @param {boolean} readOnly - Whether the input is read-only
 * @param {string} className - Additional CSS classes
 * @param {number} yearRange - How many years before/after current year to show (default: 4)
 *                            Examples: 5 = ±5 years, 50 = ±50 years (good for birth dates)
 * @param {number} yearGridCols - Number of columns in year picker grid (default: 4)
 *                               Examples: 3 = 3-column grid, 4 = 4-column grid, 5 = 5-column grid
 */
export default function DatePicker({ 
  value, 
  onChange, 
  readOnly = false, 
  className = "",
  yearRange = 4,
  yearGridCols = 3
}) {
  const [tempDate, setTempDate] = useState(value ? new Date(value).toISOString().split('T')[0] : '');
  const [isDirty, setIsDirty] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('day'); // 'day', 'month', 'year'
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef(null);
  const calendarRef = useRef(null);
  
  // Reset temp date when value changes externally
  useEffect(() => {
    const newValue = value ? new Date(value).toISOString().split('T')[0] : '';
    if (!isDirty) {
      setTempDate(newValue);
    }
    if (value) {
      setCalendarDate(new Date(value));
    }
  }, [value, isDirty]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
        setCurrentView('day'); // Reset to day view when closing
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setTempDate(newDate);
    setIsDirty(true);
  };
  
  const handleBlur = () => {
    if (isDirty && !readOnly) {
      const originalValue = value ? new Date(value).toISOString().split('T')[0] : '';
      if (tempDate !== originalValue) {
        onChange(tempDate || null);
      }
      setIsDirty(false);
    }
  };
  
  const handleKeyDown = (e) => {
    if (readOnly) return;
    
    if (e.key === 'Enter') {
      if (isDirty) {
        const originalValue = value ? new Date(value).toISOString().split('T')[0] : '';
        if (tempDate !== originalValue) {
          onChange(tempDate || null);
        }
        setIsDirty(false);
      }
      e.target.blur();
      setShowCalendar(false);
      setCurrentView('day');
    } else if (e.key === 'Escape') {
      setTempDate(value ? new Date(value).toISOString().split('T')[0] : '');
      setIsDirty(false);
      e.target.blur();
      setShowCalendar(false);
      setCurrentView('day');
    }
  };

  const handleCalendarToggle = () => {
    if (!readOnly) {
      if (!showCalendar && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        const calendarHeight = 400; // Approximate calendar height
        const calendarWidth = 320;  // Approximate calendar width (w-80 = 320px)
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const spaceRight = viewportWidth - rect.left;
        const spaceLeft = rect.left;
        
        // Vertical positioning: above if not enough space below and there's more space above
        const shouldPositionAbove = spaceBelow < calendarHeight && spaceAbove > spaceBelow;
        
        // Horizontal positioning: adjust if calendar would go off-screen
        let leftPosition = rect.left + window.scrollX;
        
        // If calendar would extend beyond right edge, position it to the left
        if (spaceRight < calendarWidth && spaceLeft > calendarWidth) {
          leftPosition = rect.right + window.scrollX - calendarWidth;
        }
        // If still not enough space, center it as much as possible within viewport
        else if (spaceRight < calendarWidth && spaceLeft <= calendarWidth) {
          leftPosition = Math.max(10, window.scrollX + 10); // 10px margin from edge
        }
        
        setCalendarPosition({
          top: shouldPositionAbove 
            ? rect.top + window.scrollY - calendarHeight - 4  // Position above
            : rect.bottom + window.scrollY + 4,               // Position below
          left: leftPosition
        });
      }
      setShowCalendar(true);
      if (tempDate) {
        setCalendarDate(new Date(tempDate));
      }
    }
  };

  const handleDateSelect = (date) => {
    // Create date string in local timezone to avoid timezone offset issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    setTempDate(dateString);
    onChange(dateString);
    setIsDirty(false);
    setShowCalendar(false);
    setCurrentView('day');
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCalendarDate(newDate);
  };

  const navigateYear = (direction) => {
    const newDate = new Date(calendarDate);
    newDate.setFullYear(newDate.getFullYear() + direction);
    setCalendarDate(newDate);
  };

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const today = new Date();
    const selectedDate = tempDate ? new Date(tempDate) : null;

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Create calendar grid
    const calendar = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Previous month days (grayed out)
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonth.getDate() - i;
      calendar.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month - 1, day)
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push({
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day)
      });
    }

    // Next month days to fill the grid
    const remainingCells = 42 - calendar.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
      calendar.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day)
      });
    }

    return createPortal(
      <div 
        className="fixed z-[99999] bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 w-80" 
        ref={calendarRef} 
        style={{ 
          top: `${calendarPosition.top}px`,
          left: `${calendarPosition.left}px`,
          zIndex: 99999
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateYear(-1)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Previous Year"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => navigateMonth(-1)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Previous Month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Clickable Month */}
            <button
              onClick={() => setCurrentView(currentView === 'month' ? 'day' : 'month')}
              className={`font-semibold px-2 py-1 rounded transition-colors ${
                currentView === 'month' 
                  ? 'bg-[#009245] text-white' 
                  : 'text-gray-800 hover:text-[#009245] hover:bg-green-50'
              }`}
            >
              {monthNames[month]}
            </button>
            
            {/* Clickable Year */}
            <button
              onClick={() => setCurrentView(currentView === 'year' ? 'day' : 'year')}
              className={`font-semibold px-2 py-1 rounded transition-colors ${
                currentView === 'year' 
                  ? 'bg-[#009245] text-white' 
                  : 'text-gray-800 hover:text-[#009245] hover:bg-green-50'
              }`}
            >
              {year}
            </button>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateMonth(1)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Next Month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => navigateYear(1)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Next Year"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Month Picker */}
        {currentView === 'month' && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-3 gap-2">
              {monthNames.map((monthName, index) => (
                <button
                  key={monthName}
                  onClick={() => {
                    const newDate = new Date(calendarDate);
                    newDate.setMonth(index);
                    setCalendarDate(newDate);
                    setCurrentView('day'); // Return to day view after selection
                  }}
                  className={`px-3 py-2 text-sm rounded transition-colors ${
                    index === month
                      ? 'bg-[#009245] text-white'
                      : 'text-gray-700 hover:bg-green-100 hover:text-[#009245]'
                  }`}
                >
                  {monthName.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Year Picker */}
        {currentView === 'year' && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className={`grid gap-2 max-h-48 overflow-y-auto date-picker-scrollbar ${
              yearGridCols === 3 ? 'grid-cols-3' :
              yearGridCols === 4 ? 'grid-cols-4' :
              yearGridCols === 5 ? 'grid-cols-5' :
              yearGridCols === 6 ? 'grid-cols-6' :
              'grid-cols-4' // fallback
            }`}>
              {(() => {
                const baseYearCount = (yearRange * 2) + 1; // Original year count
                const completeRows = Math.ceil(baseYearCount / yearGridCols); // Round up to complete rows
                const totalYears = completeRows * yearGridCols; // Total years to fill complete grid
                const extraYears = totalYears - baseYearCount; // Additional years needed
                const startYear = year - yearRange - Math.floor(extraYears / 2); // Adjust start to center
                
                return Array.from({ length: totalYears }, (_, i) => {
                  const yearOption = startYear + i;
                  return (
                    <button
                      key={yearOption}
                      onClick={() => {
                        const newDate = new Date(calendarDate);
                        newDate.setFullYear(yearOption);
                        setCalendarDate(newDate);
                        setCurrentView('day'); // Return to day view after selection
                      }}
                      className={`px-3 py-2 text-sm rounded transition-colors ${
                        yearOption === year
                          ? 'bg-[#009245] text-white'
                          : 'text-gray-700 hover:bg-green-100 hover:text-[#009245]'
                      }`}
                    >
                      {yearOption}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Day View - Headers and Calendar Grid */}
        {currentView === 'day' && (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendar.map((dayObj, index) => {
                const isToday = dayObj.date.toDateString() === today.toDateString();
                const isSelected = selectedDate && dayObj.date.toDateString() === selectedDate.toDateString();
                
                return (
                  <button
                    key={index}
                    onClick={() => handleDateSelect(dayObj.date)}
                    className={`
                      w-10 h-10 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-110
                      ${!dayObj.isCurrentMonth 
                        ? 'text-gray-300 hover:bg-gray-50' 
                        : isSelected
                          ? 'bg-[#009245] text-white shadow-lg shadow-green-200'
                          : isToday
                            ? 'bg-green-100 text-[#009245] border-2 border-[#009245] hover:bg-[#009245] hover:text-white'
                            : 'text-gray-700 hover:bg-green-50 hover:text-[#009245] hover:shadow-md'
                      }
                    `}
                  >
                    {dayObj.day}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Footer buttons */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={async () => {
              const result = await Swal.fire({
                title: 'Clear Date?',
                text: 'This will remove the date completely.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Clear',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280'
              });
              
              if (result.isConfirmed) {
                setTempDate('');
                onChange(null);
                setIsDirty(false);
                setShowCalendar(false);
                setCurrentView('day');
              }
            }}
            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => {
              const todayString = today.toISOString().split('T')[0];
              setTempDate(todayString);
              onChange(todayString);
              setIsDirty(false);
              setShowCalendar(false);
              setCurrentView('day');
            }}
            className="px-3 py-1 text-sm bg-[#009245] text-white hover:bg-green-700 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
      </div>,
      document.body
    );
  };

  // Read-only display
  if (readOnly) {
    return (
      <span className={`px-3 py-1 text-sm text-gray-700 ${className}`}>
        {tempDate ? new Date(tempDate).toLocaleDateString() : '—'}
      </span>
    );
  }

  // Editable input with beautiful calendar overlay
  return (
    <div className="relative">
      {/* Custom styled display that triggers calendar */}
      <div 
        ref={inputRef}
        onClick={handleCalendarToggle}
        className={`w-full p-1 border-0 bg-transparent hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 rounded cursor-pointer min-h-[24px] flex items-center ${className}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {tempDate ? new Date(tempDate).toLocaleDateString() : (
          <span className="text-gray-400 text-sm">Select date...</span>
        )}
      </div>
      
      {/* Hidden native input for accessibility and form submission */}
      <input
        type="date"
        value={tempDate}
        onChange={handleDateChange}
        onBlur={handleBlur}
        className="absolute inset-0 opacity-0 pointer-events-none"
        tabIndex={-1}
      />
      
      {showCalendar && renderCalendar()}
    </div>
  );
}
