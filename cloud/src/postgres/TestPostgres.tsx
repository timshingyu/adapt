/*
 * Copyright 2019 Unbounded Systems, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Adapt, { handle, Sequence, useImperativeMethods, useMethod } from "@adpt/core";
import { ConnectToInstance } from "../ConnectTo";
import { Container } from "../Container";
import { NetworkService } from "../NetworkService";
import { Service } from "../Service";
import { PreloadedPostgresImage } from "./PreloadedPostgresImage";

/**
 * A component suitable for creating test scenarios that creates a simple,
 * temporary Postgres database that loads test data from a .sql file and
 * which implements the abstract {@link postgres.Postgres} interface.
 * @public
 */
export function TestPostgres(props: { mockDataPath: string, mockDbName: string }) {
    const dbCtr = handle();
    const svc = handle();
    const svcHostname = useMethod<string | undefined>(svc, undefined, "hostname");

    useImperativeMethods<ConnectToInstance>(() => ({
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

    const img = handle();

    return <Sequence>
        <PreloadedPostgresImage handle={img} mockDbName={props.mockDbName} mockDataPath={props.mockDataPath} />
        <Service>
            <NetworkService
                handle={svc}
                scope="cluster-internal"
                endpoint={dbCtr}
                port={5432}
            />
            <Container
                name="db"
                handle={dbCtr}
                image={img}
                environment={{ POSTGRES_PASSWORD: "hello" }}
                imagePullPolicy="Never"
                ports={[5432]}
            />
        </Service>
    </Sequence>;
}
