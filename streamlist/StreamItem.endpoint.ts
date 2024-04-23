import { Endpoint } from "../fluent-api/Endpoint";
import { Api } from "../fluent-api/Api";

export function getStreamItem(api: Api): Endpoint {
  return api.get("/stream-item").content("Stream Item");
}
