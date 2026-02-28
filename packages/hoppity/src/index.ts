import hoppity from "./hoppity";
import {
    BrokerCreatedCallback,
    BuilderInterface,
    Hoppity,
    MiddlewareFunction,
    MiddlewareResult,
    MiddlewareContext,
    BrokerWithExtensions,
    Logger,
} from "./types";
import { ConsoleLogger, defaultLogger } from "./consoleLogger";

export default hoppity;

export type {
    BrokerCreatedCallback,
    BuilderInterface,
    Hoppity,
    MiddlewareFunction,
    MiddlewareResult,
    MiddlewareContext,
    BrokerWithExtensions,
    Logger,
};

export { ConsoleLogger, defaultLogger };
