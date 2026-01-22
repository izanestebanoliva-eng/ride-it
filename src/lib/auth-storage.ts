import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "./api";

export type SessionUser = {
  id: string;
  email: string;
  name?: string;      // <-- ahora opcional (por si /me no lo devuelve)
  isGuest?: boolean;
};

const ACCESS = "access_token";

function extractDetailFromErrorMessage(message: string): string {
  // apiFetch lanza Error(texto). Si el backend devuelve JSON {"detail":"..."}
  try {
    const parsed = JSON.parse(message);
    if (parsed?.detail) return String(parsed.detail);
  } catch {}
  return message;
}

export async function registerUser(input: { email: string; name: string; password: string }) {
  const payload = {
    email: input.email.trim(),
    password: input.password,
    name: input.name.trim(),
  };

  try {
    await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (e: any) {
    const detail = extractDetailFromErrorMessage(String(e?.message ?? ""));
    // Re-lanzamos con el detail limpio para que la UI lo pueda mostrar
    throw new Error(detail || "REGISTER_FAILED");
  }

  // login automático tras registro
  return await loginUser({ email: payload.email, password: payload.password });
}

export async function loginUser(input: { email: string; password: string }) {
  const payload = { email: input.email.trim(), password: input.password };

  let data: any;
  try {
    data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (e: any) {
    const detail = extractDetailFromErrorMessage(String(e?.message ?? ""));
    throw new Error(detail || "LOGIN_FAILED");
  }

  const token = data?.access_token;
  if (!token) throw new Error("LOGIN_RESPONSE_MISSING_TOKEN");

  await AsyncStorage.setItem(ACCESS, token);
  return await getSession();
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const me = await apiFetch("/me");

    // /me puede devolver: {id, email} o {id, email, name}
    return {
      id: String(me?.id ?? ""),
      email: String(me?.email ?? ""),
      name: me?.name ? String(me.name) : undefined,
      isGuest: false,
    };
  } catch {
    return null;
  }
}

export async function logout() {
  await AsyncStorage.removeItem(ACCESS);
}

export async function loginAsGuest() {
  return { id: "guest", email: "guest@local", name: "Invitado", isGuest: true } as SessionUser;
}
