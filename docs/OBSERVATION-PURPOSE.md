# 观察意图（0.24.0）

截图前先声明要回答的问题，而不是先出一张材质图再猜。

| purpose | 实际 displayMode | 用途 |
|---|---|---|
| `shape` | `outline` | 形体、部件边界、接缝、轮廓 |
| `topology` | `surface_wireframe` | 三角面、布线、网格结构 |
| `appearance` | `normal` | 材质、玻璃、PBR 外观 |

优先级：显式 `displayMode` > `purpose` > 显式诊断 `mode` > 编辑上下文 > 内部旧默认。
公共 `modeler_capture` / `workbench capture` 若三者都未给，会在读取资产和启动渲染之前
返回 `capture_purpose_required`，并列出三个可选用途；不会静默生成材质图。

- 几何编辑的 `observe.capture` 按操作分类：材质操作→appearance，triangulate/subdivide 等→topology，其余→shape。
- trial/compare 与批量采集走同一解析；回执记录 `observationSelection{purpose,mode,displayMode,source,explicitOverride}`。
- 旧诊断 `mode`（normal/clay/wire/…）与内部渲染默认保持原语义。
- 一次采集只出一种模式；不强制三连拍，也不自动追加图片。
