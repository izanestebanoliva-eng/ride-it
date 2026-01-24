import AsyncStorage from "@react-native-async-storage/async-storage";

const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL;

// fallback por si el .env no se carga
const API_URL = (RAW_API_URL ?? "https://ride-it-iler.onrender.com").replace(
  /\/+$/,
  ""
);

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type RouteVisibility = "private" | "friends" | "public";

export type FriendRequestOut = {
  id: string; // UUID
  from_user_id: string; // UUID
  to_user_id: string; // UUID
  created_at: string; // ISO
};

export type RouteOut = {
  id: string; // UUID
  name: string;
  distance_m: number;
  duration_s: number;
  visibility: RouteVisibility;
  created_at: string; // ISO
};

export type FeedRouteOut = {
  id: string; // UUID
  user_id: string; // UUID
  name: string;
  distance_m: number;
  duration_s: number;
  visibility: RouteVisibility;
  created_at: string; // ISO
};

export type RouteDetailOut = {
  id: string; // UUID
  user_id: string; // UUID
  name: string;
  distance_m: number;
  duration_s: number;
  path: any[];
  visibility: RouteVisibility;
  created_at: string; // ISO
};

export type RouteCreateIn = {
  name: string;
  distance_m: number;
  duration_s: number;
  path: any[];
  visibility?: RouteVisibility;
};

export type RouteUpdateIn = {
  name?: string | null;
  visibility?: RouteVisibility | null;
};

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** ✅ Error “controlable” cuando no hay login */
export class AuthError extends Error {
  name = "AuthError";
  status = 401;
  constructor(message = "Not authenticated") {
    super(message);
  }
}

function isNotAuthenticated(resStatus: number, bodyText: string) {
  if (resStatus === 401) return true;

  const parsed = safeJsonParse(bodyText);
  const detail = typeof parsed?.detail === "string" ? parsed.detail : "";

  // cubrimos varias variantes típicas
  if (detail.toLowerCase().includes("not authenticated")) return true;
  if (detail.toLowerCase().includes("not authorized")) return true;
  if (detail.toLowerCase().includes("unauthorized")) return true;

  return false;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit & { method?: HttpMethod } = {}
): Promise<T> {
  const token = await AsyncStorage.getItem("access_token");

  const url = `${API_URL}${normalizePath(path)}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  // leemos como texto siempre (así el error tiene el body real)
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    // ✅ si no está autenticado -> error especial + limpiamos token
    if (isNotAuthenticated(res.status, text)) {
      try {
        await AsyncStorage.removeItem("access_token");
      } catch {}
      throw new AuthError();
    }

    // resto de errores: mantenemos el body crudo para tu extractApiDetail()
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (!text) return null as T;

  // ✅ evita crash si viniera algo no-json
  const parsed = safeJsonParse(text);
  return (parsed ?? (text as any)) as T;
}

// ----------------------
// Helpers rutas
// ----------------------
export function getMyRoutes() {
  return apiFetch<RouteOut[]>("/routes/mine", { method: "GET" });
}

export function getPublicRoutes() {
  return apiFetch<RouteOut[]>("/routes/public", { method: "GET" });
}

export function getFeed() {
  return apiFetch<FeedRouteOut[]>("/feed", { method: "GET" });
}

export function getRouteById(routeId: string) {
  return apiFetch<RouteDetailOut>(`/routes/${routeId}`, { method: "GET" });
}

export function createRoute(data: RouteCreateIn) {
  return apiFetch<RouteOut>("/routes", {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      distance_m: data.distance_m,
      duration_s: data.duration_s,
      path: data.path,
      visibility: data.visibility ?? "private",
    }),
  });
}

export function updateRoute(routeId: string, data: RouteUpdateIn) {
  return apiFetch<RouteOut>(`/routes/${routeId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * ✅ helper directo para cambiar visibilidad (lo usaremos en el detalle al pulsar)
 */
export function patchRouteVisibility(
  routeId: string,
  visibility: RouteVisibility
) {
  return updateRoute(routeId, { visibility });
}

export function deleteRoute(routeId: string) {
  return apiFetch<{ status: string }>(`/routes/${routeId}`, {
    method: "DELETE",
  });
}

// ----------------------
// Friend requests
// ----------------------
export function getIncomingFriendRequests() {
  return apiFetch<FriendRequestOut[]>("/friend-requests/incoming", { method: "GET" });
}

export function getOutgoingFriendRequests() {
  return apiFetch<FriendRequestOut[]>("/friend-requests/outgoing", { method: "GET" });
}

export function acceptFriendRequest(requestId: string) {
  return apiFetch<{ status: string }>(`/friend-requests/${requestId}/accept`, { method: "POST" });
}

export function rejectFriendRequest(requestId: string) {
  return apiFetch<{ status: string }>(`/friend-requests/${requestId}/reject`, { method: "POST" });
}

export function isAuthError(e: unknown) {
  return e instanceof AuthError || (e as any)?.name === "AuthError";
}
