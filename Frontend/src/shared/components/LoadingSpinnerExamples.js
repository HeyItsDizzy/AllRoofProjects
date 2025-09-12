/**
 * LoadingSpinner Usage Examples
 * 
 * Import the component:
 * import { createLoadingSpinner, showLoadingSpinner } from '../shared/components/LoadingSpinner';
 */

// Example 1: Simple file upload
function handleFileUpload(file) {
  const spinner = showLoadingSpinner(file.name, {
    progressText: 'Uploading',
    subtitle: `${(file.size / (1024 * 1024)).toFixed(1)}MB`
  });
  
  // Your upload logic here
  uploadFile(file)
    .then(() => {
      spinner.complete();
      setTimeout(() => spinner.fadeOut(), 1000);
    })
    .catch(error => {
      spinner.error(`Upload failed: ${error.message}`);
    });
}

// Example 2: API data loading
async function loadProjectData(projectId) {
  const spinner = createLoadingSpinner({
    title: 'Loading project data...',
    progressText: 'Processing',
    showPercentage: true
  });
  
  spinner.startAutoProgress();
  
  try {
    const data = await fetchProjectData(projectId);
    spinner.complete();
    await spinner.fadeOut();
    return data;
  } catch (error) {
    spinner.error('Failed to load project');
    throw error;
  }
}

// Example 3: File processing with manual progress
function processLargeFile(file) {
  const spinner = createLoadingSpinner({
    title: file.name,
    subtitle: 'Processing large file...',
    progressText: 'Processing',
    onCancel: () => {
      // Handle cancellation
      abortProcessing();
    }
  });
  
  // Manual progress updates
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    spinner.setProgress(progress);
    
    if (progress >= 100) {
      clearInterval(interval);
      spinner.complete();
      setTimeout(() => spinner.destroy(), 2000);
    }
  }, 500);
}

// Example 4: Image optimization
function optimizeImages(images) {
  const spinner = createLoadingSpinner({
    title: `Optimizing ${images.length} images`,
    progressText: 'Optimizing',
    showProgress: true,
    backgroundColor: 'rgba(0, 0, 0, 0.95)'
  });
  
  let completed = 0;
  
  images.forEach(async (image, index) => {
    await optimizeImage(image);
    completed++;
    
    const progress = (completed / images.length) * 100;
    spinner.setProgress(progress);
    spinner.setTitle(`Optimized ${completed}/${images.length} images`);
    
    if (completed === images.length) {
      spinner.complete();
      setTimeout(() => spinner.fadeOut(), 1500);
    }
  });
}

// Example 5: Simple loading without progress bar
function simpleApiCall() {
  const spinner = createLoadingSpinner({
    title: 'Saving changes...',
    showProgress: false, // No progress bar
    showPercentage: false
  });
  
  apiCall()
    .then(() => {
      spinner.setTitle('✅ Changes saved!');
      setTimeout(() => spinner.destroy(), 1500);
    })
    .catch(() => {
      spinner.error('Failed to save changes');
    });
}

export {
  handleFileUpload,
  loadProjectData,
  processLargeFile,
  optimizeImages,
  simpleApiCall
};
