import axios, { AxiosError } from "axios";
import { Injectable } from "@nestjs/common";
import settings from "../../settings";
import { ISocialApiClient } from "../../application/ports/social-api.client";
import { ApiKeyLease } from "../../application/services/key-manager.types";

@Injectable()
export class VkApiClient implements ISocialApiClient {
  readonly network = "vk";

  async call<T = any>(
    method: string,
    params: Record<string, any>,
    lease: ApiKeyLease,
  ): Promise<{
    data: T;
    statusCode: number;
    headers?: Record<string, string | number>;
  }> {
    const baseUrl = settings.vkApi.baseUrl.replace(/\/$/, "");
    const url = `${baseUrl}/${method}`;
    const query = new URLSearchParams();

    query.set("v", settings.vkApi.version);
    query.set("access_token", lease.tokenDecrypted);

    for (const [k, v] of Object.entries(params || {})) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) query.set(k, v.join(","));
      else query.set(k, String(v));
    }

    try {
      const res = await axios.get(`${url}?${query.toString()}`, {
        validateStatus: () => true,
      });
      if (res.status >= 400 || (res.data && res.data.error)) {
        const err: AxiosError = new AxiosError(
          "VK API error",
          String(res.status),
          undefined,
          undefined,
          res,
        );
        throw err;
      }
      return {
        data: res.data?.response ?? res.data,
        statusCode: res.status,
        headers: res.headers as any,
      };
    } catch (e: any) {
      if (e.response) {
        const r = e.response;
        const err = new Error(`VK API ${method} failed: ${r.status}`);
        (err as any).statusCode = r.status;
        (err as any).headers = r.headers;
        (err as any).data = r.data;
        throw err;
      }
      throw e;
    }
  }
}
