import fs from "fs";
import path from "path";

export interface DataObject {
  id: number;
}

export class DataStore<T extends DataObject> {
  private _data: T[] = [];
  private _filePath: string;
  private _nextAutosaveTimeout: NodeJS.Timeout;

  private _usedKeys = new Set<number>();

  private _dirty = false;
  private _persisting = false;
  private _emergencyPersisted = false;

  constructor(name: string) {
    const fileName = `${name}.ds.json`;

    this._filePath = path.resolve(process.cwd(), fileName);

    if (!fs.existsSync(this._filePath)) {
      fs.writeFileSync(this._filePath, JSON.stringify(this._data));
    }

    this._data = require(this._filePath);
    this._buildKeys();

    console.log(
      `[DataStore] Read ${JSON.stringify(this._data).length} bytes from ${
        this._filePath
      }`
    );

    process.on("exit", this._emergencyPersist.bind(this, "exit"));
    process.on("SIGINT", () => {
      this._emergencyPersist("SIGINT");
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      this._emergencyPersist("SIGTERM");
      process.exit(0);
    });
    process.on("beforeExit", this._emergencyPersist.bind(this, "beforeExit"));
    process.on("SIGHUP", () => {
      this._emergencyPersist("SIGHUP");
      process.exit(0);
    });
    process.on("SIGBREAK", () => {
      this._emergencyPersist("SIGBREAK");
      process.exit(0);
    });
  }

  private async _persist() {
    this._dirty = false;

    if (this._persisting) {
      this._scheduleAutosave();
      return;
    }
    this._persisting = true;
    console.log(`[DataStore] Persisting to ${this._filePath}`);

    return new Promise<void>((resolve, reject) => {
      fs.writeFile(this._filePath, JSON.stringify(this._data), (err) => {
        this._persisting = false;

        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private _persistSync() {
    // TODO: there's still a condition where it might be busy persisting,
    // and then the writeFileSync will just fail

    if (this._nextAutosaveTimeout) {
      clearTimeout(this._nextAutosaveTimeout);
    }

    this._dirty = false;

    console.log(`[DataStore] Persisting synchronously to ${this._filePath}`);
    fs.writeFileSync(this._filePath, JSON.stringify(this._data));
  }

  public create(item: T) {
    if (this._usedKeys.has(item.id)) {
      throw new Error(`Key ${item.id} already in use`);
    }

    this._data.push(item);
    this._usedKeys.add(item.id);

    this._markDirty();
  }

  public readAll() {
    return this._data;
  }

  public readWhere(predicate: (item: T) => boolean) {
    return this._data.filter(predicate);
  }

  public update(id: number, item: Partial<T>) {
    if (!this._usedKeys.has(id)) {
      throw new Error(`Key ${id} not found`);
    }

    const index = this._data.findIndex((item) => item.id === id);
    this._data[index] = { ...this._data[index], ...item };

    this._markDirty();
  }

  public updateWhere(predicate: (item: T) => boolean, item: Partial<T>) {
    this._data = this._data.map((existingItem) =>
      predicate(existingItem) ? { ...existingItem, ...item } : existingItem
    );

    this._markDirty();
  }

  public delete(id: number) {
    this._data = this._data.filter((item) => item.id !== id);
    this._usedKeys.delete(id);

    this._markDirty();
  }

  public deleteWhere(predicate: (item: T) => boolean) {
    this._data = this._data.filter((item) => !predicate(item));
    this._buildKeys(); // TODO: this could be optimized

    this._markDirty();
  }

  private _buildKeys() {
    this._usedKeys = new Set(this._data.map((item) => item.id));
  }

  private _markDirty() {
    this._dirty = true;
    this._scheduleAutosave();
  }

  private _scheduleAutosave() {
    if (this._nextAutosaveTimeout) {
      clearTimeout(this._nextAutosaveTimeout);
    }

    this._nextAutosaveTimeout = setTimeout(this._persist.bind(this), 1000);
  }

  private _emergencyPersist(reason: string) {
    if (!this._emergencyPersisted && this._dirty) {
      console.log(`[DataStore] Received ${reason}, emergency persisting`);
      this._emergencyPersisted = true;
      this._persistSync();
    }
  }
}
