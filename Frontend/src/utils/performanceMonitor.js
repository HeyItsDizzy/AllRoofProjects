/**
 * Performance Monitor Utility
 * Add this to debug slow/freezing components
 */

class PerformanceMonitor {
  constructor() {
    this.measurements = new Map();
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  // Start timing a operation
  start(label) {
    if (!this.isEnabled) return;
    
    performance.mark(`${label}-start`);
    this.measurements.set(label, Date.now());
  }

  // End timing and log if slow
  end(label, threshold = 16) {
    if (!this.isEnabled) return;
    
    const startTime = this.measurements.get(label);
    if (!startTime) return;
    
    const duration = Date.now() - startTime;
    performance.mark(`${label}-end`);
    
    try {
      performance.measure(label, `${label}-start`, `${label}-end`);
    } catch (e) {
      // Ignore if marks don't exist
    }
    
    if (duration > threshold) {
      console.warn(`🐌 SLOW OPERATION: ${label} took ${duration}ms (threshold: ${threshold}ms)`);
      console.trace(); // Show call stack
    }
    
    this.measurements.delete(label);
    return duration;
  }

  // Monitor a function
  wrap(fn, label) {
    if (!this.isEnabled) return fn;
    
    return (...args) => {
      this.start(label);
      const result = fn(...args);
      
      // Handle promises
      if (result && typeof result.then === 'function') {
        return result.finally(() => this.end(label));
      }
      
      this.end(label);
      return result;
    };
  }

  // Monitor React component renders
  wrapComponent(Component, name) {
    if (!this.isEnabled) return Component;
    
    return (props) => {
      this.start(`render-${name}`);
      const result = Component(props);
      this.end(`render-${name}`, 5); // 5ms threshold for renders
      return result;
    };
  }

  // Check for memory leaks
  checkMemory() {
    if (!this.isEnabled || !performance.memory) return;
    
    const memory = performance.memory;
    console.log('📊 Memory Usage:', {
      used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`
    });
  }

  // Get all performance measurements
  getReport() {
    if (!this.isEnabled) return;
    
    const measures = performance.getEntriesByType('measure');
    const report = measures
      .filter(m => m.duration > 10) // Only show >10ms
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slowest
    
    console.table(report);
    return report;
  }

  // Monitor long tasks (main thread blocking)
  monitorLongTasks() {
    if (!this.isEnabled || !('PerformanceObserver' in window)) return;
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.error(`🚨 LONG TASK: ${entry.duration}ms blocked the main thread`);
        console.log('Attribution:', entry.attribution);
      }
    });
    
    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.log('Long task monitoring not supported');
    }
  }
}

// Create singleton instance
const perfMonitor = new PerformanceMonitor();

// Auto-start long task monitoring
perfMonitor.monitorLongTasks();

export default perfMonitor;

// Convenience exports
export const startTimer = (label) => perfMonitor.start(label);
export const endTimer = (label, threshold) => perfMonitor.end(label, threshold);
export const wrapFunction = (fn, label) => perfMonitor.wrap(fn, label);
export const wrapComponent = (Component, name) => perfMonitor.wrapComponent(Component, name);
export const checkMemory = () => perfMonitor.checkMemory();
export const getReport = () => perfMonitor.getReport();