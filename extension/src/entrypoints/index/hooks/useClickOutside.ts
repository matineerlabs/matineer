import { useEffect, RefObject } from "react";

export interface UseClickOutsideOptions<T extends HTMLElement = HTMLElement> {
  ref?: RefObject<T | null>;
  onClose: () => void;
  enabled?: boolean;
  ignoreSelector?: string;
  closeOnEscape?: boolean;
}

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  optionsOrRef: RefObject<T | null> | UseClickOutsideOptions<T>,
  handler?: () => void,
  enabled: boolean = true
) {
  const isOptions =
    typeof (optionsOrRef as UseClickOutsideOptions<T>)?.onClose === "function";

  const ref = isOptions
    ? (optionsOrRef as UseClickOutsideOptions<T>).ref
    : (optionsOrRef as RefObject<T | null>);

  const onClose = isOptions
    ? (optionsOrRef as UseClickOutsideOptions<T>).onClose
    : handler!;

  const isEnabled = isOptions
    ? (optionsOrRef as UseClickOutsideOptions<T>).enabled ?? true
    : enabled;

  const ignoreSelector = isOptions
    ? (optionsOrRef as UseClickOutsideOptions<T>).ignoreSelector
    : undefined;

  const closeOnEscape = isOptions
    ? (optionsOrRef as UseClickOutsideOptions<T>).closeOnEscape ?? true
    : true;

  useEffect(() => {
    if (!isEnabled) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (ignoreSelector && target.closest?.(ignoreSelector)) {
        return;
      }

      if (ref?.current) {
        if (ref.current.contains(target as Node)) {
          return;
        }
      }

      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, onClose, isEnabled, ignoreSelector, closeOnEscape]);
}
