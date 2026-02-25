// ErrorBoundary.jsx - Comprehensive error handler with detailed debugging info
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorHistory: []
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console for development
    console.error('💥 Error caught by boundary:', error);
    console.error('📍 Error info:', errorInfo);
    
    // Parse component stack to find all affected files
    const componentStack = errorInfo.componentStack || '';
    const fileMatches = [...componentStack.matchAll(/at (\w+) \((.*?):(\d+):(\d+)\)/g)];
    
    const errorChain = fileMatches.map(match => ({
      component: match[1],
      file: match[2].split('/').pop(),
      line: match[3],
      column: match[4],
      fullPath: match[2]
    }));

    // Try to extract import errors or other common issues
    const errorMessage = error.toString();
    const suggestions = this.getErrorSuggestions(errorMessage, error.stack);

    this.setState(prevState => ({
      error,
      errorInfo,
      errorHistory: [
        ...prevState.errorHistory,
        {
          error: errorMessage,
          timestamp: new Date().toISOString(),
          stack: error.stack,
          componentStack: componentStack,
          errorChain
        }
      ]
    }));
  }

  getErrorSuggestions(errorMessage, stack) {
    const suggestions = [];
    
    // Missing import detection
    if (errorMessage.includes('is not defined') || errorMessage.includes('Cannot read properties of undefined')) {
      const match = errorMessage.match(/(\w+) is not defined/);
      if (match) {
        suggestions.push({
          type: 'missing-import',
          message: `"${match[1]}" is not defined. Did you forget to import it?`,
          fix: `Check if you need: import ${match[1]} from '...'`
        });
      }
    }

    // Module not found
    if (errorMessage.includes('Cannot find module') || stack?.includes('Module not found')) {
      suggestions.push({
        type: 'module-not-found',
        message: 'Module import failed',
        fix: 'Check file paths and verify the module exists. Look for typos in import statements.'
      });
    }

    // Hook errors
    if (errorMessage.includes('Invalid hook call') || errorMessage.includes('Hooks can only be called')) {
      suggestions.push({
        type: 'hook-error',
        message: 'React Hooks error detected',
        fix: 'Ensure hooks are called at the top level of function components, not inside loops, conditions, or nested functions.'
      });
    }

    // Props error
    if (errorMessage.includes('Cannot read properties of undefined')) {
      suggestions.push({
        type: 'undefined-prop',
        message: 'Trying to access property of undefined',
        fix: 'Use optional chaining (?.) or provide default values. Example: obj?.prop || defaultValue'
      });
    }

    return suggestions;
  }

  parseStackTrace(stack) {
    if (!stack) return [];
    
    const lines = stack.split('\n');
    const parsed = [];
    
    lines.forEach(line => {
      // Match stack trace lines like "at Component (file.jsx:line:col)"
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        parsed.push({
          function: match[1],
          file: match[2].split('/').pop(),
          line: match[3],
          column: match[4],
          fullPath: match[2]
        });
      }
    });
    
    return parsed;
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleClearHistory = () => {
    this.setState({ errorHistory: [] });
  };

  copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorHistory } = this.state;
      const stackTrace = this.parseStackTrace(error?.stack);
      const suggestions = this.getErrorSuggestions(error?.toString() || '', error?.stack);

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-xl border-l-4 border-red-500 p-6 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Application Error</h1>
                    <p className="text-gray-600 mt-1">Something went wrong. Here's what we know:</p>
                  </div>
                </div>
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>

            {/* Error Message */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-red-500 text-white rounded flex items-center justify-center text-sm">1</span>
                Error Message
              </h2>
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <p className="text-red-800 font-mono text-sm break-all">{error?.toString()}</p>
              </div>
              <button
                onClick={() => this.copyToClipboard(error?.toString())}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                📋 Copy error message
              </button>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-yellow-500 text-white rounded flex items-center justify-center text-sm">💡</span>
                  Suggestions
                </h2>
                <div className="space-y-3">
                  {suggestions.map((suggestion, idx) => (
                    <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-4">
                      <p className="font-semibold text-yellow-900 mb-1">{suggestion.message}</p>
                      <p className="text-yellow-800 text-sm">{suggestion.fix}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stack Trace */}
            {stackTrace.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-500 text-white rounded flex items-center justify-center text-sm">2</span>
                  Stack Trace (Error Chain)
                </h2>
                <div className="bg-gray-50 rounded p-4 space-y-2 max-h-96 overflow-y-auto">
                  {stackTrace.map((trace, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2 hover:bg-gray-100 rounded">
                      <span className="text-gray-400 font-mono text-xs mt-1">{idx + 1}</span>
                      <div className="flex-1">
                        <p className="font-mono text-sm text-gray-900">{trace.function}</p>
                        <p className="font-mono text-xs text-gray-600">
                          {trace.file}:{trace.line}:{trace.column}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => this.copyToClipboard(error?.stack)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  📋 Copy full stack trace
                </button>
              </div>
            )}

            {/* Component Stack */}
            {errorInfo?.componentStack && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-500 text-white rounded flex items-center justify-center text-sm">3</span>
                  Component Stack
                </h2>
                <pre className="bg-gray-50 rounded p-4 text-xs overflow-x-auto">
                  <code className="text-gray-800">{errorInfo.componentStack}</code>
                </pre>
                <button
                  onClick={() => this.copyToClipboard(errorInfo.componentStack)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  📋 Copy component stack
                </button>
              </div>
            )}

            {/* Error History */}
            {errorHistory.length > 1 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 bg-orange-500 text-white rounded flex items-center justify-center text-sm">📜</span>
                    Error History ({errorHistory.length} errors)
                  </h2>
                  <button
                    onClick={this.handleClearHistory}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear History
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {errorHistory.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-gray-600">{item.timestamp}</span>
                        <span className="text-xs text-red-600 font-semibold">Error #{idx + 1}</span>
                      </div>
                      <p className="text-gray-800 font-mono text-xs break-all">{item.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Developer Tips */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Developer Tips:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Check the browser console (F12) for additional details</li>
                <li>• Look for missing imports in files listed in the stack trace</li>
                <li>• Verify all file paths are correct</li>
                <li>• Check for typos in variable/function names</li>
                <li>• Ensure all required props are passed to components</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
