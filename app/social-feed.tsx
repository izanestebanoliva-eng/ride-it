import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

import { getPublicRoutes } from "@/src/lib/api";

export default function SocialFeedScreen() {
  const border = useThemeColor({}, "border");
  const cardBg = useThemeColor({}, "card");
  const icon = useThemeColor({}, "icon");
  const subtleBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  const [refreshing, setRefreshing] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      const publicRoutes = await getPublicRoutes();
      setRoutes(publicRoutes || []);
    } catch (e) {
      console.log("Error cargando rutas públicas:", e);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadRoutes();
    } finally {
      setRefreshing(false);
    }
  }

  function formatDistance(meters: number) {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  }

  function formatDuration(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
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
              Rutas públicas de todo el mundo
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
          {loading ? (
            <View style={[styles.loadingCard, { backgroundColor: cardBg, borderColor: border }]}>
              <ActivityIndicator size="large" />
              <ThemedText style={styles.loadingText}>Cargando rutas...</ThemedText>
            </View>
          ) : routes.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: border }]}>
              <Ionicons name="bicycle-outline" size={48} color={icon} style={{ opacity: 0.5 }} />
              <ThemedText style={styles.emptyTitle}>No hay rutas públicas</ThemedText>
              <ThemedText style={styles.emptySub}>
                Sé el primero en compartir una ruta pública para que aparezca aquí.
              </ThemedText>
            </View>
          ) : (
            routes.map((route) => (
              <Pressable
                key={route.id}
                onPress={() => router.push(`/ride/${route.id}`)}
                style={({ pressed }) => [
                  styles.routeCard,
                  {
                    backgroundColor: cardBg,
                    borderColor: border,
                    opacity: pressed ? 0.95 : 1,
                  },
                ]}
              >
                <View style={styles.routeHeader}>
                  <View style={[styles.userAvatar, { backgroundColor: subtleBg, borderColor: border }]}>
                    <Ionicons name="person-outline" size={16} color={icon} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.routeName} numberOfLines={1}>
                      {route.name}
                    </ThemedText>
                    <ThemedText style={styles.routeUser}>
                      Usuario • {new Date(route.created_at).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={icon} style={{ opacity: 0.6 }} />
                </View>

                <View style={styles.routeStats}>
                  <View style={styles.stat}>
                    <Ionicons name="map-outline" size={16} color={icon} />
                    <ThemedText style={styles.statText}>
                      {formatDistance(route.distance_m)}
                    </ThemedText>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name="time-outline" size={16} color={icon} />
                    <ThemedText style={styles.statText}>
                      {formatDuration(route.duration_s)}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            ))
          )}

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

  loadingCard: {
    borderRadius: 18,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.8,
  },

  emptyCard: {
    borderRadius: 18,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: "center",
    lineHeight: 20,
  },

  routeCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: "600",
  },
  routeUser: {
    fontSize: 12,
    opacity: 0.7,
  },
  routeStats: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 14,
    opacity: 0.8,
  },

  footer: { textAlign: "center", opacity: 0.6, paddingVertical: 10 },
});
