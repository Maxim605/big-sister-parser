import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import settings from "src/settings";

@Injectable()
export class CryptoService {
  private readonly algorithm = "aes-256-gcm";
  private readonly key: Buffer;

  constructor() {
    const isProd = process.env.NODE_ENV === "production";
    const envSecret = process.env.SECRET_KEY;
    if (isProd && !envSecret) {
      throw new Error("SECRET_KEY is required");
    }

    const secret = envSecret || settings.envSecret;
    this.key = crypto.createHash("sha256").update(secret).digest();
  }

  encrypt(plainText: string): { cipherText: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const enc = Buffer.concat([
      cipher.update(Buffer.from(plainText, "utf8")),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return {
      cipherText: enc.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
    };
  }

  decrypt(cipherText: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(cipherText, "base64")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  }

  encryptToCompact(plainText: string): string {
    const { cipherText, iv, tag } = this.encrypt(plainText);
    return `${cipherText}.${iv}.${tag}`;
  }

  decryptFromCompact(compact: string): string {
    const [cipherText, iv, tag] = compact.split(".");
    if (!cipherText || !iv || !tag) throw new Error("Invalid compact cipher");
    return this.decrypt(cipherText, iv, tag);
  }
}
