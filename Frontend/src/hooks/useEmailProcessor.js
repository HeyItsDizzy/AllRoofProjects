import { useState } from 'react';
import axios from 'axios';

/**
 * Custom hook for processing email files using Rusty automation
 * Handles email parsing, attachment extraction, and file saving
 */
export const useEmailProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  /**
   * Process an email file for an existing project
   * @param {File} emailFile - The .eml email file
   * @param {string} projectId - The project ID to add files to
   * @returns {Promise<Object>} - Processing result
   */
  const processEmailFile = async (emailFile, projectId) => {
    if (!emailFile || !projectId) {
      throw new Error('Email file and project ID are required');
    }

    // Validate file type
    const validExtensions = ['.eml', '.email', '.msg'];
    const fileName = emailFile.name.toLowerCase();
    const isValidFile = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidFile) {
      throw new Error('Please drop a valid email file (.eml, .email, or .msg)');
    }

    setIsProcessing(true);
    setProcessingStatus('Reading email file...');

    try {
      // Convert file to base64
      const fileData = await fileToBase64(emailFile);
      
      setProcessingStatus('Processing email with Rusty automation...');

      // Send to backend for processing
      const response = await axios.post(
        `/api/projects/process-email/${projectId}`,
        {
          emailFile: {
            name: emailFile.name,
            size: emailFile.size,
            data: fileData
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setProcessingStatus('Email processed successfully!');
        
        return {
          success: true,
          message: response.data.message,
          data: response.data.data
        };
      } else {
        throw new Error(response.data.message || 'Failed to process email');
      }

    } catch (error) {
      console.error('Email processing error:', error);
      setProcessingStatus('');
      
      let errorMessage = 'Failed to process email file';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
      // Clear status after 3 seconds
      setTimeout(() => setProcessingStatus(''), 3000);
    }
  };

  /**
   * Convert file to base64 string
   * @param {File} file - File to convert
   * @returns {Promise<string>} - Base64 string
   */
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove data:application/octet-stream;base64, prefix
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  return {
    processEmailFile,
    isProcessing,
    processingStatus
  };
};

export default useEmailProcessor;
