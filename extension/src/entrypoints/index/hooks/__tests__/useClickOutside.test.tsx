import React, { useRef, act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { useClickOutside } from "../useClickOutside";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const TestComponent: React.FC<{
  onClose: () => void;
  enabled?: boolean;
  ignoreSelector?: string;
  closeOnEscape?: boolean;
}> = ({ onClose, enabled = true, ignoreSelector, closeOnEscape = true }) => {
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside({
    ref,
    onClose,
    enabled,
    ignoreSelector,
    closeOnEscape,
  });

  return (
    <div>
      <div ref={ref} id="inside">
        Inside content
      </div>
      <div id="outside">Outside content</div>
      <div id="ignored" className="ignore-me">
        Ignored content
      </div>
    </div>
  );
};

describe("useClickOutside", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root!.unmount();
      });
      root = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
  });

  it("calls onClose when clicking outside", () => {
    const onClose = vi.fn();
    act(() => {
      root!.render(<TestComponent onClose={onClose} />);
    });

    const outside = container!.querySelector("#outside");
    act(() => {
      outside!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking inside", () => {
    const onClose = vi.fn();
    act(() => {
      root!.render(<TestComponent onClose={onClose} />);
    });

    const inside = container!.querySelector("#inside");
    act(() => {
      inside!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    act(() => {
      root!.render(<TestComponent onClose={onClose} />);
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose on Escape if closeOnEscape is false", () => {
    const onClose = vi.fn();
    act(() => {
      root!.render(<TestComponent onClose={onClose} closeOnEscape={false} />);
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("respects ignoreSelector and does not close", () => {
    const onClose = vi.fn();
    act(() => {
      root!.render(<TestComponent onClose={onClose} ignoreSelector=".ignore-me" />);
    });

    const ignored = container!.querySelector("#ignored");
    act(() => {
      ignored!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not call onClose when enabled is false", () => {
    const onClose = vi.fn();
    act(() => {
      root!.render(<TestComponent onClose={onClose} enabled={false} />);
    });

    const outside = container!.querySelector("#outside");
    act(() => {
      outside!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});
