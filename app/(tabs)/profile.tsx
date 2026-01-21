import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { SessionUser } from "../../src/lib/auth-storage";
import { getSession, loginAsGuest, logout } from "../../src/lib/auth-storage";



export default function ProfileTab() {
  const iconColor = useThemeColor({}, "icon");
  const border = useThemeColor({}, "border");
  const card = useThemeColor({}, "card");
  const subtle = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  const [session, setSessionState] = useState<SessionUser | null>(null);

  const load = useCallback(async () => {
    const s = await getSession();
    setSessionState(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onGuest() {
    await loginAsGuest();
    await load();
  }

  async function onLogout() {
    Alert.alert("Cerrar sesión", "¿Quieres cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar",
        style: "destructive",
        onPress: async () => {
          await logout();
          await load();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Perfil
          </ThemedText>
        </View>

        {!session ? (
          <View style={[styles.heroCard, { backgroundColor: card, borderColor: border }]}>
            <View style={[styles.avatar, { backgroundColor: subtle }]}>
              <Ionicons name="person" size={26} color={iconColor} />
            </View>

            <ThemedText style={styles.heroTitle}>Tu cuenta</ThemedText>
            <ThemedText style={styles.heroSub}>
              Inicia sesión para guardar tu perfil y sincronizar en el futuro.
            </ThemedText>

            <Pressable style={[styles.bigBtn, styles.bigPrimary]} onPress={() => router.push("/login")}>
              <ThemedText style={styles.bigTitle}>Iniciar sesión</ThemedText>
              <ThemedText style={styles.bigSub}>Entrar con email</ThemedText>
            </Pressable>

            <Pressable style={[styles.bigBtn, styles.bigSecondary]} onPress={() => router.push("/register")}>
              <ThemedText style={styles.bigTitle}>Crear cuenta</ThemedText>
              <ThemedText style={styles.bigSub}>Registro rápido</ThemedText>
            </Pressable>

            <Pressable style={[styles.bigBtn, { backgroundColor: subtle }]} onPress={onGuest}>
              <ThemedText style={[styles.bigTitle, { color: iconColor }]}>Entrar como invitado</ThemedText>
              <ThemedText style={[styles.bigSub, { color: iconColor, opacity: 0.7 }]}>
                Usar rutas locales sin cuenta
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.profileCard, { backgroundColor: card, borderColor: border }]}>
            <View style={styles.profileTop}>
              <View style={[styles.avatar, { backgroundColor: subtle }]}>
                <Ionicons name={session.isGuest ? "person-outline" : "person"} size={26} color={iconColor} />
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText style={styles.name}>{session.name}</ThemedText>
                <ThemedText style={styles.email}>{session.isGuest ? "Modo invitado" : session.email}</ThemedText>
              </View>

              <Pressable onPress={() => router.push("/settings")} style={[styles.iconBtn, { backgroundColor: subtle }]}>
                <Ionicons name="settings-outline" size={20} color={iconColor} />
              </Pressable>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() => router.push("/rides")}
                style={[styles.actionBtn, { backgroundColor: subtle }]}
              >
                <Ionicons name="list" size={18} color={iconColor} />
                <ThemedText style={styles.actionText}>Mis rutas</ThemedText>
              </Pressable>

              <Pressable
                onPress={() => router.push("/explore")}
                style={[styles.actionBtn, { backgroundColor: "#1e88e5" }]}
              >
                <Ionicons name="navigate" size={18} color="white" />
                <ThemedText style={[styles.actionText, { color: "white" }]}>Grabar</ThemedText>
              </Pressable>
            </View>

            <Pressable onPress={onLogout} style={[styles.logoutBtn, { borderColor: border }]}>
              <Ionicons name="log-out-outline" size={18} color="#ff6b6b" />
              <ThemedText style={styles.logoutText}>Cerrar sesión</ThemedText>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },

  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 26 },

  heroCard: {
    marginHorizontal: 18,
    marginTop: 12,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },

  profileCard: {
    marginHorizontal: 18,
    marginTop: 12,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  heroTitle: { fontSize: 18, fontWeight: "900", marginTop: 4 },
  heroSub: { opacity: 0.75, marginBottom: 8 },

  bigBtn: { borderRadius: 18, padding: 14, gap: 4 },
  bigPrimary: { backgroundColor: "#1e88e5" },
  bigSecondary: { backgroundColor: "rgba(0,0,0,0.78)" },
  bigTitle: { color: "white", fontWeight: "900", fontSize: 16 },
  bigSub: { color: "white", opacity: 0.9 },

  profileTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 18, fontWeight: "900" },
  email: { opacity: 0.75 },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  actions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionText: { fontWeight: "900" },

  logoutBtn: {
    marginTop: 6,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  logoutText: { color: "#ff6b6b", fontWeight: "900" },
});
