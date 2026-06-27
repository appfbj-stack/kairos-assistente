import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { api } from "@/api";
import { colors, TIPO_LABEL } from "@/theme";

function firstDayOfMonth() {
  return new Date().toISOString().slice(0, 8) + "01";
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function Historico() {
  const [lista, setLista] = useState<any[]>([]);
  const [saldo, setSaldo] = useState<string>("—");
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      setLista(await api.historico(firstDayOfMonth(), today()));
      const s = await api.bancoSaldo().catch(() => null);
      if (s) setSaldo(`${(s.saldo_minutos / 60).toFixed(1)}h`);
    } catch {
      /* silencioso */
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>Saldo do banco de horas</Text>
        <Text style={styles.bannerValue}>{saldo}</Text>
      </View>
      <FlatList
        data={lista}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={<Text style={styles.muted}>Nenhum registro neste mês.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, item.suspeito && styles.suspeito]}>
            <View>
              <Text style={styles.tipo}>{TIPO_LABEL[item.tipo] || item.tipo}</Text>
              <Text style={styles.muted}>{new Date(item.registrado_em).toLocaleString("pt-BR")}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              {item.dentro_geofence === false ? (
                <Text style={{ color: colors.red, fontSize: 12 }}>Fora da área</Text>
              ) : item.dentro_geofence ? (
                <Text style={{ color: colors.green, fontSize: 12 }}>No local</Text>
              ) : null}
              <Text style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase" }}>{item.origem}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  banner: { backgroundColor: colors.primary, padding: 16, alignItems: "center" },
  bannerLabel: { color: "#dbe4ff", fontSize: 12 },
  bannerValue: { color: "#fff", fontSize: 26, fontWeight: "700" },
  row: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  suspeito: { borderColor: colors.red, backgroundColor: "#fef2f2" },
  tipo: { color: colors.text, fontWeight: "600" },
  muted: { color: colors.muted, fontSize: 12 },
});
