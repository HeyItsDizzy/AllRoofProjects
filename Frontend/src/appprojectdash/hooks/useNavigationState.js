/**
 * NAVIGATION STATE HOOK
 * Manages active module and navigation state
 */
import { useState, useCallback } from 'react';

export const useNavigationState = (initialModule = 'dashboard') => {
  const [activeModule, setActiveModule] = useState(initialModule);
  const [navigationHistory, setNavigationHistory] = useState([initialModule]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const navigateTo = useCallback((moduleId) => {
    setActiveModule(moduleId);
    setNavigationHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, moduleId];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setActiveModule(navigationHistory[historyIndex - 1]);
    }
  }, [historyIndex, navigationHistory]);

  const goForward = useCallback(() => {
    if (historyIndex < navigationHistory.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setActiveModule(navigationHistory[historyIndex + 1]);
    }
  }, [historyIndex, navigationHistory]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < navigationHistory.length - 1;

  return {
    activeModule,
    navigateTo,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    navigationHistory,
  };
};
