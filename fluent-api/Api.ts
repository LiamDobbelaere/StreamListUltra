import http from "http";
import { Endpoint, HttpMethod } from "./Endpoint";

export class Api {
  private _server: http.Server;
  private _endpointsByMethodByPath: Map<string, Map<string, Endpoint>> =
    new Map();

  constructor() {
    this._server = http.createServer(this._handleRequest.bind(this));
  }

  public get(path: string) {
    return this._endpoint("GET", path);
  }

  public post(path: string) {
    return this._endpoint("POST", path);
  }

  public put(path: string) {
    return this._endpoint("PUT", path);
  }

  public delete(path: string) {
    return this._endpoint("DELETE", path);
  }

  public listen(port: number, callback?: () => void) {
    this._server.listen(port, callback);
    return this;
  }

  public logEndpoints() {
    this._endpointsByMethodByPath.forEach((endpoints, method) => {
      endpoints.forEach((endpoint, path) => {
        console.log(`${method} ${path}`);
      });
    });
    return this;
  }

  public apply(middleware: (api: Api) => Endpoint) {
    middleware(this);
    return this;
  }

  private _endpoint(method: HttpMethod, path: string) {
    const newEndpoint = new Endpoint(this, {
      method,
      path,
    });

    if (!this._endpointsByMethodByPath.has(method)) {
      this._endpointsByMethodByPath.set(method, new Map());
    }
    this._endpointsByMethodByPath.get(method)!.set(path, newEndpoint);

    return newEndpoint;
  }

  private _handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const { method, url: path } = req;

    if (!method || !path) {
      return this._404(res);
    }

    const endpoint = this._endpointsByMethodByPath.get(method)?.get(path);

    if (!endpoint) {
      return this._404(res);
    }

    return endpoint.handle(req, res);
  }

  private _404(res: http.ServerResponse, message: string = "Not Found") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(message);
  }
}
