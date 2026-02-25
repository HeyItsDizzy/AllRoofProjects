/**
 * Reusable Loading Spinner Component
 * 
 * Creates a beautiful loading overlay with spinner, progress bar, and customizable text
 * Perfect for file uploads, downloads, API calls, or any async operations
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.title - Main title text (e.g., filename or operation name)
 * @param {string} options.subtitle - Optional subtitle text
 * @param {string} options.progressText - Text for progress indicator (default: "Loading")
 * @param {boolean} options.showProgress - Whether to show the progress bar (default: true)
 * @param {boolean} options.showPercentage - Whether to show percentage (default: true)
 * @param {string} options.backgroundColor - Modal background color (default: rgba(0, 0, 0, 0.9))
 * @param {Function} options.onCancel - Optional cancel callback function
 * @returns {Object} LoadingSpinner instance with control methods
 */
export function createLoadingSpinner(options = {}) {
  const {
    title = 'Processing...',
    subtitle = '',
    progressText = 'Loading',
    showProgress = true,
    showPercentage = true,
    backgroundColor = 'rgba(0, 0, 0, 0.9)',
    onCancel = null
  } = options;

  const isDev = process.env.NODE_ENV === 'development';
  const startTime = performance.now();
  
  // Get app zoom level from CSS variable (default to 1 if not set)
  const appZoom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-zoom')) || 1;
  const inverseZoom = 1 / appZoom;
  
  // Create modal overlay with inverse zoom to always cover 100% of viewport
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: ${backgroundColor};
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    transform: scale(${inverseZoom});
    transform-origin: top left;
  `;
  
  // Create loading container
  const loadingContainer = document.createElement('div');
  loadingContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    color: white;
  `;

  // Create spinner
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  `;

  // Add CSS animation for spinner (only once)
  if (!document.getElementById('loading-spinner-animation')) {
    const style = document.createElement('style');
    style.id = 'loading-spinner-animation';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
  }

  // Create title text
  const titleText = document.createElement('div');
  titleText.style.cssText = `
    font-size: 18px;
    text-align: center;
    font-weight: 500;
    animation: pulse 2s ease-in-out infinite;
  `;
  titleText.textContent = title;

  // Create subtitle text (if provided)
  let subtitleElement = null;
  if (subtitle) {
    subtitleElement = document.createElement('div');
    subtitleElement.style.cssText = `
      font-size: 14px;
      text-align: center;
      color: rgba(255, 255, 255, 0.8);
      margin-top: -10px;
    `;
    subtitleElement.textContent = subtitle;
  }

  // Create progress elements (if enabled)
  let gaugeContainer = null;
  let gaugeBar = null;
  let progressTextElement = null;
  
  if (showProgress) {
    // Create buffer gauge container
    gaugeContainer = document.createElement('div');
    gaugeContainer.style.cssText = `
      width: 300px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 4px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;

    // Create buffer gauge bar
    gaugeBar = document.createElement('div');
    gaugeBar.style.cssText = `
      height: 8px;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      border-radius: 6px;
      width: 0%;
      transition: width 0.3s ease;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
    `;

    // Create progress percentage text
    if (showPercentage) {
      progressTextElement = document.createElement('div');
      progressTextElement.style.cssText = `
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
        text-align: center;
        margin-top: 8px;
      `;
      progressTextElement.textContent = `${progressText}... 0%`;
    }

    gaugeContainer.appendChild(gaugeBar);
  }

  // Create cancel button (if callback provided)
  let cancelButton = null;
  if (onCancel) {
    cancelButton = document.createElement('button');
    cancelButton.style.cssText = `
      background: rgba(239, 68, 68, 0.8);
      border: none;
      color: white;
      font-size: 14px;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      margin-top: 10px;
      transition: background-color 0.2s;
    `;
    cancelButton.textContent = 'Cancel';
    cancelButton.onmouseover = () => cancelButton.style.background = 'rgba(239, 68, 68, 1)';
    cancelButton.onmouseout = () => cancelButton.style.background = 'rgba(239, 68, 68, 0.8)';
    cancelButton.onclick = () => {
      onCancel();
      instance.destroy();
    };
  }

  // Performance indicator for dev mode
  let perfIndicator = null;
  if (isDev) {
    perfIndicator = document.createElement('div');
    perfIndicator.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: #4ade80;
      font-size: 12px;
      font-family: monospace;
      background: rgba(0, 0, 0, 0.7);
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid #4ade80;
    `;
    perfIndicator.textContent = `${progressText}... 0.0s`;
  }

  // Assemble loading container
  loadingContainer.appendChild(spinner);
  loadingContainer.appendChild(titleText);
  if (subtitleElement) loadingContainer.appendChild(subtitleElement);
  if (gaugeContainer) loadingContainer.appendChild(gaugeContainer);
  if (progressTextElement) loadingContainer.appendChild(progressTextElement);
  if (cancelButton) loadingContainer.appendChild(cancelButton);

  // Add to modal
  modal.appendChild(loadingContainer);
  if (perfIndicator) modal.appendChild(perfIndicator);
  document.body.appendChild(modal);

  // Progress tracking variables
  let progress = 0;
  let bufferInterval = null;
  let perfInterval = null;

  // Create the instance object with control methods
  const instance = {
    // Update the title text
    setTitle(newTitle) {
      titleText.textContent = newTitle;
    },

    // Update the subtitle text
    setSubtitle(newSubtitle) {
      if (subtitleElement) {
        subtitleElement.textContent = newSubtitle;
      }
    },

    // Set progress manually (0-100)
    setProgress(percent) {
      if (gaugeBar && showProgress) {
        progress = Math.max(0, Math.min(100, percent));
        gaugeBar.style.width = `${progress}%`;
        
        if (progressTextElement && showPercentage) {
          progressTextElement.textContent = `${progressText}... ${Math.round(progress)}%`;
        }
        
        // Update colors based on progress
        if (progress > 70) {
          gaugeBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
        } else if (progress > 40) {
          gaugeBar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
        }
      }
    },

    // Start automatic progress simulation
    startAutoProgress() {
      if (!showProgress) return;
      
      bufferInterval = setInterval(() => {
        if (progress < 95) {
          // Simulate realistic loading - fast start, then slower
          const increment = progress < 30 ? Math.random() * 15 : 
                           progress < 60 ? Math.random() * 8 : 
                           progress < 80 ? Math.random() * 3 : 
                           Math.random() * 1;
          
          this.setProgress(progress + increment);
        }
      }, 100 + Math.random() * 200); // Variable timing for realistic feel
    },

    // Stop automatic progress
    stopAutoProgress() {
      if (bufferInterval) {
        clearInterval(bufferInterval);
        bufferInterval = null;
      }
    },

    // Complete the loading (sets to 100% and shows success)
    complete() {
      this.stopAutoProgress();
      if (showProgress) {
        this.setProgress(100);
        if (progressTextElement) {
          progressTextElement.textContent = 'Complete! 100%';
        }
      }
      
      if (isDev && perfIndicator) {
        const loadTime = performance.now() - startTime;
        perfIndicator.textContent = `✅ Completed in ${(loadTime / 1000).toFixed(2)}s`;
        perfIndicator.style.color = loadTime > 3000 ? '#ef4444' : '#10b981';
      }
    },

    // Show error state
    error(errorMessage = 'An error occurred') {
      this.stopAutoProgress();
      
      // Update spinner to show error
      spinner.style.display = 'none';
      
      // Update text
      titleText.textContent = errorMessage;
      titleText.style.color = '#ff6b6b';
      
      // Update progress bar to red
      if (gaugeBar) {
        gaugeBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
        if (progressTextElement) {
          progressTextElement.textContent = 'Failed';
        }
      }
      
      if (isDev && perfIndicator) {
        const errorTime = performance.now() - startTime;
        perfIndicator.textContent = `❌ Failed after ${(errorTime / 1000).toFixed(2)}s`;
        perfIndicator.style.color = '#ef4444';
      }
    },

    // Destroy the loading spinner
    destroy() {
      this.stopAutoProgress();
      if (perfInterval) clearInterval(perfInterval);
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    },

    // Fade out and destroy
    fadeOut(duration = 500) {
      return new Promise((resolve) => {
        modal.style.transition = `opacity ${duration}ms ease`;
        modal.style.opacity = '0';
        
        setTimeout(() => {
          this.destroy();
          resolve();
        }, duration);
      });
    }
  };

  // Start dev performance tracking
  if (isDev) {
    perfInterval = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      perfIndicator.textContent = `${progressText}... ${elapsed.toFixed(1)}s`;
      if (elapsed > 3) {
        perfIndicator.style.color = '#f59e0b'; // Orange for slow
      }
      if (elapsed > 6) {
        perfIndicator.style.color = '#ef4444'; // Red for very slow
      }
    }, 100);
  }

  return instance;
}

// Export convenience function for simple usage
export function showLoadingSpinner(title, options = {}) {
  const spinner = createLoadingSpinner({ title, ...options });
  spinner.startAutoProgress();
  return spinner;
}
