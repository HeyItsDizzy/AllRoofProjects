/**
 * Status Update Performance Test
 * Use this in Chrome DevTools Console to test status updates
 */

// 🧪 Test status update performance
function testStatusUpdatePerformance() {
  console.log('🧪 Starting status update performance test...');
  
  // Start DevTools performance recording
  performance.mark('status-test-start');
  
  // Find status dropdowns
  const statusDropdowns = document.querySelectorAll('select[value]');
  console.log(`Found ${statusDropdowns.length} status dropdowns`);
  
  if (statusDropdowns.length === 0) {
    console.warn('❌ No status dropdowns found. Make sure you\'re on the AllProjects page.');
    return;
  }
  
  // Test updating the first status dropdown
  const firstDropdown = statusDropdowns[0];
  const originalValue = firstDropdown.value;
  console.log(`🎯 Testing dropdown with current value: "${originalValue}"`);
  
  // Record layout before change
  const beforeLayout = {
    scrollTop: window.scrollY,
    elementRect: firstDropdown.getBoundingClientRect()
  };
  
  // Measure paint time
  const paintObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`🎨 Paint: ${entry.name} took ${entry.duration}ms`);
    }
  });
  paintObserver.observe({ entryTypes: ['paint'] });
  
  // Measure layout shifts
  const layoutObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.warn(`📐 Layout Shift detected: ${entry.value} (threshold: 0.1)`);
      console.log('Shift details:', entry);
    }
  });
  layoutObserver.observe({ entryTypes: ['layout-shift'] });
  
  // Change status (simulate user interaction)
  const options = Array.from(firstDropdown.options);
  const newOption = options.find(opt => opt.value !== originalValue);
  
  if (!newOption) {
    console.warn('❌ No alternative status option found');
    return;
  }
  
  console.log(`🔄 Changing status from "${originalValue}" to "${newOption.value}"`);
  
  // Time the update
  const updateStart = performance.now();
  
  // Trigger change
  firstDropdown.value = newOption.value;
  firstDropdown.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Measure UI responsiveness
  setTimeout(() => {
    const updateEnd = performance.now();
    const afterLayout = {
      scrollTop: window.scrollY,
      elementRect: firstDropdown.getBoundingClientRect()
    };
    
    performance.mark('status-test-end');
    performance.measure('status-update-total', 'status-test-start', 'status-test-end');
    
    console.log(`⏱️ Status update took: ${updateEnd - updateStart}ms`);
    console.log(`📊 Layout shift check:`, {
      scrollMoved: Math.abs(afterLayout.scrollTop - beforeLayout.scrollTop),
      elementMoved: {
        x: Math.abs(afterLayout.elementRect.x - beforeLayout.elementRect.x),
        y: Math.abs(afterLayout.elementRect.y - beforeLayout.elementRect.y)
      }
    });
    
    // Clean up observers
    paintObserver.disconnect();
    layoutObserver.disconnect();
    
    // Show performance entries
    const measures = performance.getEntriesByType('measure');
    console.table(measures.slice(-5)); // Show last 5 measurements
    
    console.log('✅ Performance test complete! Check console for details.');
  }, 1000);
}

// 🔍 Check for common performance issues
function diagnosePerformanceIssues() {
  console.log('🔍 Diagnosing performance issues...');
  
  // Check for excessive React renders
  const reactDevTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (reactDevTools) {
    console.log('✅ React DevTools detected');
  } else {
    console.log('❌ React DevTools not found - install for better debugging');
  }
  
  // Check table size
  const tables = document.querySelectorAll('table tbody tr');
  console.log(`📊 Found ${tables.length} table rows`);
  
  if (tables.length > 100) {
    console.warn('⚠️ Large table detected! Consider virtualization for >100 rows');
  }
  
  // Check for memory leaks
  if (performance.memory) {
    const memory = performance.memory;
    console.log('💾 Memory usage:', {
      used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`
    });
    
    if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
      console.warn('⚠️ High memory usage detected!');
    }
  }
  
  // Check for layout thrashing
  const computedStyles = getComputedStyle(document.body);
  console.log('🎨 Body layout info:', {
    position: computedStyles.position,
    overflow: computedStyles.overflow,
    transform: computedStyles.transform
  });
}

// Export functions for console use
window.testStatusUpdatePerformance = testStatusUpdatePerformance;
window.diagnosePerformanceIssues = diagnosePerformanceIssues;

console.log('🧪 Performance testing tools loaded!');
console.log('Run testStatusUpdatePerformance() to test status updates');
console.log('Run diagnosePerformanceIssues() to check for common issues');