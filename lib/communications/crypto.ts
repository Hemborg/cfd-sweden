import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

type Envelope = { v: 1; iv: string; ciphertext: string; tag: string };

export function isEncryptedPayload(value: unknown): value is Envelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const envelope = value as Partial<Envelope>;
  return (
    envelope.v === 1 &&
    typeof envelope.iv === "string" &&
    typeof envelope.ciphertext === "string" &&
    typeof envelope.tag === "string"
  );
}

function encryptionKey() {
  const source = process.env.CFD_MAIL_ENCRYPTION_KEY;
  if (!source)
    throw new Error("Kommunikationskryptering saknar konfiguration.");
  const key = Buffer.from(source, "base64");
  if (key.length !== 32)
    throw new Error(
      "Kommunikationskryptering kräver en base64-kodad 32-byte nyckel.",
    );
  return key;
}

export function encryptPayload(value: unknown): Envelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return {
    v: 1,
    iv: iv.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
  };
}

export function decryptPayload<T>(value: unknown): T {
  if (!isEncryptedPayload(value))
    throw new Error("Ogiltig krypterad köpayload.");
  const envelope = value;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(envelope.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString("utf8")) as T;
}
