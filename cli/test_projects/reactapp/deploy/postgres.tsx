import Adapt, { handle, useImperativeMethods } from "@usys/adapt";
import { Container, NetworkService, Service, useMethod } from "@usys/cloud";
import { usePreloadedPostgres } from "./lib";

export function TestPostgres(props: { mockDataPath: string, mockDbName: string }) {
    const dbCtr = handle();
    const svc = handle();
    const svcHostname = useMethod(svc, undefined, "hostname");
    const { image, buildObj } = usePreloadedPostgres(props.mockDbName, props.mockDataPath);

    useImperativeMethods(() => ({
        connectEnv: () => {
            if (!svcHostname) return undefined;
            return [
                { name: "PGHOST", value: svcHostname },
                { name: "PGDATABASE", value: props.mockDbName },
                { name: "PGUSER", value: "postgres" },
                { name: "PGPASSWORD", value: "hello" }
            ];
        }
    }));

    return <Service>
        {buildObj}
        <NetworkService
            handle={svc}
            scope="cluster-internal"
            endpoint={dbCtr}
            port={5432}
        />
        {image ?
            <Container
                name="db"
                handle={dbCtr}
                image={image.nameTag!}
                environment={{ POSTGRES_PASSWORD: "hello" }}
                imagePullPolicy="Never"
                ports={[5432]}
            />
        : null}
    </Service>;
}

export function ProdPostgres() {
    useImperativeMethods(() => ({
        connectEnv: () => ([
            { name: "PGHOST", value: "postgres_db" },
            { name: "PGUSER", value: "postgres" },
            {
                name: "PGPASSWORD",
                valueFrom: {
                    secretKeyRef: {
                        name: "postgres_password",
                        key: "password"
                    }
                }
            }
        ])
    }));
    return null;
}