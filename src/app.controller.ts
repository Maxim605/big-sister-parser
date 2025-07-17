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
  QueryRequest,
} from "./grpc/services/grpc.service";

interface ReadRequest {
  collection: string;
  key: string;
}

@Controller()
export class AppController {
  constructor(private readonly grpcService: GrpcService) {}

  @GrpcMethod("ArangoService", "CreateDocument")
  createDocument(request: {
    fields: any;
    collection: string;
  }): Observable<CRUDResponse> {
    return this.grpcService.createDocument(request.collection, request.fields);
  }

  @GrpcMethod("ArangoService", "ReadDocument")
  readDocument(request: ReadRequest): Observable<{ document: Document }> {
    return this.grpcService
      .readDocument(request.collection, request.key)
      .pipe(map((document) => ({ document })));
  }

  @GrpcMethod("ArangoService", "UpdateDocument")
  updateDocument(request: {
    fields: any;
    collection: string;
  }): Observable<CRUDResponse> {
    const { _key, ...data } = request.fields;
    return this.grpcService.updateDocument(request.collection, _key, data);
  }

  @GrpcMethod("ArangoService", "DeleteDocument")
  deleteDocument(request: ReadRequest): Observable<CRUDResponse> {
    return this.grpcService.deleteDocument(request.collection, request.key);
  }

  @GrpcStreamMethod("ArangoService", "StreamQuery")
  streamQuery(
    request: QueryRequest & { collection: string },
  ): Observable<{ document: Document }> {
    return this.grpcService
      .streamQuery(request.aql, request.bindVars)
      .pipe(map((document) => ({ document })));
  }

  @GrpcStreamMethod("ArangoService", "BatchInsert")
  batchInsert(stream$: Observable<Document>): Observable<CRUDResponse> {
    return this.grpcService.batchInsert(stream$);
  }

  @GrpcMethod("ArangoService", "AddFollow")
  addFollow(request: FollowRequest): Observable<CRUDResponse> {
    return this.grpcService.addFollow(request.fromKey, request.toKey);
  }

  @GrpcMethod("ArangoService", "GetFriends")
  getFriends(
    request: FriendsRequest,
  ): Observable<{ friends: FriendsResponse }> {
    return this.grpcService
      .getFriends(request.key)
      .pipe(map((friends) => ({ friends })));
  }
}
