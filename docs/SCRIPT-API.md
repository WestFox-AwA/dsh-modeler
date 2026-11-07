# Modeler Script API

产品中的发现入口是 `modeler_workbench({action:'help',args:{topic:'start'}})`。本文件供人阅读，模型不需要先打开本文件或生成器源码。需要精确用法时调用 `help` 的 `api` 主题并提供函数名；目录只返回元数据，精确查询返回完整签名、参数语义和可运行例子。

## 帮助模块接口

`lib/discovery.js` 导出三个无副作用函数：

- `getModelerHelp(options={})`：默认/`topic:'start'` 返回 canonical `main` 指南；`topic:'legacy_tutorial'` 返回旧八步教程；`topic:'api',query` 保留旧签名合同。
- `quickStart()`，等价于 `getModelerHelp()`（canonical main）。
- `legacyTutorial()`，等价于 `getModelerHelp({topic:'legacy_tutorial'})`。
- `scriptApi({query?,offset=0,limit=12}={})`，等价于 `getModelerHelp({topic:'api',query,offset,limit})`

所有返回值均为可序列化的普通数据；没有函数、日期、资产读取或源码文件读取。每次返回独立副本。可用主题为 `start`、`modeling`、`edit`、`observe`、`relations`、`source`、`api`。

示例请求：

```json
{"action":"help","args":{"topic":"api","query":"m.sphere"}}
```

`query:'sphere'`、`topic:'m.sphere'` 和默认主题下 `query:'m.sphere'` 也能精确查询。Part 方法可使用 `Part.mods`、`part.mods`、`.mods`。裸名 `mat` 指向 `m.mat`，`.mat` 指向 Part 方法。`modifier.mirror` 和 `modifiers.mirror` 可查询 modifier。

成功返回的数据形状：

```json
{
  "ok":true,
  "schemaVersion":1,
  "topic":"api",
  "query":"m.sphere",
  "detail":"entry",
  "total":1,
  "offset":0,
  "limit":12,
  "returned":1,
  "nextOffset":null,
  "complete":true,
  "items":[],
  "topics":[],
  "maxCharacters":12000
}
```

上面 `items`/`topics` 为空仅展示返回字段；实际精确查询的 `items[0]` 包含 `id`、`signature`、`summary`、参数/默认值/注意点和 `examples[].code`。`detail:'directory'` 只包含 `id/kind/category/summary/detail`，其中 `detail` 是可直接传回帮助函数的查询对象。`detail:'guide'` 返回主题条目。

`offset` 按条目计数，必须为非负安全整数；`limit` 为 1..100 整数。每个 JSON 返回页最多 12000 个 JavaScript 字符。这个预算可使实际条目数小于 `limit`，但不会截断字符串、签名或例子。使用返回的 `nextOffset` 继续同一 `topic/query`，直到 `null`，即可完整取回全部条目；不要自行用请求的 `limit` 推算下一页。查询顺序稳定、无重复、无遗漏。

非精确 API 查询按名称、类别、摘要做大小写不敏感的包含匹配。没有结果时返回 `total:0` 和可用查询建议；未知主题返回 `ok:false,code:'unknown_topic'` 及合法候选，不引导模型读源码。参数类型或范围错误返回 `invalid_request`。

## 最短建模与复验路径

1. `status` 取得当前会话 `assetId/revision/contentHash`。新作品可先 `new`，之后使用其返回的守卫。
2. `script` 传 `code` 和 `assetId`、`expectedRevision` 或 `expectedHash`。主要零件使用稳定且全场唯一的 `.key(...)`。
3. `capture` 传固定相机与当前版本，取得 PNG 路径。
4. 用 `read_image` 实际查看 PNG，再做外形、遮挡和材质判断。
5. `inspect({id})` 读取该语义件真实的 `recipe.params`。
6. `edit` 的 `operations` 使用 `parameters` 改局部参数，并带当前资产守卫。
7. 使用相同相机、尺寸和模式复采并读图，再核对几何诊断和版本。

