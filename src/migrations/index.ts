import { InitMigration1751961990 } from "./1751961990-InitMigration";
import { AddWallCollections1755735724 } from "./1755735724-AddWallCollections";
import { AddInteractionsCollections1774528799 } from "./1774528799-AddInteractionsCollections";
import { RefactorInteractions1774548747 } from "./1774548747-RefactorInteractions";

export const migrations = [
  InitMigration1751961990,
  AddWallCollections1755735724,
  AddInteractionsCollections1774528799,
  RefactorInteractions1774548747,
];
