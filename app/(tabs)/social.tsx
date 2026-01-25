// ...existing code...
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

import { getFeed, getFriends, sendFriendRequest } from "@/src/lib/api";

/**
 * SOCIAL - Rediseño profesional
 * Pantalla principal con cards para opciones.
 * Vista de Amigos con panel deslizante para lista.
 *
 * ✅ MainView NUEVA: "Top bar + quick actions + tarjeta grande tipo highlight + lista de módulos"
 * (sin meter features nuevas, solo UI)
 *
 * CAMBIOS:
 * - Arriba solo queda Feed
 * - "Rutas públicas" desaparece
 * - En su lugar va "Amistades" (abre friends)
 * - Subtítulos de Feed y Amistades ajustados
 * - En main el título pasa a "Feed"
 * - Se cargan amigos también en main para que el contador sea real
 * - Subtítulo en Amistades cambiado
 * - Título en vista Amistades: sin corte (padding/lineHeight/font + espacio)
 */

type ViewType = "main" | "friends";

export default function SocialScreen() {
  const border = useThemeColor({}, "border");
  const cardBg = useThemeColor({}, "card");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");

  const subtleBg = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.06)" },
    "background"
  );

  const [view, setView] = useState<ViewType>("main");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingStub, setLoadingStub] = useState(false);
  const [username, setUsername] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [feedRoutes, setFeedRoutes] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const translateX = useSharedValue(Dimensions.get("window").width);

  const title = useMemo(() => {
    if (view === "main") return "Social";
    return "Amigos";
  }, [view]);

  const loadFriends = useCallback(async () => {
    try {
      setLoadingFriends(true);
      const f = await getFriends();
      setFriends(f);
    } catch (e) {
      console.log("Error cargando amigos:", e);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  const loadFeed = useCallback(async () => {
    try {
      setLoadingFeed(true);
      const routes = await getFeed();
      setFeedRoutes(routes);
    } catch (e) {
      console.log("Error cargando feed:", e);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
      loadFeed();
    }, [loadFriends, loadFeed])
  );

  const publicRoutes = useMemo(() => {
    return feedRoutes.filter(route => route.visibility === "public");
  }, [feedRoutes]);

  const friendsRoutes = useMemo(() => {
    const friendIds = friends.map(f => f.id);
    return feedRoutes.filter(route => 
      route.visibility === "public" || 
      route.visibility === "friends" && friendIds.includes(route.user_id)
    );
  }, [feedRoutes, friends]);

  async function handleSendRequest() {
    if (!username.trim()) {
      Alert.alert("Error", "Ingresa un nombre de usuario.");
      return;
    }
    try {
      await sendFriendRequest(username.trim());
      Alert.alert("Enviado", "Solicitud de amistad enviada.");
      setUsername("");
    } catch (e) {
      console.log("Error enviando solicitud:", e);
      Alert.alert(
        "Error",
        "No se pudo enviar la solicitud. Revisa el nombre de usuario."
      );
    }
  }

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

  const togglePanel = () => {
    if (showPanel) {
      translateX.value = withSpring(Dimensions.get("window").width);
    } else {
      translateX.value = withSpring(0);
    }
    setShowPanel(!showPanel);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title" style={styles.title}>
              {title}
            </ThemedText>

            <ThemedText style={styles.subtitle}>
              {view === "main"
                ? "Conecta con la comunidad"
                : "Personas con las que ruedas"}
            </ThemedText>
          </View>

          {view === "friends" && (
            <>
              <Pressable
                onPress={() => setView("main")}
                style={[
                  styles.backBtn,
                  { backgroundColor: subtleBg, borderColor: border },
                ]}
                hitSlop={10}
              >
                <Ionicons name="chevron-back" size={18} color={icon} />
              </Pressable>

              <Pressable
                onPress={togglePanel}
                style={[
                  styles.friendsHeaderBtn,
                  { backgroundColor: subtleBg, borderColor: border },
                ]}
                hitSlop={10}
              >
                <Ionicons name="people-outline" size={18} color={icon} />
                <ThemedText
                  style={styles.friendsHeaderText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Amistades
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>

        {/* BODY */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!showPanel}
        >
          {view === "main" ? (
            <MainView
              setView={setView}
              cardBg={cardBg}
              border={border}
              text={text}
              icon={icon}
              subtleBg={subtleBg}
              friendsCount={friends.length}
              publicRoutes={publicRoutes}
              loadingFeed={loadingFeed}
            />
          ) : (
            <FriendsView
              username={username}
              setUsername={setUsername}
              handleSendRequest={handleSendRequest}
              friends={friends}
              loadingFriends={loadingFriends}
              friendsRoutes={friendsRoutes}
              loadingFeed={loadingFeed}
              showPanel={showPanel}
              setShowPanel={setShowPanel}
              translateX={translateX}
              togglePanel={togglePanel}
              cardBg={cardBg}
              border={border}
              text={text}
              icon={icon}
              subtleBg={subtleBg}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/* ───────── Main View (NUEVA - estilo “dashboard”) ───────── */
function MainView({
  setView,
  cardBg,
  border,
  text,
  icon,
  subtleBg,
  friendsCount,
}: any) {
  return (
    <>
      {/* Quick Actions (solo Feed arriba) */}
      <View style={styles.quickRow}>
        <QuickAction
          title="Feed"
          subtitle="Rutas de todo el mundo"
          iconName="globe-outline"
          onPress={() => router.push("/social-feed")}
          cardBg={cardBg}
          border={border}
          icon={icon}
          subtleBg={subtleBg}
          full
        />
      </View>

      {/* Highlight card grande */}
      <Pressable
        onPress={() => alert("Próximamente")}
        style={({ pressed }) => [
          styles.highlightCard,
          {
            backgroundColor: cardBg,
            borderColor: border,
            opacity: pressed ? 0.95 : 1,
          },
        ]}
      >
        <View style={styles.highlightTop}>
          <View
            style={[
              styles.highlightIcon,
              { backgroundColor: subtleBg, borderColor: border },
            ]}
          >
            <Ionicons name="trophy-outline" size={22} color={icon} />
          </View>

          <View style={{ flex: 1 }}>
            <ThemedText style={styles.highlightTitle}>
              Destacado de la semana
            </ThemedText>
            <ThemedText style={styles.highlightSub}>
              Rankings, rutas top y actividad de la comunidad.
            </ThemedText>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={icon}
            style={{ opacity: 0.75 }}
          />
        </View>

        <View style={styles.highlightStats}>
          <StatPill label="Rutas" value="—" border={border} subtleBg={subtleBg} />
          <StatPill label="Likes" value="—" border={border} subtleBg={subtleBg} />
          <StatPill label="Top" value="—" border={border} subtleBg={subtleBg} />
        </View>

        <ThemedText style={styles.highlightHint}>
          Próximamente · Pulsa para ver
        </ThemedText>
      </Pressable>

      {/* Lista de módulos (look “settings pro”) */}
      <View
        style={[
          styles.moduleCard,
          { backgroundColor: cardBg, borderColor: border },
        ]}
      >
        <ThemedText style={styles.moduleHeader}>Explorar</ThemedText>

        {/* ✅ antes "Rutas públicas" -> ahora "Amistades" */}
        <ModuleRow
          title="Amigos"
          subtitle="Personas con las que ruedas"
          iconName="people-outline"
          onPress={() => setView("friends")}
          border={border}
          icon={icon}
          subtleBg={subtleBg}
        />
        <Divider border={border} />

        <ModuleRow
          title="Clubs"
          subtitle="Grupos por zona o estilo"
          iconName="flag-outline"
          onPress={() => alert("Próximamente")}
          border={border}
          icon={icon}
          subtleBg={subtleBg}
        />
        <Divider border={border} />

        <ModuleRow
          title="Eventos"
          subtitle="Quedadas y rutas organizadas"
          iconName="calendar-outline"
          onPress={() => alert("Próximamente")}
          border={border}
          icon={icon}
          subtleBg={subtleBg}
        />
      </View>

      <ThemedText style={styles.footer}>Ride it · Social</ThemedText>
    </>
  );
}

function QuickAction({
  title,
  subtitle,
  iconName,
  onPress,
  cardBg,
  border,
  icon,
  subtleBg,
  full,
}: any) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: cardBg,
          borderColor: border,
          opacity: pressed ? 0.92 : 1,
          flex: full ? undefined : 1,
          width: full ? "100%" : undefined,
        },
      ]}
    >
      <View
        style={[
          styles.quickIcon,
          { backgroundColor: subtleBg, borderColor: border },
        ]}
      >
        <Ionicons name={iconName} size={20} color={icon} />
      </View>

      <View style={{ flex: 1 }}>
        <ThemedText
          style={styles.quickTitle}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </ThemedText>
        <ThemedText
          style={styles.quickSub}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {subtitle}
        </ThemedText>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={icon}
        style={{ opacity: 0.75 }}
      />
    </Pressable>
  );
}

function StatPill({ label, value, border, subtleBg }: any) {
  return (
    <View
      style={[
        styles.statPill,
        { borderColor: border, backgroundColor: subtleBg },
      ]}
    >
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

function ModuleRow({
  title,
  subtitle,
  iconName,
  onPress,
  border,
  icon,
  subtleBg,
}: any) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.moduleRow, pressed && { opacity: 0.92 }]}
    >
      <View
        style={[
          styles.moduleIcon,
          { backgroundColor: subtleBg, borderColor: border },
        ]}
      >
        <Ionicons name={iconName} size={18} color={icon} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.moduleTitle}>{title}</ThemedText>
        <ThemedText style={styles.moduleSub}>{subtitle}</ThemedText>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={icon}
        style={{ opacity: 0.7 }}
      />
    </Pressable>
  );
}

function Divider({ border }: any) {
  return (
    <View style={[styles.divider, { backgroundColor: border, opacity: 0.35 }]} />
  );
}

/* ───────── Friends View (IGUAL que tenías) ───────── */
function FriendsView({
  username,
  setUsername,
  handleSendRequest,
  friends,
  loadingFriends,
  friendsRoutes,
  loadingFeed,
  showPanel,
  setShowPanel,
  translateX,
  togglePanel,
  cardBg,
  border,
  text,
  icon,
  subtleBg,
}: any) {
  const [modalVisible, setModalVisible] = useState(false);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleSend = async () => {
    await handleSendRequest();
    setModalVisible(false);
  };

  return (
    <>
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: cardBg, borderColor: border },
        ]}
      >
        <View style={styles.sectionTop}>
          <ThemedText style={styles.sectionTitle}>Rutas de Amigos</ThemedText>
          <ThemedText style={styles.sectionMeta}>{friendsRoutes.length} rutas</ThemedText>
        </View>
        {loadingFeed ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator />
            <ThemedText style={{ opacity: 0.75 }}>Cargando rutas…</ThemedText>
          </View>
        ) : friendsRoutes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="map-outline" size={22} color={icon} />
            <ThemedText style={styles.emptyTitle}>No hay rutas</ThemedText>
            <ThemedText style={styles.emptySub}>
              Las rutas públicas de tus amigos aparecerán aquí.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.routesList}>
            {friendsRoutes.slice(0, 3).map((route: any) => (
              <Pressable
                key={route.id}
                onPress={() => router.push(`/ride/${route.id}`)}
                style={({ pressed }) => [
                  styles.routeItem,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="map-outline" size={18} color={icon} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.routeName}>{route.name}</ThemedText>
                  <ThemedText style={styles.routeMeta}>
                    {route.user_name} · {(route.distance_m / 1000).toFixed(1)} km · {Math.floor(route.duration_s / 60)} min
                  </ThemedText>
                </View>
                <ThemedText style={styles.routeVisibility}>
                  {route.visibility === "public" ? "Pública" : "Amigos"}
                </ThemedText>
              </Pressable>
            ))}
            {friendsRoutes.length > 3 && (
              <ThemedText style={styles.moreRoutes}>
                +{friendsRoutes.length - 3} más...
              </ThemedText>
            )}
          </View>
        )}
      </View>

      <Animated.View style={[styles.slidingPanel, panelStyle]}>
        <View style={styles.panelHeader}>
          {/* ✅ “cortado” => más alto + lineHeight + padding */}
          <ThemedText style={styles.panelTitle} numberOfLines={1}>
            Amistades
          </ThemedText>

          <Pressable onPress={togglePanel} hitSlop={10}>
            <Ionicons name="close" size={24} color={text} />
          </Pressable>
        </View>

        <ScrollView style={styles.panelContent}>
          {loadingFriends ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator />
              <ThemedText style={{ opacity: 0.75 }}>Cargando…</ThemedText>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={22} color={icon} />
              <ThemedText style={styles.emptyTitle}>No tienes amistades</ThemedText>
              <ThemedText style={styles.emptySub}>
                Envía solicitudes para conectar.
              </ThemedText>
            </View>
          ) : (
            friends.map((friend: any) => (
              <View
                key={friend.id}
                style={[
                  styles.friendItem,
                  { backgroundColor: subtleBg, borderColor: border },
                ]}
              >
                <Ionicons name="person-circle-outline" size={32} color={icon} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.friendName}>
                    {friend.name || `Usuario ${friend.id}`}
                  </ThemedText>
                </View>
                <Pressable style={styles.friendAction}>
                  <Ionicons name="chatbubble-outline" size={20} color={icon} />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.panelFooter}>
          <Pressable
            style={[
              styles.sendRequestBtn,
              { backgroundColor: subtleBg, borderColor: border },
            ]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="person-add-outline" size={20} color={icon} />
            <ThemedText style={styles.sendRequestText}>Enviar Solicitud</ThemedText>
            <Ionicons
              name={modalVisible ? "chevron-up" : "chevron-down"}
              size={16}
              color={icon}
            />
          </Pressable>
        </View>
      </Animated.View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 100}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: cardBg, borderColor: border },
            ]}
          >
            <ThemedText style={styles.modalTitle}>
              Enviar Solicitud de Amistad
            </ThemedText>
            <TextInput
              placeholder="Nombre de usuario"
              value={username}
              onChangeText={setUsername}
              style={[styles.input, { borderColor: border, color: text }]}
              placeholderTextColor="#888"
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={[styles.modalBtn, { backgroundColor: "transparent" }]}
              >
                <ThemedText style={[styles.modalBtnText, { color: "#666" }]}>
                  Cancelar
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSend}
                style={[styles.modalBtn, { backgroundColor: "#1e88e5" }]}
              >
                <Ionicons name="send" size={18} color="white" />
                <ThemedText style={[styles.modalBtnText, { color: "white" }]}>
                  Enviar
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

