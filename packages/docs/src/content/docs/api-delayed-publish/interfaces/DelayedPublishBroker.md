---
editUrl: false
next: false
prev: false
title: "DelayedPublishBroker"
---

Defined in: [packages/hoppity-delayed-publish/src/types.ts:149](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L149)

Extended broker interface that adds the `delayedPublish()` method to
Rascal's `BrokerAsPromised`.

Since hoppity middleware extends the broker at runtime via monkey-patching,
the `build()` return type is `BrokerAsPromised`. Cast the result to
`DelayedPublishBroker` to access the delayed publish API.

## Example

```typescript
import type { DelayedPublishBroker } from "@apogeelabs/hoppity-delayed-publish";

const broker = (await hoppity
    .withTopology(topology)
    .use(withDelayedPublish({ serviceName: "svc", instanceId: randomUUID() }))
    .build()) as DelayedPublishBroker;

await broker.delayedPublish("my_publication", payload, undefined, 5_000);
```

## See

[DelayedPublishOptions](/hoppity/api-delayed-publish/interfaces/delayedpublishoptions/) — configuration consumed by the middleware

## Extends

- `BrokerAsPromised`

## Properties

### config

> `readonly` **config**: `BrokerConfig`

Defined in: node_modules/.pnpm/@types+rascal@10.2.1/node_modules/@types/rascal/index.d.ts:458

#### Inherited from

`BrokerAsPromised.config`

## Methods

### \[captureRejectionSymbol\]()?

> `optional` **\[captureRejectionSymbol\]**\<`K`\>(`error`, `event`, ...`args`): `void`

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:136

#### Type Parameters

##### K

`K`

#### Parameters

##### error

`Error`

##### event

`string` | `symbol`

##### args

...`AnyRest`

#### Returns

`void`

#### Inherited from

`BrokerAsPromised.[captureRejectionSymbol]`

---

### addListener()

> **addListener**\<`K`\>(`eventName`, `listener`): `this`

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:597

Alias for `emitter.on(eventName, listener)`.

#### Type Parameters

##### K

`K`

#### Parameters

##### eventName

`string` | `symbol`

##### listener

(...`args`) => `void`

#### Returns

`this`

#### Since

v0.1.26

#### Inherited from

`BrokerAsPromised.addListener`

---

### bounce()

> **bounce**(): `Promise`\<`void`\>

Defined in: node_modules/.pnpm/@types+rascal@10.2.1/node_modules/@types/rascal/index.d.ts:465

#### Returns

`Promise`\<`void`\>

#### Inherited from

`BrokerAsPromised.bounce`

---

### connect()

> **connect**(`name`): `Promise`\<`Connection`\>

Defined in: node_modules/.pnpm/@types+rascal@10.2.1/node_modules/@types/rascal/index.d.ts:461

#### Parameters

##### name

`string`

#### Returns

`Promise`\<`Connection`\>

#### Inherited from

`BrokerAsPromised.connect`

---

### delayedPublish()

> **delayedPublish**(`publication`, `message`, `overrides?`, `delay?`): `Promise`\<`void`\>

Defined in: [packages/hoppity-delayed-publish/src/types.ts:172](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L172)

Publishes a message with a delay before it gets re-published to its
original destination.

Under the hood this wraps the message in a [DelayedMessage](/hoppity/api-delayed-publish/interfaces/delayedmessage/) envelope
and publishes it to the wait queue with a per-message TTL equal to the
delay. When the TTL expires, RabbitMQ dead-letters the message to the
ready queue, where it is unwrapped and re-published.

#### Parameters

##### publication

`string`

Name of an existing Rascal publication in the topology.
This is where the message will be re-published after the delay.

##### message

`any`

The message payload (any serializable value).

##### overrides?

`PublicationConfig`

Optional Rascal `PublicationConfig` overrides forwarded
to the re-publish call.

##### delay?

`number`

Delay in milliseconds. Falls back to `defaultDelay` from
[DelayedPublishOptions](/hoppity/api-delayed-publish/interfaces/delayedpublishoptions/) if omitted.

