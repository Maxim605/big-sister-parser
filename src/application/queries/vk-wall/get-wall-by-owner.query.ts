import { Inject, Injectable } from "@nestjs/common";
import { TOKENS } from "src/common/tokens";
import { IPostRepository } from "src/domain/repositories/ipost.repository";

@Injectable()
export class GetWallByOwnerQuery {
  constructor(
    @Inject(TOKENS.IPostRepository) private readonly postRepo: IPostRepository,
  ) {}

  async execute(params: {
    ownerId: number;
    offset?: number;
    count?: number;
  }): Promise<any[]> {
    const hasPaging =
      typeof params.offset === "number" || typeof params.count === "number";

    if (hasPaging) {
      return this.postRepo.findByOwner(params.ownerId, {
        offset: params.offset,
        count: params.count,
      });
    }

    const all: any[] = [];
    let offset = 0;
    const pageSize = params.count ?? 1000;
    for (;;) {
      const batch = await this.postRepo.findByOwner(params.ownerId, {
        offset,
        count: pageSize,
      });
      if (!batch.length) break;
      all.push(...batch);
      offset += batch.length;
      if (batch.length < pageSize) break;
    }
    return all;
  }
} 