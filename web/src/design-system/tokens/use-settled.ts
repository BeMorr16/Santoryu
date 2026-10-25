import { useEffect, useState } from "react";

/**
 * `value` once it has stayed the same for `delay` ms, so a status announces where typing settles,
 * not every keystroke (ds-tokens R11.4). Timers are an external system, so this is an effect.
 */
export function useSettled<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSettled(value);
    }, delay);
    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delay]);
  return settled;
}