#### Returns

`Promise`\<`void`\>

Promise that resolves when the message is accepted by the wait queue
(not when it is eventually re-published).

#### Throws

[DelayedPublishError](/hoppity/api-delayed-publish/classes/delayedpublisherror/) with code `INVALID_DELAY` if delay is <= 0.

#### Throws

[DelayedPublishError](/hoppity/api-delayed-publish/classes/delayedpublisherror/) with code `QUEUE_FULL` if publishing to
the wait queue fails.

---

### emit()

> **emit**\<`K`\>(`eventName`, ...`args`): `boolean`

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:859

Synchronously calls each of the listeners registered for the event named `eventName`, in the order they were registered, passing the supplied arguments
to each.

Returns `true` if the event had listeners, `false` otherwise.

```js
import { EventEmitter } from "node:events";
const myEmitter = new EventEmitter();

// First listener
myEmitter.on("event", function firstListener() {
    console.log("Helloooo! first listener");
});
// Second listener
myEmitter.on("event", function secondListener(arg1, arg2) {
    console.log(`event with parameters ${arg1}, ${arg2} in second listener`);
});
// Third listener
myEmitter.on("event", function thirdListener(...args) {
    const parameters = args.join(", ");
    console.log(`event with parameters ${parameters} in third listener`);
});

console.log(myEmitter.listeners("event"));

myEmitter.emit("event", 1, 2, 3, 4, 5);

// Prints:
// [
//   [Function: firstListener],
//   [Function: secondListener],
//   [Function: thirdListener]
// ]
// Helloooo! first listener
// event with parameters 1, 2 in second listener
// event with parameters 1, 2, 3, 4, 5 in third listener
```

#### Type Parameters

##### K

`K`

#### Parameters

##### eventName

`string` | `symbol`

##### args

...`AnyRest`

#### Returns

`boolean`

#### Since

v0.1.26

#### Inherited from

`BrokerAsPromised.emit`

---

### eventNames()

> **eventNames**(): (`string` \| `symbol`)[]

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:922

Returns an array listing the events for which the emitter has registered
listeners. The values in the array are strings or `Symbol`s.

```js
import { EventEmitter } from "node:events";

const myEE = new EventEmitter();
myEE.on("foo", () => {});
myEE.on("bar", () => {});

const sym = Symbol("symbol");
myEE.on(sym, () => {});

console.log(myEE.eventNames());
// Prints: [ 'foo', 'bar', Symbol(symbol) ]
```

#### Returns

(`string` \| `symbol`)[]

#### Since

v6.0.0

#### Inherited from

`BrokerAsPromised.eventNames`

---

### forward()

> **forward**(`name`, `message`, `overrides?`): `Promise`\<`PublicationSession`\>

Defined in: node_modules/.pnpm/@types+rascal@10.2.1/node_modules/@types/rascal/index.d.ts:467

#### Parameters

##### name

`string`

##### message

`any`

##### overrides?

`string` | `PublicationConfig`

#### Returns

`Promise`\<`PublicationSession`\>

#### Inherited from

`BrokerAsPromised.forward`

---

### getConnections()

> **getConnections**(): `ConnectionDetails`[]

Defined in: node_modules/.pnpm/@types+rascal@10.2.1/node_modules/@types/rascal/index.d.ts:471

#### Returns

`ConnectionDetails`[]

#### Inherited from

`BrokerAsPromised.getConnections`

---

### getMaxListeners()

> **getMaxListeners**(): `number`

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:774

Returns the current max listener value for the `EventEmitter` which is either
set by `emitter.setMaxListeners(n)` or defaults to EventEmitter.defaultMaxListeners.

#### Returns

`number`

#### Since

v1.0.0

#### Inherited from

`BrokerAsPromised.getMaxListeners`

---

### listenerCount()

> **listenerCount**\<`K`\>(`eventName`, `listener?`): `number`

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:868

Returns the number of listeners listening for the event named `eventName`.
If `listener` is provided, it will return how many times the listener is found
in the list of the listeners of the event.

