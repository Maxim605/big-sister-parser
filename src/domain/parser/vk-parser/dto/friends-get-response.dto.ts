import { ApiProperty } from '@nestjs/swagger';
import { FriendDto } from './friend.dto';

export class FriendsGetResponseDto {
  @ApiProperty({
    description: 'Общее количество друзей',
    example: 2,
  })
  count: number;

  @ApiProperty({
    description: 'Список друзей',
    example: [
      112233,
      321321
    ],
    type: [FriendDto],
    isArray: true,
  })
  items: Array<number | FriendDto>;
} 