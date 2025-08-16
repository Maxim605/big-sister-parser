import { Module } from "@nestjs/common";
import { TOKENS } from "../../common/tokens";
import { VkApiClient } from "./vk-client";

@Module({
  providers: [
    VkApiClient,
    { provide: TOKENS.ISocialApiClient, useExisting: VkApiClient },
  ],
  exports: [TOKENS.ISocialApiClient],
})
export class VkApiModule {}
