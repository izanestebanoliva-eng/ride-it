import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { loginUser } from "../src/lib/auth-storage";

function extractApiDetail(error: any): string {
  const msg = String(error?.message ?? "");
  try {
    const parsed = JSON.parse(msg);
    if (parsed?.detail) return String(parsed.detail);
  } catch {}
  return msg;
}

export default function LoginScreen() {
  const iconColor = useThemeColor({}, "icon");
  const border = useThemeColor({}, "border");
  const card = useThemeColor({}, "card");
  const text = useThemeColor({}, "text");
  const inputBg = useThemeColor(
    { light: "rgba(0,0,0,0.05)", dark: "rgba(255,255,255,0.08)" },
    "background"
  );
  const backBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const disabled = useMemo(() => {
    return loading || email.trim().length < 3 || password.length < 4;
  }, [email, password, loading]);

  async function onLogin() {
    if (disabled) return;
    setLoading(true);
    try {
      await loginUser({ email, password });
      router.replace("/profile");
    } catch (e: any) {
      const detail = extractApiDetail(e);

      if (detail.includes("NOT_FOUND")) {
        Alert.alert("No existe", "No hay ninguna cuenta con ese email.");
        return;
      }
      if (detail.includes("BAD_PASSWORD")) {
        Alert.alert("Contraseña incorrecta", "Revisa la contraseña.");
        return;
      }
      if (detail.includes("Network request failed") || detail.includes("Failed to fetch")) {
        Alert.alert(
          "Sin conexión",
          "No se pudo conectar con el servidor. Revisa que EXPO_PUBLIC_API_URL apunte a Render."
        );
        return;
      }

      Alert.alert("Error", detail || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: backBg }]} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={iconColor} />
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            Iniciar sesión
          </ThemedText>

          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          <ThemedText style={styles.label}>Email</ThemedText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="tu@email.com"
            placeholderTextColor={String(text) === "#FFFFFF" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)"}
            style={[styles.input, { backgroundColor: inputBg, color: text }]}
          />

          <ThemedText style={styles.label}>Contraseña</ThemedText>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={String(text) === "#FFFFFF" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)"}
            style={[styles.input, { backgroundColor: inputBg, color: text }]}
          />

          <Pressable onPress={onLogin} disabled={disabled} style={[styles.primaryBtn, disabled && { opacity: 0.5 }]}>
            <ThemedText style={styles.primaryText}>{loading ? "Entrando..." : "Entrar"}</ThemedText>
          </Pressable>

          <Pressable onPress={() => router.replace("/register")} style={styles.link}>
            <ThemedText style={styles.linkText}>No tengo cuenta → Crear cuenta</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },

  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22 },

  card: {
    marginHorizontal: 18,
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },

  label: { opacity: 0.8, fontWeight: "800" },
  input: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 12,
    fontSize: 15,
  },

  primaryBtn: {
    marginTop: 8,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e88e5",
  },
  primaryText: { color: "white", fontWeight: "900", fontSize: 16 },

  link: { alignSelf: "center", paddingVertical: 10 },
  linkText: { opacity: 0.75, fontWeight: "800" },
});
