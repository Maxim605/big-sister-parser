import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";
import settings from "src/settings";
import { IVkGroupApiClient } from "src/application/ports/ivk-group-api.client";
import {
  VkApiError,
  VkGroupDetail,
  VkGroupsGetByIdParams,
  VkGroupsGetMembersParams,
  VkGroupsMembersResponse,
} from "src/infrastructure/vk/types";

/**
 * Реализация клиента VK API для работы с сообществами.
 * Покрывает методы: groups.getById, groups.getMembers, wall.get.
 */
@Injectable()
export class VkGroupApiClient implements IVkGroupApiClient {
  private readonly logger = new Logger(VkGroupApiClient.name);
  private readonly baseUrl = settings.vkApi.baseUrl.replace(/\/$/, "");
  private readonly version = settings.vkApi.version;

  constructor(private readonly http: HttpService) {}

  /**
   * Универсальный вызов VK API с токеном.
   * Выбрасывает VkApiError при ошибке ответа.
   * Добавляет задержку 340ms между запросами (не более 3 req/s).
   */
  private async call<T>(
    method: string,
    params: Record<string, any>,
    token: string,
  ): Promise<T> {
    await new Promise((r) => setTimeout(r, 340));

    const query = new URLSearchParams();
    query.set("access_token", token);
    query.set("v", this.version);

    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) query.set(k, v.join(","));
      else query.set(k, String(v));
    }

    const url = `${this.baseUrl}/${method}?${query}`;

    try {
      const { data } = await lastValueFrom(this.http.get(url));
      if (data?.error) {
        throw new VkApiError(
          Number(data.error.error_code) || 0,
          data.error.error_msg || "VK API error",
        );
      }
      return (data.response ?? data) as T;
    } catch (e: any) {
      if (e instanceof VkApiError) throw e;
      this.logger.error(`VK API call ${method} failed: ${e.message}`);
      throw e;
    }
  }

  /**
   * Получить информацию о группе (groups.getById).
   * Возвращает массив объектов группы (обычно один элемент).
   */
  async groupsGetById(
    params: VkGroupsGetByIdParams,
  ): Promise<VkGroupDetail[]> {
    const { access_token, fields, group_id } = params;
    return this.call<VkGroupDetail[]>(
      "groups.getById",
      {
        group_id,
        ...(fields && fields.length > 0 ? { fields: fields.join(",") } : {}),
      },
      access_token,
    );
  }

  /**
   * Получить список участников группы (groups.getMembers).
   * Поддерживает пагинацию через offset/count.
   */
  async groupsGetMembers(
    params: VkGroupsGetMembersParams,
  ): Promise<VkGroupsMembersResponse> {
    const { access_token, ...rest } = params;
    return this.call<VkGroupsMembersResponse>(
      "groups.getMembers",
      rest,
      access_token,
    );
  }

  /**
   * Получить посты со стены группы (wall.get).
   * owner_id для группы должен быть отрицательным.
   */
  async wallGet(params: {
    owner_id: number;
    offset?: number;
    count?: number;
    access_token: string;
  }): Promise<{ count: number; items: any[] }> {
    const { access_token, ...rest } = params;
    return this.call<{ count: number; items: any[] }>(
      "wall.get",
      rest,
      access_token,
    );
  }
}
