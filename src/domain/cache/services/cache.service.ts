import { DateTime } from "luxon";

export class CachedData<T> {
  constructor(
    public data: T,
    public date: DateTime,
  ) {}
}

export class LocalCacheService {
  // TODO: implement a pure in-memory cache or move to infrastructure layer.
  constructor() {}

  private generatePrimaryKey(module: string, key: string): string {
    return `${module}_${key}`;
  }
}
