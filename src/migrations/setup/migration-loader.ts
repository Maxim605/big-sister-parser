import { Migration } from "./types";
import { migrations } from "../index";

export async function getAvailableMigrations(): Promise<Migration[]> {
  return migrations
    .map((MigrationClass) => {
      const migration = new MigrationClass();
      return {
        id: migration.id,
        name: migration.name,
        timestamp: migration.timestamp,
        up: () => migration.up(),
        down: () => migration.down(),
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}