帮助 `start` 中的 `$latest.*` 是替换标记，必须换成最近一次 `status/new/script/edit` 的真实返回值。`$capture.evidence.path` 必须换成真实截图路径。`captured` 仅表示采集，不能作为外观通过结论。

以下是中性展示支架，可直接作为 `script` 的代码输入：

```modeler-script
const base=m.rbox(1.2,0.16,0.8,0.025,'Base')
  .key('sample.base').at(0,0.08,0).mat(m.matte('#607580'));
const post=m.cylinder(0.12,0.12,0.65,32,'Post')
  .key('sample.post').at(0,0.485,0).mat(m.metal());
const cap=m.sphere(0.25,0.16,0.25,32,16,'Cap')
  .key('sample.cap').at(0,0.96,0).mat(m.paint('#e3a34a'));
return m.scene('Neutral display stand',[base,post,cap]);
```

底座对应的局部操作形状：

```json
{"op":"parameters","id":"sample.base","params":{"w":1.5}}
```

将它放在带资产守卫的 `edit.args.operations` 中。它改变保存的几何参数，不会自动修改生成源码。

## 坐标、参数与执行

长度使用米。X 为左右，Y 向上，Z 为深度。默认正前视图的相机在 +Z；资产的 front 元数据可改变前后含义。多数实体以原点为中心，放样截面的 `y` 则是底高。

几何角度和 `part.rot(x,y,z)` 使用弧度。求值依次为基网格 → 按数组顺序的局部 modifiers → scale → 绕 Z → 绕 Y → 绕 X → position。即使先调用 `.at(...)` 再 `.mods(...)`，modifier 仍在本件 TRS 前的局部空间。组合件先求值子件，再应用组合的 modifiers/TRS。

脚本必须返回 `m.scene(...)`。隔离 JavaScript VM 不提供 `require`、`process` 或 `fs`；代码必须非空，最多 200000 字符，执行上限 8 秒。生成脚本后仍由共享 kernel 求值、校验与保存；不能将 `runModelerScript` 返回文档本身当作几何健康通过结论。

## 形体签名

下表中的默认值为脚本 m API 的位置参数。与结构化 build/recipe 的别名字段不能混为一谈。精确查询函数名会返回更细的参数限制和例子。

| API | 签名与语义 |
|---|---|
| `m.box` | `(w=1,h=1,d=1,name='Box')`；XYZ 全尺寸。 |
| `m.rbox` | `(w=1,h=1,d=1,c=.03,name='RBox')`；平面 chamfer。实际 c 限制在 `max(.001,min(c,w*.225,h*.225,d*.225))`。 |
| `m.sphere` | `(rx=.5,ry=rx,rz=rx,segments=40,rings=24,name='Sphere')`；XYZ 半径。名字是第六参。 |
| `m.cylinder` | `(radiusTop=.5,radiusBottom=radiusTop,height=1,segments=40,name='Cylinder')`；Y 轴，先顶半径后底半径。 |
| `m.cone` | `(radius=.5,height=1,segments=40,name='Cone')`；Y 轴，底在负端。 |
| `m.torus` | `(R=.6,r=.15,segments=48,tube=20,name='Torus')`；XZ 环、Y 孔轴，`tube` 为段数，保存字段是 `tubeSegments`。 |
| `m.torusArc` | `(R,r,u0,u1,segments=48,tube=16,name='Arc')`；XY 管弧，角度弧度，与 torus 平面不同。 |
| `m.lathe` | `(profile,segments=48,caps=true,name='Lathe')`；剖面 `[radius,y]` 绕 Y。 |
| `m.sectionLoft` | `(sections,opts={},name='Section loft')`；Z 向剖面放样，w 全宽，h 全高，y 底高。 |
| `m.loft` | `(sections,opts={},name='Loft')`；legacy 超椭圆，w **半宽**，h 全高，y 底高。 |
| `m.hull` | `(sections,opts={},name='Hull')`；超椭圆，w **全宽**；求值默认 segments=20、expX/expY=.08，默认 flat。 |
| `m.extrude` | `(polygon,depth=.1,name='Extrude')`；XY 剖面沿 Z 居中挤出。 |
| `m.plate` | `(points,depth=.1,plane='xy',name='Plate')`；xy 点为[x,y]/厚Z，zy 点为[z,y]/厚X，xz 点为[x,z]/厚Y。 |
| `m.patch` | `(rx,ry,rz,u0,u1,v0,v1,segments=28,rings=16,name='Patch')`；椭球开放角域，没封口或厚度。 |
| `m.tube` | `(points,radius=.03,segments=14,name='Tube')`；XYZ 折线扫圆截面，封闭两端，无 caps/opts 参数。 |
| `m.grille` | `(w=1,h=.6,t=.05,opts={},name='Grille')`；XY 格栅，opts: bars=6、frame=.10、bar=.012。 |
| `m.panel` | `(w=1,h=1,t=.05,holes=[],opts={},name='Panel')`；孔为 `{x,y,w,h}`，opts.plane 同 plate。 |
| `m.shell` | `(w=1,h=1,d=1,t=.05,opts={},name='Shell')`；opts.open 指定省略的 top/bottom/left/right/front/back 墙。 |
| `m.ring` | `(outer,inner,depth=.2,name='Ring')`；XY 环形棱柱，半径或对应轮廓数组，厚度 Z。 |
| `m.band` | `(path,width=.6,thick=.1,name='Band')`；实际路径 XY，width 沿 Z。 |
| `m.mesh` | `(positions,name='Mesh')`；每 9 个数是一面，不是索引数组。 |
| `new m.Part` | `(positions,name='Part')`；底层构造器，通常用 m.mesh 或形体函数。 |
| `m.sdf` | `(fn,min,max,nx=72,ny=72,nz=72,name='SDF')`；sampled signed distance；内部负，外部正。 |

