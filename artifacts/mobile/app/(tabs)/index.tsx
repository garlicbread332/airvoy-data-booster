import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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

const COLORS = {
  bg: "#0A0F1E",
  card: "#141929",
  border: "#1E2D4A",
  primary: "#3B8BFF",
  accent: "#00D2FF",
  muted: "#1A2540",
  mutedFg: "#6B7FA8",
  fg: "#FFFFFF",
  subFg: "#A0AEC0",
  success: "#00C48C",
  warning: "#FFB020",
  danger: "#FF4757",
};

type BotState = "idle" | "running";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<BotState>("idle");
  const [totalAds, setTotalAds] = useState(0);
  const [sessionAds, setSessionAds] = useState(0);
  const [elapsed, setElapsed] = useState("00:00");
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(3);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const totalRef = useRef(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load saved state
  useEffect(() => {
    AsyncStorage.getItem("booster_state").then((raw) => {
      if (raw) {
        const saved = JSON.parse(raw);
        totalRef.current = saved.total ?? 0;
        setTotalAds(saved.total ?? 0);
        setDelaySeconds(saved.delay ?? 3);
      }
    }).catch(() => {});
  }, []);

  // Pulse animation when running
  useEffect(() => {
    if (state === "running") {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
    pulseAnim.setValue(1);
  }, [state]);

  // Elapsed timer
  useEffect(() => {
    if (state === "running") {
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000);
        const m = String(Math.floor(secs / 60)).padStart(2, "0");
        const s = String(secs % 60).padStart(2, "0");
        setElapsed(`${m}:${s}`);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (state === "idle") setElapsed("00:00");
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  const incrementAd = useCallback(() => {
    totalRef.current += 1;
    setTotalAds(totalRef.current);
    setSessionAds((s) => s + 1);
    AsyncStorage.setItem("booster_state", JSON.stringify({ total: totalRef.current, delay: delaySeconds })).catch(() => {});
  }, [delaySeconds]);

  const handleStartStop = async () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (state === "idle") {
      if (!overlayGranted || !accessGranted) {
        Alert.alert("Permissions Required", "Grant both Overlay and Accessibility permissions first.");
        return;
      }
      startTimeRef.current = Date.now();
      setState("running");
      setSessionAds(0);
      // Simulate cycle: every (ad duration 15s + delay) seconds
      const cycleMs = (15 + delaySeconds) * 1000;
      intervalRef.current = setInterval(incrementAd, cycleMs);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setState("idle");
      startTimeRef.current = null;
    }
  };

  const openOverlay = () => {
    if (Platform.OS === "android") {
      Linking.openSettings();
    }
    // Optimistically mark as granted after user goes to settings
    setTimeout(() => setOverlayGranted(true), 1500);
  };

  const openAccessibility = () => {
    if (Platform.OS === "android") {
      Linking.sendIntent("android.settings.ACCESSIBILITY_SETTINGS").catch(() => Linking.openSettings());
    }
    setTimeout(() => setAccessGranted(true), 1500);
  };

  const isRunning = state === "running";

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#0D1420", "#0A0F1E"]} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <MaterialCommunityIcons name="lightning-bolt" size={26} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.title}>Airvoy Booster</Text>
            <Text style={styles.subtitle}>Auto Ad Watcher</Text>
          </View>
          <View style={[styles.badge, { borderColor: isRunning ? COLORS.success + "50" : COLORS.mutedFg + "40", backgroundColor: isRunning ? COLORS.success + "15" : COLORS.muted }]}>
            <Animated.View style={[styles.dot, { backgroundColor: isRunning ? COLORS.success : COLORS.mutedFg, opacity: isRunning ? pulseAnim : 1 }]} />
            <Text style={[styles.badgeText, { color: isRunning ? COLORS.success : COLORS.mutedFg }]}>
              {isRunning ? "RUNNING" : "STOPPED"}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.row}>
          {[
            { label: "Total Ads", value: String(totalAds), color: COLORS.primary },
            { label: "Session", value: String(sessionAds), color: COLORS.accent },
            { label: "Uptime", value: elapsed, color: COLORS.success },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Big button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Pressable onPress={handleStartStop}>
            <LinearGradient
              colors={isRunning ? [COLORS.danger, "#C0392B"] : (overlayGranted && accessGranted) ? [COLORS.primary, "#1A56DB"] : [COLORS.muted, "#0F1828"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bigBtn}
            >
              <MaterialCommunityIcons name={isRunning ? "stop-circle" : "play-circle"} size={34} color="#fff" />
              <Text style={styles.bigBtnText}>{isRunning ? "STOP BOOSTER" : "START BOOSTER"}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {(!overlayGranted || !accessGranted) && (
          <Text style={styles.hint}>Grant both permissions below to enable</Text>
        )}

        {/* How it works */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How It Works</Text>
          {[
            "Opens Airvoy in the background",
            'Clicks "Watch Ad" automatically',
            "Waits for the ad to finish (~15s)",
            'Clicks "X" to close the ad',
            "Repeats until you stop it",
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepIcon}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Permissions */}
        <Text style={styles.groupLabel}>REQUIRED PERMISSIONS</Text>

        {[
          { icon: "layers-outline", title: "Draw Over Other Apps", desc: "Lets booster display over Airvoy", granted: overlayGranted, onPress: openOverlay },
          { icon: "gesture-tap", title: "Accessibility Service", desc: "Enables auto-clicking ad buttons", granted: accessGranted, onPress: openAccessibility },
        ].map((p) => (
          <Pressable key={p.title} onPress={p.onPress} style={({ pressed }) => [styles.permRow, { opacity: pressed ? 0.75 : 1, borderColor: p.granted ? COLORS.success + "50" : COLORS.border }]}>
            <View style={[styles.permIcon, { backgroundColor: p.granted ? COLORS.success + "20" : COLORS.muted }]}>
              <MaterialCommunityIcons name={p.icon as any} size={20} color={p.granted ? COLORS.success : COLORS.mutedFg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permTitle}>{p.title}</Text>
              <Text style={styles.permDesc}>{p.desc}</Text>
            </View>
            {p.granted
              ? <Feather name="check-circle" size={18} color={COLORS.success} />
              : <Feather name="chevron-right" size={18} color={COLORS.mutedFg} />}
          </Pressable>
        ))}

        {/* Delay setting */}
        <Text style={[styles.groupLabel, { marginTop: 20 }]}>DELAY BETWEEN ADS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            {[1, 2, 3, 5, 10].map((d) => (
              <Pressable
                key={d}
                onPress={() => {
                  setDelaySeconds(d);
                  AsyncStorage.setItem("booster_state", JSON.stringify({ total: totalRef.current, delay: d })).catch(() => {});
                  Haptics.selectionAsync();
                }}
                style={[styles.chip, { backgroundColor: delaySeconds === d ? COLORS.primary : COLORS.muted, borderColor: delaySeconds === d ? COLORS.primary : COLORS.border }]}
              >
                <Text style={[styles.chipText, { color: delaySeconds === d ? "#fff" : COLORS.mutedFg }]}>{d}s</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Reset */}
        <Pressable
          onPress={() => Alert.alert("Reset?", "Clear all statistics?", [
            { text: "Cancel", style: "cancel" },
            { text: "Reset", style: "destructive", onPress: () => {
              totalRef.current = 0;
              setTotalAds(0);
              setSessionAds(0);
              AsyncStorage.setItem("booster_state", JSON.stringify({ total: 0, delay: delaySeconds })).catch(() => {});
            }},
          ])}
          style={styles.resetBtn}
        >
          <Text style={styles.resetText}>Reset Statistics</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 18, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary + "20", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 19, fontWeight: "700", color: COLORS.fg },
  subtitle: { fontSize: 12, color: COLORS.mutedFg, marginTop: 1 },
  badge: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  row: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  statNum: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 10, color: COLORS.mutedFg, marginTop: 2, fontWeight: "500" },
  bigBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 18 },
  bigBtnText: { fontSize: 17, fontWeight: "700", color: "#fff", letterSpacing: 0.8 },
  hint: { textAlign: "center", fontSize: 12, color: COLORS.warning, marginTop: -4 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: COLORS.fg, marginBottom: 2 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: COLORS.primary + "20", alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
  stepText: { fontSize: 13, color: COLORS.subFg, flex: 1 },
  groupLabel: { fontSize: 10, fontWeight: "600", color: COLORS.mutedFg, letterSpacing: 1.2, marginBottom: -4 },
  permRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.card, borderRadius: 12, padding: 12, borderWidth: 1 },
  permIcon: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  permTitle: { fontSize: 13, fontWeight: "600", color: COLORS.fg },
  permDesc: { fontSize: 11, color: COLORS.mutedFg, marginTop: 1 },
  chip: { flex: 1, paddingVertical: 8, borderRadius: 9, borderWidth: 1, alignItems: "center" },
  chipText: { fontSize: 12, fontWeight: "600" },
  resetBtn: { alignSelf: "center", paddingVertical: 10 },
  resetText: { fontSize: 12, color: COLORS.mutedFg },
});
