import { Tabs, router } from "expo-router";
import { TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";
import { clearSession } from "@/api";

function sair() {
  Alert.alert("Sair", "Deseja encerrar a sessão?", [
    { text: "Cancelar", style: "cancel" },
    {
      text: "Sair",
      style: "destructive",
      onPress: async () => {
        await clearSession();
        router.replace("/login");
      },
    },
  ]);
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: "#fff",
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerRight: () => (
          <TouchableOpacity onPress={sair} style={{ marginRight: 16 }}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="ponto"
        options={{
          title: "Bater Ponto",
          tabBarIcon: ({ color, size }) => <Ionicons name="finger-print" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: "Histórico",
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="solicitacoes"
        options={{
          title: "Solicitações",
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
