/**
 * Optimistic UI Hook for Driver App
 *
 * Industry-standard pattern for responsive UIs:
 * 1. Update UI immediately (optimistic update)
 * 2. Make API call in background
 * 3. If API fails, revert to previous state
 *
 * Usage:
 *   const { execute, isLoading, error } = useOptimisticAction({
 *     action: () => api.updateStatus('delivered'),
 *     onOptimisticUpdate: (prev) => ({ ...prev, status: 'delivered' }),
 *     onSuccess: (result) => console.log('Done!'),
 *     onError: (error) => Alert.alert('Error', error.message),
 *   });
 */

import { useState, useCallback, useRef } from 'react';

interface OptimisticActionOptions<TData, TResult> {
  // The async action to perform (API call)
  action: () => Promise<TResult>;

  // Function to compute optimistic state (called before API)
  onOptimisticUpdate?: (previousData: TData | null) => TData;

  // Called with the result on success
  onSuccess?: (result: TResult) => void;

  // Called with error on failure (after rollback)
  onError?: (error: Error) => void;

  // Called to rollback state on failure (receives previous data)
  onRollback?: (previousData: TData | null) => void;

  // Current data to update optimistically
  currentData?: TData | null;
}

interface OptimisticActionResult<TResult> {
  execute: () => Promise<TResult | null>;
  isLoading: boolean;
  error: Error | null;
  clearError: () => void;
}

export function useOptimisticAction<TData, TResult>(
  options: OptimisticActionOptions<TData, TResult>
): OptimisticActionResult<TResult> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const previousDataRef = useRef<TData | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const execute = useCallback(async (): Promise<TResult | null> => {
    const {
      action,
      onOptimisticUpdate,
      onSuccess,
      onError,
      onRollback,
      currentData,
    } = options;

    // Store previous state for potential rollback
    previousDataRef.current = currentData ?? null;

    // Clear any previous error
    setError(null);
    setIsLoading(true);

    // Apply optimistic update immediately
    if (onOptimisticUpdate) {
      try {
        onOptimisticUpdate(previousDataRef.current);
      } catch (e) {
        console.warn('[OptimisticAction] Error in optimistic update:', e);
      }
    }

    try {
      // Execute the actual API call
      const result = await action();

      // Success - call success callback
      if (onSuccess) {
        onSuccess(result);
      }

      setIsLoading(false);
      return result;
    } catch (e) {
      const errorObj = e instanceof Error ? e : new Error(String(e));

      console.warn('[OptimisticAction] API call failed, rolling back:', errorObj.message);

      // Rollback to previous state
      if (onRollback) {
        try {
          onRollback(previousDataRef.current);
        } catch (rollbackError) {
          console.error('[OptimisticAction] Error during rollback:', rollbackError);
        }
      }

      // Set error state
      setError(errorObj);
      setIsLoading(false);

      // Call error callback
      if (onError) {
        onError(errorObj);
      }

      return null;
    }
  }, [options]);

  return {
    execute,
    isLoading,
    error,
    clearError,
  };
}

/**
 * Simplified version for status updates
 * Pre-configured for common driver actions like status changes
 */
interface StatusActionOptions<TStatus> {
  currentStatus: TStatus;
  newStatus: TStatus;
  apiCall: () => Promise<void>;
  onStatusChange: (status: TStatus) => void;
  onError?: (error: Error) => void;
}

export function useStatusAction<TStatus>(
  options: StatusActionOptions<TStatus>
): OptimisticActionResult<void> {
  const { currentStatus, newStatus, apiCall, onStatusChange, onError } = options;

  return useOptimisticAction<TStatus, void>({
    action: apiCall,
    currentData: currentStatus,
    onOptimisticUpdate: () => {
      onStatusChange(newStatus);
      return newStatus;
    },
    onRollback: () => {
      onStatusChange(currentStatus);
    },
    onError,
  });
}

export default useOptimisticAction;