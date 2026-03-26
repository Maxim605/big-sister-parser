import { Injectable } from "@nestjs/common";
import { LoadFriendsGraphParams } from "../dto/load-friends-graph-params.interface";
import { LoadFriendsGraphRequestDto } from "src/presentation/http/orchestrator/dto/load-friends-graph-request.dto";

@Injectable()
export class LoadFriendsGraphParamsMapper {
  toUseCaseParams(dto: LoadFriendsGraphRequestDto): LoadFriendsGraphParams {
    return {
      start_id: dto.start_id,
      max_depth: dto.max_depth ?? 1,
      rewrite: dto.rewrite ?? false,
      mode: dto.mode,
      db_batch_size: dto.db_batch_size,
      api_batch_size: dto.api_batch_size,
      api_concurrency: dto.api_concurrency,
      worker_count: dto.worker_count,
      api_timeout_ms: dto.api_timeout_ms,
      max_retries: dto.max_retries,
      backoff_base_ms: dto.backoff_base_ms,
      redis_namespace: dto.redis_namespace,
      job_ttl: dto.job_ttl,
      access_token: dto.access_token,
      fields: dto.fields,
      name_case: dto.name_case,
    };
  }
}
