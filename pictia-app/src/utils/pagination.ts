import { PaginationOptions } from '../types/googlePhotos';

/**
 * Pagination utilities for handling large photo collections
 */

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems?: number | undefined;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPageToken?: string | undefined;
  previousPageTokens: string[];
}

export interface PaginationConfig {
  defaultPageSize: number;
  maxPageSize: number;
  prefetchPages: number;
}

export const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  defaultPageSize: 50,
  maxPageSize: 100,
  prefetchPages: 2,
};

/**
 * Create initial pagination state
 */
export function createPaginationState(
  pageSize: number = DEFAULT_PAGINATION_CONFIG.defaultPageSize
): PaginationState {
  return {
    currentPage: 1,
    pageSize: Math.min(pageSize, DEFAULT_PAGINATION_CONFIG.maxPageSize),
    hasNextPage: false,
    hasPreviousPage: false,
    previousPageTokens: [],
  };
}

/**
 * Update pagination state after receiving new data
 */
export function updatePaginationState(
  currentState: PaginationState,
  nextPageToken?: string,
  totalItems?: number
): PaginationState {
  const newState: PaginationState = {
    ...currentState,
    hasNextPage: !!nextPageToken,
  };
  
  if (nextPageToken !== undefined) {
    newState.nextPageToken = nextPageToken;
  }
  
  if (totalItems !== undefined) {
    newState.totalItems = totalItems;
  }
  
  return newState;
}

/**
 * Navigate to next page
 */
export function goToNextPage(currentState: PaginationState): PaginationState {
  if (!currentState.hasNextPage || !currentState.nextPageToken) {
    return currentState;
  }

  return {
    ...currentState,
    currentPage: currentState.currentPage + 1,
    hasPreviousPage: true,
    previousPageTokens: [
      ...currentState.previousPageTokens,
      currentState.nextPageToken,
    ],
    // These will be updated when new data is received
    hasNextPage: false,
    nextPageToken: undefined,
  };
}

/**
 * Navigate to previous page
 */
export function goToPreviousPage(currentState: PaginationState): PaginationState {
  if (!currentState.hasPreviousPage || currentState.previousPageTokens.length === 0) {
    return currentState;
  }

  const newPreviousTokens = [...currentState.previousPageTokens];
  const previousToken = newPreviousTokens.pop();

  return {
    ...currentState,
    currentPage: Math.max(1, currentState.currentPage - 1),
    hasPreviousPage: newPreviousTokens.length > 0,
    previousPageTokens: newPreviousTokens,
    nextPageToken: previousToken,
    hasNextPage: true,
  };
}

/**
 * Reset pagination to first page
 */
export function resetPagination(
  currentState: PaginationState,
  newPageSize?: number
): PaginationState {
  return createPaginationState(newPageSize || currentState.pageSize);
}

/**
 * Get pagination options for API call
 */
export function getPaginationOptions(state: PaginationState): PaginationOptions {
  return {
    pageSize: state.pageSize,
    pageToken: state.currentPage === 1 ? undefined : state.nextPageToken,
  };
}

/**
 * Calculate total pages if total items is known
 */
export function getTotalPages(state: PaginationState): number | undefined {
  if (!state.totalItems) {
    return undefined;
  }
  return Math.ceil(state.totalItems / state.pageSize);
}

/**
 * Get pagination info for display
 */
export function getPaginationInfo(state: PaginationState): {
  currentPage: number;
  totalPages?: number | undefined;
  startItem: number;
  endItem: number;
  totalItems?: number | undefined;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} {
  const startItem = (state.currentPage - 1) * state.pageSize + 1;
  const endItem = Math.min(
    state.currentPage * state.pageSize,
    state.totalItems || state.currentPage * state.pageSize
  );

  return {
    currentPage: state.currentPage,
    totalPages: getTotalPages(state),
    startItem,
    endItem,
    totalItems: state.totalItems,
    hasNextPage: state.hasNextPage,
    hasPreviousPage: state.hasPreviousPage,
  };
}

/**
 * Pagination hook for React components
 */
export function usePagination(
  initialPageSize: number = DEFAULT_PAGINATION_CONFIG.defaultPageSize
) {
  const [paginationState, setPaginationState] = React.useState(() =>
    createPaginationState(initialPageSize)
  );

  const goNext = React.useCallback(() => {
    setPaginationState(goToNextPage);
  }, []);

  const goPrevious = React.useCallback(() => {
    setPaginationState(goToPreviousPage);
  }, []);

  const reset = React.useCallback((newPageSize?: number) => {
    setPaginationState(current => resetPagination(current, newPageSize));
  }, []);

  const updateState = React.useCallback((nextPageToken?: string, totalItems?: number) => {
    setPaginationState(current => updatePaginationState(current, nextPageToken, totalItems));
  }, []);

  const paginationOptions = React.useMemo(
    () => getPaginationOptions(paginationState),
    [paginationState]
  );

  const paginationInfo = React.useMemo(
    () => getPaginationInfo(paginationState),
    [paginationState]
  );

  return {
    paginationState,
    paginationOptions,
    paginationInfo,
    goNext,
    goPrevious,
    reset,
    updateState,
  };
}

import React from 'react';

/**
 * Infinite scroll pagination state
 */
export interface InfiniteScrollState {
  items: any[];
  nextPageToken?: string | undefined;
  isLoading: boolean;
  hasMore: boolean;
  error?: string | undefined;
}

/**
 * Create initial infinite scroll state
 */
export function createInfiniteScrollState(): InfiniteScrollState {
  return {
    items: [],
    nextPageToken: undefined,
    isLoading: false,
    hasMore: true,
    error: undefined,
  };
}

/**
 * Update infinite scroll state with new items
 */
export function updateInfiniteScrollState(
  currentState: InfiniteScrollState,
  newItems: any[],
  nextPageToken?: string,
  error?: string
): InfiniteScrollState {
  return {
    items: [...currentState.items, ...newItems],
    nextPageToken,
    isLoading: false,
    hasMore: !!nextPageToken && !error,
    error,
  };
}

/**
 * Set loading state for infinite scroll
 */
export function setInfiniteScrollLoading(
  currentState: InfiniteScrollState,
  isLoading: boolean
): InfiniteScrollState {
  return {
    ...currentState,
    isLoading,
    error: isLoading ? undefined : currentState.error,
  };
}

/**
 * Reset infinite scroll state
 */
export function resetInfiniteScroll(): InfiniteScrollState {
  return createInfiniteScrollState();
}

/**
 * Batch processing utilities for large datasets
 */
export interface BatchProcessor<T> {
  batchSize: number;
  processBatch: (batch: T[]) => Promise<void>;
  onProgress?: (processed: number, total: number) => void;
  onError?: (error: Error, batch: T[]) => void;
}

/**
 * Process items in batches
 */
export async function processBatches<T>(
  items: T[],
  processor: BatchProcessor<T>
): Promise<void> {
  const { batchSize, processBatch, onProgress, onError } = processor;
  let processed = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    try {
      await processBatch(batch);
      processed += batch.length;
      onProgress?.(processed, items.length);
    } catch (error) {
      onError?.(error as Error, batch);
      // Continue processing other batches
    }
  }
}

/**
 * Debounce utility for search/filter operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}