import { cantDeploy, DeployBase } from "../../base";
import { UserError } from "../../error";
import { DeployState, isDeploySuccess, UpdateOptions } from "../../types/adapt_shared";

export default class UpdateCommand extends DeployBase {
    static description = "Update an existing deployment of an Adapt project";

    static examples = [
`
Update the deployment "myproj-dev-abcd", using the stack named "dev" from
the default project description file, "index.tsx":
    $ adapt deploy:update myproj-dev-abcd dev

Update the deployment "myproj-dev-abcd", using the stack named "dev" from
an alternate description file, "somefile.tsx":
    $ adapt deploy:update --rootFile somefile.tsx myproj-dev-abcd dev`,
    ];

    static flags = {
        ...DeployBase.flags,
    };

    static args = [
        {
            name: "deployID",
            required: true,
        },
        {
            name: "stackName",
            required: true,
        },
    ];

    async run() {
        const deployID: string | undefined = this.args.deployID;
        if (deployID == null) {
            throw new Error(`Internal error: deployID cannot be null`);
        }

        const ctx = this.ctx;
        if (ctx == null) {
            throw new Error(`Internal error: ctx cannot be null`);
        }

        this.tasks.add([
           {
                title: "Updating project deployment",
                task: async () => {
                    if (ctx.project == null) {
                        throw new Error(`Internal error: project cannot be null`);
                    }

                    let deployState: DeployState;
                    try {
                        const updateOptions: UpdateOptions = {
                            adaptUrl: ctx.adaptUrl,
                            debug: ctx.debug,
                            deployID,
                            dryRun: ctx.dryRun,
                            fileName: ctx.projectFile,
                            stackName: ctx.stackName,
                        };
                        deployState = await ctx.project.update(updateOptions);
                    } catch (err) {
                        if (err.message.match(/No plugins registered/)) {
                            this.error(cantDeploy +
                                `The project did not import any Adapt plugins`);
                        }
                        if (err instanceof UserError) this.error(err.message);
                        throw err;
                    }

                    if (!isDeploySuccess(deployState)) {
                        return this.deployFailure(deployState);
                    } else {
                        this.deployInformation(deployState);
                    }

                    const id = deployState.deployID;

                    this.appendOutput(`Deployment ${id} updated successfully.`);
                }
            }
        ]);

        await this.tasks.run();
    }
}
