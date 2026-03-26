import { DateTime } from "luxon";

export class LocalCache {
  module?: string;
  type?: string;
  data?: unknown;
  createdAt: DateTime;
}
