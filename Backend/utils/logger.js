const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const deprecationLogPath = path.join(logsDir, 'deprecation.log');
const bugLogPath = path.join(logsDir, 'bugs.log');

/**
 * Extract call origin information from stack trace
 */
function getCallOrigin() {
  const stack = new Error().stack;
  const stackLines = stack.split('\n');
  
  // Skip the first few lines (Error, getCallOrigin, and the calling function)
  const relevantLines = stackLines.slice(3, 8);
  
  return {
    fullStack: stack,
    callOrigin: relevantLines.map(line => line.trim()),
    immediateCallerFile: stackLines[3] ? stackLines[3].trim() : 'unknown',
    immediateCallerFunction: stackLines[2] ? stackLines[2].trim() : 'unknown'
  };
}

/**
 * Get detailed request information
 */
function getRequestDetails(req) {
  return {
    method: req?.method,
    url: req?.url,
    originalUrl: req?.originalUrl,
    ip: req?.ip || req?.connection?.remoteAddress || req?.socket?.remoteAddress,
    userAgent: req?.headers?.['user-agent'],
    referer: req?.headers?.referer,
    origin: req?.headers?.origin,
    host: req?.headers?.host,
    timestamp: getTimestamp(),
    sessionId: req?.sessionID,
    cookies: req?.headers?.cookie ? 'present' : 'none'
  };
}

/**
 * Format timestamp for log entries
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Write to a specific log file
 */
function writeToLogFile(filePath, level, message, metadata = {}) {
  const logEntry = {
    timestamp: getTimestamp(),
    level,
    message,
    ...metadata
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    fs.appendFileSync(filePath, logLine);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

/**
 * Log deprecation warnings
 */
function logDeprecation(message, metadata = {}, req = null) {
  const timestamp = getTimestamp();
  const callOrigin = getCallOrigin();
  const requestDetails = req ? getRequestDetails(req) : {};
  
  // Enhanced console warning for deprecation
  console.warn('⚠️'.repeat(5));
  console.warn('🚨 DEPRECATION WARNING 🚨');
  console.warn('⚠️'.repeat(5));
  console.warn(`📅 Time: ${timestamp}`);
  console.warn(`📝 Message: ${message}`);
  console.warn(`🔗 Called from: ${callOrigin.immediateCallerFile}`);
  console.warn(`👤 User: ${metadata.userId || 'unknown'}`);
  console.warn(`🌐 IP: ${requestDetails.ip || metadata.ip || 'unknown'}`);
  console.warn(`📱 User Agent: ${requestDetails.userAgent || metadata.userAgent || 'unknown'}`);
  if (metadata.recommendedEndpoint) {
    console.warn(`✅ Use instead: ${metadata.recommendedEndpoint}`);
  }
  console.warn('⚠️'.repeat(5));
  
  const logData = {
    ...metadata,
    timestamp,
    callOrigin,
    requestDetails,
    severity: 'DEPRECATION'
  };
  
  writeToLogFile(deprecationLogPath, 'DEPRECATION', message, logData);
}

/**
 * Log bugs and errors
 */
function logBug(message, error = null, metadata = {}, req = null) {
  const timestamp = getTimestamp();
  const callOrigin = getCallOrigin();
  const requestDetails = req ? getRequestDetails(req) : {};
  
  console.error('🐛'.repeat(5));
  console.error('💥 BUG DETECTED 💥');
  console.error('🐛'.repeat(5));
  console.error(`📅 Time: ${timestamp}`);
  console.error(`📝 Message: ${message}`);
  console.error(`🔗 Called from: ${callOrigin.immediateCallerFile}`);
  console.error(`👤 User: ${metadata.userId || 'unknown'}`);
  console.error(`🌐 IP: ${requestDetails.ip || metadata.ip || 'unknown'}`);
  if (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(`📍 Error Stack: ${error.stack}`);
  }
  console.error('🐛'.repeat(5));
  
  const bugData = {
    ...metadata,
    timestamp,
    callOrigin,
    requestDetails,
    severity: 'BUG'
  };
  
  if (error) {
    bugData.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    };
  }
  
  writeToLogFile(bugLogPath, 'BUG', message, bugData);
}

/**
 * Log general application warnings
 */
function logWarning(message, metadata = {}, req = null) {
  const timestamp = getTimestamp();
  const callOrigin = getCallOrigin();
  const requestDetails = req ? getRequestDetails(req) : {};
  
  console.warn(`⚠️ WARNING: ${message}`);
  console.warn(`📅 Time: ${timestamp}`);
  console.warn(`🔗 Called from: ${callOrigin.immediateCallerFile}`);
  console.warn(`👤 User: ${metadata.userId || 'unknown'}`);
  
  writeToLogFile(deprecationLogPath, 'WARNING', message, {
    ...metadata,
    timestamp,
    callOrigin,
    requestDetails,
    severity: 'WARNING'
  });
}

/**
 * Get recent deprecation logs (for debugging)
 */
function getRecentDeprecationLogs(lines = 50) {
  try {
    if (!fs.existsSync(deprecationLogPath)) {
      return [];
    }
    
    const data = fs.readFileSync(deprecationLogPath, 'utf8');
    const logLines = data.trim().split('\n').filter(line => line.length > 0);
    
    return logLines
      .slice(-lines)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      });
  } catch (error) {
    console.error('Failed to read deprecation logs:', error);
    return [];
  }
}

/**
 * Get recent bug logs (for debugging)
 */
function getRecentBugLogs(lines = 50) {
  try {
    if (!fs.existsSync(bugLogPath)) {
      return [];
    }
    
    const data = fs.readFileSync(bugLogPath, 'utf8');
    const logLines = data.trim().split('\n').filter(line => line.length > 0);
    
    return logLines
      .slice(-lines)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      });
  } catch (error) {
    console.error('Failed to read bug logs:', error);
    return [];
  }
}

module.exports = {
  logDeprecation,
  logBug,
  logWarning,
  getRecentDeprecationLogs,
  getRecentBugLogs
};
