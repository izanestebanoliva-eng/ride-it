import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "./api";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  isGuest?: boolean;
};

const ACCESS = "access_token";

export async function registerUser(input: { email: string; name: string; password: string }) {
  // backend registra
  await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });

  // y luego hacemos login para conseguir token
  return await loginUser({ email: input.email, password: input.password });
}

export async function loginUser(input: { email: string; password: string }) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });

  await AsyncStorage.setItem(ACCESS, data.access_token);
  return await getSession();
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const me = await apiFetch("/me");
    return { id: String(me.id), email: me.email, name: me.name, isGuest: false };
  } catch {
    return null;
  }
}

export async function logout() {
  await AsyncStorage.removeItem(ACCESS);
}

export async function loginAsGuest() {
  // invitado local, sin backend
  return { id: "guest", email: "guest@local", name: "Invitado", isGuest: true } as SessionUser;
}
