export interface Migration {
  id: string;
  name: string;
  timestamp: number;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export interface MigrationRecord {
  _key: string;
  _id: string;
  _rev: string;
  migration_id: string;
  name: string;
  timestamp: number;
  applied_at: string;
}

export interface MigrationOptions {
  database: string;
  url: string;
  username: string;
  password: string;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  appliedMigrations?: string[];
  revertedMigrations?: string[];
} 