import { Injectable, Logger } from '@nestjs/common';
import { LocalCache } from '../entites/app-cache.entity';
import { DateTime } from 'luxon';

export class CachedData<T> {
    constructor(data: T, date: DateTime) {
        this.data = data;
        this.date = date;
    }

    public data: T;
    public date: DateTime;
}

// TODO
@Injectable()
export class LocalCacheService {
    private readonly logger = new Logger(LocalCacheService.name);

    constructor() {}

    private generatePrimaryKey = (module: string, key: string): string => {
        return `${module}_${key}`;
    };
}
