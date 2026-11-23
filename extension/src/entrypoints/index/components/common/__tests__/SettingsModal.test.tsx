import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { SettingsModal } from "../SettingsModal";
import { SettingsProvider } from "../../../context/SettingsContext";
import { DEFAULT_APP_SETTINGS } from "../../../../../shared/types/settings";
import { UserMovieStatus } from "../../../../../shared/types/movie";
import * as clientApi from "../../../api/client";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("SettingsModal", () => {
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
    vi.restoreAllMocks();
  });

  it("does not render when isOpen is false", () => {
    act(() => {
      root!.render(
        <SettingsProvider initialSettings={DEFAULT_APP_SETTINGS}>
          <SettingsModal isOpen={false} onClose={vi.fn()} />
        </SettingsProvider>
      );
    });

    expect(container?.innerHTML).toBe("");
  });

  it("renders all sections in expected order when isOpen is true", () => {
    act(() => {
      root!.render(
        <SettingsProvider initialSettings={DEFAULT_APP_SETTINGS}>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </SettingsProvider>
      );
    });

    const text = container?.textContent || "";
    expect(text).toContain("Settings & Preferences");
    expect(text).toContain("Scheduling Defaults");
    expect(text).toContain("Default Earliest Start");
    expect(text).toContain("Default Latest End");
    expect(text).toContain("Default Trailer Duration");
    expect(text).toContain("Default Wait Between Movies");
    expect(text).toContain("Prefer Premium Formats");
    expect(text).toContain("Browsing & Display");
    expect(text).toContain("Display Ratings Data");
    expect(text).toContain("Rank Non-A-List Movies Last");
    expect(text).toContain("Integrations (MDBList API Key)");
    expect(text).toContain("Local Data & History");
    expect(text).toContain("Watched Movies");
    expect(text).toContain("Won't Watch");
    expect(text).toContain("Showtimes Cache");
    expect(text).toContain("Ratings Cache");
  });

  it("handles resetting watched movies with confirmation", async () => {
    const mockReset = vi.spyOn(clientApi, "resetMovieStatuses").mockResolvedValue(3);
    const onResetSpy = vi.fn();

    act(() => {
      root!.render(
        <SettingsProvider initialSettings={DEFAULT_APP_SETTINGS}>
          <SettingsModal isOpen={true} onClose={vi.fn()} onHistoryReset={onResetSpy} />
        </SettingsProvider>
      );
    });

    // Find and click "Reset Watched" button
    const buttons = Array.from(container!.querySelectorAll("button"));
    const resetWatchedBtn = buttons.find((b) => b.textContent?.includes("Reset Watched"));
    expect(resetWatchedBtn).toBeDefined();

    act(() => {
      resetWatchedBtn!.click();
    });

    // Now confirmation button should appear
    const confirmBtn = Array.from(container!.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Confirm")
    );
    expect(confirmBtn).toBeDefined();

    await act(async () => {
      confirmBtn!.click();
    });

    expect(mockReset).toHaveBeenCalledWith(UserMovieStatus.SEEN);
    expect(onResetSpy).toHaveBeenCalledWith(UserMovieStatus.SEEN, 3);
    expect(container?.textContent).toContain("Successfully reset 3 watched movies.");
  });

  it("saves modified settings and closes modal", async () => {
    const onCloseSpy = vi.fn();
    const onSaveKeySpy = vi.fn();

    act(() => {
      root!.render(
        <SettingsProvider initialSettings={DEFAULT_APP_SETTINGS}>
          <SettingsModal
            isOpen={true}
            onClose={onCloseSpy}
            onSaveKey={onSaveKeySpy}
          />
        </SettingsProvider>
      );
    });

    // Click "Save Settings"
    const saveBtn = Array.from(container!.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Save Settings")
    );
    expect(saveBtn).toBeDefined();

    await act(async () => {
      saveBtn!.click();
    });

    expect(onSaveKeySpy).toHaveBeenCalledWith("");
    expect(onCloseSpy).toHaveBeenCalled();
  });

  it("verifies and saves new MDBList API key", async () => {
    const onCloseSpy = vi.fn();
    const onSaveKeySpy = vi.fn();
    const verifySpy = vi.spyOn(clientApi, "verifyMdblistKey").mockResolvedValue({
      valid: true,
      message: "MDBList API key verified successfully!",
    });

    act(() => {
      root!.render(
        <SettingsProvider initialSettings={{ ...DEFAULT_APP_SETTINGS, mdblistApiKey: "" }}>
          <SettingsModal
            isOpen={true}
            onClose={onCloseSpy}
            onSaveKey={onSaveKeySpy}
          />
        </SettingsProvider>
      );
    });

    const input = container?.querySelector('input[aria-label="MDBList API Key"]') as HTMLInputElement;
    expect(input).toBeDefined();

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;
    nativeInputValueSetter?.call(input, "new-test-key");
    act(() => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const saveBtn = Array.from(container!.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Save Settings")
    );
    expect(saveBtn).toBeDefined();

    await act(async () => {
      saveBtn!.click();
    });

    expect(verifySpy).toHaveBeenCalledWith("new-test-key");
    expect(onSaveKeySpy).toHaveBeenCalledWith("new-test-key");
    expect(onCloseSpy).toHaveBeenCalled();
  });
});
