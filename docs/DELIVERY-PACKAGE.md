# 版本化交付包（Modeler → 消费者）

本文件定义 Modeler 向其他插件（当前为 dsh-godot-master）交付完整模型的唯一稳定合同。
消费者只校验/消费交付包，不加载 Modeler 的 `kernel.js`、`workspace.js`、`relations.js`、
`material-source.js`，也不自行求值 Modeler 文档。

## 入口

```json
{"action":"delivery","args":{"assetId":"<当前资产ID>","expectedHash":"<当前 contentHash>"}}
```

- 只读，不写资产、不改 revision。
- `assetId` 与 `expectedHash` **都必填**：`assetId` 非空且不超过 200 字符，`expectedHash` 为 64 位小写 sha256；缺参或格式错误返回 `invalid_argument`。两者用来固定要交付的确切版本；不匹配返回 `binding_conflict` 或 `conflict`。
- `expectedRevision` 可选，给出时必须是 `>= 0` 的安全整数；只接受这三个字段，其它字段返回 `invalid_argument`。
- 也可通过 HTTP 桥 `/api/modeler/workbench` 以 `{"action":"delivery","args":{...}}` 调用。

## 返回形状：有界票据

交付包可能接近 96 MiB，不能倒进模型上下文。`delivery` 动作只返回票据：

```json
{
  "ok": true,
  "assetId": "...",
  "revision": 7,
  "contentHash": "...",
  "delivery": {
    "schema": "dsh-modeler.delivery",
    "schemaVersion": 1,
    "digest": "<包内容 sha256>",
    "bytes": 123456,
    "path": "C:/Users/.../.dsh/modeler-deliveries/modeler-delivery-....json",
    "nodes": 12, "leaves": 12, "images": 0, "triangles": 2400,
    "materialScope": "Constant PBR plus ..."
  }
}
```

`path` 指向内部交付目录中的包文件。目录固定为 `~/.dsh/modeler-deliveries/`；文件名为
`modeler-delivery-<assetId>-<contentHash16>-<digest16>.json`，只允许
`[A-Za-z0-9_-]`。发布使用临时文件 + rename；最多保留最近 32 份，清理只删除同时满足
固定文件名与包内 `"schema":"dsh-modeler.delivery"` 标记的普通文件，不触碰同目录其它数据。

## 包结构（schemaVersion 1）

```text
{
  schema: "dsh-modeler.delivery",
  schemaVersion: 1,
  producer: { package, version, kernelVersion },
  source: { provider, assetId, revision, contentHash, title, units, axes, handedness, matrixLayout },
  nodes: [{ id, parent, name, matrix[16], visible, semanticId, sourceId, recipeType }],
  leaves: [{ id, positions[9n], normals[9n], uvs[6n]|null, materials[], triangleMaterials[] }],
  images: { "<sha256>": { width, height, codec: "rgba8-base64", data } },
  triangles: n,
  materialScope: "...",
  limitations: { fidelity, unsupported: [...] },
  digest: "<sha256 of sorted-key JSON without digest>"
}
```

- 节点保留原始层级、局部 4x4 列主序矩阵、可见性和语义身份；叶几何为世界空间逐角
  positions/normals/UV 与逐三角形材质槽，足以直接构造 Godot 网格。
- 图像只包含材质显式引用、已通过 Modeler 图像存储校验的 baked PNG → RGBA8。
- 包内容版本由 `source.contentHash`（Modeler 文档规范哈希）和 `digest`（包字节规范哈希）
  共同固定；消费者必须同时校验两者和 `assetId/revision`。

## 预算

| 项 | 上限 |
|---|---:|
| 三角形 | 250,000 |
| 叶 | 1,000 |
| 节点 | 2,048 |
| 图像边长 | 2,048 |
| 图像总像素 | 16,777,216 |
| 包字节 | 96 MiB |
| 材质槽/叶 | 64 |

超限明确返回 `MODELER_BUDGET` / `MODELER_TEXTURE_*`，不截断、不静默丢件。

## 材质保真边界

`limitations.fidelity = "constant-pbr-and-baked-uv-images"`。只交付：

- 常量 PBR：color、metalness、metallic、roughness、opacity、emissive、emissiveIntensity、
  doubleSided、clearcoat、clearcoatRoughness、normalScale；
- 显式 baked UV 图像通道：baseColor、roughness、metalness、normal、ao、emissive。

以下情况**拒绝交付**（`MODELER_MATERIAL_UNSUPPORTED` / `MODELER_TEXTURE_UNSUPPORTED`），
不降级成纯色、不声称保真：

- procedural / surface / detail / properties；
- transmission、thickness、attenuationColor/Distance；
- 非 UV 投影、非 0 UV 集、UV scale/rotation/offset；
- 非红标量通道、倒置 normal Y。

## 版本策略

- 不兼容字段变更递增 `schemaVersion`。消费者对未知 `schemaVersion` 返回
  `MODELER_DELIVERY_VERSION`，对未知字段返回 `MODELER_DELIVERY_SCHEMA`。
- 消费者重算 `digest`；不一致返回 `MODELER_DELIVERY_DIGEST`。
- 新增字段必须同时递增版本；不接受“同版本可选未知字段”。

## 测试覆盖

- `tests/delivery-package.mjs`：包结构、层级/矩阵、逐角几何/UV/材质槽、图像、拒绝边界、预算常量。
- `tests/delivery-store.mjs`：文件名/路径穿越、临时文件 + rename、损坏/缺失文件重建、清理隔离。
- `tests/delivery-action.mjs`：实际工具注册路径的有界票据、版本守卫、未知字段与发现项。
