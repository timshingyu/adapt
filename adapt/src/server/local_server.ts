import * as fs from "fs-extra";
import JsonDB = require("node-json-db");
import { URL } from "url";

import { AdaptServer, register, ServerOptions, SetOptions } from "./server";

export interface LocalServerOptions extends ServerOptions {
    init?: boolean;
}

const defaultOptions = {
    init: false,
};

const currentVersion = 0;

// Exported for testing only
export class LocalServer implements AdaptServer {
    static urlMatch = /^file:/;
    private db: JsonDB;
    private filename: string;
    private options: LocalServerOptions;

    constructor(url: URL, options: Partial<LocalServerOptions>) {
        this.filename = url.pathname;
        this.options = {...defaultOptions, ...options};
    }

    async init(): Promise<void> {
        const exists = await fs.pathExists(this.filename);
        if (exists === false && this.options.init === false) {
            throw new Error(`Adapt local server file '${this.filename}' does not exist`);
        }

        // Creates file if none exists. Params are:
        // saveOnPush: true
        // humanReadable: true
        this.db = new JsonDB(this.filename, true, true);

        if (exists) {
            let ver: any = null;
            try {
                ver = this.db.getData("/adaptLocalServerVersion");
            } catch (err) {
                // fall through
            }
            if (ver !== currentVersion) {
                throw new Error(`File '${this.filename}' is not a valid Adapt local server file`);
            }
        } else {
            this.db.push("/adaptLocalServerVersion", currentVersion);
        }
    }

    async set(dataPath: string, val: any, options?: SetOptions): Promise<void> {
        if (options != null && options.mustCreate === true) {
            try {
                this.db.getData(dataPath);
                throw new Error(`Local server: path '${dataPath}' already exists`);
            } catch (err) {
                if (err.name !== "DataError") throw err;
            }
        }
        this.db.push(dataPath, val);
    }

    async get(dataPath: string): Promise<any> {
        return this.db.getData(dataPath);
    }

    async delete(dataPath: string): Promise<void> {
        this.db.delete(dataPath);
    }
}

register(LocalServer);
