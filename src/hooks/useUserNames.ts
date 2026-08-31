import { useEffect, useState } from 'react';
import { directoryService } from '@/services';

let cache: Record<string, string> | null = null;
let inFlight: Promise<Record<string, string>> | null = null;

/**
 * Resolves audit UIDs to display names, e.g. "Created by: Ravi Kumar".
 *
 * Names are fetched once per session and shared across every component, so a
 * long visit timeline does not issue one lookup per row.
 */
export function useUserNames(): (uid: string) => string {
  const [names, setNames] = useState<Record<string, string>>(cache ?? {});

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    inFlight ??= directoryService.getUserNames();
    void inFlight
      .then((result) => {
        cache = result;
        if (!cancelled) setNames(result);
      })
      .catch(() => {
        // Falls back to the raw UID; not worth surfacing to staff.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (uid: string) => names[uid] ?? 'Unknown user';
}