`rbox` 的倒角由平面和角三角面构成，固定拓扑不是圆角多段网格。`shade('smooth')` 改变法线，不增加几何面；`subsurf` 则改变几何和轮廓。

sphere 与 patch 的角度坐标：`x=rx*sin(v)*cos(u),y=ry*cos(v),z=rz*sin(v)*sin(u)`。`u` 绕 Y，`v` 从 +Y 极点量起。脚本只有 `m.patch`，没有 `m.spherePatch`。当前 patch 生成器的三角绕序与完整 sphere 相反；不要将 doubleSided 当作法线或拓扑修复。

sectionLoft 的 profile 是 3..512 点的对应闭合剖面 `[x,y]`，x∈[-1,1]、y∈[0,1]，每站映射为 `[x*w/2,station.y+y*h,station.z]`。各站点数必须相同，z 不重复；剖面不能自交、零面积或相邻重复。`steps=1` 是站间线性插值段数，`caps=true`，需要共享 opts.profile 或各站 profile。

```modeler-script
const shell=m.sectionLoft(
  [{z:-0.6,w:1,h:0.5,y:0},{z:0.6,w:0.6,h:0.3,y:0.1}],
  {profile:[[-1,0],[1,0],[1,1],[-1,1]],steps:3}
).key('profile.body');
return m.scene('Profile specimen',[shell]);
```

可编辑 recipe 包括 box/rbox/sphere/cylinder/cone/torus/lathe/extrude/hull/loft/sectionLoft/tyre，以及需要文档上下文的 surfacePath/surfaceAttach/clearance。其他返回网格的函数，应通过 `inspect(id)` 确认有无 recipe，不要直接假定可 parameters 改参。

## 重复、组合与关系

