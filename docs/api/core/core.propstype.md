---
id: core.propstype
title: PropsType type
hide_title: true
---
<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[API Reference](../index.md) &gt; [Adapt Core](./index.md) &gt; [@adpt/core](./core.md) &gt; [PropsType](./core.propstype.md)

## PropsType type

<b>Signature:</b>

```typescript
export declare type PropsType<Comp extends Constructor<Component<any, any>>> = Comp extends Constructor<Component<infer CProps, any>> ? CProps : never;
```