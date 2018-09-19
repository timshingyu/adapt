import * as should from "should";
import { getEnvAsBoolean } from "../src/env";
// tslint:disable-next-line:no-var-requires
const mockedEnv = require("mocked-env");

describe("Env tests", () => {
    let envRestore: any;

    before(() => {
        envRestore = mockedEnv({
            F0: "0",
            F1: "false",
            F2: "FALSE",
            F3: "fALsE",
            F4: "no",
            F5: "No",
            F6: "OFF",
            F7: "off",

            T0: "1",
            T1: "true",
            T2: "True",
            T3: "On",
            T4: "yEs",
            T5: "",
            T6: "Really anything at all",
            T7: "00",
            T8: "Falsey",
        });
    });
    after(() => {
        envRestore();
    });

    it("Should return false for false-ish values", () => {
        should(getEnvAsBoolean("F0")).be.False();
        should(getEnvAsBoolean("F1")).be.False();
        should(getEnvAsBoolean("F2")).be.False();
        should(getEnvAsBoolean("F3")).be.False();
        should(getEnvAsBoolean("F4")).be.False();
        should(getEnvAsBoolean("F5")).be.False();
        should(getEnvAsBoolean("F6")).be.False();
        should(getEnvAsBoolean("F7")).be.False();
        should(getEnvAsBoolean("NOT_SET")).be.False();
    });

    it("Should return true for all other values", () => {
        should(getEnvAsBoolean("T0")).be.True();
        should(getEnvAsBoolean("T1")).be.True();
        should(getEnvAsBoolean("T2")).be.True();
        should(getEnvAsBoolean("T3")).be.True();
        should(getEnvAsBoolean("T4")).be.True();
        should(getEnvAsBoolean("T5")).be.True();
        should(getEnvAsBoolean("T6")).be.True();
        should(getEnvAsBoolean("T7")).be.True();
        should(getEnvAsBoolean("T8")).be.True();
    });
});
