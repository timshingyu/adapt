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

import { PrimitiveComponent } from "@adpt/core";
import { ConnectToInstance } from "../ConnectTo";
import { NetworkScope } from "../NetworkService";

/**
 * Abstract Redis component
 *
 * @remarks
 * This component is used to denote a needed {@link https://redis.io | Redis} service.
 * Users should use a style sheet to subsitute a concrete Redis instance that provides
 * the service.  {@link redis.TestRedis} is such a component, suitable for test
 * environments.
 *
 * All implementations of this component should implmenent {@link ConnectToInstance}
 * that provides a `REDIS_URI` variable of the form `redis://<hostname>:<port>`.
 *
 * @public
 */
export abstract class Redis extends PrimitiveComponent implements ConnectToInstance {
    connectEnv(_scope?: NetworkScope) { return undefined; }
}
