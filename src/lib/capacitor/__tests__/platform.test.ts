import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isNativePlatform, useNativePlatform } from "../platform";

const platform = vi.hoisted(() => ({ native: false }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => platform.native } }));

describe("Capacitor platform boundary", () => {
  it("defers the platform decision in real React server rendering", () => {
    platform.native = true;
    function Probe() {
      const native = useNativePlatform();
      return React.createElement("p", null, native === undefined ? "pending" : String(native));
    }
    expect(renderToStaticMarkup(React.createElement(Probe))).toBe("<p>pending</p>");
  });
  it("uses the native bridge rather than the Android browser user agent", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/120" });
    platform.native = false;
    expect(isNativePlatform()).toBe(false);
    platform.native = true;
    expect(isNativePlatform()).toBe(true);
    vi.unstubAllGlobals();
  });
});
