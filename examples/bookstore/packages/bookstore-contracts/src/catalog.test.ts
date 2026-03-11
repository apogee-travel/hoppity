/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { CatalogDomain } from "./catalog";

describe("bookstore-contracts > catalog", () => {
    describe("CatalogDomain.rpc.getStockLevels request schema", () => {
        describe("when request is an empty object", () => {
            let result: any;

            beforeEach(() => {
                result = CatalogDomain.rpc.getStockLevels.requestSchema.safeParse({});
            });

            it("should parse successfully", () => {
                expect(result.success).toBe(true);
            });
        });
    });

    describe("CatalogDomain.rpc.getStockLevels response schema", () => {
        describe("when response is valid", () => {
            let result: any;

            beforeEach(() => {
                result = CatalogDomain.rpc.getStockLevels.responseSchema.safeParse({
                    products: [
                        {
                            productId: "widget-1",
                            productName: "Widget",
                            unitPrice: 9.99,
                            stock: 97,
                        },
                        {
                            productId: "gadget-1",
                            productName: "Gadget",
                            unitPrice: 17.99,
                            stock: 49,
                        },
                    ],
                });
            });

            it("should parse successfully", () => {
                expect(result.success).toBe(true);
            });

            it("should return the product list", () => {
                expect(result.data.products).toHaveLength(2);
            });
        });

        describe("when products array is empty", () => {
            let result: any;

            beforeEach(() => {
                result = CatalogDomain.rpc.getStockLevels.responseSchema.safeParse({
                    products: [],
                });
            });

            it("should parse successfully", () => {
                expect(result.success).toBe(true);
            });
        });

        describe("when a product has a non-integer stock value", () => {
            let result: any;

            beforeEach(() => {
                result = CatalogDomain.rpc.getStockLevels.responseSchema.safeParse({
                    products: [
                        {
                            productId: "widget-1",
                            productName: "Widget",
                            unitPrice: 9.99,
                            stock: 97.5,
                        },
                    ],
                });
            });

            it("should fail validation", () => {
                expect(result.success).toBe(false);
            });
        });

        describe("when products field is missing", () => {
            let result: any;

            beforeEach(() => {
                result = CatalogDomain.rpc.getStockLevels.responseSchema.safeParse({});
            });

            it("should fail validation", () => {
                expect(result.success).toBe(false);
            });
        });

        describe("when a product is missing productName", () => {
            let result: any;

            beforeEach(() => {
                result = CatalogDomain.rpc.getStockLevels.responseSchema.safeParse({
                    products: [
                        {
                            productId: "widget-1",
                            unitPrice: 9.99,
                            stock: 97,
                        },
                    ],
                });
            });

            it("should fail validation", () => {
                expect(result.success).toBe(false);
            });
        });
    });

    describe("CatalogDomain domain metadata", () => {
        it("should produce expected routing key for getStockLevels RPC", () => {
            expect(CatalogDomain.rpc.getStockLevels.routingKey).toBe(
                "catalog.rpc.get_stock_levels"
            );
        });
    });
});
