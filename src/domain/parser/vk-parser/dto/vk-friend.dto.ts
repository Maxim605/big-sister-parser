import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class VkFriendDto {
  @ApiProperty({
    description: "ID пользователя VK",
    example: 508133099,
  })
  id: number;

  @ApiProperty({
    description: "Имя пользователя",
    example: "Иван",
  })
  first_name: string;

  @ApiProperty({
    description: "Фамилия пользователя",
    example: "Иванов",
  })
  last_name: string;

  @ApiPropertyOptional({
    description: "Статус аккаунта (например, deleted или banned)",
    example: "deleted",
  })
  deactivated?: string;

  @ApiPropertyOptional({
    description: "Скрыт ли пользователь",
    example: 0,
  })
  hidden?: number;

  @ApiPropertyOptional({
    description: "Дата рождения",
    example: "11.03.1990",
  })
  bdate?: string;

  @ApiPropertyOptional({
    description: "Пол: 1 — женский; 2 — мужской; 0 — не указан",
    example: 2,
  })
  sex?: number;

  @ApiPropertyOptional({
    description: "Город",
    example: { id: 1, title: "Москва" },
    type: Object,
  })
  city?: { id: number; title: string };

  @ApiPropertyOptional({
    description: "Страна",
    example: { id: 1, title: "Россия" },
    type: Object,
  })
  country?: { id: number; title: string };

  @ApiPropertyOptional({
    description: "Онлайн ли пользователь",
    example: 1,
  })
  online?: number;

  @ApiPropertyOptional({
    description: "Время последнего визита (unix timestamp)",
    example: 1719927350,
  })
  last_seen?: {
    time: number;
    platform: number;
  };

  @ApiPropertyOptional({
    description: "Фотография профиля (50px)",
    example: "https://vk.com/images/camera_50.png",
  })
  photo_50?: string;

  @ApiPropertyOptional({
    description: "Фотография профиля (100px)",
    example: "https://vk.com/images/camera_100.png",
  })
  photo_100?: string;

  @ApiPropertyOptional({
    description: "Фотография профиля (200px)",
    example: "https://vk.com/images/camera_200.png",
  })
  photo_200_orig?: string;

  @ApiPropertyOptional({
    description: "Закрыт ли профиль",
    example: true,
  })
  is_closed?: boolean;

  @ApiPropertyOptional({
    description: "Доступен ли профиль текущему пользователю",
    example: true,
  })
  can_access_closed?: boolean;

  [key: string]: any;
}