| API | 签名与语义 |
|---|---|
| `m.pair` | `(build)`，回调依次接受 -1、+1；不自动镜像网格。 |
| `m.repeat` | `(part,count,step)`；向量乘 i，回调 `step(i)` 返回相对原件的位移，含 i=0 克隆。 |
| `m.grid` | `(piece,spec={})`；nx/ny/nz 默认1，step 默认[.1,0,0]，默认 centred。 |
| `m.merge` | `(list,name='Merged',materialOverride)`；保留子件层级、材质、recipe 与身份。可选第三参统一覆材。 |
| `m.align` | `(piece,target,spec={},name)`；按目标求值世界 AABB 设置 piece **原点**，不补本件半厚度。 |
| `m.mirror` | `(part,axis='x',pivot=0)`；烘焙世界几何后反射并纠正绕序，只返回镜像件，无 recipe。 |
| `m.bake` | `(part,name)`；世界求值烘焙，新件 TRS 归零、mods=[]，无 recipe/子件层级。 |
| `m.splitAt` | `(piece,axis,value,opts={})`；世界切平面，返回非空低/高侧，**不封切面**。 |

m.align 的 spec 每轴可为 min/max/center/centre/数值；offset 或 xOffset/yOffset/zOffset 默认0。它是一次定位，不是持久约束。m.merge 不做布尔并集；没有第三参时保留子件材质，组合上 `.mat(...)` 不等于统一子件覆材。

clone/repeat/grid 都保留 key；放到同一场景前必须逐件重设唯一 key。

```modeler-script
const base=m.box(1,0.4,0.6).key('base');
const badge=m.align(m.box(0.2,0.2,0.2),base,{y:'max',offset:0.1}).key('badge');
const pegs=m.repeat(m.cylinder(0.04,0.04,0.1,16),3,[0.25,0,0]);
pegs.forEach((p,i)=>p.key('peg.'+i).at(-0.25+i*0.25,-0.25,0));
return m.scene('Relation specimen',[base,badge,pegs]);
```

## 持久表面关系与间隙

| API | 签名与保留信息 |
|---|---|
| `m.recipe` | `(recipe,name='Recipe')`，从 `{type,params}` 或有可编辑 leaf recipe 的 Part 创建新件。输入 Part 时仅读取 recipe，不继承 TRS/mods/材质/子件。 |
| `m.tyre` | `(params={},name='Tyre')`，params 默认 outerRadius=.5、rimRadius=.3、width=.25、segments=64、profileSegments=4。轮轴 Y，内外圆 XZ。 |
| `m.surfacePath` | `(target,points,opts={},name='Surface path')`，逐段细采样、射线首命中、世界法线偏移，再扫封口管。 |
| `m.surfaceAttach` | `(target,source,opts={},name='Surface attachment')`，源 recipe 原点放到射线首命中，可对齐外法线。 |
| `m.clearance` | `(source,cutters,opts={},name='Clearance')`，保存原始 source 描述符，减圆柱包络并封切面。source 是 Part 时保留身份/TRS/mods/材质。 |

关系 target 是精确场景对象 ID，或有 `.key(...)` 的 Part；目标必须加入 scene。关系 recipe 保持可编辑并在完整文档中求值，不能对单独关系调用无上下文的 buildRecipe。缺目标、循环引用、投射未命中或超预算会拒绝。

surfacePath 的 opts 默认 `space:'target'`、`direction:[0,-1,0]`、`maxDistance:10`、`offset:.003`、`sampleStep:.05`、`radius:.003`、`radialSegments:8`。points 是 2..4096 个射线起点。默认 points/direction 属于目标局部坐标，转世界后选最近非负命中；space 也可 world。offset 沿世界外法线，sampleStep/radius/maxDistance 为世界长度。每段按世界长度细采样后再投射，避免只贴端点而中间穿曲面。

surfaceAttach 另有默认 anchor=[0,1,0]、alignNormal=true、up=[0,1,0]。anchor 是射线起点；up 是源几何的法向参考，不是相机 up。target 模式源尺寸也通过目标线性变换，world 模式用世界尺寸。offset 定位源原点，不自动补半厚度。source Part 必须有可编辑 leaf recipe 和 identity TRS；它只提供 recipe，不带 modifiers/材质。

