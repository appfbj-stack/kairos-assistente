import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { api, clearSession } from "@/api";
import { colors, TIPO_LABEL } from "@/theme";

export default function Ponto() {
  const cameraRef = useRef<CameraView>(null);
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState("Obtendo localização…");
  const [hoje, setHoje] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function carregar() {
    try {
      setHoje(await api.pontoHoje());
    } catch (e: any) {
      if (String(e.message).includes("Token")) {
        await clearSession();
        router.replace("/login");
      }
    }
  }

  async function pegarLocalizacao() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setGeoMsg("Permissão de localização negada");
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setGeoMsg("");
    } catch {
      setGeoMsg("Não foi possível obter a localização");
    }
  }

  useEffect(() => {
    carregar();
    pegarLocalizacao();
    if (!camPerm?.granted) requestCamPerm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bater(tipo: string) {
    setLoading(true);
    try {
      let selfie = "";
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.4 });
        if (photo?.base64) selfie = `data:image/jpeg;base64,${photo.base64}`;
      }
      await api.registrarPonto({
        tipo,
        gps_lat: coords?.lat,
        gps_lng: coords?.lng,
        selfie,
        dispositivo: "app-mobile",
      });
      Alert.alert("Pronto!", `${TIPO_LABEL[tipo]} registrada com sucesso.`);
      await carregar();
    } catch (e: any) {
      Alert.alert("Não foi possível registrar", e.message);
    } finally {
      setLoading(false);
    }
  }

  const proximo = hoje?.proximo_tipo;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.cameraWrap}>
        {camPerm?.granted ? (
          <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        ) : (
          <View style={[styles.camera, styles.camPlaceholder]}>
            <Ionicons name="camera-outline" size={32} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>Câmera não autorizada</Text>
          </View>
        )}
      </View>

      <View style={styles.geoRow}>
        <Ionicons name="location" size={16} color={coords ? colors.green : colors.amber} />
        <Text style={styles.geoText}>
          {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : geoMsg}
        </Text>
      </View>

      {proximo ? (
        <TouchableOpacity style={styles.bigBtn} disabled={loading} onPress={() => bater(proximo)}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bigBtnText}>Bater ponto: {TIPO_LABEL[proximo]}</Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={styles.done}>Todos os pontos do dia foram registrados ✅</Text>
      )}

      <View style={styles.grid}>
        {Object.keys(TIPO_LABEL).map((t) => (
          <TouchableOpacity key={t} style={styles.smallBtn} disabled={loading} onPress={() => bater(t)}>
            <Text style={styles.smallBtnText}>{TIPO_LABEL[t]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Marcações de hoje</Text>
        {hoje?.registros?.length ? (
          hoje.registros.map((r: any) => (
            <View key={r.id} style={styles.regRow}>
              <Text style={styles.regTipo}>{TIPO_LABEL[r.tipo]}</Text>
              <Text style={styles.regHora}>{new Date(r.registrado_em).toLocaleTimeString("pt-BR")}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>Nenhuma marcação hoje.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.bg, gap: 12 },
  cameraWrap: { alignItems: "center" },
  camera: { width: 220, height: 220, borderRadius: 16, overflow: "hidden", backgroundColor: "#000" },
  camPlaceholder: { alignItems: "center", justifyContent: "center" },
  geoRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  geoText: { color: colors.muted, fontSize: 13 },
  bigBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  bigBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  done: { textAlign: "center", color: colors.green, fontSize: 15, paddingVertical: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  smallBtn: {
    width: "48%",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  smallBtnText: { color: colors.text, fontSize: 13 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontWeight: "600", marginBottom: 10, color: colors.text },
  regRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  regTipo: { color: colors.text },
  regHora: { color: colors.muted },
  muted: { color: colors.muted },
});
