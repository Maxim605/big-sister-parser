import { ApiProperty } from "@nestjs/swagger";
import { VkFriendDto } from "./vk-friend.dto";

export class VkFriendsGetResponseDto {
  @ApiProperty({
    description: "Общее количество друзей",
    example: 2,
  })
  count: number;

  @ApiProperty({
    description: "Список друзей",
    example: [112233, 321321],
    type: [VkFriendDto],
    isArray: true,
  })
  items: Array<number | VkFriendDto>;
}
