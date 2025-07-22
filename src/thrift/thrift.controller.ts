import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Put,
  Delete,
  Logger,
} from "@nestjs/common";
import { ThriftArangoService } from "./services";
import { API_V1, ARANGO_TAG } from "src/constants";
import { ApiBody, ApiTags } from "@nestjs/swagger";

@ApiTags(ARANGO_TAG)
@Controller(`${API_V1}/${ARANGO_TAG}`)
export class ThriftController {
  private readonly logger = new Logger(ThriftController.name);
  constructor(private readonly thriftArangoService: ThriftArangoService) {}

  @Post("create")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        collection: { type: "string", example: "test" },
        anyField: { type: "string", example: "anyValue" },
      },
      required: ["collection"],
      additionalProperties: true,
    },
    examples: {
      "example-1": {
        value: {
          collection: "test",
          name: "John",
          age: 30,
          isActive: true,
        },
      },
      "example-2": {
        value: {
          collection: "test",
          name: "Kate",
          sex: "female",
          bdate: "1990-01-01",
          city_id: "Moscow",
          domain: "kate",
          photo: "https://example.com/photo.jpg",
          deactivated: 0,
          is_closen: 0,
          owner_user_id: 1,
        },
      },
    },
  })
  async create(@Body() body: Record<string, any>) {
    const { collection, ...fields } = body;
    if (!collection) {
      throw new Error("Collection is required");
    }
    const res = await this.thriftArangoService.save(collection, fields);
    return { _id: `${collection}/${res.key}` };
  }

  @Get("read")
  async read(
    @Query("collection") collection: string,
    @Query("key") key: string,
  ) {
    return this.thriftArangoService.get(collection, key);
  }

  @Put("update")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        collection: { type: "string", example: "test" },
        key: { type: "string", example: "123" },
        anyField: { type: "string", example: "anyValue" },
      },
      required: ["collection", "key"],
      additionalProperties: true,
    },
    examples: {
      "example-1": {
        value: {
          collection: "test",
          key: "123",
          name: "Max",
          age: 30,
          isActive: true,
          photo: "https://example.com/photo.jpg",
          deactivated: 0,
        },
      },
      "example-2": {
        value: {
          collection: "test",
          key: "333",
          name: "Kate",
          age: 30,
        },
      },
    },
  })
  async update(@Body() body: Record<string, any>) {
    const { collection, key, ...fields } = body;
    if (!collection || !key) {
      throw new Error("Collection and key are required");
    }
    await this.thriftArangoService.get(collection, key);
    await this.thriftArangoService.save(collection, { ...fields, key });
    return { _id: `${collection}/${key}` };
  }

  @Delete("delete")
  async delete(
    @Query("collection") collection: string,
    @Query("key") key: string,
  ) {
    return { error: "Not implemented: add delete to thrift server" };
  }
}