```modeler-script
const body=m.box(1.6,0.4,0.8).key('surface.body');
const seam=m.surfacePath(body,[[-0.6,1,0],[0.6,1,0]],{
  direction:[0,-1,0],offset:0.025,radius:0.01,sampleStep:0.08
}).key('surface.seam');
const badge=m.surfaceAttach(body,{type:'box',params:{w:0.25,h:0.04,d:0.18}},{
  anchor:[0,1,0.2],direction:[0,-1,0],offset:0.025,alignNormal:true
}).key('surface.badge');
return m.scene('Surface relation specimen',[body,seam,badge]);
```

tyre 要求 `0<rimRadius<outerRadius`、width>0。segments 为8..4096整数，profileSegments 为1..4096整数，并受几何预算限制。内外半径与胎宽独立，改 rimRadius 不改变外包络。

clearance 的 cutters 最多32个，格式为 `{axis:'y',center?,radius?,depth?,clearance:0,segments?,target?}`。无 target 时，center（默认[0,0,0]）、radius、depth 在源局部坐标，radius 必填。引用目标后，这些值在目标局部坐标；tyre 且 axis=y、无 center 覆写/启用 modifiers 时自动取 outerRadius 和位姿，其他目标用局部网格包络推半径。clearance>=0，作为该坐标系下的半径增量。非均匀/负比例 TRS 可生成仿射椭圆柱，这不是恒定的世界欧氏间距。

depth 省略时自动贯穿源。opts.segments 默认48，也可每 cutter 覆写，要求8..256整数。使用圆柱外切多边形包络确保所需半径内部没有原面残留。原始 source 必须封闭、外向、凸；非凸或开放源拒绝。允许嵌套 clearance，将 cutters 合并后从原始凸源扣除。引用目标的祖先有启用 modifier 时拒绝；普通层级 TRS 支持仿射变换。

```modeler-script
const ring=m.tyre({outerRadius:0.4,rimRadius:0.23,width:0.2,segments:24})
  .key('opening.ring');
const plate=m.clearance(
  {type:'box',params:{w:1.6,h:0.3,d:1.2}},
  [{target:ring,axis:'y',clearance:0.03,segments:24}]
).key('opening.plate');
return m.scene('Clearance specimen',[plate,ring]);
```

只把切后结果加入场景，避免再加入重叠原实体。source recipe 和引用 ID 会保存；目标改半径或位姿后自动重算。完全切除可产生空几何，不能将空结果当作修复成功。

## Part 方法与 modifier

| 方法 | 行为 |
|---|---|
| `.at(x,y,z)` | 设置 position，不追加位移。 |
| `.rot(x,y,z)` | 设置欧拉弧度，实际 Z→Y→X。 |
| `.scaleTo(x,y=x,z=x)` | 设置正缩放比例；各分量有限且>0。 |
| `.mat(materialOrColor)` | 克隆材质对象或从颜色创建默认材质。 |
| `.mods(list)` | 替换整个 modifier 数组，最多32项，按顺序在本件 TRS 前执行。 |
| `.shade(mode)` | flat 或 smooth 法线，不增加几何。 |
| `.nameAs(name)` | 修改显示名，显式 key 独立。 |
| `.key(id)` | trim 后非空全场唯一身份，inspect/edit 用该 id。 |
| `.clone()` | 复制几何、recipe、TRS、mods、材质、key 和子件。 |

modifier 数据默认值：

```json
[
  {"type":"mirror","axis":"x","pivot":0,"keepOriginal":true,"enabled":true},
  {"type":"array","count":2,"offset":[1,0,0],"enabled":true},
  {"type":"subsurf","levels":1,"crease":false,"creaseAngle":1.0471975511965976,"enabled":true},
  {"type":"solidify","thickness":0.02,"offset":0,"enabled":true}
]
```

mirror 的 pivot 与 array 的 offset 都在局部空间。mirror 不焊接接缝。subsurf levels 是0..6整数，面数每层约乘4；creaseAngle 为弧度。solidify 沿局部顶点法线生成两层并接边界，thickness>0、offset∈[-1,1]，位移分别为 `normal*thickness*(+1+offset)/2` 和 `normal*thickness*(-1+offset)/2`。

## 材质与场景

