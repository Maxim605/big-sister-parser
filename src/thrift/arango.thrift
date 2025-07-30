namespace js arango

struct SaveRequest {
  1: string collection,
  2: map<string, string> fields
}

struct SaveResponse {
  1: bool success,
  2: optional string key,
  3: optional string error
}

struct GetRequest {
  1: string collection,
  2: string key
}

struct GetResponse {
  1: optional map<string, string> fields,
  2: optional string error
}

service ArangoService {
  SaveResponse save(1: SaveRequest req),
  GetResponse get(1: GetRequest req)
} 