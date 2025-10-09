/**
 * React Performance Hooks
 * Easy-to-use hooks for debugging component performance
 */

import { useEffect, useRef, useCallback } from 'react';
import perfMonitor from './performanceMonitor';

/**
 * Hook to monitor component render performance
 * @param {string} componentName - Name for logging
 * @param {number} threshold - Warning threshold in ms (default: 5ms)
 */
export const useRenderTimer = (componentName, threshold = 5) => {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current++;
    const label = `${componentName}-render-${renderCount.current}`;
    
    perfMonitor.start(label);
    
    // Cleanup on unmount or next render
    return () => {
      perfMonitor.end(label, threshold);
    };
  });
};

/**
 * Hook to monitor async operations
 * @param {Function} asyncFn - The async function to monitor
 * @param {string} operationName - Name for logging
 * @param {number} threshold - Warning threshold in ms (default: 100ms)
 */
export const useAsyncTimer = (asyncFn, operationName, threshold = 100) => {
  return useCallback(async (...args) => {
    const label = `${operationName}-${Date.now()}`;
    perfMonitor.start(label);
    
    try {
      const result = await asyncFn(...args);
      perfMonitor.end(label, threshold);
      return result;
    } catch (error) {
      perfMonitor.end(label, threshold);
      throw error;
    }
  }, [asyncFn, operationName, threshold]);
};

/**
 * Hook to monitor expensive calculations
 * @param {Function} expensiveFn - Function with heavy computation
 * @param {Array} deps - Dependencies array
 * @param {string} operationName - Name for logging
 * @param {number} threshold - Warning threshold in ms (default: 10ms)
 */
export const useExpensiveCalculation = (expensiveFn, deps, operationName, threshold = 10) => {
  const memoizedFn = useCallback(() => {
    const label = `calc-${operationName}`;
    perfMonitor.start(label);
    const result = expensiveFn();
    perfMonitor.end(label, threshold);
    return result;
  }, deps);
  
  return memoizedFn();
};

/**
 * Hook to track component lifecycle performance
 * @param {string} componentName - Name for logging
 */
export const useLifecycleTimer = (componentName) => {
  const mountTime = useRef(null);
  
  useEffect(() => {
    // Component mounted
    mountTime.current = Date.now();
    console.log(`🟢 ${componentName} mounted`);
    
    return () => {
      // Component unmounting
      const lifetime = Date.now() - mountTime.current;
      console.log(`🔴 ${componentName} unmounted after ${lifetime}ms`);
    };
  }, [componentName]);
};

/**
 * Hook to monitor state updates
 * @param {*} state - State to monitor
 * @param {string} stateName - Name for logging
 */
export const useStateTimer = (state, stateName) => {
  const previousState = useRef(state);
  const updateCount = useRef(0);
  
  useEffect(() => {
    if (previousState.current !== state) {
      updateCount.current++;
      console.log(`🔄 ${stateName} updated (${updateCount.current} times):`, {
        from: previousState.current,
        to: state
      });
      previousState.current = state;
    }
  }, [state, stateName]);
};

/**
 * Hook to detect and warn about excessive re-renders
 * @param {string} componentName - Name for logging
 * @param {number} threshold - Max renders per second (default: 10)
 */
export const useRenderWarning = (componentName, threshold = 10) => {
  const renders = useRef([]);
  
  useEffect(() => {
    const now = Date.now();
    renders.current.push(now);
    
    // Keep only renders from last second
    renders.current = renders.current.filter(time => now - time < 1000);
    
    if (renders.current.length > threshold) {
      console.warn(`⚠️ ${componentName} rendered ${renders.current.length} times in 1 second!`);
      console.trace();
    }
  });
};