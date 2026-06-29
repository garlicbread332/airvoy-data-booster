import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Overlay } from "@/modules/overlay";

type AdPhase = "idle" | "clicking-watch" | "watching" | "clicking-x" | "done";

const AD_SOURCES = [
  "Airvoy — Video Reward",
  "Airvoy — Sponsored Video",
  "Airvoy — Data Offer",
  "Airvoy — Interstitial",
  "Airvoy — Rewarded Clip",
];

function ClickRipple({ visible }: { visible: boolean }) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0);
    opacity.setValue(0.9);
    Animated.parallel([
      Animated.timing(scale, { toValue: 2, duration: 400, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ripple, { backgroundColor: colors.primary, transform: [{ scale }], opacity }]}
    />
  );
}

function AdSimulator({
  phase,
  countdown,
  adName,
  rippleWatch,
  rippleX,
}: {
  phase: AdPhase;
  countdown: number;
  adName: string;
  rippleWatch: boolean;
  rippleX: boolean;
}) {
  const colors = useColors();
  const watchPulse = useRef(new Animated.Value(1)).current;
  const xPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (phase === "clicking-watch") {
      Animated.sequence([
        Animated.timing(watchPulse, { toValue: 0.88, duration: 120, useNativeDriver: true }),
        Animated.timing(watchPulse, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "clicking-x") {
      Animated.sequence([
        Animated.timing(xPulse, { toValue: 0.75, duration: 120, useNativeDriver: true }),
        Animated.timing(xPulse, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [phase]);

  return (
    <View style={[styles.adSim, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.adBanner, { backgroundColor: "#0A1628", borderColor: colors.border }]}>
        <View style={styles.adBannerInner}>
          <LinearGradient colors={["#1A2545", "#0A1628"]} style={styles.adThumb}>
            <Feather name="play" size={20} color={colors.primary} />
          </LinearGradient>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={[styles.adPlaceholderLine, { backgroundColor: colors.border, width: "75%" }]} />
            <View style={[styles.adPlaceholderLine, { backgroundColor: colors.border, width: "50%", opacity: 0.6 }]} />
          </View>
          {(phase === "watching" || phase === "clicking-x") && (
            <Animated.View
              style={[
                styles.xBtn,
                {
                  backgroundColor: phase === "clicking-x" ? colors.destructive : colors.secondary,
                  borderColor: phase === "clicking-x" ? colors.destructive : colors.border,
                  transform: [{ scale: xPulse }],
                },
              ]}
            >
              <ClickRipple visible={rippleX} />
              <Feather name="x" size={14} color="#fff" />
            </Animated.View>
          )}
        </View>
        {phase === "watching" && (
          <View style={[styles.adProgressBg, { backgroundColor: colors.secondary }]}>
            <View
              style={[
                styles.adProgressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${Math.max(0, Math.min(100, (1 - countdown / 5) * 100))}%` as any,
                },
              ]}
            />
          </View>
        )}
      </View>

      <View style={styles.watchBtnRow}>
        <Text style={[styles.adLabel, { color: colors.mutedForeground }]}>{adName || "Waiting…"}</Text>
        <Animated.View style={{ transform: [{ scale: watchPulse }] }}>
          <View
            style={[
              styles.watchBtn,
              {
                backgroundColor: phase === "clicking-watch" ? colors.primary : colors.secondary,
                borderColor: phase === "clicking-watch" ? colors.primary : colors.border,
                opacity: phase === "watching" || phase === "clicking-x" ? 0.4 : 1,
              },
            ]}
          >
            <ClickRipple visible={rippleWatch} />
            <Feather name="play" size={13} color={phase === "clicking-watch" ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.watchBtnText, { color: phase === "clicking-watch" ? "#fff" : colors.mutedForeground }]}>
              Watch
            </Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.statusRow}>
        {phase === "idle" && <Text style={[styles.statusText, { color: colors.mutedForeground }]}>Starting…</Text>}
        {phase === "clicking-watch" && <Text style={[styles.statusText, { color: colors.primary }]}>👆 Tapping Watch…</Text>}
        {phase === "watching" && <Text style={[styles.statusText, { color: colors.warning ?? "#FFB800" }]}>▶ Watching ad · {countdown}s</Text>}
        {phase === "clicking-x" && <Text style={[styles.statusText, { color: colors.accent }]}>👆 Closing ad…</Text>}
        {phase === "done" && <Text style={[styles.statusText, { color: colors.accent }]}>✓ +15 MB earned!</Text>}
      </View>
    </View>
  );
}

export default function WatchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { currentSession, isWatching, startSession, stopSession, adCompleted, settings } = useApp();

  const [phase, setPhase] = useState<AdPhase>("idle");
  const [adName, setAdName] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [rippleWatch, setRippleWatch] = useState(false);
  const [rippleX, setRippleX] = useState(false);
  const [overlayOn, setOverlayOn] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const cycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (Overlay.isAvailable) {
      Overlay.checkPermission().then(setHasPermission);
    }
  }, []);

  const clearTimers = () => {
    if (cycleRef.current) clearTimeout(cycleRef.current);
    if (countRef.current) clearInterval(countRef.current);
  };

  const runCycle = useCallback(() => {
    if (stoppedRef.current) return;
    const name = AD_SOURCES[Math.floor(Math.random() * AD_SOURCES.length)];
    setAdName(name);
    setPhase("idle");

    cycleRef.current = setTimeout(() => {
      if (stoppedRef.current) return;
      setPhase("clicking-watch");
      setRippleWatch(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setRippleWatch(false), 420);

      cycleRef.current = setTimeout(() => {
        if (stoppedRef.current) return;
        setPhase("watching");
        const adSecs = settings.adDelay;
        setCountdown(adSecs);
        if (countRef.current) clearInterval(countRef.current);
        countRef.current = setInterval(() => {
          setCountdown((c) => {
            if (c <= 1) { clearInterval(countRef.current!); return 0; }
            return c - 1;
          });
        }, 1000);

        cycleRef.current = setTimeout(() => {
          if (stoppedRef.current) return;
          setPhase("clicking-x");
          setRippleX(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setTimeout(() => setRippleX(false), 420);

          cycleRef.current = setTimeout(() => {
            if (stoppedRef.current) return;
            setPhase("done");
            adCompleted();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            cycleRef.current = setTimeout(() => {
              if (stoppedRef.current) return;
              const watched = (currentSession?.adsWatched ?? 0) + 1;
              if (watched >= settings.maxAdsPerSession) {
                stopSession();
                return;
              }
              runCycle();
            }, 700);
          }, 600);
        }, adSecs * 1000);
      }, 500);
    }, 600);
  }, [adCompleted, settings.adDelay, settings.maxAdsPerSession, currentSession, stopSession]);

  useEffect(() => {
    if (isWatching) {
      stoppedRef.current = false;
      runCycle();
    } else {
      stoppedRef.current = true;
      clearTimers();
      setPhase("idle");
      setAdName("");
      setCountdown(0);
    }
    return clearTimers;
  }, [isWatching]);

  useEffect(() => {
    if (!Overlay.isAvailable || !isWatching) return;
    const ads = currentSession?.adsWatched ?? 0;
    const data = currentSession?.dataEarned ?? 0;
    Overlay.update(ads, data);
  }, [currentSession?.adsWatched, currentSession?.dataEarned, isWatching]);

  const handleToggle = () => {
    if (isWatching) {
      Alert.alert("Stop Session?", "This will end the current ad watch session.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop",
          style: "destructive",
          onPress: () => {
            stoppedRef.current = true;
            clearTimers();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            stopSession();
          },
        },
      ]);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startSession();
    }
  };

  const handleOverlayToggle = async () => {
    if (!Overlay.isAvailable) return;
    if (!hasPermission) {
      Alert.alert(
        "Permission Needed",
        "Allow \"Display over other apps\" for Airvoy Data Booster in the next screen.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: async () => { await Overlay.requestPermission(); const p = await Overlay.checkPermission(); setHasPermission(p); } },
        ]
      );
      return;
    }
    if (overlayOn) {
      await Overlay.stop();
      setOverlayOn(false);
    } else {
      await Overlay.start();
      setOverlayOn(true);
    }
  };

  const adsWatched = currentSession?.adsWatched ?? 0;
  const adsLeft = Math.max(0, settings.maxAdsPerSession - adsWatched);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom),
        paddingHorizontal: 20,
        alignItems: "center",
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Auto-Watcher</Text>
          <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
            Auto-taps Watch → X on every ad
          </Text>
        </View>
        {Overlay.isAvailable && (
          <Pressable
            onPress={handleOverlayToggle}
            style={({ pressed }) => [
              styles.overlayToggle,
              {
                backgroundColor: overlayOn ? colors.primary + "22" : colors.secondary,
                borderColor: overlayOn ? colors.primary : colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Feather name="layers" size={15} color={overlayOn ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.overlayToggleText, { color: overlayOn ? colors.primary : colors.mutedForeground }]}>
              {overlayOn ? "Overlay ON" : "Overlay"}
            </Text>
          </Pressable>
        )}
      </View>

      <AdSimulator
        phase={phase}
        countdown={countdown}
        adName={adName}
        rippleWatch={rippleWatch}
        rippleX={rippleX}
      />

      {isWatching && (
        <View style={styles.sessionStatsRow}>
          <View style={[styles.miniStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.miniStatVal, { color: colors.accent }]}>+{currentSession?.dataEarned ?? 0} MB</Text>
            <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>this session</Text>
          </View>
          <View style={[styles.miniStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.miniStatVal, { color: colors.foreground }]}>{adsWatched}/{settings.maxAdsPerSession}</Text>
            <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>ads watched</Text>
          </View>
          <View style={[styles.miniStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.miniStatVal, { color: colors.warning ?? "#FFB800" }]}>{adsLeft}</Text>
            <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>remaining</Text>
          </View>
        </View>
      )}

      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1, width: "100%", marginTop: isWatching ? 0 : 20 }]}
      >
        <LinearGradient
          colors={isWatching ? [colors.destructive, "#B33050"] : [colors.primary, "#0077A8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.mainButton}
        >
          <Feather name={isWatching ? "square" : "play"} size={22} color="#fff" />
          <Text style={styles.mainButtonText}>{isWatching ? "Stop Session" : "Start Auto-Clicker"}</Text>
        </LinearGradient>
      </Pressable>

      <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoTitle, { color: colors.foreground }]}>How it works</Text>
        <View style={styles.infoStep}>
          <View style={[styles.infoNum, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.infoNumText, { color: colors.primary }]}>1</Text>
          </View>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Taps <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Watch</Text> on each Airvoy ad automatically
          </Text>
        </View>
        <View style={styles.infoStep}>
          <View style={[styles.infoNum, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.infoNumText, { color: colors.primary }]}>2</Text>
          </View>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Waits for the ad, then taps <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>X</Text> to close it
          </Text>
        </View>
        <View style={styles.infoStep}>
          <View style={[styles.infoNum, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.infoNumText, { color: colors.primary }]}>3</Text>
          </View>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Enable <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Overlay</Text> (top right) to see the booster while using Airvoy
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", width: "100%", marginBottom: 24 },
  screenTitle: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 4 },
  screenSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  overlayToggle: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  overlayToggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  adSim: { width: "100%", borderRadius: 18, borderWidth: 1, padding: 16, gap: 12, marginBottom: 20 },
  adBanner: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  adBannerInner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  adThumb: { width: 48, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  adPlaceholderLine: { height: 10, borderRadius: 5 },
  xBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  adProgressBg: { height: 3, overflow: "hidden" },
  adProgressFill: { height: 3 },
  watchBtnRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  adLabel: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, marginRight: 10 },
  watchBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  watchBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  ripple: { position: "absolute", width: 44, height: 44, borderRadius: 22 },
  statusRow: { alignItems: "center" },
  statusText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sessionStatsRow: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 16 },
  miniStat: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "center", gap: 4 },
  miniStatVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  miniStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  mainButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 18, borderRadius: 16, width: "100%", marginBottom: 24 },
  mainButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  infoBox: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  infoTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  infoStep: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoNum: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  infoNumText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
