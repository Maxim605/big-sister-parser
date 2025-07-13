import { Controller } from "@nestjs/common";
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import {
  GrpcService,
  CRUDResponse,
  Document,
  FollowRequest,
  FriendsRequest,
  FriendsResponse,
} from "./services";

@Controller()
export class GrpcController {
  constructor(private readonly service: GrpcService) {}

  @GrpcMethod("ArangoService", "CreateDocument")
  createDocument(request: { fields: any }): Observable<CRUDResponse> {
    return this.service.createDocument(request.fields);
  }

  @GrpcMethod("ArangoService", "ReadDocument")
  readDocument(request: { key: string }): Observable<{ document: Document }> {
    return this.service
      .readDocument(request.key)
      .pipe(map((document) => ({ document })));
  }

  @GrpcMethod("ArangoService", "UpdateDocument")
  updateDocument(request: { fields: any }): Observable<CRUDResponse> {
    const { _key, ...rest } = request.fields;
    return this.service.updateDocument(_key, rest);
  }

  @GrpcMethod("ArangoService", "DeleteDocument")
  deleteDocument(request: { key: string }): Observable<CRUDResponse> {
    return this.service.deleteDocument(request.key);
  }

  @GrpcStreamMethod("ArangoService", "StreamQuery")
  streamQuery(request: {
    aql: string;
    bindVars?: { [key: string]: any };
  }): Observable<{ document: Document }> {
    return this.service
      .streamQuery(request.aql, request.bindVars)
      .pipe(map((document) => ({ document })));
  }

  @GrpcStreamMethod("ArangoService", "BatchInsert")
  batchInsert(stream$: Observable<Document>): Observable<CRUDResponse> {
    return this.service.batchInsert(stream$);
  }

  @GrpcMethod("ArangoService", "AddFollow")
  addFollow(request: FollowRequest): Observable<CRUDResponse> {
    return this.service.addFollow(request.fromKey, request.toKey);
  }

  @GrpcMethod("ArangoService", "GetFriends")
  getFriends(request: FriendsRequest): Observable<FriendsResponse> {
    return this.service
      .getFriends(request.key)
      .pipe(map((friends) => ({ friends })));
  }
}
