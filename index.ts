import { Api } from "./fluent-api/Api";
import { getStreamItem } from "./streamlist/StreamItem.endpoint";
import { DataObject, DataStore } from "./mem-db/DataStore";

export interface StreamItem extends DataObject {
  name: string;
  coop?: boolean;
}

const streamItems = new DataStore<StreamItem>("stream-items");

new Api()
  //.apply(getStreamItem)

  .get("/stream-item")
  .function((req, res) => {
    return streamItems.readAll();
  })
  .api()
  .listen(3000, () => {
    console.log("Server listening on port 3000");
  })
  .logEndpoints();

console.log("API ready");
