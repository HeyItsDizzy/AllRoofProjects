// Version check service for detecting app updates
import axiosPublic from '../hooks/AxiosPublic/useAxiosPublic';
import { APP_CONFIG } from '../config/version';

class VersionService {
  constructor() {
    this.checkInterval = null;
    this.isChecking = false;
  }

  // Start periodic version checking
  startPeriodicCheck(intervalMinutes = 5) {
    // Don't start multiple intervals
    if (this.checkInterval) {
      return;
    }

    // Check immediately
    this.checkVersion();

    // Set up periodic checking
    this.checkInterval = setInterval(() => {
      this.checkVersion();
    }, intervalMinutes * 60 * 1000);

    console.log(`🔄 Started version checking every ${intervalMinutes} minutes`);
  }

  // Stop periodic version checking
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏹️ Stopped version checking');
    }
  }

  // Check current version against server
  async checkVersion() {
    if (this.isChecking) {
      return;
    }

    this.isChecking = true;

    try {
      const response = await axiosPublic.get('/version');
      const serverData = response.data.data;

      // Store server deployment ID
      if (serverData.deploymentId) {
        const currentDeploymentId = localStorage.getItem('deploymentId');
        
        if (currentDeploymentId && currentDeploymentId !== serverData.deploymentId) {
          console.log('🆕 New deployment detected, prompting user to refresh');
          this.promptForUpdate(serverData);
        } else if (!currentDeploymentId) {
          // First time - store the deployment ID
          localStorage.setItem('deploymentId', serverData.deploymentId);
        }
      }

      // Check version compatibility
      if (serverData.version !== APP_CONFIG.VERSION) {
        console.log(`🔄 Version mismatch: Client(${APP_CONFIG.VERSION}) vs Server(${serverData.version})`);
        this.promptForUpdate(serverData);
      }

    } catch (error) {
      console.error('❌ Version check failed:', error);
      // Don't show errors to user for background checks
    } finally {
      this.isChecking = false;
    }
  }

  // Prompt user to update the application
  promptForUpdate(serverData) {
    // Avoid showing multiple prompts
    if (window.updatePromptShown) {
      return;
    }
    window.updatePromptShown = true;

    // Dynamic import to avoid circular dependencies
    import('sweetalert2').then(({ default: Swal }) => {
      Swal.fire({
        icon: 'info',
        title: 'App Update Available',
        text: 'A new version of the application is available. Please refresh to get the latest features and fixes.',
        showConfirmButton: true,
        confirmButtonText: 'Refresh Now',
        showCancelButton: true,
        cancelButtonText: 'Later',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then((result) => {
        if (result.isConfirmed) {
          this.forceUpdate(serverData);
        } else {
          // Allow another prompt later
          window.updatePromptShown = false;
        }
      });
    });
  }

  // Force update the application
  forceUpdate(serverData) {
    // Clear old data
    localStorage.clear();
    
    // Store new deployment ID
    if (serverData?.deploymentId) {
      localStorage.setItem('deploymentId', serverData.deploymentId);
    }

    // Force hard refresh
    window.location.reload(true);
  }

  // Manual version check (called by user action)
  async manualCheck() {
    try {
      await this.checkVersion();
      
      // If no update was needed, show success message
      if (!window.updatePromptShown) {
        import('sweetalert2').then(({ default: Swal }) => {
          Swal.fire({
            icon: 'success',
            title: 'Up to Date',
            text: 'You are running the latest version of the application.',
            timer: 2000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true
          });
        });
      }
    } catch (error) {
      import('sweetalert2').then(({ default: Swal }) => {
        Swal.fire({
          icon: 'error',
          title: 'Check Failed',
          text: 'Unable to check for updates. Please try again later.',
          timer: 3000,
          showConfirmButton: false,
          position: 'top-end',
          toast: true
        });
      });
    }
  }
}

// Export singleton instance
export const versionService = new VersionService();
export default versionService;