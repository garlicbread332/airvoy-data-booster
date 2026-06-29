import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface AdSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  adsWatched: number;
  dataEarned: number;
  status: "active" | "completed" | "stopped";
}

export interface AppSettings {
  simSlot: "SIM 1" | "SIM 2";
  autoWatchEnabled: boolean;
  dailyTarget: number;
  maxAdsPerSession: number;
  adDelay: number;
}

interface AppContextType {
  totalDataEarned: number;
  todayDataEarned: number;
  sessions: AdSession[];
  currentSession: AdSession | null;
  settings: AppSettings;
  isWatching: boolean;
  adsWatchedToday: number;
  startSession: () => void;
  stopSession: () => void;
  adCompleted: () => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  clearHistory: () => void;
}

const defaultSettings: AppSettings = {
  simSlot: "SIM 1",
  autoWatchEnabled: false,
  dailyTarget: 500,
  maxAdsPerSession: 20,
  adDelay: 3,
};

const AppContext = createContext<AppContextType | null>(null);

const DATA_PER_AD = 15;
const STORAGE_SESSIONS = "airvoy_sessions";
const STORAGE_SETTINGS = "airvoy_settings";
const STORAGE_TOTAL = "airvoy_total";

function todayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<AdSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AdSession | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isWatching, setIsWatching] = useState(false);
  const [totalDataEarned, setTotalDataEarned] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [rawSessions, rawSettings, rawTotal] = await Promise.all([
          AsyncStorage.getItem(STORAGE_SESSIONS),
          AsyncStorage.getItem(STORAGE_SETTINGS),
          AsyncStorage.getItem(STORAGE_TOTAL),
        ]);
        if (rawSessions) setSessions(JSON.parse(rawSessions));
        if (rawSettings) setSettings({ ...defaultSettings, ...JSON.parse(rawSettings) });
        if (rawTotal) setTotalDataEarned(Number(rawTotal));
      } catch {}
    })();
  }, []);

  const todayDataEarned = sessions
    .filter((s) => s.startedAt >= todayStart() && s.status !== "active")
    .reduce((sum, s) => sum + s.dataEarned, 0) + (currentSession?.dataEarned ?? 0);

  const adsWatchedToday = sessions
    .filter((s) => s.startedAt >= todayStart() && s.status !== "active")
    .reduce((sum, s) => sum + s.adsWatched, 0) + (currentSession?.adsWatched ?? 0);

  const persistSessions = useCallback(async (s: AdSession[]) => {
    await AsyncStorage.setItem(STORAGE_SESSIONS, JSON.stringify(s));
  }, []);

  const startSession = useCallback(() => {
    const session: AdSession = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      startedAt: Date.now(),
      adsWatched: 0,
      dataEarned: 0,
      status: "active",
    };
    setCurrentSession(session);
    setIsWatching(true);
  }, []);

  const stopSession = useCallback(() => {
    if (!currentSession) return;
    const ended: AdSession = {
      ...currentSession,
      endedAt: Date.now(),
      status: currentSession.adsWatched > 0 ? "completed" : "stopped",
    };
    setCurrentSession(null);
    setIsWatching(false);
    setSessions((prev) => {
      const updated = [ended, ...prev].slice(0, 200);
      persistSessions(updated);
      return updated;
    });
    setTotalDataEarned((prev) => {
      const next = prev + ended.dataEarned;
      AsyncStorage.setItem(STORAGE_TOTAL, String(next));
      return next;
    });
  }, [currentSession, persistSessions]);

  const adCompleted = useCallback(() => {
    setCurrentSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        adsWatched: prev.adsWatched + 1,
        dataEarned: prev.dataEarned + DATA_PER_AD,
      };
    });
  }, []);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem(STORAGE_SETTINGS, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    setSessions([]);
    setTotalDataEarned(0);
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_SESSIONS),
      AsyncStorage.setItem(STORAGE_TOTAL, "0"),
    ]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        totalDataEarned,
        todayDataEarned,
        sessions,
        currentSession,
        settings,
        isWatching,
        adsWatchedToday,
        startSession,
        stopSession,
        adCompleted,
        updateSettings,
        clearHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
