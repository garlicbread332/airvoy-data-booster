import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
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

function AnimatedRing({ progress }: { progress: number }) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.ringContainer}>
      <View style={[styles.ringOuter, { borderColor: colors.border }]}>
        <View style={[styles.ringInner, { backgroundColor: colors.card }]}>
          <LinearGradient
            colors={[colors.primary, colors.purple ?? "#7B2FBE"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ringGlow}
          />
        </View>
      </View>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>
        {value}
        <Text style={[styles.statUnit, { color: colors.mutedForeground }]}> {unit}</Text>
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { totalDataEarned, todayDataEarned, adsWatchedToday, settings, isWatching, sessions } =
    useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const completedSessions = sessions.filter((s) => s.status === "completed").length;
  const progressPct = Math.min(todayDataEarned / settings.dailyTarget, 1);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isWatching) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isWatching]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#0A1628", colors.background]}
        style={[styles.header, { paddingTop: topPad + 20 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>SIM Data Booster</Text>
            <Text style={[styles.simBadge, { color: colors.foreground }]}>{settings.simSlot}</Text>
          </View>
          {isWatching && (
            <Animated.View style={[styles.liveBadge, { backgroundColor: colors.accent + "22", transform: [{ scale: pulse }] }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.liveText, { color: colors.accent }]}>LIVE</Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.dataCenter}>
          <AnimatedRing progress={progressPct} />
          <View style={styles.dataCenterContent}>
            <Text style={[styles.dataValue, { color: colors.foreground }]}>
              {todayDataEarned}
              <Text style={[styles.dataUnit, { color: colors.primary }]}>MB</Text>
            </Text>
            <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>earned today</Text>
            <View style={styles.targetRow}>
              <Text style={[styles.targetText, { color: colors.mutedForeground }]}>
                Target: {settings.dailyTarget} MB
              </Text>
              <Text style={[styles.targetPct, { color: colors.primary }]}>
                {Math.round(progressPct * 100)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.round(progressPct * 100)}%` as any, backgroundColor: colors.primary },
            ]}
          />
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        <StatCard
          icon="database"
          label="Total earned"
          value={totalDataEarned >= 1024 ? (totalDataEarned / 1024).toFixed(1) : String(totalDataEarned)}
          unit={totalDataEarned >= 1024 ? "GB" : "MB"}
          color={colors.primary}
        />
        <StatCard
          icon="play"
          label="Ads today"
          value={String(adsWatchedToday)}
          unit="ads"
          color={colors.accent}
        />
        <StatCard
          icon="activity"
          label="Sessions"
          value={String(completedSessions)}
          unit="done"
          color={colors.purple ?? "#7B2FBE"}
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>QUICK ACTION</Text>
        <Pressable
          onPress={() => router.push("/(tabs)/watch")}
          style={({ pressed }) => [
            styles.ctaButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <LinearGradient
            colors={[colors.primary, "#0077A8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Feather name={isWatching ? "pause-circle" : "play-circle"} size={22} color="#fff" />
            <Text style={styles.ctaText}>
              {isWatching ? "View Active Session" : "Start Auto-Watch"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {sessions.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, paddingHorizontal: 0 }]}>
            RECENT SESSIONS
          </Text>
          {sessions.slice(0, 3).map((s) => (
            <View
              key={s.id}
              style={[styles.sessionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.sessionDot, { backgroundColor: s.status === "completed" ? colors.accent : colors.destructive }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sessionData, { color: colors.foreground }]}>
                  +{s.dataEarned} MB
                </Text>
                <Text style={[styles.sessionMeta, { color: colors.mutedForeground }]}>
                  {s.adsWatched} ads · {new Date(s.startedAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={[styles.sessionBadge, { backgroundColor: s.status === "completed" ? colors.accent + "22" : colors.destructive + "22" }]}>
                <Text style={[styles.sessionBadgeText, { color: s.status === "completed" ? colors.accent : colors.destructive }]}>
                  {s.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
  greeting: { fontSize: 13, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  simBadge: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  dataCenter: { alignItems: "center", marginBottom: 20 },
  ringContainer: { position: "absolute", width: 180, height: 180 },
  ringOuter: { width: 180, height: 180, borderRadius: 90, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  ringInner: { width: 158, height: 158, borderRadius: 79, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  ringGlow: { position: "absolute", width: 100, height: 100, borderRadius: 50, opacity: 0.15, top: -10, left: -10 },
  dataCenterContent: { alignItems: "center", paddingTop: 50 },
  dataValue: { fontSize: 52, fontFamily: "Inter_700Bold", lineHeight: 60 },
  dataUnit: { fontSize: 22, fontFamily: "Inter_600SemiBold" },
  dataLabel: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  targetRow: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" },
  targetText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  targetPct: { fontSize: 12, fontFamily: "Inter_700Bold" },
  progressBarBg: { height: 4, backgroundColor: "#1E2D50", borderRadius: 2, overflow: "hidden", marginTop: 16 },
  progressBarFill: { height: 4, borderRadius: 2 },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 20 },
  statCard: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  section: { margin: 16, borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  ctaButton: { borderRadius: 12, overflow: "hidden" },
  ctaGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16 },
  ctaText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  recentSection: { paddingHorizontal: 16, gap: 10 },
  sessionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  sessionDot: { width: 8, height: 8, borderRadius: 4 },
  sessionData: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sessionMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  sessionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sessionBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
