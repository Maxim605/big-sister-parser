import { Inject, Injectable, Logger } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { IVkGroupApiClient } from "src/application/ports/ivk-group-api.client";
import { TOKENS } from "src/common/tokens";
import { VkGroupDetail } from "src/infrastructure/vk/types";
import { ThriftArangoService } from "src/thrift/services/thrift-arango.service";

/** Событие прогресса при потоковой загрузке информации о группе */
export interface GroupInfoEvent {
  type: "started" | "saved" | "completed" | "error";
  group_id?: number;
  name?: string;
  error?: string;
  data?: VkGroupDetail;
}

/** Параметры загрузки информации о группе */
export interface LoadGroupInfoParams {
  /** ID группы или её короткое имя */
  group_id: string | number;
  /** Список полей для запроса у VK API */
  fields?: string[];
  /** Токен доступа VK API */
  access_token: string;
  /** Перезаписать данные, если уже существуют */
  rewrite?: boolean;
}

/**
 * Use case: получение и сохранение информации о сообществе ВКонтакте.
 * Поддерживает синхронный, асинхронный и потоковый (SSE) режимы.
 *
 * Для чтения использует IGroupRepository (DDD-репозиторий).
 * Для сохранения расширенных полей (members_count, activity, counters и т.д.)
 * использует ThriftArangoService напрямую в коллекцию groups.
 */
@Injectable()
export class VkGroupInfoUseCase {
  private readonly logger = new Logger(VkGroupInfoUseCase.name);

  constructor(
    @Inject(TOKENS.IVkGroupApiClient)
    private readonly api: IVkGroupApiClient,
    private readonly thrift: ThriftArangoService,
  ) {}

  /**
   * Получить данные группы из VK API без сохранения.
   */
  async fetch(params: LoadGroupInfoParams): Promise<VkGroupDetail[]> {
    return this.api.groupsGetById({
      group_id: params.group_id,
      fields: params.fields,
      access_token: params.access_token,
    });
  }

  /**
   * Получить сохранённую информацию о группе из базы данных.
   * Читает через ThriftArangoService по _key = group_id.
   */
  async getFromDb(groupId: string | number): Promise<any | null> {
    try {
      const result = await this.thrift.get("groups", String(groupId));
      return result?.fields ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Синхронная загрузка: получить из VK API и сохранить в ArangoDB (thrift).
   * Thrift сохраняет все расширенные поля (members_count, activity, counters и т.д.)
   * в коллекцию groups.
   */
  async loadSync(params: LoadGroupInfoParams): Promise<{
    saved: boolean;
    group: VkGroupDetail | null;
    key?: string;
  }> {
    this.logger.log(
      `[GroupInfo] Загрузка информации о группе ${params.group_id}`,
    );

    const groups = await this.api.groupsGetById({
      group_id: params.group_id,
      fields: params.fields,
      access_token: params.access_token,
    });

    if (!groups || groups.length === 0) {
      this.logger.warn(
        `[GroupInfo] Группа ${params.group_id} не найдена в VK API`,
      );
      return { saved: false, group: null };
    }

    const group = groups[0];

    // Сохраняем в коллекцию groups через thrift (расширенные поля)
    const result = await this.thrift.save("groups", {
      _key: String(group.id),
      id: String(group.id),
      name: group.name ?? "",
      screen_name: group.screen_name ?? "",
      type: group.type ?? "",
      activity: group.activity ?? "",
      members_count:
        group.members_count != null ? String(group.members_count) : "",
      city: group.city ? JSON.stringify(group.city) : "",
      country: group.country ? JSON.stringify(group.country) : "",
      wall: group.wall != null ? String(group.wall) : "",
      counters: group.counters ? JSON.stringify(group.counters) : "",
      description: group.description ?? "",
      status: group.status ?? "",
      verified: group.verified != null ? String(group.verified) : "",
      is_closed: group.is_closed != null ? String(group.is_closed) : "",
      saved_at: new Date().toISOString(),
    });

    this.logger.log(
      `[GroupInfo] Группа ${group.id} (${group.name}) сохранена, key=${result.key}`,
    );

    return { saved: result.success, group, key: result.key };
  }

  /**
   * Потоковая загрузка: возвращает Observable с событиями прогресса.
   */
  loadStream(params: LoadGroupInfoParams): Observable<GroupInfoEvent> {
    const subject = new Subject<GroupInfoEvent>();

    // Запускаем загрузку асинхронно, не блокируя
    this.executeStream(params, subject).catch((err) => {
      this.logger.error(`[GroupInfo] Ошибка потоковой загрузки: ${err.message}`);
      subject.error(err);
    });

    return new Observable((subscriber) => {
      subject.subscribe(subscriber);
    });
  }

  private async executeStream(
    params: LoadGroupInfoParams,
    subject: Subject<GroupInfoEvent>,
  ): Promise<void> {
    subject.next({ type: "started", group_id: undefined });

    try {
      const result = await this.loadSync(params);

      if (result.group) {
        subject.next({
          type: "saved",
          group_id: result.group.id,
          name: result.group.name,
          data: result.group,
        });
      }

      subject.next({
        type: "completed",
        group_id: result.group?.id,
        name: result.group?.name,
        data: result.group ?? undefined,
      });
    } catch (err: any) {
      subject.next({ type: "error", error: err.message || String(err) });
    } finally {
      subject.complete();
    }
  }
}