#### Type Parameters

##### K

`K`

#### Parameters

##### eventName

The name of the event being listened for

`string` | `symbol`

##### listener?

`Function`

The event handler function

#### Returns

`number`

#### Since

v3.2.0

#### Inherited from

`BrokerAsPromised.listenerCount`

---

### listeners()

> **listeners**\<`K`\>(`eventName`): `Function`[]

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:787

Returns a copy of the array of listeners for the event named `eventName`.

```js
server.on("connection", stream => {
    console.log("someone connected!");
});
console.log(util.inspect(server.listeners("connection")));
// Prints: [ [Function] ]
```

#### Type Parameters

##### K

`K`

#### Parameters

##### eventName

`string` | `symbol`

#### Returns

`Function`[]

#### Since

v0.1.26

#### Inherited from

`BrokerAsPromised.listeners`

---

### nuke()

> **nuke**(): `Promise`\<`void`\>

Defined in: node_modules/.pnpm/@types+rascal@10.2.1/node_modules/@types/rascal/index.d.ts:462

#### Returns

`Promise`\<`void`\>

#### Inherited from

`BrokerAsPromised.nuke`

---

### off()

> **off**\<`K`\>(`eventName`, `listener`): `this`

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:747

Alias for `emitter.removeListener()`.

#### Type Parameters

##### K

`K`

#### Parameters

##### eventName

`string` | `symbol`

##### listener

(...`args`) => `void`

#### Returns

`this`

#### Since

v10.0.0

#### Inherited from

`BrokerAsPromised.off`

---

### on()

> **on**\<`K`\>(`eventName`, `listener`): `this`

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:629

Adds the `listener` function to the end of the listeners array for the event
named `eventName`. No checks are made to see if the `listener` has already
been added. Multiple calls passing the same combination of `eventName` and
`listener` will result in the `listener` being added, and called, multiple times.

