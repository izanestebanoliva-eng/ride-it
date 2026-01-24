import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { SessionUser } from "@/src/lib/auth-storage";
import { getSession, loginAsGuest, logout } from "@/src/lib/auth-storage";

export default function ProfileTab() {
  const icon = useThemeColor({}, "icon");
  const border = useThemeColor({}, "border");
  const card = useThemeColor({}, "card");
  const subtle = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );
  const text = useThemeColor({}, "text");

  const [session, setSession] = useState<SessionUser | null>(null);

  const load = useCallback(async () => {
    const s = await getSession();
    setSession(s);
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

  const isGuest = !!session?.isGuest;

  const headerTitle = useMemo(() => {
    if (!session) return "Tu cuenta";
    return session.name;
  }, [session]);

  const headerSubtitle = useMemo(() => {
    if (!session) return "Inicia sesión para sincronizar y usar Social.";
    if (session.isGuest) return "Modo invitado · Rutas locales";
    return session.email;
  }, [session]);

  const initials = useMemo(() => {
    const name = session?.name?.trim() || "R";
    const parts = name.split(" ").filter(Boolean);
    const a = parts[0]?.[0] ?? "R";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase();
  }, [session]);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* TOP BAR */}
          <View style={styles.topBar}>
            <ThemedText type="title" style={styles.title}>
              Perfil
            </ThemedText>

            <Pressable
              onPress={() => router.push("/settings")}
              style={[styles.roundBtn, { backgroundColor: subtle, borderColor: border }]}
              hitSlop={10}
            >
              <Ionicons name="settings-outline" size={20} color={icon} />
            </Pressable>
          </View>

          {/* ACCOUNT HEADER CARD */}
          <Pressable
            onPress={() => {
              if (!session) router.push("/login");
            }}
            style={[styles.accountCard, { backgroundColor: card, borderColor: border }]}
          >
            <View style={styles.accountRow}>
              <View style={[styles.avatar, { backgroundColor: subtle, borderColor: border }]}>
                {session ? (
                  <ThemedText style={styles.initials}>{initials}</ThemedText>
                ) : (
                  <Ionicons name="person-outline" size={22} color={icon} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText style={styles.accountTitle}>{headerTitle}</ThemedText>
                <ThemedText style={styles.accountSub}>{headerSubtitle}</ThemedText>
              </View>

              <Ionicons name="chevron-forward" size={18} color={icon} style={{ opacity: 0.75 }} />
            </View>

            {/* MINI STATUS STRIP */}
            <View style={[styles.strip, { backgroundColor: subtle, borderColor: border }]}>
              <Ionicons
                name={session ? (session.isGuest ? "sparkles-outline" : "shield-checkmark-outline") : "key-outline"}
                size={16}
                color={icon}
              />
              <ThemedText style={styles.stripText}>
                {!session
                  ? "Accede para sincronizar y publicar"
                  : session.isGuest
                  ? "Invitado: todo local (sin nube)"
                  : "Sesión activa"}
              </ThemedText>
            </View>
          </Pressable>

          

          {/* SECTION: SOCIAL */}
          <Section title="Social" card={card} border={border}>
            <Row
              icon="mail-unread-outline"
              title="Solicitudes de amistad"
              subtitle={session ? (isGuest ? "Requiere cuenta" : "Entrantes y salientes") : "Inicia sesión para verlas"}
              onPress={() => {
                if (!session || isGuest) return;
                router.push("/friend-requests");
              }}
              iconColor={icon}
              subtle={subtle}
              disabled={!session || isGuest}
            />
            <Row
              icon="people-outline"
              title="Amigos"
              subtitle="Gestiona tus conexiones"
              onPress={() => router.push("/social")}
              iconColor={icon}
              subtle={subtle}
            />
          </Section>

          {/* SECTION: APP */}
          <Section title="Aplicación" card={card} border={border}>
            <Row
              icon="settings-outline"
              title="Ajustes"
              subtitle="Preferencias de la app"
              onPress={() => router.push("/settings")}
              iconColor={icon}
              subtle={subtle}
            />
            <Row
              icon="help-circle-outline"
              title="Ayuda"
              subtitle="Consejos y soporte"
              onPress={() => Alert.alert("Pronto", "Aquí pondremos FAQ / soporte.")}
              iconColor={icon}
              subtle={subtle}
            />
            <View style={styles.divider} />
            <ThemedText style={styles.version}>Ride it · v0.1</ThemedText>
          </Section>

          {/* LOGOUT */}
          {!!session && (
            <Pressable
              onPress={onLogout}
              style={[styles.logout, { backgroundColor: card, borderColor: border }]}
            >
              <Ionicons name="log-out-outline" size={18} color="#ff6b6b" />
              <ThemedText style={styles.logoutText}>Cerrar sesión</ThemedText>
            </Pressable>
          )}

          <ThemedText style={styles.footer}>Ride it · Perfil</ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/* ───────── components ───────── */

function Section({
  title,
  children,
  card,
  border,
}: {
  title: string;
  children: React.ReactNode;
  card: string;
  border: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View style={[styles.sectionCard, { backgroundColor: card, borderColor: border }]}>
        {children}
      </View>
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
  iconColor,
  subtle,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  iconColor: string;
  subtle: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.row,
        { opacity: disabled ? 0.55 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: subtle }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <View style={{ flex: 1 }}>
        <ThemedText style={styles.rowTitle}>{title}</ThemedText>
        {!!subtitle && <ThemedText style={styles.rowSub}>{subtitle}</ThemedText>}
      </View>

      <Ionicons name="chevron-forward" size={18} color={iconColor} style={{ opacity: 0.6 }} />
    </Pressable>
  );
}

/* ───────── styles ───────── */

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },

  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28, gap: 14 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { fontSize: 26 },

  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  accountCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontWeight: "900", fontSize: 16 },

  accountTitle: { fontSize: 18, fontWeight: "900" },
  accountSub: { opacity: 0.75, marginTop: 2 },

  strip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stripText: { opacity: 0.8, flex: 1 },

  sectionTitle: { opacity: 0.7, fontWeight: "900", marginLeft: 2 },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },

  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontWeight: "900" },
  rowSub: { opacity: 0.7, marginTop: 2, fontSize: 12 },

  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.06)", marginHorizontal: 14, marginTop: 8 },
  version: { opacity: 0.6, textAlign: "center", paddingVertical: 12 },

  logout: {
    height: 54,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: { color: "#ff6b6b", fontWeight: "900" },

  footer: { textAlign: "center", opacity: 0.6, paddingTop: 6 },
});
