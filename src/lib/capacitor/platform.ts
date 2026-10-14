"use client";

import { Capacitor } from "@capacitor/core";
import { useSyncExternalStore } from "react";

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

const subscribe = () => () => {};
const serverSnapshot = () => undefined;

// Keep purchase UI hidden in server HTML and through the hydration render.
export function useNativePlatform(): boolean | undefined {
  return useSyncExternalStore(subscribe, isNativePlatform, serverSnapshot);
}
