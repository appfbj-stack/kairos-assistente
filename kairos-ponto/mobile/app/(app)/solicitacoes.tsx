import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { api, clearSession } from "@/api";
import { colors } from "@/theme";

const TIPOS: { key: string; label: string }[] = [
  { key: "ajuste_ponto", label: "Ajuste de ponto" },
  { key: "folga", label: "Folga" },
  { key: "justificativa", label: "Justificativa" },
  { key: "correcao_horario", label: "Correção de horário" },
];
const STATUS_COR: Record<string, string> = {
  solicitado: colors.amber,
  em_analise: colors.primary,
  aprovado: colors.green,
  rejeitado: colors.red,
};

export default function Solicitacoes() {
  const [lista, setLista] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tipo, setTipo] = useState("ajuste_ponto");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      setLista(await api.solicitacoes.list());
    } catch (e: any) {
      if (String(e.message).includes("Token")) {
        await clearSession();
        router.replace("/login");
      }
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function enviar() {
    if (!descricao.trim()) return Alert.alert("Atenção", "Descreva sua solicitação.");
    setEnviando(true);
    try {
      await api.solicitacoes.create({ tipo, descricao: descricao.trim() });
      setDescricao("");
      Alert.alert("Enviado", "Sua solicitação foi registrada.");
      await load();
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Nova solicitação</Text>
        <View style={styles.chips}>
          {TIPOS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.chip, tipo === t.key && styles.chipActive]}
              onPress={() => setTipo(t.key)}
            >
              <Text style={[styles.chipText, tipo === t.key && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Descreva o motivo…"
          placeholderTextColor={colors.muted}
          value={descricao}
          onChangeText={setDescricao}
          multiline
        />
        <TouchableOpacity style={styles.btn} onPress={enviar} disabled={enviando}>
          <Ionicons name="send" size={16} color="#fff" />
          <Text style={styles.btnText}>Enviar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={lista}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={<Text style={styles.muted}>Nenhuma solicitação.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipo}>{TIPOS.find((t) => t.key === item.tipo)?.label || item.tipo}</Text>
              <Text style={styles.muted}>{item.descricao}</Text>
            </View>
            <Text style={[styles.status, { color: STATUS_COR[item.status] || colors.muted }]}>{item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  form: { backgroundColor: colors.card, padding: 16, borderBottomWidth: 1, borderColor: colors.border },
  formTitle: { fontWeight: "600", color: colors.text, marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    minHeight: 60,
    color: colors.text,
    textAlignVertical: "top",
  },
  btn: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  btnText: { color: "#fff", fontWeight: "600" },
  row: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tipo: { color: colors.text, fontWeight: "600" },
  muted: { color: colors.muted, fontSize: 12 },
  status: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
});
