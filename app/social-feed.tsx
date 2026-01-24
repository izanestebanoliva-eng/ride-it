import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function SocialFeedScreen() {
  const border = useThemeColor({}, "border");
  const cardBg = useThemeColor({}, "card");
  const icon = useThemeColor({}, "icon");
  const subtleBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  const [refreshing, setRefreshing] = useState(false);
  const [loadingStub, setLoadingStub] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      setLoadingStub(true);
      await new Promise((r) => setTimeout(r, 550));
    } finally {
      setLoadingStub(false);
      setRefreshing(false);
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: subtleBg, borderColor: border }]}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={18} color={icon} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <ThemedText type="title" style={styles.title}>
              Feed
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Rutas públicas y de amigos
            </ThemedText>
          </View>

          <Pressable
            onPress={onRefresh}
            disabled={refreshing}
            style={[
              styles.refreshBtn,
              { backgroundColor: subtleBg, borderColor: border, opacity: refreshing ? 0.7 : 1 },
            ]}
            hitSlop={10}
          >
            {refreshing ? (
              <ActivityIndicator />
            ) : (
              <Ionicons name="refresh" size={18} color={icon} />
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <ThemedText style={styles.cardTitle}>Próximo paso</ThemedText>
            <ThemedText style={styles.cardSub}>
              Aquí conectaremos el feed con tu backend:
            </ThemedText>

            <View style={[styles.line, { backgroundColor: subtleBg, borderColor: border }]}>
              <Ionicons name="link-outline" size={18} color={icon} />
              <ThemedText style={{ opacity: 0.8, flex: 1 }}>
                GET /feed (y quizá paginación)
              </ThemedText>
            </View>

            {loadingStub ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator />
                <ThemedText style={{ opacity: 0.75 }}>Cargando…</ThemedText>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="sparkles-outline" size={22} color={icon} />
                <ThemedText style={{ fontWeight: "900" }}>Vacío por ahora</ThemedText>
                <ThemedText style={{ opacity: 0.75, textAlign: "center" }}>
                  En cuanto conectemos, aquí aparecerán rutas como una red social.
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText style={styles.footer}>Ride it · Feed</ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 24 },
  subtitle: { opacity: 0.75, marginTop: 2 },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  content: { padding: 16, gap: 12, paddingBottom: 28 },

  card: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  cardTitle: { fontWeight: "900", fontSize: 16 },
  cardSub: { opacity: 0.75, lineHeight: 18 },

  line: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },

  loadingBox: {
    height: 120,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyBox: {
    height: 140,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },

  footer: { textAlign: "center", opacity: 0.6, paddingVertical: 10 },
});
