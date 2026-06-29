import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdSession, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function SessionItem({ session }: { session: AdSession }) {
  const colors = useColors();
  const isCompleted = session.status === "completed";
  const duration =
    session.endedAt
      ? Math.round((session.endedAt - session.startedAt) / 1000)
      : null;
  const durationStr = duration
    ? duration < 60
      ? `${duration}s`
      : `${Math.floor(duration / 60)}m ${duration % 60}s`
    : "—";

  return (
    <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.itemIcon, { backgroundColor: (isCompleted ? colors.accent : colors.destructive) + "22" }]}>
        <Feather
          name={isCompleted ? "check-circle" : "x-circle"}
          size={18}
          color={isCompleted ? colors.accent : colors.destructive}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemData, { color: colors.foreground }]}>
          +{session.dataEarned} MB earned
        </Text>
        <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
          {session.adsWatched} ads · {durationStr} · {new Date(session.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
      <View style={[styles.itemBadge, { backgroundColor: (isCompleted ? colors.accent : colors.destructive) + "22" }]}>
        <Text style={[styles.itemBadgeText, { color: isCompleted ? colors.accent : colors.destructive }]}>
          {session.status}
        </Text>
      </View>
    </View>
  );
}

function EmptyState() {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <Feather name="clock" size={40} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No sessions yet</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        Start watching ads to see your data history here
      </Text>
    </View>
  );
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { sessions, clearHistory, todayDataEarned, totalDataEarned } = useApp();

  const handleClear = () => {
    Alert.alert("Clear History?", "This will reset all session history and earned data totals.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearHistory },
    ]);
  };

  const todaySessions = sessions.filter((s) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return s.startedAt >= d.getTime();
  });

  return (
    <FlatList
      data={sessions}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => <SessionItem session={item} />}
      ListEmptyComponent={<EmptyState />}
      scrollEnabled={sessions.length > 0}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom),
        paddingHorizontal: 16,
        gap: 10,
        flexGrow: 1,
      }}
      ListHeaderComponent={
        <View style={{ gap: 16, marginBottom: 8 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>History</Text>
            {sessions.length > 0 && (
              <Pressable onPress={handleClear} style={({ pressed }) => [styles.clearBtn, { opacity: pressed ? 0.7 : 1 }]}>
                <Feather name="trash-2" size={16} color={colors.destructive} />
                <Text style={[styles.clearText, { color: colors.destructive }]}>Clear</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryVal, { color: colors.primary }]}>{todayDataEarned} MB</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Today</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryVal, { color: colors.foreground }]}>{todaySessions.length}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Sessions today</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryVal, { color: colors.accent }]}>
                {totalDataEarned >= 1024 ? (totalDataEarned / 1024).toFixed(1) + " GB" : totalDataEarned + " MB"}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>All time</Text>
            </View>
          </View>
          {sessions.length > 0 && (
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ALL SESSIONS</Text>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  screenTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8 },
  clearText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 4 },
  summaryVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  itemIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  itemData: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  itemMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  itemBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  itemBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260 },
});
