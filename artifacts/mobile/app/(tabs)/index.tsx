import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const STORAGE_KEY = "airvoy_booster_state";

type BotState = "idle" | "running" | "paused";

interface Stats {
  totalAdsWatched: number;
  sessionAdsWatched: number;
  sessionStartTime: number | null;
}

function StatusBadge({ state }: { state: BotState }) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === "running") {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state]);

  const badgeColor = state === "running" ? colors.success : state === "paused" ? colors.warning : colors.mutedForeground;
  const label = state === "running" ? "RUNNING" : state === "paused" ? "PAUSED" : "STOPPED";

  return (
    <View style={[styles.badge, { borderColor: badgeColor + "40", backgroundColor: badgeColor + "18" }]}>
      <Animated.View style={[styles.badgeDot, { backgroundColor: badgeColor, opacity: state === "running" ? pulseAnim : 1 }]} />
      <Text style={[styles.badgeText, { color: badgeColor }]}>{label}</Text>
    </View>
  );
}

function PermissionCard({
  icon,
  title,
  description,
  granted,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  granted: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.permCard,
        {
          backgroundColor: colors.card,
          borderColor: granted ? colors.success + "40" : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.permIconWrap, { backgroundColor: granted ? colors.success + "20" : colors.muted }]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={22}
          color={granted ? colors.success : colors.mutedForeground}
        />
      </View>
      <View style={styles.permInfo}>
        <Text style={[styles.permTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.permDesc, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      {granted ? (
        <Feather name="check-circle" size={20} color={colors.success} />
      ) : (
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [botState, setBotState] = useState<BotState>("idle");
  const [stats, setStats] = useState<Stats>({
    totalAdsWatched: 0,
    sessionAdsWatched: 0,
    sessionStartTime: null,
  });
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(3);
  const [elapsed, setElapsed] = useState("00:00");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    if (botState === "running" && stats.sessionStartTime) {
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - (stats.sessionStartTime ?? Date.now())) / 1000);
        const m = String(Math.floor(secs / 60)).padStart(2, "0");
        const s = String(secs % 60).padStart(2, "0");
        setElapsed(`${m}:${s}`);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (botState === "idle") setElapsed("00:00");
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [botState, stats.sessionStartTime]);

  const loadState = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setStats((s) => ({ ...s, totalAdsWatched: saved.totalAdsWatched ?? 0 }));
        setDelaySeconds(saved.delaySeconds ?? 3);
      }
    } catch {}
  };

  const saveState = async (total: number, delay: number) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ totalAdsWatched: total, delaySeconds: delay }));
    } catch {}
  };

  const simulateCycle = useCallback(() => {
    setStats((prev) => {
      const next = {
        ...prev,
        totalAdsWatched: prev.totalAdsWatched + 1,
        sessionAdsWatched: prev.sessionAdsWatched + 1,
      };
      saveState(next.totalAdsWatched, delaySeconds);
      return next;
    });
  }, [delaySeconds]);

  const handleStartStop = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    if (botState === "idle") {
      if (!overlayGranted || !accessGranted) {
        Alert.alert(
          "Permissions Required",
          "Please grant Overlay and Accessibility permissions before starting.",
          [{ text: "OK" }]
        );
        return;
      }
      setBotState("running");
      setStats((s) => ({ ...s, sessionAdsWatched: 0, sessionStartTime: Date.now() }));
      const delay = delaySeconds * 1000;
      intervalRef.current = setInterval(simulateCycle, delay + 15000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setBotState("idle");
      setStats((s) => ({ ...s, sessionStartTime: null }));
    }
  };

  const openOverlaySettings = () => {
    if (Platform.OS === "android") {
      Linking.openSettings();
      setTimeout(() => setOverlayGranted(true), 2000);
    } else {
      setOverlayGranted(true);
    }
  };

  const openAccessibilitySettings = () => {
    if (Platform.OS === "android") {
      Linking.sendIntent("android.settings.ACCESSIBILITY_SETTINGS").catch(() =>
        Linking.openSettings()
      );
      setTimeout(() => setAccessGranted(true), 2000);
    } else {
      setAccessGranted(true);
    }
  };

  const allGranted = overlayGranted && accessGranted;
  const isRunning = botState === "running";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#0A0F1E", "#0D1833", "#0A0F1E"]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.logoWrap, { backgroundColor: colors.primary + "20" }]}>
            <MaterialCommunityIcons name="lightning-bolt" size={28} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.appTitle, { color: colors.foreground }]}>Airvoy Booster</Text>
            <Text style={[styles.appSub, { color: colors.mutedForeground }]}>Auto Ad Watcher</Text>
          </View>
          <StatusBadge state={botState} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{stats.totalAdsWatched}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Ads</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.accent }]}>{stats.sessionAdsWatched}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>This Session</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.success }]}>{elapsed}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Uptime</Text>
          </View>
        </View>

        {/* Main control button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Pressable onPress={handleStartStop} style={styles.ctaWrap}>
            <LinearGradient
              colors={isRunning ? ["#FF4757", "#C0392B"] : allGranted ? [colors.primary, "#1A56DB"] : [colors.muted, colors.muted]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaButton}
            >
              <MaterialCommunityIcons
                name={isRunning ? "stop-circle" : "play-circle"}
                size={36}
                color="#FFFFFF"
              />
              <Text style={styles.ctaText}>{isRunning ? "STOP BOOSTER" : "START BOOSTER"}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {!allGranted && (
          <Text style={[styles.hintText, { color: colors.warning }]}>
            Grant both permissions below to enable
          </Text>
        )}

        {/* How it works */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How It Works</Text>
          {[
            { icon: "eye-outline", text: "Opens Airvoy in background" },
            { icon: "cursor-default-click-outline", text: 'Clicks "Watch Ad" automatically' },
            { icon: "timer-outline", text: "Waits for ad to complete" },
            { icon: "close-circle-outline", text: 'Clicks "X" to close the ad' },
            { icon: "refresh", text: "Repeats continuously" },
          ].map((item, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: colors.primary + "20" }]}>
                <MaterialCommunityIcons name={item.icon as any} size={16} color={colors.primary} />
              </View>
              <Text style={[styles.stepText, { color: colors.secondaryForeground }]}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Permissions */}
        <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>REQUIRED PERMISSIONS</Text>

        <PermissionCard
          icon="layers-outline"
          title="Draw Over Other Apps"
          description="Allows the booster to display over Airvoy"
          granted={overlayGranted}
          onPress={openOverlaySettings}
        />
        <PermissionCard
          icon="gesture-tap"
          title="Accessibility Service"
          description="Enables auto-clicking ad buttons in Airvoy"
          granted={accessGranted}
          onPress={openAccessibilitySettings}
        />

        {/* Delay setting */}
        <Text style={[styles.groupLabel, { color: colors.mutedForeground, marginTop: 24 }]}>SETTINGS</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
            <Text style={[styles.settingLabel, { color: colors.foreground }]}>Delay between ads</Text>
            <Text style={[styles.settingValue, { color: colors.primary }]}>{delaySeconds}s</Text>
          </View>
          <View style={styles.delayButtons}>
            {[1, 2, 3, 5, 10].map((d) => (
              <Pressable
                key={d}
                onPress={() => {
                  setDelaySeconds(d);
                  saveState(stats.totalAdsWatched, d);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.delayChip,
                  {
                    backgroundColor: delaySeconds === d ? colors.primary : colors.muted,
                    borderColor: delaySeconds === d ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.delayChipText, { color: delaySeconds === d ? "#fff" : colors.mutedForeground }]}>
                  {d}s
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Reset button */}
        <Pressable
          onPress={() => {
            Alert.alert("Reset Stats", "Clear all ad watch history?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Reset",
                style: "destructive",
                onPress: () => {
                  setStats({ totalAdsWatched: 0, sessionAdsWatched: 0, sessionStartTime: null });
                  saveState(0, delaySeconds);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                },
              },
            ]);
          }}
          style={({ pressed }) => [styles.resetBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.resetText, { color: colors.mutedForeground }]}>Reset Statistics</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  logoWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  appTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  appSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1 },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2, letterSpacing: 0.5 },
  ctaWrap: { borderRadius: 20, overflow: "hidden" },
  ctaButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 20, borderRadius: 20 },
  ctaText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: 1 },
  hintText: { textAlign: "center", fontSize: 12, fontFamily: "Inter_500Medium" },
  section: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  groupLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: -4 },
  permCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  permIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  permInfo: { flex: 1 },
  permTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  permDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  settingValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  delayButtons: { flexDirection: "row", gap: 8 },
  delayChip: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  delayChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  resetBtn: { alignSelf: "center", paddingVertical: 12 },
  resetText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
