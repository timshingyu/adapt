---
id: cloud.withfilesimage
title: withFilesImage() function
hide_title: true
---
<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[@usys/cloud](./cloud.md) &gt; [withFilesImage](./cloud.withfilesimage.md)

## withFilesImage() function

<b>Signature:</b>

```typescript
export declare function withFilesImage<T>(files: File[] | undefined, opts: DockerGlobalOptions, fn: (img: ImageInfo | undefined) => T | Promise<T>): Promise<T>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  files | <code>File[] &#124; undefined</code> |  |
|  opts | <code>DockerGlobalOptions</code> |  |
|  fn | <code>(img: ImageInfo &#124; undefined) =&gt; T &#124; Promise&lt;T&gt;</code> |  |

<b>Returns:</b>

`Promise<T>`