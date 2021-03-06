/*
 * Copyright 2018-2019 Unbounded Systems, LLC
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

import * as util from "util";

import * as ld from "lodash";

import {
    AdaptElement,
    AnyProps,
    AnyState,
    Component,
    isElement,
} from "./jsx";
import { StateNamespace } from "./state";

const defaultKeySym = Symbol("defaultKey");

export interface ElementKey {
    key?: string;
    [defaultKeySym]?: boolean;
}

export function isDefaultKey(props: AnyProps & ElementKey) {
    return props[defaultKeySym] === true;
}

export function setKey(elem: AdaptElement, key: ElementKey) {
    // Ensure key doesn't have extra properties for later use of assign
    key = ld.pick(key, "key", defaultKeySym);
    if (Object.isFrozen(elem.props)) {
        const newProps = Object.assign(ld.clone(elem.props), key);
        Object.freeze(newProps);
        (elem as { props: AnyProps }).props = newProps;
    } else {
        Object.assign(elem.props, key);
    }
}

export function computeMountKey(
    elem: AdaptElement,
    parentStateNamespace: StateNamespace): ElementKey {

    let newKey: string | undefined = elem.props.key;
    if (newKey == null) {
        const lastKey = ld.last(parentStateNamespace);
        const name = elem.componentName;
        newKey = (lastKey == null) ? name : `${lastKey}-${name}`;
    }
    return {
        key: newKey,
        [defaultKeySym]: isDefaultKey(elem.props) || elem.props.key == null,
    };
}

export function assignKeysAtPlacement(siblingsIn: any | any[] | null | undefined) {
    const existingKeys = new KeyNames();
    const needsKeys: AdaptElement[] = [];
    const duplicateKeys: AdaptElement[] = [];

    if (siblingsIn == null) return;
    const siblings = ld.isArray(siblingsIn) ? siblingsIn : [siblingsIn];

    for (const node of siblings) {
        if (isElement(node)) {
            if (("key" in node.props) && (node.props.key != null)) {
                if (ld.isString(node.props.key)) {
                    if (existingKeys.has(node.props.key)) {
                        duplicateKeys.push(node);
                    } else {
                        existingKeys.add(node.props.key);
                    }
                } else {
                    throw new Error(
                        `children have non-string keys: ${node.componentName}: ${util.inspect(node.props.key)}`);
                }
            } else {
                needsKeys.push(node);
            }
        }
    }

    if (duplicateKeys.length !== 0) {
        throw new Error(`children have duplicate keys: ${util.inspect(duplicateKeys)}`);
    }

    for (const elem of needsKeys) {
        const key = existingKeys.getUnique(elem.componentName);
        setKey(elem, { key, [defaultKeySym]: true });
    }
}

/**
 * Stores the set of keys for a given group of sibling elements to keep
 * track of uniqueness and optionally generate a new unique key, given
 * a base name.
 */
class KeyNames {
    names: Map<string, number> = new Map<string, number>();

    getUnique(baseName: string): string {
        let unique = baseName;
        let next = this.names.get(baseName);
        if (next === undefined) {
            next = 1;
        } else {
            unique += next.toString();
            next++;
        }
        this.names.set(baseName, next);
        return unique;
    }

    has(key: string): boolean {
        return this.names.has(key);
    }

    add(key: string) {
        if (this.names.has(key)) {
            throw new Error(`Cannot add duplicate key '${key}`);
        }
    }
}

export class KeyTracker {
    private path: string[] = [];
    private names: KeyNames[] = [];
    private depth = 0;

    constructor() {
        this.names.push(new KeyNames());
    }

    lastKeyPath(): string {
        return this.path.join(".");
    }

    addKey(component: Component<AnyProps, AnyState>) {
        // TODO: Allow components to make names for themselves
        const compName = component.constructor.name;
        const uniqueName = this.names[this.depth].getUnique(compName);
        this.path[this.depth] = uniqueName;
    }

    pathPush() {
        this.names.push(new KeyNames());
        this.depth++;
    }

    pathPop() {
        if (this.depth <= 0) {
            throw new Error(`Attempt to pop KeyTracker past 0`);
        }
        this.depth--;
        this.path.pop();
        this.names.pop();
    }
}
