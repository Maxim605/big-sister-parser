import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface QueryRequest {
  aql: string;
  bindVars?: { [key: string]: any };
}

export interface Document {
  fields: { [key: string]: any };
}

export interface CRUDResponse {
  success: boolean;
  key?: string;
  error?: { code: number; message: string };
}

export interface FollowRequest {
  fromKey: string;
  toKey: string;
}

export interface FriendsRequest {
  key: string;
}

export interface FriendsResponse {
  friends: Document[];
}

interface ArangoGrpc {
  StreamQuery(request: QueryRequest): Observable<Document>;
  CreateDocument(request: {
    collection: string;
    fields: any;
  }): Observable<CRUDResponse>;
  ReadDocument(request: {
    collection: string;
    key: string;
  }): Observable<Document>;
  UpdateDocument(request: {
    collection: string;
    fields: any;
  }): Observable<CRUDResponse>;
  DeleteDocument(request: {
    collection: string;
    key: string;
  }): Observable<CRUDResponse>;
  BatchInsert(stream: Observable<Document>): Observable<CRUDResponse>;
  AddFollow(request: FollowRequest): Observable<CRUDResponse>;
  GetFriends(request: FriendsRequest): Observable<FriendsResponse>;
}

@Injectable()
export class GrpcService implements OnModuleInit, OnModuleDestroy {
  private client: ArangoGrpc;

  constructor(
    @Inject("ARANGO_GRPC_CLIENT") private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.client = this.grpcClient.getService<ArangoGrpc>("ArangoService");
  }

  onModuleDestroy() {}

  createDocument(collection: string, fields: any): Observable<CRUDResponse> {
    return this.client.CreateDocument({ collection, fields });
  }

  readDocument(collection: string, key: string): Observable<Document> {
    return this.client.ReadDocument({ collection, key });
  }

  updateDocument(
    collection: string,
    key: string,
    fields: any,
  ): Observable<CRUDResponse> {
    return this.client.UpdateDocument({
      collection,
      fields: { _key: key, ...fields },
    });
  }

  deleteDocument(collection: string, key: string): Observable<CRUDResponse> {
    return this.client.DeleteDocument({ collection, key });
  }

  streamQuery(aql: string, bindVars?: object): Observable<Document> {
    return this.client.StreamQuery({ aql, bindVars });
  }

  batchInsert(docs$: Observable<Document>): Observable<CRUDResponse> {
    return this.client.BatchInsert(docs$);
  }

  addFollow(fromKey: string, toKey: string): Observable<CRUDResponse> {
    return this.client.AddFollow({ fromKey, toKey });
  }

  getFriends(key: string): Observable<FriendsResponse> {
    return this.client.GetFriends({ key });
  }
}
