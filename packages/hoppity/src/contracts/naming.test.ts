/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import {
    toSnakeCase,
    getExchangeName,
    getRoutingKey,
    getQueueName,
    getBindingName,
    getPublicationName,
    getSubscriptionName,
    getDelayedWaitQueueName,
    getDelayedReadyQueueName,
    getDelayedErrorQueueName,
    getDelayedWaitPublicationName,
    getDelayedReadySubscriptionName,
} from "./naming";

describe("hoppity > contracts > naming", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    describe("toSnakeCase", () => {
        let result: string;

        describe("when given a simple camelCase string", () => {
            beforeEach(() => {
                result = toSnakeCase("orderCreated");
            });

            it("should convert to snake_case", () => {
                expect(result).toBe("order_created");
            });
        });

        describe("when given a PascalCase string", () => {
            beforeEach(() => {
                result = toSnakeCase("OrderService");
            });

            it("should convert to snake_case", () => {
                expect(result).toBe("order_service");
            });
        });

        describe("when given a string with consecutive capitals (acronym)", () => {
            beforeEach(() => {
                result = toSnakeCase("getHTTPResponse");
            });

            it("should treat the acronym as a single segment", () => {
                expect(result).toBe("get_http_response");
            });
        });

        describe("when given a leading-acronym PascalCase string", () => {
            beforeEach(() => {
                result = toSnakeCase("XMLParser");
            });

            it("should convert correctly", () => {
                expect(result).toBe("xml_parser");
            });
        });

        describe("when given an already-snake-case string", () => {
            beforeEach(() => {
                result = toSnakeCase("already_snake_case");
            });

            it("should return it unchanged (lowercased)", () => {
                expect(result).toBe("already_snake_case");
            });
        });

        describe("when given a fully uppercase acronym string", () => {
            beforeEach(() => {
                result = toSnakeCase("RPC");
            });

            it("should return lowercased with no underscores", () => {
                expect(result).toBe("rpc");
            });
        });
    });

    describe("getExchangeName", () => {
        let result: string;

        describe("when operation type is event", () => {
            beforeEach(() => {
                result = getExchangeName("orders", "event");
            });

            it("should return the domain name as the exchange name", () => {
                expect(result).toBe("orders");
            });
        });

        describe("when operation type is command", () => {
            beforeEach(() => {
                result = getExchangeName("orders", "command");
            });

            it("should return the domain name as the exchange name", () => {
                expect(result).toBe("orders");
            });
        });

        describe("when operation type is rpc", () => {
            beforeEach(() => {
                result = getExchangeName("orders", "rpc");
            });

            it("should return the domain name suffixed with _rpc", () => {
                expect(result).toBe("orders_rpc");
            });
        });
    });

    describe("getRoutingKey", () => {
        let result: string;

        describe("when given an event operation with camelCase name", () => {
            beforeEach(() => {
                result = getRoutingKey("orders", "event", "orderCreated");
            });

            it("should return the full dot-delimited routing key with snake_case name", () => {
                expect(result).toBe("orders.event.order_created");
            });
        });

        describe("when given a command operation", () => {
            beforeEach(() => {
                result = getRoutingKey("orders", "command", "cancelOrder");
            });

            it("should return the full dot-delimited routing key", () => {
                expect(result).toBe("orders.command.cancel_order");
            });
        });

        describe("when given an rpc operation", () => {
            beforeEach(() => {
                result = getRoutingKey("orders", "rpc", "createOrder");
            });

            it("should return the full dot-delimited routing key", () => {
                expect(result).toBe("orders.rpc.create_order");
            });
        });
    });

    describe("getQueueName", () => {
        let result: string;

        describe("when given all components with a camelCase operation name", () => {
            beforeEach(() => {
                result = getQueueName("catalog-service", "orders", "event", "orderCreated");
            });

            it("should return the underscore-delimited queue name", () => {
                expect(result).toBe("catalog-service_orders_event_order_created");
            });
        });

        describe("when given an rpc operation", () => {
            beforeEach(() => {
                result = getQueueName("order-service", "orders", "rpc", "createOrder");
            });

            it("should return the underscore-delimited queue name", () => {
                expect(result).toBe("order-service_orders_rpc_create_order");
            });
        });
    });

    describe("getBindingName", () => {
        let result: string;

        describe("when given a queue name", () => {
            beforeEach(() => {
                result = getBindingName("catalog-service_orders_event_order_created");
            });

            it("should append _binding to the queue name", () => {
                expect(result).toBe("catalog-service_orders_event_order_created_binding");
            });
        });
    });

    describe("getPublicationName", () => {
        let result: string;

        describe("when given an event operation", () => {
            beforeEach(() => {
                result = getPublicationName("orders", "event", "orderCreated");
            });

            it("should return the underscore-delimited publication name", () => {
                expect(result).toBe("orders_event_order_created");
            });
        });

        describe("when given an rpc operation", () => {
            beforeEach(() => {
                result = getPublicationName("orders", "rpc", "createOrder");
            });

            it("should return the underscore-delimited publication name", () => {
                expect(result).toBe("orders_rpc_create_order");
            });
        });
    });

    describe("getSubscriptionName", () => {
        let result: string;

        describe("when given an event operation", () => {
            beforeEach(() => {
                result = getSubscriptionName("orders", "event", "orderCreated");
            });

            it("should return the underscore-delimited subscription name", () => {
                expect(result).toBe("orders_event_order_created");
            });
        });

        describe("when given a command operation", () => {
            beforeEach(() => {
                result = getSubscriptionName("orders", "command", "cancelOrder");
            });

            it("should return the underscore-delimited subscription name", () => {
                expect(result).toBe("orders_command_cancel_order");
            });
        });
    });

    describe("getDelayedWaitQueueName", () => {
        let result: string;

        describe("when given domain, operation type, and name", () => {
            beforeEach(() => {
                result = getDelayedWaitQueueName("orders", "event", "reminderDue");
            });

            it("should return the operation-scoped wait queue name with _wait suffix", () => {
                expect(result).toBe("orders_event_reminder_due_wait");
            });
        });
    });

    describe("getDelayedReadyQueueName", () => {
        let result: string;

        describe("when given domain, operation type, and name", () => {
            beforeEach(() => {
                result = getDelayedReadyQueueName("orders", "event", "reminderDue");
            });

            it("should return the operation-scoped ready queue name with _ready suffix", () => {
                expect(result).toBe("orders_event_reminder_due_ready");
            });
        });
    });

    describe("getDelayedErrorQueueName", () => {
        let result: string;

        describe("when given domain, operation type, and name", () => {
            beforeEach(() => {
                result = getDelayedErrorQueueName("orders", "event", "reminderDue");
            });

            it("should return the operation-scoped error queue name with _errors suffix", () => {
                expect(result).toBe("orders_event_reminder_due_errors");
            });
        });
    });

    describe("getDelayedWaitPublicationName", () => {
        let result: string;

        describe("when given domain, operation type, and name", () => {
            beforeEach(() => {
                result = getDelayedWaitPublicationName("orders", "event", "reminderDue");
            });

            it("should return the publication name with _delayed suffix", () => {
                expect(result).toBe("orders_event_reminder_due_delayed");
            });
        });
    });

    describe("getDelayedReadySubscriptionName", () => {
        let result: string;

        describe("when given domain, operation type, and name", () => {
            beforeEach(() => {
                result = getDelayedReadySubscriptionName("orders", "event", "reminderDue");
            });

            it("should return the subscription name with _ready suffix", () => {
                expect(result).toBe("orders_event_reminder_due_ready");
            });
        });

        describe("invariant: ready subscription name matches ready queue name", () => {
            // The ready subscription MUST reference the ready queue by name — both naming
            // functions must produce the same value for the wiring to resolve correctly.
            let subscriptionName: string, queueName: string;

            beforeEach(() => {
                subscriptionName = getDelayedReadySubscriptionName(
                    "catalog",
                    "command",
                    "restockItem"
                );
                queueName = getDelayedReadyQueueName("catalog", "command", "restockItem");
            });

            it("should produce matching names so the subscription routes to the correct queue", () => {
                expect(subscriptionName).toBe(queueName);
            });
        });
    });

    describe("getDelayedWaitPublicationName", () => {
        describe("when given a command operation type", () => {
            let result: string;

            beforeEach(() => {
                result = getDelayedWaitPublicationName("admin", "command", "purgeExpiredSessions");
            });

            it("should return the publication name with _delayed suffix", () => {
                expect(result).toBe("admin_command_purge_expired_sessions_delayed");
            });
        });
    });
});
