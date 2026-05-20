import { useCallback, useState } from "react";

const DEFAULT_WIDTH = 480;
const KEY_WIDTH = "iii-desktop:dock-width";
const KEY_OPEN = "iii-desktop:dock-open";

function readWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const stored = Number(window.localStorage.getItem(KEY_WIDTH));
  return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_WIDTH;
}

function readOpen(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY_OPEN) === "1";
}

export function useChatDock() {
  const [open, setOpenState] = useState<boolean>(() => readOpen());
  const [width, setWidthState] = useState<number>(() => readWidth());

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    try {
      window.localStorage.setItem(KEY_OPEN, next ? "1" : "0");
    } catch {
      // storage may be blocked
    }
  }, []);

  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  const setWidth = useCallback((next: number) => {
    setWidthState(next);
    try {
      window.localStorage.setItem(KEY_WIDTH, String(next));
    } catch {
      // storage may be blocked
    }
  }, []);

  return { open, setOpen, toggle, width, setWidth };
}
