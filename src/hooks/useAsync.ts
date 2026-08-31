import { useCallback, useEffect, useRef, useState } from 'react';
import { AppError } from '@/types';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-runs the loader, e.g. after a mutation or from an error state. */
  reload: () => void;
  /** Replaces the loaded value without a round trip. */
  setData: (value: T) => void;
}

export function messageFromError(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Runs an async loader and tracks loading/error/data.
 *
 * `deps` behaves like a `useEffect` dependency list. Results from a superseded
 * run are discarded so a slow response cannot overwrite a newer one.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[],
  options: { enabled?: boolean } = {},
): AsyncState<T> {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const runId = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    runId.current += 1;
    const currentRun = runId.current;
    let cancelled = false;

    setLoading(true);
    setError(null);

    loaderRef
      .current()
      .then((result) => {
        if (cancelled || currentRun !== runId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (cancelled || currentRun !== runId.current) return;
        setError(messageFromError(caught));
      })
      .finally(() => {
        if (cancelled || currentRun !== runId.current) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { data, loading, error, reload, setData };
}

/**
 * Wraps a mutation so a button can be disabled while it is in flight, which is
 * how duplicate submissions are prevented throughout the app.
 */
export function useMutation<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
): {
  run: (...args: TArgs) => Promise<TResult | null>;
  pending: boolean;
  error: string | null;
  clearError: () => void;
} {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const actionRef = useRef(action);
  actionRef.current = action;

  const run = useCallback(async (...args: TArgs): Promise<TResult | null> => {
    // Guards against a double click landing before React re-renders.
    if (inFlight.current) return null;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      return await actionRef.current(...args);
    } catch (caught) {
      setError(messageFromError(caught));
      return null;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, []);

  return { run, pending, error, clearError: useCallback(() => setError(null), []) };
}
