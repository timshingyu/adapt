import * as should from "should";

import Adapt, { Group, } from "../src";
import {
    assignKeysAtPlacement,
    computeMountKey,
    KeyTracker,
} from "../src/keys";
import {
    componentConstructorDataFixture,
    Empty,
} from "./testlib";

describe("Assign Keys", () => {
    it("Should generate needed keys", () => {
        const tree = <Group>
            <Empty id={1} />
            <Empty id={2} />
        </Group>;

        assignKeysAtPlacement(tree.props.children);
        should(tree.props.children[0].props.key).equal("Empty");
        should(tree.props.children[1].props.key).equal("Empty1");
    });

    it("Should not overwrite keys", () => {
        const tree = <Group>
            <Empty key="userDef" id={1} />
            <Empty id={2} />
        </Group>;

        assignKeysAtPlacement(tree.props.children);
        should(tree.props.children[0].props.key).equal("userDef");
        should(tree.props.children[1].props.key).equal("Empty");
    });

    it("Should assign singleton child key", () => {
        const tree = <Group>
            <Empty id={2} />
        </Group>;

        assignKeysAtPlacement(tree.props.children);
        should(tree.props.children.props.key).equal("Empty");
    });

    it("Should assign key for anonymous SFCs", async () => {
        function makeAnon<T>(x: T) { return x; }
        // tslint:disable-next-line:variable-name
        const Foo = makeAnon(() => <Empty id={1} />);
        const tree = <Foo />;

        const newKey = computeMountKey(tree, []);
        should(newKey).equal("anonymous");
    });
});

describe("KeyTracker", () => {

    componentConstructorDataFixture();

    it("Should generate unique keys for a base name", () => {
        const tracker = new KeyTracker();
        const comp = new Empty({ id: 1 });

        tracker.addKey(comp); // Depth 0
        tracker.lastKeyPath().should.equal("Empty");
        tracker.pathPush();
        tracker.addKey(comp); // Depth 1
        tracker.lastKeyPath().should.equal("Empty.Empty");
        tracker.addKey(comp); // Depth 1
        tracker.lastKeyPath().should.equal("Empty.Empty1");
        tracker.pathPop();

        tracker.addKey(comp); // Depth 0
        tracker.lastKeyPath().should.equal("Empty1");
        tracker.pathPush();
        tracker.addKey(comp); // Depth 1
        tracker.lastKeyPath().should.equal("Empty1.Empty");
    });
});
