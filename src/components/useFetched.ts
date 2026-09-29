"use client";

import { useEffect, useState } from "react";
import type { ApiResult } from "@/game/api";

/**
 * Load data when `key` changes. Returns undefined while loading, so callers
 * can show a skeleton. `retry` re-runs the same request.
 */
export function useFetched<T>(
  key: string,
  load: () => Promise<ApiResult<T>>,
): { result: ApiResult<T> | undefined; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; result: ApiResult<T> } | null>(null);
  const fullKey = `${key}#${attempt}`;

  useEffect(() => {
    let alive = true;
    load().then((result) => {
      if (alive) setState({ key: fullKey, result });
    });
    return () => {
      alive = false;
    };
    // `load` is derived from `key`; re-running on identity changes would refetch every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);

  return {
    result: state?.key === fullKey ? state.result : undefined,
    retry: () => setAttempt((n) => n + 1),
  };
}
