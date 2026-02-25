/**
 * Emails Feature - Barrel Export
 * Centralized exports for all email-related components
 */

// Jobboard Email Modals
export { default as EstimateCompleteModal } from './modals/jobboard/EstimateCompleteModal';
export { default as JobDelayedModal } from './modals/jobboard/JobDelayedModal';
export { default as SendMessageModal } from './modals/jobboard/SendMessageModal';
export { default as MessageTypeSelector } from './modals/jobboard/MessageTypeSelector';

// Email Templates
export { default as EstimateCompleteTemplate } from './templates/jobboard/EstimateComplete.js';
export { default as JobDelayedTemplate } from './templates/jobboard/JobDelayed.js';
export { default as SendEstimateTemplate } from './templates/jobboard/SendEstimate.js';

// Grouped exports for convenience
export const JobboardModals = {
  EstimateCompleteModal: () => import('./modals/jobboard/EstimateCompleteModal'),
  JobDelayedModal: () => import('./modals/jobboard/JobDelayedModal'),
  SendMessageModal: () => import('./modals/jobboard/SendMessageModal'),
  MessageTypeSelector: () => import('./modals/jobboard/MessageTypeSelector'),
};

export const JobboardTemplates = {
  EstimateCompleteTemplate: () => import('./templates/jobboard/EstimateComplete.js'),
  JobDelayedTemplate: () => import('./templates/jobboard/JobDelayed.js'),
  SendEstimateTemplate: () => import('./templates/jobboard/SendEstimate.js'),
};
