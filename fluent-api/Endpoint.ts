import http from "http";
import { Api } from "./Api";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface EndpointUrlConfig {
  method: HttpMethod;
  path: string;
}

export class Endpoint {
  private _type: string;
  private _contentExpression: (
    req: http.IncomingMessage,
    res: http.ServerResponse
  ) => string | object;

  constructor(private _api: Api, private _config: EndpointUrlConfig) {}

  public handle(req: http.IncomingMessage, res: http.ServerResponse) {
    let response = this._contentExpression(req, res);

    if (typeof response === "object") {
      this.json();
      response = JSON.stringify(response);
    }

    res.writeHead(200, { "Content-Type": this._type });
    res.end(response);
  }

  public content(response: string) {
    this.plainText();
    this._contentExpression = () => response;
    return this;
  }

  public plainText() {
    this._type = "text/plain";
    return this;
  }

  public json() {
    this._type = "application/json";
    return this;
  }

  public function(
    expression: (
      req: http.IncomingMessage,
      res: http.OutgoingMessage
    ) => string | object
  ) {
    this._contentExpression = expression;
    return this;
  }

  public api(): Api {
    return this._api;
  }
}
