import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface QueryRequest { aql: string; bindVars?: { [key: string]: any }; }
export interface Document { fields: { [key: string]: any }; }
export interface CRUDResponse { success: boolean; key?: string; error?: { code: number; message: string } }
export interface StreamResponse { document: Document }
export interface FollowRequest { fromKey: string; toKey: string }
export interface FriendsRequest { key: string }
export interface FriendsResponse { friends: Document[] }

interface ArangoGrpc {
  StreamQuery(request: QueryRequest): Observable<Document>;
  CreateDocument(request: Document): Observable<CRUDResponse>;
  ReadDocument(request: { key: string }): Observable<StreamResponse>;
  UpdateDocument(request: Document): Observable<CRUDResponse>;
  DeleteDocument(request: { key: string }): Observable<CRUDResponse>;
  BatchInsert(stream: Observable<Document>): Observable<CRUDResponse>;
  AddFollow(request: FollowRequest): Observable<CRUDResponse>;
  GetFriends(request: FriendsRequest): Observable<FriendsResponse>;
}

@Injectable()
export class GrpcService implements OnModuleInit, OnModuleDestroy {
  private client: ArangoGrpc;

  constructor(
    @Inject('ARANGO_GRPC_CLIENT')
    private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.client = this.grpcClient.getService<ArangoGrpc>('ArangoService');
  }

  onModuleDestroy() {
    // TODO 
  }

  createDocument(fields: any): Observable<CRUDResponse> {
    return this.client.CreateDocument({ fields });
  }

  readDocument(key: string): Observable<Document> {
    return this.client.ReadDocument({ key }).pipe(
      map(resp => resp.document),
    );
  }

  updateDocument(key: string, fields: any): Observable<CRUDResponse> {
    return this.client.UpdateDocument({ fields: { _key: key, ...fields } });
  }

  deleteDocument(key: string): Observable<CRUDResponse> {
    return this.client.DeleteDocument({ key });
  }

  streamQuery(aqlString: string, bindVars?: object): Observable<Document> {
    return this.client.StreamQuery({ aql: aqlString, bindVars });
  }

  batchInsert(docs$: Observable<Document>): Observable<CRUDResponse> {
    return this.client.BatchInsert(docs$);
  }

  addFollow(fromKey: string, toKey: string): Observable<CRUDResponse> {
    return this.client.AddFollow({ fromKey, toKey });
  }

  getFriends(key: string): Observable<Document[]> {
    return this.client.GetFriends({ key }).pipe(
      map(r => r.friends),
    );
  }
}
