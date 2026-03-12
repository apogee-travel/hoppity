---
editUrl: false
next: false
prev: false
title: "@apogeelabs/hoppity"
---

## Example

```typescript
import hoppity, { defineDomain, onEvent, onCommand, onRpc } from "@apogeelabs/hoppity";

const OrdersDomain = defineDomain("orders", {
    events: { orderCreated: z.object({ orderId: z.string() }) },
});

const broker = await hoppity
    .service("order-service", {
        connection: { url: "amqp://localhost" },
        handlers: [onEvent(OrdersDomain.events.orderCreated, handler)],
        publishes: [OrdersDomain.events.orderCreated],
    })
    .build();
```

## Enumerations

- [DelayedDeliveryErrorCode](/hoppity/api/enumerations/delayeddeliveryerrorcode/)

## Classes

- [ConsoleLogger](/hoppity/api/classes/consolelogger/)
- [DelayedDeliveryError](/hoppity/api/classes/delayeddeliveryerror/)
- [RpcError](/hoppity/api/classes/rpcerror/)
- [ServiceBuilder](/hoppity/api/classes/servicebuilder/)

## Interfaces

- [CommandContract](/hoppity/api/interfaces/commandcontract/)
- [CommandHandlerDeclaration](/hoppity/api/interfaces/commandhandlerdeclaration/)
- [ConnectionConfig](/hoppity/api/interfaces/connectionconfig/)
- [DelayedDeliveryEnvelope](/hoppity/api/interfaces/delayeddeliveryenvelope/)
- [DomainDefinition](/hoppity/api/interfaces/domaindefinition/)
- [DomainDefinitionInput](/hoppity/api/interfaces/domaindefinitioninput/)
- [EventContract](/hoppity/api/interfaces/eventcontract/)
- [EventHandlerDeclaration](/hoppity/api/interfaces/eventhandlerdeclaration/)
- [HandlerContext](/hoppity/api/interfaces/handlercontext/)
- [HandlerOptions](/hoppity/api/interfaces/handleroptions/)
- [Hoppity](/hoppity/api/interfaces/hoppity/)
- [InboundMetadata](/hoppity/api/interfaces/inboundmetadata/)
- [Interceptor](/hoppity/api/interfaces/interceptor/)
- [Logger](/hoppity/api/interfaces/logger/)
- [MiddlewareContext](/hoppity/api/interfaces/middlewarecontext/)
- [MiddlewareResult](/hoppity/api/interfaces/middlewareresult/)
- [OutboundMetadata](/hoppity/api/interfaces/outboundmetadata/)
- [RpcContract](/hoppity/api/interfaces/rpccontract/)
- [RpcHandlerDeclaration](/hoppity/api/interfaces/rpchandlerdeclaration/)
- [RpcRequest](/hoppity/api/interfaces/rpcrequest/)
- [RpcResponse](/hoppity/api/interfaces/rpcresponse/)
- [ServiceBroker](/hoppity/api/interfaces/servicebroker/)
- [ServiceConfig](/hoppity/api/interfaces/serviceconfig/)

## Type Aliases

- [BrokerCreatedCallback](/hoppity/api/type-aliases/brokercreatedcallback/)
- [BrokerWithExtensions](/hoppity/api/type-aliases/brokerwithextensions/)
- [CommandHandler](/hoppity/api/type-aliases/commandhandler/)
- [CommandsDefinition](/hoppity/api/type-aliases/commandsdefinition/)
- [DelayConfig](/hoppity/api/type-aliases/delayconfig/)
- [EventHandler](/hoppity/api/type-aliases/eventhandler/)
- [EventsDefinition](/hoppity/api/type-aliases/eventsdefinition/)
- [HandlerDeclaration](/hoppity/api/type-aliases/handlerdeclaration/)
- [InboundWrapper](/hoppity/api/type-aliases/inboundwrapper/)
- [MiddlewareFunction](/hoppity/api/type-aliases/middlewarefunction/)
- [OutboundWrapper](/hoppity/api/type-aliases/outboundwrapper/)
- [RpcDefinition](/hoppity/api/type-aliases/rpcdefinition/)
- [RpcErrorCodeValue](/hoppity/api/type-aliases/rpcerrorcodevalue/)
- [RpcHandler](/hoppity/api/type-aliases/rpchandler/)

## Variables

- [default](/hoppity/api/variables/default/)
- [defaultLogger](/hoppity/api/variables/defaultlogger/)
- [RpcErrorCode](/hoppity/api/variables/rpcerrorcode/)

## Functions

- [defineDomain](/hoppity/api/functions/definedomain/)
- [onCommand](/hoppity/api/functions/oncommand/)
- [onEvent](/hoppity/api/functions/onevent/)
- [onRpc](/hoppity/api/functions/onrpc/)
