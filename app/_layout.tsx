import "@/src/lib/location-task";
import { Stack } from "expo-router";
import { Text } from "react-native";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../src/lib/location-task";

export default function RootLayout() {
  const fontsLoaded = true;


  if (!fontsLoaded) {
    return (
      <GestureHandlerRootView
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white" }}>Cargando...</Text>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