`m.mat(color='#c0c7d4',opts={})` 返回普通材质数据。opts 默认 metalness=.1、roughness=.5、opacity=1、clearcoat=false、transparent=false、doubleSided=false、emissive='#000000'、emissiveIntensity=0。metalness/roughness 限制在[0,1]，opacity 在[.02,1]。

预设有 `m.paint(color='#b31724')`、`m.metal(color='#aab3c0')`、`m.chrome()`、`m.gold()`、`m.carbon()`、`m.rubber()`、`m.glass()`、`m.leather()`、`m.bone()`、`m.ceramic()`、`m.matte(color='#101216')`、`m.emitter(color='#4de8ff',intensity=5)`。预设名称指颜色和属性，不包含纹理采样。

`m.glass()` 不接受定制参数，默认 opacity=.55、doubleSided=true；自定义透明色用 m.mat。渲染支持 color/metalness/roughness/opacity/emissive/emissiveIntensity/clearcoat/doubleSided。透明和双面显示不能修复缺厚度、错误绕序或开放面。

`m.scene(title,parts,meta={})` 将 Part 数组展开最多4层，转换为源文档。`.key(...)` 为 id/semanticId；无 key 时用名称生成身份。应把待局部修改的主要件显式设 key。

SDF helper 均返回数值，不是 Part：`m.sdfKit.sphere(p,center,radius)`、`box(p,center,halfExtents)`、`ellipsoid(p,center,radii)`、`capsule(p,a,b,radius)`、`smin(a,b,k)`、`ssub(a,b,k)`。k>0，ssub 从 a 减 b。

## 源码维护与观察

- `source({offset:0,limit:6000})` 分页读当前生成程序，返回 sourceId、characters、nextOffset 和 code；按 nextOffset 完整拼接。
- `save_source({code,...assetGuards})` 先保存惰性代码字符串，再检查，返回 sourceId、validation 和 committable；无效代码也可保留以便修补，不改变当前资源。
- `patch_source({sourceId?,patches:[{find,replace,all:false}],...assetGuards})` 精确补丁产生新的不可变 sourceId，再检查；省略 sourceId 取当前保存源码。匹配失败不产生新版本；验证失败仍保留新代码，旧 sourceId 和原资产不变。
- `validate({code|sourceId})` 编译/求值但不提交。
- `script({code|sourceId,...assetGuards})` 提交当前资产。已有局部覆写时使用 rebase:true 重放可重放编辑；明确舍弃才 discardOverrides:true。冲突不提交。

`...assetGuards` 表示真实 assetId 与 expectedRevision 或 expectedHash，不能原样传这段占位文字。代码与 sourceId 二选一。代码hash标识不可变 sourceId。stage 不代表验证通过，验证通过也不代表资产已改变；仅 `committable:true` 可进入 script，script 会重新校验，无效代码不能提交。源码错误定位的 line 可能为 null。

相机与物体角度不同：相机 azimuth/elevation/fov 使用度。eye/target/up 是世界 XYZ。eye 与 azimuth/elevation/distance 互斥。正交 span 是垂直全视野长度；透视 fov 默认42度。为了比较变化，固定 eye/target、正交 span、width/height 和 mode。

capture 默认独立 Three 渲染，无需打开面板；结果 PNG 必须 read_image 查看。preview 是字符诊断，不证明材质。inspect 提供参数与几何发现，evidence 提供版本与图像回执。候选试验使用 trial 入口，局部 operations 是最短路线；code/sourceId 候选与正式提交使用相同覆写规则，需要保留可重放修改时显式 rebase:true，不默认 discardOverrides。复用固定相机比较，accept_trial 才提交。

## 验证

执行 `node tests/discovery.mjs`。测试会调用真实 runModelerScript 并经共享 kernel 求值所有公开帮助例子和本文件的 modeler-script 代码段，检查有限且非空几何；另验证参数错位负例、真实尺寸/轴向/默认参数、变换顺序、局部改参、组合材质及按 query 分页无丢失。测试通过真实 workspace 的 candidate 路径验证改参，并确认资产与磁盘保持未写入，不触及实际资源。
