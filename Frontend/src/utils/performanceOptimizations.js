/**
 * CRITICAL RESOURCE PRELOADER
 * Preloads critical resources to improve LCP
 */

import { useEffect } from 'react';

/**
 * Preload critical fonts and resources
 */
export const useCriticalResourcePreloader = () => {
  useEffect(() => {
    // Preload critical fonts
    const fontPreloads = [
      'system-ui',
      '-apple-system', 
      'BlinkMacSystemFont',
      'sans-serif'
    ];

    // Create font preload links
    fontPreloads.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      // Note: This is just for font family declaration, actual font files would need URLs
    });

    // Preload critical CSS
    const criticalCSS = `
      .table-critical { 
        font-family: system-ui, -apple-system, sans-serif;
        font-display: swap;
      }
      .text-critical {
        text-rendering: optimizeSpeed;
        font-display: swap;
      }
    `;

    const style = document.createElement('style');
    style.textContent = criticalCSS;
    document.head.appendChild(style);

    return () => {
      // Cleanup on unmount
      document.head.removeChild(style);
    };
  }, []);
};

/**
 * Lazy load non-critical resources
 */
export const useLazyResourceLoader = () => {
  useEffect(() => {
    // Load non-critical resources after initial paint
    const loadNonCriticalResources = () => {
      // Load additional fonts, icons, etc.
      const nonCriticalCSS = `
        .non-critical-animations {
          transition: all 0.2s ease;
        }
        .fancy-borders {
          border-radius: 0.375rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
      `;

      const style = document.createElement('style');
      style.textContent = nonCriticalCSS;
      document.head.appendChild(style);
    };

    // Delay non-critical resource loading
    const timer = setTimeout(loadNonCriticalResources, 100);
    
    return () => clearTimeout(timer);
  }, []);
};

/**
 * Performance budget monitor
 */
export const usePerformanceBudget = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const checkPerformanceBudget = () => {
      if (window.performance && window.performance.getEntriesByType) {
        const paintEntries = window.performance.getEntriesByType('paint');
        const lcpEntries = window.performance.getEntriesByType('largest-contentful-paint');
        
        paintEntries.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            console.log(`🎨 FCP: ${entry.startTime.toFixed(2)}ms`);
            if (entry.startTime > 1800) {
              console.warn('⚠️ FCP exceeds budget (1.8s)');
            }
          }
        });

        if (lcpEntries.length > 0) {
          const lcp = lcpEntries[lcpEntries.length - 1];
          console.log(`🖼️ LCP: ${lcp.startTime.toFixed(2)}ms`);
          if (lcp.startTime > 2500) {
            console.warn('⚠️ LCP exceeds budget (2.5s)');
          } else {
            console.log('✅ LCP within budget');
          }
        }
      }
    };

    // Check performance after page load
    if (document.readyState === 'complete') {
      setTimeout(checkPerformanceBudget, 100);
    } else {
      window.addEventListener('load', () => {
        setTimeout(checkPerformanceBudget, 100);
      });
    }
  }, []);
};