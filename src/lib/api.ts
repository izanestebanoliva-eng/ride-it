import AsyncStorage from "@react-native-async-storage/async-storage";

const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL;

// fallback por si el .env no se carga
const API_URL = (RAW_API_URL ?? "https://ride-it-iler.onrender.com").replace(/\/+$/, "");

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem("access_token");

  // fuerza a que el path empiece por /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_URL}${normalizedPath}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return text ? JSON.parse(text) : null;
}
