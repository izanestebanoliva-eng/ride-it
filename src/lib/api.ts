import AsyncStorage from "@react-native-async-storage/async-storage";

const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL;

// fallback por si el .env no se carga
const API_URL = (RAW_API_URL ?? "https://ride-it-iler.onrender.com").replace(/\/+$/, "");

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return { controller, timeoutId };
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem("access_token");

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_URL}${normalizedPath}`;

  const { controller, timeoutId } = withTimeout(15000); // 15s

  try {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // Solo setear JSON content-type si enviamos body
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const text = await res.text().catch(() => "");

    if (!res.ok) {
      // devolvemos el body crudo (normalmente JSON con {"detail":...})
      throw new Error(text || `HTTP ${res.status}`);
    }

    if (!text) return null;

    // intenta JSON, si no, devuelve texto
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (e: any) {
    // Timeout / abort
    if (e?.name === "AbortError") throw new Error("NETWORK_TIMEOUT");
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

