import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { DualRangeSlider } from "../DualRangeSlider";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function setNativeValue(element: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("DualRangeSlider", () => {
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
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  it("renders both min and max input handles", () => {
    act(() => {
      root!.render(
        <DualRangeSlider
          minValue={-15}
          maxValue={20}
          minBound={-25}
          maxBound={60}
          step={5}
          onMinChange={vi.fn()}
          onMaxChange={vi.fn()}
        />
      );
    });

    const inputs = container!.querySelectorAll("input[type='range']");
    expect(inputs.length).toBe(2);

    const minInput = inputs[0] as HTMLInputElement;
    const maxInput = inputs[1] as HTMLInputElement;

    expect(minInput.value).toBe("-15");
    expect(minInput.min).toBe("-25");
    expect(minInput.max).toBe("60");

    expect(maxInput.value).toBe("20");
    expect(maxInput.min).toBe("-25");
    expect(maxInput.max).toBe("60");
  });

  it("renders striped trailer zone and zero tick line when minBound < 0", () => {
    act(() => {
      root!.render(
        <DualRangeSlider
          minValue={-15}
          maxValue={20}
          minBound={-25}
          maxBound={60}
          onMinChange={vi.fn()}
          onMaxChange={vi.fn()}
        />
      );
    });

    // Striped background track for trailer zone
    const stripedZone = container!.querySelector(".bg-hatched-track-subtle");
    expect(stripedZone).toBeDefined();

    // Active muted slate hatched segment for trailer skipping
    const activeMutedHatched = container!.querySelector(".bg-hatched-trailers-muted");
    expect(activeMutedHatched).toBeDefined();

    // Zero marker tick line
    const zeroMarker = container!.querySelector("[title='Ticketed Showtime (0m)']");
    expect(zeroMarker).toBeDefined();
  });

  it("sets accessible aria-valuetext reflecting trailer skip and Showtime collapse", () => {
    // 1. Negative minValue (skipping trailers)
    act(() => {
      root!.render(
        <DualRangeSlider
          minValue={-15}
          maxValue={20}
          minBound={-25}
          maxBound={60}
          onMinChange={vi.fn()}
          onMaxChange={vi.fn()}
        />
      );
    });

    let inputs = container!.querySelectorAll("input[type='range']");
    expect(inputs[0]!.getAttribute("aria-valuetext")).toBe("Skip 15m trailers");
    expect(inputs[1]!.getAttribute("aria-valuetext")).toBe("Wait up to 20m");

    // 2. Resting at 0 (collapsed to At Showtime)
    act(() => {
      root!.render(
        <DualRangeSlider
          minValue={0}
          maxValue={20}
          minBound={-25}
          maxBound={60}
          onMinChange={vi.fn()}
          onMaxChange={vi.fn()}
        />
      );
    });

    inputs = container!.querySelectorAll("input[type='range']");
    expect(inputs[0]!.getAttribute("aria-valuetext")).toBe("At Showtime");
    expect(inputs[1]!.getAttribute("aria-valuetext")).toBe("Wait up to 20m");
  });

  it("enforces minimum gap on min change", () => {
    const onMinChangeSpy = vi.fn();
    act(() => {
      root!.render(
        <DualRangeSlider
          minValue={0}
          maxValue={15}
          minBound={-25}
          maxBound={60}
          step={5}
          minGap={5}
          onMinChange={onMinChangeSpy}
          onMaxChange={vi.fn()}
        />
      );
    });

    const inputs = container!.querySelectorAll("input[type='range']");
    const minInput = inputs[0] as HTMLInputElement;

    act(() => {
      setNativeValue(minInput, "20");
    });

    expect(onMinChangeSpy).toHaveBeenCalledWith(10);
  });

  it("enforces minimum gap on max change", () => {
    const onMaxChangeSpy = vi.fn();
    act(() => {
      root!.render(
        <DualRangeSlider
          minValue={10}
          maxValue={25}
          minBound={-25}
          maxBound={60}
          step={5}
          minGap={5}
          onMinChange={vi.fn()}
          onMaxChange={onMaxChangeSpy}
        />
      );
    });

    const inputs = container!.querySelectorAll("input[type='range']");
    const maxInput = inputs[1] as HTMLInputElement;

    act(() => {
      setNativeValue(maxInput, "5");
    });

    expect(onMaxChangeSpy).toHaveBeenCalledWith(15);
  });
});
