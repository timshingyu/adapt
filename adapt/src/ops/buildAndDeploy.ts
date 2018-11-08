import * as path from "path";

/*
 * IMPORTANT NOTE
 * This file primarily operates on the results from the user's program,
 * which runs in its own V8 context. Don't use our (outer) Adapt or other
 * things imported here to operate on those results.
 * It is safe to use types from the outer context, but be VERY careful that
 * you know what you're doing if you import and use objects or functions
 * in this file.
 *
 * In order to make it more obvious which types/objects we're importing,
 * NEVER "import * from " in this file.
 */
// @ts-ignore
import AdaptDontUse, {
    AdaptElementOrNull,
    Message,
    MessageLogger,
    ProjectBuildError,
} from "..";

// @ts-ignore
// tslint:disable-next-line:variable-name prefer-const
let Adapt: never;

import { InternalError } from "../error";
import {
    ExecutedQuery,
} from "../observers";
import { createPluginManager } from "../plugin_support";
import { Deployment } from "../server/deployment";
import { createStateStore, StateStore } from "../state";
import { AdaptContext, projectExec } from "../ts";
import { DeployState } from "./common";
import { parseFullObservationsJson, stringifyFullObservations } from "./serialize";

export interface BuildOptions {
    deployment: Deployment;
    dryRun: boolean;
    fileName: string;
    logger: MessageLogger;
    stackName: string;

    observationsJson?: string;
    prevStateJson?: string;
    projectRoot?: string;
}

export async function buildAndDeploy(options: BuildOptions): Promise<DeployState> {
    const { deployment, logger, stackName } = options;

    let dataDir: string | undefined;
    const prev = await deployment.lastEntry();
    const prevStateJson =
        options.prevStateJson ||
        (prev ? prev.stateJson : "");
    const observations = (() => {
        if (options.observationsJson) return parseFullObservationsJson(options.observationsJson);
        if (prev && prev.observationsJson) return parseFullObservationsJson(prev.observationsJson);
        return {};
    })();

    let observerObservations = observations.observer ? observations.observer : {};

    const fileName = path.resolve(options.fileName);
    const projectRoot = options.projectRoot || path.dirname(fileName);

    // Compile and run the project
    let ctx: AdaptContext | undefined;
    try {
        ctx = projectExec(projectRoot, fileName);

        // This is the inner context's copy of Adapt
        const inAdapt = ctx.Adapt;

        const stacks = ctx.adaptStacks;
        if (!stacks) throw new InternalError(`No stacks found`);
        const stack = stacks.get(stackName);
        if (!stack) throw new Error(`Adapt stack '${stackName}' not found`);

        let stateStore: StateStore;
        try {
            stateStore = createStateStore(prevStateJson);
        } catch (err) {
            let msg = `Invalid previous state JSON`;
            if (err.message) msg += `: ${err.message}`;
            throw new Error(msg);
        }

        let newDom: AdaptElementOrNull = null;
        let buildMessages: Message[] = [];

        let needsData: { [name: string]: ExecutedQuery[] } = {};
        const root = await stack.root;
        const style = await stack.style;
        if (root != null) {
            const preObserverManager = inAdapt.internal.makeObserverManagerDeployment(observerObservations);

            const preObserve = await inAdapt.build(
                root, style, { stateStore, observerManager: preObserverManager });
            if (preObserve.messages.length !== 0) {
                logger.append(preObserve.messages);
                throw new ProjectBuildError(inAdapt.serializeDom(preObserve.contents));
            }

            observerObservations = await inAdapt.internal.observe(preObserverManager.executedQueries(), logger);

            const postObserverManager = inAdapt.internal.makeObserverManagerDeployment(observerObservations);
            const postObserve = await inAdapt.build(
                root, style, { stateStore, observerManager: postObserverManager });
            newDom = postObserve.contents;
            buildMessages = postObserve.messages;
            needsData = postObserverManager.executedQueriesThatNeededData();
            inAdapt.internal.patchInNewQueries(observerObservations, postObserverManager.executedQueries());
        }

        const domXml = inAdapt.serializeDom(newDom, true);

        if (buildMessages.length !== 0) {
            logger.append(buildMessages);
            throw new ProjectBuildError(domXml);
        }

        const stateJson = stateStore.serialize();

        const mgr = createPluginManager(ctx.pluginModules);
        const prevDom = prev ? await inAdapt.internal.reanimateDom(prev.domXml) : null;

        // This grabs a lock on the deployment's uncommitted data dir
        dataDir = await deployment.getDataDir();

        await mgr.start(prevDom, newDom, {
            dataDir: path.join(dataDir, "plugins"),
            deployID: deployment.deployID,
            logger,
        });
        const newPluginObs = await mgr.observe();
        mgr.analyze();

        /*
        * NOTE: There should be no deployment side effects prior to here, but
        * once act is called, that is no longer true.
        */
        const observationsJson = stringifyFullObservations({
            plugin: newPluginObs,
            observer: observerObservations
        });

        await deployment.commitEntry({
            dataDir,
            domXml,
            stateJson,
            stackName,
            projectRoot,
            fileName,
            observationsJson
        });

        await mgr.act(options.dryRun);
        await mgr.finish();

        return {
            type: "success",
            deployID: deployment.deployID,
            domXml,
            stateJson,
            //Move data from inner adapt to outer adapt via JSON
            needsData: JSON.parse(JSON.stringify((inAdapt.internal.simplifyNeedsData(needsData)))),
            messages: logger.messages,
            summary: logger.summary,
        };

    } finally {
        if (ctx) ctx.destroy();
        if (dataDir) await deployment.releaseDataDir();
    }
}
