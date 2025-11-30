import { useState, useCallback, useEffect } from 'react';

// Command interface for undo/redo pattern
export interface Command<T> {
  execute: () => T;
  undo: () => T;
  description: string;
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
) {
  const { maxHistorySize = 50 } = options;

  const [state, setState] = useState<T>(initialState);
  const [history, setHistory] = useState<Command<T>[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1;

  // Execute a command and add it to history
  const executeCommand = useCallback(
    (command: Command<T>) => {
      const newState = command.execute();
      setState(newState);

      // Remove any commands after current index (when undoing then making new change)
      const newHistory = history.slice(0, currentIndex + 1);
      newHistory.push(command);

      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      } else {
        setCurrentIndex((prev) => prev + 1);
      }

      setHistory(newHistory);
    },
    [history, currentIndex, maxHistorySize]
  );

  // Undo the last command
  const undo = useCallback(() => {
    if (!canUndo) return;

    const command = history[currentIndex];
    const newState = command.undo();
    setState(newState);
    setCurrentIndex((prev) => prev - 1);
  }, [canUndo, history, currentIndex]);

  // Redo the next command
  const redo = useCallback(() => {
    if (!canRedo) return;

    const command = history[currentIndex + 1];
    const newState = command.execute();
    setState(newState);
    setCurrentIndex((prev) => prev + 1);
  }, [canRedo, history, currentIndex]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  // Get current command description
  const getCurrentCommand = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < history.length) {
      return history[currentIndex].description;
    }
    return null;
  }, [currentIndex, history]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y or Cmd+Shift+Z for redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    state,
    setState,
    executeCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    getCurrentCommand,
    historyLength: history.length,
    currentIndex,
  };
}
