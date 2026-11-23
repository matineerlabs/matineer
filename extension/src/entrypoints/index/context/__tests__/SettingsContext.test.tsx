import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import {
  SettingsProvider,
  useSettings,
  useOptionalSettings,
} from "../SettingsContext";
import { DEFAULT_APP_SETTINGS } from "../../../../shared/types/settings";
import { UserMovieStatus } from "../../../../shared/types/movie";
import * as clientApi from "../../api/client";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("SettingsContext", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
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
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("provides initial default settings", () => {
    let capturedSettings: any = null;

    const TestComponent = () => {
      const { settings } = useSettings();
      capturedSettings = settings;
      return <div>Settings Ready</div>;
    };

    act(() => {
      root!.render(
        <SettingsProvider initialSettings={DEFAULT_APP_SETTINGS}>
          <TestComponent />
        </SettingsProvider>
      );
    });

    expect(capturedSettings).toEqual(DEFAULT_APP_SETTINGS);
    expect(capturedSettings.preferPremiumFormats).toBe(true);
    expect(capturedSettings.showRatings).toBe(true);
    expect(capturedSettings.rankNonAListLast).toBe(false);
  });

  it("updates settings and saves them", async () => {
    let updateFn: any = null;
    let currentSettings: any = null;

    const TestComponent = () => {
      const { settings, updateSettings } = useSettings();
      currentSettings = settings;
      updateFn = updateSettings;
      return <div>Settings</div>;
    };

    act(() => {
      root!.render(
        <SettingsProvider initialSettings={DEFAULT_APP_SETTINGS}>
          <TestComponent />
        </SettingsProvider>
      );
    });

    await act(async () => {
      await updateFn({ preferPremiumFormats: false, defaultTrailerMin: 30 });
    });

    expect(currentSettings.preferPremiumFormats).toBe(false);
    expect(currentSettings.defaultTrailerMin).toBe(30);
  });

  it("triggers history reset and invokes callback", async () => {
    const mockReset = vi.spyOn(clientApi, "resetMovieStatuses").mockResolvedValue(5);
    const onResetSpy = vi.fn();
    let resetFn: any = null;

    const TestComponent = () => {
      const { resetHistory } = useSettings();
      resetFn = resetHistory;
      return <div>Reset Test</div>;
    };

    act(() => {
      root!.render(
        <SettingsProvider initialSettings={DEFAULT_APP_SETTINGS} onHistoryReset={onResetSpy}>
          <TestComponent />
        </SettingsProvider>
      );
    });

    let count = 0;
    await act(async () => {
      count = await resetFn(UserMovieStatus.SEEN);
    });

    expect(mockReset).toHaveBeenCalledWith(UserMovieStatus.SEEN);
    expect(count).toBe(5);
    expect(onResetSpy).toHaveBeenCalledWith(UserMovieStatus.SEEN, 5);
  });

  it("throws error when useSettings is used outside provider", () => {
    const BrokenComponent = () => {
      useSettings();
      return null;
    };

    expect(() => {
      act(() => {
        root!.render(<BrokenComponent />);
      });
    }).toThrow("useSettings must be used within a SettingsProvider");
  });

  it("returns null when useOptionalSettings is used outside provider", () => {
    let optionalResult: any = "unset";
    const SafeComponent = () => {
      optionalResult = useOptionalSettings();
      return null;
    };

    act(() => {
      root!.render(<SafeComponent />);
    });

    expect(optionalResult).toBeNull();
  });
});
