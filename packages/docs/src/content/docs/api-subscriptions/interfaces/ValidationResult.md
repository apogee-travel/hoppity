---
editUrl: false
next: false
prev: false
title: "ValidationResult"
---

Defined in: [types.ts:74](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-subscriptions/src/types.ts#L74)

Result of validating subscription handlers against a broker topology.

Returned by [validateSubscriptionHandlers](/hoppity/api-subscriptions/functions/validatesubscriptionhandlers/). When `isValid` is `false`,
`errorMessage` contains a human-readable summary suitable for logging or
throwing directly.

## Example

```ts
const result = validateSubscriptionHandlers(topology, handlers);
if (!result.isValid) {
    console.error(result.errorMessage);
    console.log("Available subscriptions:", result.availableSubscriptions);
}
```

## Properties

### availableSubscriptions

> **availableSubscriptions**: `string`[]

Defined in: [types.ts:80](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-subscriptions/src/types.ts#L80)

Every subscription name found across all vhosts in the topology.

---

### errorMessage?

> `optional` **errorMessage**: `string`

Defined in: [types.ts:84](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-subscriptions/src/types.ts#L84)

Human-readable error summary, present only when `isValid` is `false`.

---

### invalidHandlers

> **invalidHandlers**: `string`[]

Defined in: [types.ts:82](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-subscriptions/src/types.ts#L82)

Handler keys whose values are not functions (e.g. `undefined`, a string, etc.).

---

### isValid

> **isValid**: `boolean`

Defined in: [types.ts:76](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-subscriptions/src/types.ts#L76)

Whether all handler keys matched a topology subscription and all values are functions.

---

### missingSubscriptions

> **missingSubscriptions**: `string`[]

Defined in: [types.ts:78](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-subscriptions/src/types.ts#L78)

Handler keys that have no corresponding subscription in any vhost.
