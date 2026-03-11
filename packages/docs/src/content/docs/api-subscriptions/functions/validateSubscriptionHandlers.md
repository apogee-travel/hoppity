---
editUrl: false
next: false
prev: false
title: "validateSubscriptionHandlers"
---

> **validateSubscriptionHandlers**(`topology`, `handlers`): [`ValidationResult`](/hoppity/api-subscriptions/interfaces/validationresult/)

Defined in: [validation.ts:40](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-subscriptions/src/validation.ts#L40)

Validates subscription handlers against the broker topology.

This function performs the following validations:

1. Checks that all handler keys have matching subscriptions in the topology
2. Validates that all handlers are functions

## Parameters

### topology

`BrokerConfig`

The broker topology configuration

### handlers

[`SubscriptionHandlers`](/hoppity/api-subscriptions/type-aliases/subscriptionhandlers/)

The subscription handlers object

## Returns

[`ValidationResult`](/hoppity/api-subscriptions/interfaces/validationresult/)

ValidationResult with detailed validation information