```js
server.on("connection", stream => {
    console.log("someone connected!");
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

By default, event listeners are invoked in the order they are added. The `emitter.prependListener()` method can be used as an alternative to add the
event listener to the beginning of the listeners array.

```js
import { EventEmitter } from "node:events";
const myEE = new EventEmitter();
myEE.on("foo", () => console.log("a"));
myEE.prependListener("foo", () => console.log("b"));
myEE.emit("foo");
// Prints:
//   b
//   a
```

#### Type Parameters

##### K

`K`

#### Parameters

##### eventName

The name of the event.

`string` | `symbol`

##### listener

(...`args`) => `void`

The callback function

#### Returns

`this`

#### Since

v0.1.101

#### Inherited from

`BrokerAsPromised.on`

---

### once()

> **once**\<`K`\>(`eventName`, `listener`): `this`

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:659

Adds a **one-time** `listener` function for the event named `eventName`. The
next time `eventName` is triggered, this listener is removed and then invoked.

```js
server.once("connection", stream => {
    console.log("Ah, we have our first user!");
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

By default, event listeners are invoked in the order they are added. The `emitter.prependOnceListener()` method can be used as an alternative to add the
event listener to the beginning of the listeners array.

```js
import { EventEmitter } from "node:events";
const myEE = new EventEmitter();
myEE.once("foo", () => console.log("a"));
myEE.prependOnceListener("foo", () => console.log("b"));
myEE.emit("foo");
// Prints:
//   b
//   a
```

#### Type Parameters

##### K

`K`

#### Parameters

##### eventName

The name of the event.

`string` | `symbol`

##### listener

(...`args`) => `void`

The callback function

#### Returns

`this`

#### Since

v0.3.0

#### Inherited from

`BrokerAsPromised.once`

---

### prependListener()

> **prependListener**\<`K`\>(`eventName`, `listener`): `this`

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:886

Adds the `listener` function to the _beginning_ of the listeners array for the
event named `eventName`. No checks are made to see if the `listener` has
already been added. Multiple calls passing the same combination of `eventName`
and `listener` will result in the `listener` being added, and called, multiple times.

```js
server.prependListener("connection", stream => {
    console.log("someone connected!");
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Type Parameters

##### K

`K`

#### Parameters

##### eventName

The name of the event.

`string` | `symbol`

##### listener

(...`args`) => `void`

The callback function

#### Returns

`this`

#### Since

v6.0.0

#### Inherited from

`BrokerAsPromised.prependListener`

---

### prependOnceListener()

> **prependOnceListener**\<`K`\>(`eventName`, `listener`): `this`

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:902

Adds a **one-time**`listener` function for the event named `eventName` to the _beginning_ of the listeners array. The next time `eventName` is triggered, this
listener is removed, and then invoked.

```js
server.prependOnceListener("connection", stream => {
    console.log("Ah, we have our first user!");
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Type Parameters

##### K

`K`

#### Parameters

##### eventName

The name of the event.

`string` | `symbol`

##### listener

(...`args`) => `void`

The callback function

#### Returns

`this`

#### Since

v6.0.0

#### Inherited from

`BrokerAsPromised.prependOnceListener`

---

### publish()

> **publish**(`name`, `message`, `overrides?`): `Promise`\<`PublicationSession`\>

Defined in: node_modules/.pnpm/@types+rascal@10.2.1/node_modules/@types/rascal/index.d.ts:466

#### Parameters

##### name

`string`

##### message

`any`

##### overrides?

`string` | `PublicationConfig`

#### Returns

`Promise`\<`PublicationSession`\>

#### Inherited from

`BrokerAsPromised.publish`

---

### purge()

> **purge**(): `Promise`\<`void`\>

Defined in: node_modules/.pnpm/@types+rascal@10.2.1/node_modules/@types/rascal/index.d.ts:463

#### Returns

`Promise`\<`void`\>

#### Inherited from

`BrokerAsPromised.purge`

---

### rawListeners()

> **rawListeners**\<`K`\>(`eventName`): `Function`[]

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:818

Returns a copy of the array of listeners for the event named `eventName`,
including any wrappers (such as those created by `.once()`).

```js
import { EventEmitter } from "node:events";
const emitter = new EventEmitter();
emitter.once("log", () => console.log("log once"));

// Returns a new Array with a function `onceWrapper` which has a property
// `listener` which contains the original listener bound above
const listeners = emitter.rawListeners("log");
const logFnWrapper = listeners[0];

// Logs "log once" to the console and does not unbind the `once` event
logFnWrapper.listener();

// Logs "log once" to the console and removes the listener
logFnWrapper();

emitter.on("log", () => console.log("log persistently"));
// Will return a new Array with a single function bound by `.on()` above
const newListeners = emitter.rawListeners("log");

// Logs "log persistently" twice
newListeners[0]();
emitter.emit("log");
```

#### Type Parameters

##### K

`K`

#### Parameters

##### eventName

`string` | `symbol`

#### Returns

`Function`[]

#### Since

v9.4.0

#### Inherited from

`BrokerAsPromised.rawListeners`

---

### removeAllListeners()

> **removeAllListeners**(`eventName?`): `this`

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:758

Removes all listeners, or those of the specified `eventName`.

It is bad practice to remove listeners added elsewhere in the code,
particularly when the `EventEmitter` instance was created by some other
component or module (e.g. sockets or file streams).

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Parameters

##### eventName?

`string` | `symbol`

#### Returns

`this`

#### Since

v0.1.26

#### Inherited from

`BrokerAsPromised.removeAllListeners`

---

### removeListener()

> **removeListener**\<`K`\>(`eventName`, `listener`): `this`

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:742

Removes the specified `listener` from the listener array for the event named `eventName`.

```js
const callback = stream => {
    console.log("someone connected!");
};
server.on("connection", callback);
// ...
server.removeListener("connection", callback);
```

`removeListener()` will remove, at most, one instance of a listener from the
listener array. If any single listener has been added multiple times to the
listener array for the specified `eventName`, then `removeListener()` must be
called multiple times to remove each instance.

Once an event is emitted, all listeners attached to it at the
time of emitting are called in order. This implies that any `removeListener()` or `removeAllListeners()` calls _after_ emitting and _before_ the last listener finishes execution
will not remove them from`emit()` in progress. Subsequent events behave as expected.

```js
import { EventEmitter } from "node:events";
class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();

const callbackA = () => {
    console.log("A");
    myEmitter.removeListener("event", callbackB);
};

const callbackB = () => {
    console.log("B");
};

myEmitter.on("event", callbackA);

myEmitter.on("event", callbackB);

// callbackA removes listener callbackB but it will still be called.
// Internal listener array at time of emit [callbackA, callbackB]
myEmitter.emit("event");
// Prints:
//   A
//   B

// callbackB is now removed.
// Internal listener array [callbackA]
myEmitter.emit("event");
// Prints:
//   A
```

Because listeners are managed using an internal array, calling this will
change the position indices of any listener registered _after_ the listener
being removed. This will not impact the order in which listeners are called,
but it means that any copies of the listener array as returned by
the `emitter.listeners()` method will need to be recreated.

When a single function has been added as a handler multiple times for a single
event (as in the example below), `removeListener()` will remove the most
recently added instance. In the example the `once('ping')` listener is removed:

```js
import { EventEmitter } from "node:events";
const ee = new EventEmitter();

function pong() {
    console.log("pong");
}

ee.on("ping", pong);
ee.once("ping", pong);
ee.removeListener("ping", pong);

ee.emit("ping");
ee.emit("ping");
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Type Parameters

##### K

`K`

#### Parameters

##### eventName

`string` | `symbol`

##### listener

(...`args`) => `void`

#### Returns

`this`

#### Since

v0.1.26

#### Inherited from

`BrokerAsPromised.removeListener`

---

### setMaxListeners()

> **setMaxListeners**(`n`): `this`

Defined in: node_modules/.pnpm/@types+node@20.19.2/node_modules/@types/node/events.d.ts:768

By default `EventEmitter`s will print a warning if more than `10` listeners are
added for a particular event. This is a useful default that helps finding
memory leaks. The `emitter.setMaxListeners()` method allows the limit to be
modified for this specific `EventEmitter` instance. The value can be set to `Infinity` (or `0`) to indicate an unlimited number of listeners.

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Parameters

##### n

`number`

#### Returns

`this`

#### Since

v0.3.5

#### Inherited from

`BrokerAsPromised.setMaxListeners`

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: node_modules/.pnpm/@types+rascal@10.2.1/node_modules/@types/rascal/index.d.ts:464

#### Returns

`Promise`\<`void`\>

#### Inherited from

`BrokerAsPromised.shutdown`

---

### subscribe()

> **subscribe**(`name`, `overrides?`): `Promise`\<`SubscriberSessionAsPromised`\>

Defined in: node_modules/.pnpm/@types+rascal@10.2.1/node_modules/@types/rascal/index.d.ts:469

#### Parameters

##### name

`string`

##### overrides?

`SubscriptionConfig`

#### Returns

`Promise`\<`SubscriberSessionAsPromised`\>

#### Inherited from

`BrokerAsPromised.subscribe`

---

### subscribeAll()

> **subscribeAll**(`filter?`): `Promise`\<`SubscriberSessionAsPromised`[]\>

Defined in: node_modules/.pnpm/@types+rascal@10.2.1/node_modules/@types/rascal/index.d.ts:470

#### Parameters

##### filter?

(`config`) => `boolean`

#### Returns

`Promise`\<`SubscriberSessionAsPromised`[]\>

#### Inherited from

`BrokerAsPromised.subscribeAll`

---

### unsubscribeAll()

> **unsubscribeAll**(): `Promise`\<`void`\>

Defined in: node_modules/.pnpm/@types+rascal@10.2.1/node_modules/@types/rascal/index.d.ts:468

#### Returns

`Promise`\<`void`\>

#### Inherited from

`BrokerAsPromised.unsubscribeAll`
