/**
 * Reconhecimento facial (PRD seção 8).
 *
 * Provider plugável. O objetivo é NÃO fingir segurança que não existe: o
 * provider padrão (`none`) apenas armazena a selfie e devolve um resultado
 * "pendente de revisão" (não verificado, não suspeito), registrando a tentativa.
 * Quando um provider real for configurado (ex: AWS Rekognition), a comparação
 * 1:1 entre a foto de referência do funcionário e a selfie do registro é feita
 * de fato e o `score` passa a refletir a confiança da correspondência.
 */
const PROVIDER = (process.env.FACE_PROVIDER || "none").toLowerCase();
const THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD || 85);

export interface FaceResult {
  verificada: boolean;
  score: number | null;
  suspeito: boolean;
  motivo: string;
}

/**
 * Compara a selfie do registro com a foto de referência do funcionário.
 * @param referencia foto facial cadastrada (base64 ou URL)
 * @param selfie selfie capturada no momento do registro (base64)
 */
export async function compareFace(referencia: string, selfie: string): Promise<FaceResult> {
  if (!selfie) {
    return { verificada: false, score: null, suspeito: true, motivo: "Selfie ausente" };
  }
  if (!referencia) {
    return { verificada: false, score: null, suspeito: false, motivo: "Funcionário sem foto de referência cadastrada" };
  }

  switch (PROVIDER) {
    case "rekognition":
      return compareWithRekognition(referencia, selfie);
    case "none":
    default:
      // Sem provider de verificação: a selfie fica armazenada para auditoria,
      // marcada como pendente de revisão manual (não bloqueia, não aprova).
      return {
        verificada: false,
        score: null,
        suspeito: false,
        motivo: "Provider de reconhecimento facial não configurado — registro pendente de revisão manual",
      };
  }
}

/**
 * Stub de integração com AWS Rekognition (CompareFaces). Mantido como ponto de
 * extensão: para ativar, instalar @aws-sdk/client-rekognition e implementar a
 * chamada real. Enquanto a dependência não existir, cai no comportamento seguro.
 */
async function compareWithRekognition(_referencia: string, _selfie: string): Promise<FaceResult> {
  console.warn(
    "FACE_PROVIDER=rekognition configurado, mas a integração AWS ainda não foi implementada. " +
      "Tratando como pendente de revisão. Implemente compareWithRekognition() com @aws-sdk/client-rekognition."
  );
  return {
    verificada: false,
    score: null,
    suspeito: false,
    motivo: "Integração Rekognition pendente de implementação",
  };
}

export { THRESHOLD as FACE_THRESHOLD };
