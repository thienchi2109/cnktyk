import { useEffect, useState } from 'react';

/**
 * Custom hook for debouncing values
 * Delays updating the value until after the specified delay has passed
 * since the last change.
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 * 
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 300);
 * 
 * useEffect(() => {
 *   // API call will only happen after user stops typing for 300ms
 *   fetchData(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay expires
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for debouncing callbacks
 * Returns a debounced version of the provided callback function
 * 
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns A debounced version of the callback
 * 
 * @example
 * ```tsx
 * const handleSearch = useDebouncedCallback((term: string) => {
 *   fetchData(term);
 * }, 300);
 * 
 * <input onChange={(e) => handleSearch(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  useEffect(() => {
    // Cleanup function
    return () => {
      // Any cleanup if needed
    };
  }, [callback, delay]);

  return (...args: Parameters<T>) => {
    const handler = setTimeout(() => {
      callback(...args);
    }, delay);

    // Store the timeout ID for potential cleanup
    return () => clearTimeout(handler);
  };
}
