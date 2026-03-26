import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { TOKENS } from "../../../common/tokens";
import {
  ApiKeyRecord,
  IApiKeyRepository,
} from "../../../domain/repositories/iapi-key.repository";
import { CryptoService } from "../../security/crypto.service";

@Injectable()
export class PostgresApiKeyRepository implements IApiKeyRepository {
  constructor(
    @Inject(TOKENS.PgPool) private readonly pg: Pool,
    private readonly crypto: CryptoService,
  ) {}

  async ensureTable(): Promise<void> {
    await this.pg.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        network TEXT NOT NULL,
        token_encrypted TEXT NOT NULL,
        status TEXT NOT NULL,
        paused_until BIGINT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_api_keys_network_status ON api_keys(network, status);
    `);
  }

  async findActiveKeys(network: string): Promise<ApiKeyRecord[]> {
    const res = await this.pg.query(
      `SELECT id, network, token_encrypted AS "tokenEncrypted", status, paused_until AS "pausedUntil", created_at AS "createdAt", updated_at AS "updatedAt" FROM api_keys WHERE network = $1 AND status = 'active'`,
      [network],
    );
    return res.rows;
  }

  async updateStatus(
    id: string,
    status: "active" | "invalid" | "paused",
    pausedUntil?: number | null,
  ): Promise<void> {
    await this.pg.query(
      `UPDATE api_keys SET status = $2, paused_until = $3, updated_at = NOW() WHERE id = $1`,
      [id, status, pausedUntil ?? null],
    );
  }

  async save(record: ApiKeyRecord): Promise<void> {
    await this.pg.query(
      `INSERT INTO api_keys (id, network, token_encrypted, status, paused_until)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET network = EXCLUDED.network, token_encrypted = EXCLUDED.token_encrypted, status = EXCLUDED.status, paused_until = EXCLUDED.paused_until, updated_at = NOW()`,
      [
        record.id,
        record.network,
        record.tokenEncrypted,
        record.status,
        record.pausedUntil ?? null,
      ],
    );
  }
}
