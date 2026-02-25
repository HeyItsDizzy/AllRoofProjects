import React, { useState, useCallback } from 'react';
import { useEmailProcessor } from '../hooks/useEmailProcessor';

/**
 * ScopeRequestDropZone Component
 * Handles drag-and-drop email processing for existing projects
 * Runs Rusty automation for email parsing and file extraction
 */
const ScopeRequestDropZone = ({ projectId, onProcessingComplete, className = '' }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [lastProcessedEmail, setLastProcessedEmail] = useState(null);
  const { processEmailFile, isProcessing, processingStatus } = useEmailProcessor();

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  /**
   * Handle file drop
   */
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const emailFile = files[0]; // Process only the first file

    try {
      const result = await processEmailFile(emailFile, projectId);
      
      setLastProcessedEmail({
        fileName: emailFile.name,
        subject: result.data.emailSubject,
        attachments: result.data.attachmentsProcessed,
        processedAt: new Date().toLocaleString()
      });

      if (onProcessingComplete) {
        onProcessingComplete(result);
      }

    } catch (error) {
      console.error('Drop processing error:', error);
      // Error is already handled by the hook
    }
  }, [projectId, processEmailFile, onProcessingComplete]);

  /**
   * Handle file input change (for click to upload)
   */
  const handleFileInput = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const emailFile = files[0];

    try {
      const result = await processEmailFile(emailFile, projectId);
      
      setLastProcessedEmail({
        fileName: emailFile.name,
        subject: result.data.emailSubject,
        attachments: result.data.attachmentsProcessed,
        processedAt: new Date().toLocaleString()
      });

      if (onProcessingComplete) {
        onProcessingComplete(result);
      }

    } catch (error) {
      console.error('File input processing error:', error);
      // Error is already handled by the hook
    }

    // Reset the input
    e.target.value = '';
  }, [projectId, processEmailFile, onProcessingComplete]);

  return (
    <div className={`w-full ${className}`}>
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : isProcessing
            ? 'border-orange-400 bg-orange-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-orange-50 bg-opacity-90 flex items-center justify-center rounded-lg z-10">
            <div className="text-center">
              <div className="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-orange-700 font-medium">{processingStatus}</p>
            </div>
          </div>
        )}

        {/* Drag Over Overlay */}
        {isDragOver && !isProcessing && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-90 flex items-center justify-center rounded-lg z-10">
            <div className="text-center">
              <svg className="w-8 h-8 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-blue-700 font-medium">Drop email here to process</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          {/* Main Text */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Scope Request</h4>
            <p className="text-gray-600 mb-4">
              Drag and drop an email here to run the Rusty automation process. 
              This will extract attachments, parse content, and save files to the Scope folder.
            </p>
            
            {/* Click to Upload */}
            <label className="inline-block">
              <input
                type="file"
                className="hidden"
                accept=".eml,.email,.msg"
                onChange={handleFileInput}
                disabled={isProcessing}
              />
              <span className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer transition-colors">
                {isProcessing ? 'Processing...' : 'Or click to select file'}
              </span>
            </label>
          </div>

          {/* File Type Info */}
          <p className="text-sm text-gray-500">
            Supports .eml, .email, and .msg files
          </p>
        </div>
      </div>

      {/* Last Processed Email Info */}
      {lastProcessedEmail && !isProcessing && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h5 className="font-medium text-green-800">Last Email Processed</h5>
              <div className="mt-1 text-sm text-green-700 space-y-1">
                <p><strong>File:</strong> {lastProcessedEmail.fileName}</p>
                <p><strong>Subject:</strong> {lastProcessedEmail.subject}</p>
                <p><strong>Attachments:</strong> {lastProcessedEmail.attachments} processed</p>
                <p><strong>Time:</strong> {lastProcessedEmail.processedAt}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScopeRequestDropZone;
