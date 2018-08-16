import * as path from "path";
import * as ts from "typescript";
import { trace, tracef } from "../utils";
import { ChainableHost } from "./hosts";

const debugModuleResolution = false;

const dtsRegex = /\.d\.ts$/;

export class ModuleResolver extends ChainableHost {
    private cache: Map<string, ts.ResolvedModuleFull | null>;

    constructor(private compilerOptions: ts.CompilerOptions,
                chainHost?: ChainableHost, id?: string) {
        super((chainHost && chainHost.cwd) || "/");
        if (chainHost) this.setSource(chainHost);
        this.cache = new Map<string, ts.ResolvedModuleFull | null>();
        if (id) this._id = id;
    }

    @tracef(debugModuleResolution)
    resolveModuleNames(moduleNames: string[], containingFile: string,
                       reusedNames?: string[]) {
        const resolved: ts.ResolvedModuleFull[] = [];
        for (const modName of moduleNames) {
            // NOTE: ts.CompilerHost allows returning undefined for a module, but
            // ts.LanguageServiceHost does not. Fib a little here.
            resolved.push(
                this.resolveModuleName(modName, containingFile,
                                       false) as ts.ResolvedModuleFull);
        }
        return resolved;
    }

    /**
     * Resolve a single module name to a file path
     * @param modName The module name, as specified in import/require
     * @param containingFile The path to the file that contains the import
     * @param runnable Return a file that can be executed, which means either
     *     a .js file or something that we know how to compile (ts, tsx).
     */
    @tracef(debugModuleResolution)
    resolveModuleName(modName: string, containingFile: string, runnable: boolean) {
        trace(debugModuleResolution, `Trying to resolve ${modName}`);
        const fn = this.realFilename(containingFile);
        if (!fn) throw new Error(`Unable to get real filename for ${containingFile}`);
        containingFile = fn;
        const cacheKey = `${modName}\0${containingFile}\0${runnable}`;
        let mod = this.cache.get(cacheKey);

        if (mod !== undefined) return mod === null ? undefined : mod;

        const r = ts.resolveModuleName(modName, containingFile,
                                       this.compilerOptions, this);
        if (r) {
            mod = r.resolvedModule;

            if (runnable) {
                const resolved = mod && mod.resolvedFileName;
                // FIXME(mark): This isn't quite the right check. It *should*
                // be anything we know how to run, which is .js or anything
                // we know how to compile. But we don't have immediate access
                // to which extensions we know how to compile... In practice,
                // rejecting .d.ts is sufficient here.
                if (resolved && resolved.match(dtsRegex)) {
                    trace(debugModuleResolution,
                        `Initially resolved to ${resolved}, but rejecting .d.ts ` +
                        `file because runnable=true`);
                    mod = resolveJS(modName, containingFile, this);
                }
                if (!mod) mod = resolveJSON(modName, containingFile, this);
            }
        }

        if (mod) {
            trace(debugModuleResolution, `Resolved to ${mod.resolvedFileName}`);
            this.cache.set(cacheKey, mod);
            return mod;
        }

        trace(debugModuleResolution, `FAILED to resolve ${modName}`);
        this.cache.set(cacheKey, null);
        return undefined;
    }

    /**
     * Called by TS for module tracing and other debug output
     * @param s String to be printed to debug output stream
     */
    trace(s: string) {
        trace(debugModuleResolution, s);
    }
}

function resolveJSON(modName: string, containingFile: string,
                   host: ts.ModuleResolutionHost
): ts.ResolvedModuleFull | null {
    if (!modName.match(/\.json$/)) return null;

    const resolved = path.resolve(path.dirname(containingFile), modName);
    if (!host.fileExists(resolved)) return null;

    return {
        extension: ts.Extension.Json,
        resolvedFileName: resolved,
    };
}

function resolveJS(modName: string, containingFile: string,
                   host: ts.ModuleResolutionHost
): ts.ResolvedModuleFull | null {
    // The function is exported, but marked @internal
    const tsResolve = (ts as any).resolveJavaScriptModule;
    if (!tsResolve) {
        trace(debugModuleResolution,
            `No resolveJavaScriptModule function available`);
        return null;
    }

    const jsFile = tsResolve(modName, path.dirname(containingFile), host);
    if (!jsFile) {
        trace(debugModuleResolution, `JavaScript file resolution failed`);
        return null;
    }

    let ext: ts.Extension;
    switch (path.extname(jsFile)) {
        case ts.Extension.Js:
            ext = ts.Extension.Js;
            break;
        case ts.Extension.Jsx:
            ext = ts.Extension.Jsx;
            break;
        default:
            throw new Error(`Module file extension ` +
                            `'${path.extname(jsFile)}' not understood`);
    }
    return {
        resolvedFileName: jsFile,
        isExternalLibraryImport: true,
        extension: ext,
    };
}
