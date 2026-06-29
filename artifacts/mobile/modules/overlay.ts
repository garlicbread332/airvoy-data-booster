import { NativeModules, Platform } from "react-native";

const Native = NativeModules.OverlayModule as {
  checkPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  startOverlay: () => Promise<boolean>;
  stopOverlay: () => Promise<boolean>;
  updateOverlay: (ads: number, data: number) => Promise<boolean>;
  isOverlayRunning: () => Promise<boolean>;
} | null;

const isAndroid = Platform.OS === "android";

export const Overlay = {
  isAvailable: isAndroid && !!Native,

  checkPermission: (): Promise<boolean> => {
    if (!isAndroid || !Native) return Promise.resolve(false);
    return Native.checkPermission();
  },

  requestPermission: (): Promise<boolean> => {
    if (!isAndroid || !Native) return Promise.resolve(false);
    return Native.requestPermission();
  },

  start: (): Promise<boolean> => {
    if (!isAndroid || !Native) return Promise.resolve(false);
    return Native.startOverlay();
  },

  stop: (): Promise<boolean> => {
    if (!isAndroid || !Native) return Promise.resolve(false);
    return Native.stopOverlay();
  },

  update: (ads: number, data: number): Promise<boolean> => {
    if (!isAndroid || !Native) return Promise.resolve(false);
    return Native.updateOverlay(ads, data);
  },

  isRunning: (): Promise<boolean> => {
    if (!isAndroid || !Native) return Promise.resolve(false);
    return Native.isOverlayRunning();
  },
};
