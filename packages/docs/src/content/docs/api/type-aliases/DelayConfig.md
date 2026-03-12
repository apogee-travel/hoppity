---
editUrl: false
next: false
prev: false
title: "DelayConfig"
---

> **DelayConfig** = `true` \| \{ `default`: `number`; \}

Defined in: packages/hoppity/src/contracts/types.ts:14

Declares delayed delivery support on a contract.

`true` — delay is supported but has no default; the caller must always supply
an explicit delay value when publishing.

`{ default: number }` — delay is supported and has a default; the caller may
omit the delay value to use the default, or supply a value to override it.
The default must be greater than 0.
