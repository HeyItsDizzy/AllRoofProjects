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
      console.log('⚠️ [Version Service] Check interval already running, skipping duplicate');
      return;
    }

    const userRole = JSON.parse(localStorage.getItem('authUser') || '{}')?.role || 'Unknown';
    console.log(`🔄 [Version Service] Starting periodic version check for user role: ${userRole}`);
    console.log(`   - Check interval: ${intervalMinutes} minutes`);

    // Check immediately
    this.checkVersion();

    // Set up periodic checking
    this.checkInterval = setInterval(() => {
      console.log(`⏰ [Version Service] Periodic check triggered for user role: ${userRole}`);
      this.checkVersion();
    }, intervalMinutes * 60 * 1000);

    console.log(`✅ [Version Service] Version checking started successfully`);
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
      const userRole = JSON.parse(localStorage.getItem('authUser') || '{}')?.role || 'Unknown';
      console.log(`🔍 [Version Service] Checking version for user role: ${userRole}`);
      
      const response = await axiosPublic.get('/version');
      const serverData = response.data.data;

      console.log(`📦 [Version Service] Server data received:`, {
        serverVersion: serverData.version,
        clientVersion: APP_CONFIG.VERSION,
        serverDeploymentId: serverData.deploymentId,
        clientDeploymentId: localStorage.getItem('deploymentId')
      });

      // Store server deployment ID
      if (serverData.deploymentId) {
        const currentDeploymentId = localStorage.getItem('deploymentId');
        
        if (currentDeploymentId && currentDeploymentId !== serverData.deploymentId) {
          console.log(`🆕 [Version Service] New deployment detected for user (${userRole})`);
          console.log(`   - Current: ${currentDeploymentId}`);
          console.log(`   - Server: ${serverData.deploymentId}`);
          this.promptForUpdate(serverData);
        } else if (!currentDeploymentId) {
          // First time - store the deployment ID
          console.log(`💾 [Version Service] Storing initial deployment ID: ${serverData.deploymentId}`);
          localStorage.setItem('deploymentId', serverData.deploymentId);
        } else {
          console.log(`✅ [Version Service] Deployment ID matches, no update needed`);
        }
      }

      // Check version compatibility
      if (serverData.version !== APP_CONFIG.VERSION) {
        console.log(`🔄 [Version Service] Version mismatch detected for user (${userRole})`);
        console.log(`   - Client: ${APP_CONFIG.VERSION}`);
        console.log(`   - Server: ${serverData.version}`);
        this.promptForUpdate(serverData);
      }

    } catch (error) {
      console.error('❌ [Version Service] Version check failed:', error);
      console.error('   - Error details:', error.response?.data || error.message);
      // Don't show errors to user for background checks
    } finally {
      this.isChecking = false;
    }
  }

  // Prompt user to update the application
  promptForUpdate(serverData) {
    // Avoid showing multiple prompts
    if (window.updatePromptShown) {
      console.log('⚠️ Version update prompt already shown, skipping duplicate');
      return;
    }
    window.updatePromptShown = true;

    // Get user info for logging
    const userData = JSON.parse(localStorage.getItem('authUser') || '{}');
    const userRole = userData?.role || 'Unknown';
    const userEmail = userData?.email || '';
    console.log(`🔔 [Version Service] Showing update prompt to user: ${userEmail} (${userRole})`);
    console.log(`📦 Server deployment ID: ${serverData.deploymentId}, Server version: ${serverData.version}`);

    // Dynamic import to avoid circular dependencies
    import('sweetalert2').then(({ default: Swal }) => {
      Swal.fire({
        icon: 'info',
        title: 'App Updated',
        text: 'The application has been updated. Please log in again to continue.',
        showConfirmButton: true,
        confirmButtonText: 'OK',
        showCancelButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(() => {
        console.log(`✅ [Version Service] User (${userRole}) acknowledged update, redirecting to login`);
        
        // Clear localStorage except email for prefill
        const emailToPrefill = userEmail;
        localStorage.clear();
        
        // Store new deployment ID and email for prefill
        if (serverData?.deploymentId) {
          localStorage.setItem('deploymentId', serverData.deploymentId);
        }
        if (emailToPrefill) {
          localStorage.setItem('prefillEmail', emailToPrefill);
        }
        
        // Redirect to login
        window.location.href = '/login';
      });
    });
  }

  // Force update the application (used by manual check)
  forceUpdate(serverData) {
    // Store user email before clearing
    const userData = JSON.parse(localStorage.getItem('authUser') || '{}');
    const emailToPrefill = userData?.email || '';
    
    // Clear old data
    localStorage.clear();
    
    // Store new deployment ID and email for prefill
    if (serverData?.deploymentId) {
      localStorage.setItem('deploymentId', serverData.deploymentId);
    }
    if (emailToPrefill) {
      localStorage.setItem('prefillEmail', emailToPrefill);
    }

    // Redirect to login instead of hard refresh
    window.location.href = '/login';
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