/* ───────── styles ───────── */
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 24,
    lineHeight: 30, // ✅ evita recorte en algunos Android
    includeFontPadding: false,
  },
  subtitle: { opacity: 0.75, marginTop: 2 },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  friendsHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14, // ✅ un pelín menos para que no corte
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 210, // ✅ evita que reviente el layout
  },
  friendsHeaderText: {
    fontWeight: "900",
    opacity: 0.85,
    flexShrink: 1, // ✅ permite reducir sin cortar feo
  },

  content: { padding: 16, gap: 12, paddingBottom: 100 },

  /* --- Main NUEVO --- */
  quickRow: { flexDirection: "row", gap: 12 },

  quickAction: {
    flex: 1,
    minHeight: 92,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  quickTitle: {
    fontWeight: "900",
    fontSize: 16,
    includeFontPadding: false,
  },

  quickSub: {
    opacity: 0.7,
    marginTop: 3,
    lineHeight: 18,
    includeFontPadding: false,
  },

  highlightCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  highlightTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  highlightIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  highlightTitle: { fontWeight: "900", fontSize: 16 },
  highlightSub: { opacity: 0.75, marginTop: 2, lineHeight: 18 },

  highlightStats: { flexDirection: "row", gap: 10 },
  statPill: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  statValue: { fontWeight: "900", fontSize: 16 },
  statLabel: { opacity: 0.7, fontWeight: "700", fontSize: 12 },
  highlightHint: { opacity: 0.65, fontWeight: "700" },

  moduleCard: {
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
  },
  moduleHeader: {
    fontWeight: "900",
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  moduleIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  moduleTitle: { fontWeight: "900" },
  moduleSub: { opacity: 0.7, marginTop: 2, lineHeight: 18 },
  divider: { height: 1, width: "100%" },

  /* --- Friends (sin tocar) --- */
  sectionCard: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  sectionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontWeight: "900", fontSize: 16 },
  sectionMeta: { opacity: 0.65, fontWeight: "800" },

  emptyBox: {
    height: 300,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  emptyTitle: { fontWeight: "900", marginTop: 2 },
  emptySub: { opacity: 0.75, textAlign: "center", lineHeight: 18 },

  loadingBox: {
    height: 120,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  slidingPanel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: Dimensions.get("window").width * 0.8,
    backgroundColor: "white",
    borderLeftWidth: 1,
    borderLeftColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14, // ✅ más alto para que NO corte
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  panelTitle: {
    fontWeight: "900",
    fontSize: 18,
    lineHeight: 22, // ✅ evita recorte vertical
    includeFontPadding: false,
    paddingTop: 1, // ✅ Android: a veces recorta arriba
    flexShrink: 1,
  },
  panelContent: { flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 0 },
  panelFooter: { padding: 16, borderTopWidth: 1, borderTopColor: "#e0e0e0" },

  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  friendName: { fontWeight: "600" },
  friendAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,136,229,0.12)",
  },

  sendRequestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  sendRequestText: { fontWeight: "600", fontSize: 16 },

  footer: { textAlign: "center", opacity: 0.6, paddingVertical: 10 },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },

  routesList: {
    gap: 8,
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  routeName: {
    fontWeight: "600",
    fontSize: 14,
  },
  routeMeta: {
    opacity: 0.7,
    fontSize: 12,
    marginTop: 1,
  },
  routeVisibility: {
    opacity: 0.6,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  moreRoutes: {
    textAlign: "center",
    opacity: 0.6,
    fontSize: 12,
    marginTop: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "85%",
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  modalBtnText: { fontWeight: "600" },
});
