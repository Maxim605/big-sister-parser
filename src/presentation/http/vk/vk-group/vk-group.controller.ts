import {
  Controller,
  Get,
  Query,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { API_V1, VK_TAG, GROUP_TAG } from "src/constants";
import { VkApiService } from "src/infrastructure/vk/vk-api.service";
import settings from "src/settings";

@ApiTags(`${VK_TAG}-${GROUP_TAG}`)
@Controller(`${API_V1}/${VK_TAG}/${GROUP_TAG}`)
export class VkGroupController {
  private readonly logger = new Logger(VkGroupController.name);

  constructor(private readonly vkApi: VkApiService) {}

  @Get("info/fetch")
  @ApiOperation({ summary: "Получить информацию о группе из VK API" })
  @ApiQuery({ name: "group_id", required: true, type: String, example: settings.vkApi.defaultGroupId })
  @ApiQuery({ name: "fields", required: false, type: [String] })
  @ApiQuery({ name: "access_token", required: true, type: String, example: settings.token.vkDefault })
  async fetchGroupInfo(
    @Query("group_id") groupId: string,
    @Query("access_token") accessToken: string,
    @Query("fields") fields?: string | string[],
  ) {
    if (!groupId) throw new BadRequestException("group_id is required");
    if (!accessToken) throw new BadRequestException("access_token is required");

    const fieldsArr = fields
      ? Array.isArray(fields)
        ? fields
        : [fields]
      : undefined;

    return this.vkApi.groupsGet({
      group_id: groupId,
      access_token: accessToken,
      fields: fieldsArr,
    });
  }
}
