import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function Row({
  icon,
  label,
  sublabel,
  right,
  onPress,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed && !!onPress ? 0.7 : 1 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as any} size={17} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        {sublabel && <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{sublabel}</Text>}
      </View>
      {right ?? (onPress && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />)}
    </Pressable>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function SimSelector() {
  const colors = useColors();
  const { settings, updateSettings } = useApp();
  const sims: Array<"SIM 1" | "SIM 2"> = ["SIM 1", "SIM 2"];

  return (
    <View style={styles.simRow}>
      {sims.map((sim) => {
        const active = settings.simSlot === sim;
        return (
          <Pressable
            key={sim}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              updateSettings({ simSlot: sim });
            }}
            style={({ pressed }) => [
              styles.simBtn,
              {
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primary + "22" : colors.secondary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="smartphone" size={15} color={active ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.simText, { color: active ? colors.primary : colors.mutedForeground }]}>
              {sim}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StepControl({
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.stepRow}>
      <Pressable
        onPress={() => {
          if (value - step < min) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(value - step);
        }}
        style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
      >
        <Feather name="minus" size={16} color={colors.foreground} />
      </Pressable>
      <Text style={[styles.stepVal, { color: colors.foreground }]}>
        {value}
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}> {unit}</Text>
      </Text>
      <Pressable
        onPress={() => {
          if (value + step > max) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(value + step);
        }}
        style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
      >
        <Feather name="plus" size={16} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { settings, updateSettings } = useApp();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom),
        paddingHorizontal: 16,
        gap: 4,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: colors.foreground }]}>Settings</Text>

      <LinearGradient
        colors={["#0F1A3A", "#091020"]}
        style={[styles.banner, { borderColor: colors.border }]}
      >
        <Feather name="sim-card" size={24} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: colors.foreground }]}>Active SIM: {settings.simSlot}</Text>
          <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>
            Earned data is applied to this SIM card
          </Text>
        </View>
      </LinearGradient>

      <SectionCard title="SIM CARD">
        <Row icon="smartphone" label="Data SIM" sublabel="Select which SIM receives data" />
        <SimSelector />
      </SectionCard>

      <SectionCard title="AUTO-WATCH">
        <Row
          icon="zap"
          label="Auto-Watch"
          sublabel={settings.autoWatchEnabled ? "Sessions auto-start on app open" : "Manual start only"}
          right={
            <Switch
              value={settings.autoWatchEnabled}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateSettings({ autoWatchEnabled: v });
              }}
              trackColor={{ false: colors.secondary, true: colors.primary + "88" }}
              thumbColor={settings.autoWatchEnabled ? colors.primary : colors.mutedForeground}
            />
          }
        />
        <Divider />
        <Row
          icon="target"
          label="Daily Target"
          sublabel="Stop when daily target is reached"
          right={
            <StepControl
              value={settings.dailyTarget}
              min={100}
              max={5000}
              step={100}
              unit="MB"
              onChange={(v) => updateSettings({ dailyTarget: v })}
            />
          }
        />
        <Divider />
        <Row
          icon="play"
          label="Ads Per Session"
          sublabel="Max ads before session ends"
          right={
            <StepControl
              value={settings.maxAdsPerSession}
              min={5}
              max={100}
              step={5}
              unit="ads"
              onChange={(v) => updateSettings({ maxAdsPerSession: v })}
            />
          }
        />
        <Divider />
        <Row
          icon="clock"
          label="Ad Duration"
          sublabel="Seconds per ad"
          right={
            <StepControl
              value={settings.adDelay}
              min={3}
              max={30}
              step={1}
              unit="sec"
              onChange={(v) => updateSettings({ adDelay: v })}
            />
          }
        />
      </SectionCard>

      <SectionCard title="ABOUT">
        <Row icon="info" label="Airvoy Data Booster" sublabel="Version 1.0.0" />
        <Divider />
        <Row icon="shield" label="Privacy" sublabel="No personal data is collected" />
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenTitle: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 16 },
  banner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  bannerTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  bannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  section: { gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, paddingHorizontal: 4 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: 1, marginLeft: 62 },
  simRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingBottom: 14 },
  simBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  simText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepVal: { fontSize: 14, fontFamily: "Inter_700Bold", minWidth: 54, textAlign: "center" },
});
