import crypto from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem caracteres ambíguos (0/O, 1/I/L)

function randomSegment(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return out;
}

/** Gera chave no formato KAIROS-XXXX-XXXX-XXXX */
export function generateLicenseKey(): string {
  return `KAIROS-${randomSegment(4)}-${randomSegment(4)}-${randomSegment(4)}`;
}
