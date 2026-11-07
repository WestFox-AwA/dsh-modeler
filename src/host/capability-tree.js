import {capabilityDecisions,rankDecisions,positiveIntent,decisionByNode} from './capability-decisions.js';
import {recommendCapability} from './capability-guidance.js';
// Task-first discovery. Pure JSON; this module never reads or changes assets.
const SCHEMA_VERSION=1,MAX_CHARACTERS=10000,MAX_CHILDREN=5,MAX_SEARCH=6;
const clone=value=>JSON.parse(JSON.stringify(value));
const api=query=>({action:'help',args:{topic:'api',query}});
const action=query=>({action:'help',args:{topic:'actions',query}});
const expand=node=>({action:'help',args:{node}});
const nodes=new Map();
function branch(id,parent,title,summary,when,terms=[]){nodes.set(id,{id,parent,title,summary,when,terms,children:[]});if(parent)nodes.get(parent).children.push(id);}
function leaf(id,parent,title,summary,when,contracts,code,requiredEvidence,validityScope,links=[],terms=[]){
 const entry={id,parent,title,summary,when,terms,children:[],contracts,code,requiredEvidence,validityScope,links};
 nodes.set(id,entry);nodes.get(parent).children.push(id);
}
const scene=part=>`return m.scene('Capability sample',[${part}]);`;
const observed=['固定相机采集当前hash的相关视图并读取PNG。','改参后复验目标的世界bounds；coverage/unknownReasons须保留。'];
const local='长度为米；局部modifier先于scale/Rz/Ry/Rx/position。';
branch('root',null,'选择建模任务 / Choose an intent','先决定表示与关系，再取动作的精确合同与验证。','从要构造、组织或修正的结果出发。',['任务','intent','model']);
branch('construct','root','构造形体 / Construct','选择实体、截面、表面或孔厚表示。','还没有合适的可编辑几何。',['create','build','造型','构造']);
branch('organize','root','组织装配 / Organize','选择局部框架、重复关系或接触关系。','已有零件，需要稳定组织它们之间的关系。',['assembly','关系','组织']);
branch('refine','root','检查并修正 / Refine','围绕轮廓、接触、表面、材质或候选范围修改。','已有结果，需要定位证据与最小修改范围。',['inspect','edit','验证','修正']);
branch('native','root','原生构造与精修 / Geometry','直接创建源、定位边面并保存局部特征，计算交给隔离后端。','需要真实拓扑操作、关联更新或物理材质。',['geometry','native','precision','原生','精修','布尔','bevel','倒角']);
leaf('native.construct','native','持久构造源','规则体、截面、曲线、控制网和扫掠共用可编辑源。','以明确尺寸和轮廓起形。',[action('geometry')],"const body=m.box([1,.6,.15]).key('body');return m.scene('Source',[body]);",[],['此处m用于geometry program；cylinder/extrude轴Z，profile为XY。'],[],['box','loft','sweep','surface','curve','构造','截面','曲面','扫掠']);
leaf('native.refine','native','选边/面局部精修','bevel/inset/extrude/subdivide/bridge/fill/dissolve/merge/split/bisect及硬边折痕。','已有几何，要明确修改局部而保留其它源。',[action('geometry')],null,[],['select条件在本地坐标；显式ID必须绑定topologyStamp。'],[],['bevel','inset','extrude','bridge','crease','倒角','内插','挤出','桥接','边环']);
leaf('native.solids','native','负空间、厚度与重复','EXACT布尔、solidify、subdivision、mirror/array及持久面板/路径分布。','切孔/内腔、开面加厚或规则重复。',[action('geometry')],null,[],['布尔操作数须闭合非零体积流形；不是CAD公差保证。'],[],['boolean','hole','solidify','array','mirror','布尔','开孔','厚度','阵列']);
leaf('native.relations','native','依附与图像定位','附件引用最终目标面；图像点/射线返回源与持久面选区。','定位具体修改并维护与主源的关联。',[action('geometry')],null,[],['真实命中；目标消失或歧义明确拒绝，不隐式烘焙。'],[],['attachment','pick','射线','拾取','定位','依附','关系']);
leaf('native.render','native','材质属性和真实场景','UV、分面材质、物理透射、纹理和实际灯光/阴影。','从同一源渲染或导出明确配置的画面。',[action('geometry'),action('capture')],null,[],['纹理按UV采样；emissive不代替真实光源。'],[],['uv','texture','material','light','纹理','贴图','材质','灯光','阴影']);
branch('construct.solid','construct','从实体尺寸开始','规则包络、回转实体或自定义网格。','轮廓可由全尺寸或半径直接表达。',['solid','实体','primitive']);
branch('construct.profile','construct','让截面决定轮廓','平面挤出、对应截面或回转剖面。','需要显式轮廓和可回放的截面参数。',['profile','截面','轮廓']);
branch('construct.surface','construct','从曲面或路径生成','开放曲面、线扫或距离场。','形体不是单一封闭规则实体。',['surface','曲面','path']);
branch('construct.void','construct','表达孔、内腔和厚度','选择通孔、壳厚或目标驱动切口。','孔和实体厚度属于设计要求。',['hole','thickness','孔','厚度']);
branch('organize.frame','organize','保留层级与局部框架','先确认语义身份、父子层级和枢轴。','整组移动、复用或替换需要明确范围。',['hierarchy','group','pivot','module','层级','枢轴','模块']);
branch('organize.repeat','organize','保持重复件的关系','对称、线性格阵或带方向的路径重复。','副本需要跟随来源、路径或镜像平面。',['repeat','symmetry','belt','重复','对称','履带']);
branch('organize.contact','organize','放置并核验接触','区分原点对齐、表面附着和净空间。','位置关系依赖另一个零件。',['contact','attach','gap','贴附','接触','间隙']);
branch('refine.contour','refine','修正轮廓与比例','尺寸、截面轮廓或局部拓扑。','从视图和数值证据定位形体偏差。',['contour','proportion','比例']);
branch('refine.contact','refine','检查接触与方向','距离、投射或有向路径角色。','需要确认间隙、命中点、朝向与外侧。',['direction','roles','方向','接触']);
branch('refine.surface','refine','修正法线与曲率','区分着色法线、几何细分和开放边界。','高光、厚度或连接处出现表面问题。',['normal','curvature','法线','曲率']);
branch('refine.material','refine','修正材质观感','颜色、表面响应或透明显示。','形体已明确，需要当前版本的材质图。',['material','color','roughness','材质']);
branch('refine.scope','refine','选择候选修改范围','参数、独立模块或候选提交。','先限定影响范围，再比较与接受。',['candidate','module edit','候选','模块编辑']);
leaf('construct.solid.block','construct.solid','按外包络构造块体','全宽高深决定主体，chamfer仅作平面倒角。','需要可改尺寸的规则基体。',[api('m.box'),api('m.rbox')],scene("m.rbox(1,.4,.6,.03).key('body')"),observed,[local,'rbox的c不是圆角分段数。'],['construct.profile.stations'],['box','block','chamfer','块体','倒角']);
leaf('construct.solid.round','construct.solid','按半径与轴线构造','先确认半径/全尺寸和回转轴。','球、圆柱、锥、圆环或胎圈的包络。',['m.sphere','m.cylinder','m.cone','m.torus','m.torusArc','m.tyre'].map(api),scene("m.cylinder(.2,.35,.7,24).key('round')"),observed,['sphere为XYZ半径；cylinder沿Y，torus主环XZ，torusArc主环XY。'],['construct.profile.revolve'],['radius','cylinder','sphere','半径','圆柱']);
leaf('construct.solid.custom','construct.solid','从明确三角面构造','已有三角坐标时保留显式网格。','轮廓不能由现有参数表示。',[api('m.mesh'),api('m.Part')],scene("m.mesh([0,0,0,1,0,0,0,1,0]).key('triangle')"),['diagnose part检查朝向、退化面和开放边；需要厚度时再处理。'],['每9个有限数描述一个三角面；开放面不自动封闭。'],['refine.surface.boundaries'],['mesh','triangle','网格']);
leaf('construct.profile.plate','construct.profile','平面轮廓加厚度','按XY/ZY/XZ明确厚度方向。','轮廓主要位于一个平面。',[api('m.extrude'),api('m.plate')],scene("m.plate([[-.5,0],[.5,0],[.3,.7],[-.3,.7]],.08,'xy').key('plate')"),observed,['剖面不可自交或零面积；厚度在剩余轴居中。'],['construct.void.holes'],['extrude','plate','挤出','平面轮廓']);
leaf('construct.profile.stations','construct.profile','用对应截面控制轮廓','沿Z逐站定义宽高与闭合剖面。','前后轮廓和截面变化需单独修改。',['m.sectionLoft','m.hull','m.loft'].map(api),scene("m.sectionLoft([{z:-.6,w:1,h:.4},{z:.6,w:.5,h:.25}],{profile:[[-1,0],[1,0],[1,1],[-1,1]],steps:3}).key('body')"),observed,['sectionLoft/hull的w为全宽；legacy loft.w为半宽；steps为线性插值。'],['refine.contour.silhouette'],['loft','stations','放样','截面']);
leaf('construct.profile.revolve','construct.profile','用回转剖面控制轮廓','半径/Y剖面绕Y；空心轮廓可用环形棱柱。','轴对称形体需要保留剖面。',[api('m.lathe'),api('m.ring')],scene("m.lathe([[.2,0],[.4,.2],[.3,.7]],24,true).key('vessel')"),observed,['lathe profile是[半径,y]；ring主轮廓在XY、厚度沿Z。'],['construct.solid.round'],['lathe','revolve','回转']);
leaf('construct.surface.patch','construct.surface','截取一片开放曲面','用椭球角域表达曲面覆盖。','需要开放壳面而非整个椭球。',[api('m.patch')],scene("m.patch(.7,.4,.6,0,Math.PI,.2,1.3,16,8).key('surface')"),['法线图与开放边界诊断；加厚前确认法线方向。'],['patch无recipe/封口/厚度；当前绕序与sphere相反。'],['refine.surface.normals','construct.void.wall'],['patch','开放曲面']);
leaf('construct.surface.sweep','construct.surface','沿线扫管或带','先决定路径平面和截面轴。','线形轮廓需要实体截面。',[api('m.tube'),api('m.band')],scene("m.tube([[-.5,0,0],[0,.4,0],[.5,.4,.3]],.04,10).key('rail')"),observed,['tube为三维折线圆截面、两端封口；band为XY闭合路径、width沿Z。'],['organize.repeat.path'],['tube','band','sweep','扫掠','路径']);
leaf('construct.surface.field','construct.surface','用距离场表达融合形体','有限采样域中的内负外正距离。','隐式组合比显式截面更合适。',['m.sdf','m.sdfKit','m.sdfKit.sphere','m.sdfKit.box','m.sdfKit.ellipsoid','m.sdfKit.capsule','m.sdfKit.smin','m.sdfKit.ssub'].map(api),scene("m.sdf(p=>m.sdfKit.sphere(p,[0,0,0],.4),[-.6,-.6,-.6],[.6,.6,.6],12,12,12).key('field')"),['检查采样域封闭覆盖与三视图轮廓；调整采样后复验。'],['无recipe；表面必须在采样域内，采样分辨率增加成本。'],['refine.surface.curvature'],['sdf','implicit','距离场']);
leaf('construct.void.holes','construct.void','显式通孔与格栅','用孔矩形或框条结构表达开口。','设计要求是平面通孔或格栅。',[api('m.panel'),api('m.grille')],scene("m.panel(1,.7,.08,[{x:0,y:0,w:.4,h:.3}]).key('panel')"),['正视与侧视核验孔宽高、贯通厚度及残余条带。'],['panel/grille由封闭盒体组成，可有内部接触面。'],['construct.profile.plate'],['panel','grille','holes','通孔','格栅']);
leaf('construct.void.wall','construct.void','表达空腔和壁厚','规则壳体用墙，开放面沿法线加厚。','需要真实壁厚而非透明显示。',[api('m.shell'),api('modifier.solidify'),api('Part.mods')],scene("m.shell(1,.6,.8,.04,{open:['top']}).key('shell')"),['剖面和法线证据核对内外壁、厚度及开放边。'],['solidify依赖局部顶点法线；闭合件也会生成两层。'],['refine.surface.normals'],['shell','wall','solidify','壳','壁厚']);
leaf('construct.void.clearance','construct.void','按目标包络保留净空','保留source recipe及圆柱cutter的目标引用。','切口需要随轮圈或目标半径和位姿变化。',[api('m.clearance'),api('m.recipe')],"const wheel=m.tyre({outerRadius:.35,rimRadius:.2,width:.2,segments:24}).key('wheel');const body=m.clearance({type:'box',params:{w:1.4,h:.25,d:1}},[{target:wheel,axis:'y',clearance:.03,segments:24}]).key('body');return m.scene('Clearance',[body,wheel]);",['目标半径变化后重新求值；剖面检查所需包络内无残面。'],['原始源须封闭、外向、凸；clearance在引用局部坐标加到半径。'],['organize.contact.clearance'],['cut','clearance','切口','净空']);
leaf('organize.frame.hierarchy','organize.frame','保留组与子件身份','组合保留子件参数、材质和语义ID。','多件需要一起移动且子件继续可编辑。',['m.merge','Part.key','Part.nameAs','m.scene'].map(api),scene("m.merge([m.box(.4,.2,.3).key('base'),m.cylinder(.08,.08,.5,16).at(0,.35,0).key('post')],'Assembly').key('assembly')"),['编辑前后核对组树、子件ID与世界bounds。'],['merge不是布尔并集；全场key唯一；组合先子件再本组变换。'],['organize.frame.pivot','refine.scope.module'],['group','reparent','hierarchy','组','层级']);
leaf('organize.frame.pivot','organize.frame','明确枢轴与局部变换','局部原点、组框架和世界外观分开确认。','整组旋转或重挂父级需要稳定框架。',['Part.at','Part.rot','Part.scaleTo'].map(api),scene("m.merge([m.box(.6,.1,.2).at(.3,0,0).key('arm')]).key('pivot').rot(0,0,.4)"),['改框架时核对叶的世界bounds是否按意图保留。'],[local,'at/rot/scaleTo设置值；角度为弧度；scaleTo不是目标尺寸。'],['organize.frame.hierarchy'],['pivot','frame','枢轴','局部框架']);
leaf('organize.frame.module','organize.frame','建立可局部替换的模块','以稳定组ID限定独立生成程序的影响范围。','零件子树需要单独生成、试验或替换。',[api('m.merge'),api('Part.key')],scene("m.merge([m.box(.6,.2,.4).key('module.base')],'Module').key('module')"),['核对模块树、外部引用与未修改模块的身份/世界bounds。'],['先限定模块ID再读局部生成程序；替换后复验外部依赖。'],['refine.scope.module','organize.frame.hierarchy'],['module','subtree','模块','子树']);
leaf('organize.repeat.mirror','organize.repeat','选择持久或一次镜像','区分来源驱动关系、本地modifier与烘焙副本。','另一侧应随来源还是只复制当前形体。',['m.mirrorOf','m.symmetry','m.mirror','modifier.mirror','m.pair'].map(api),"const right=m.box(.2,.4,.3).at(.5,.2,0).key('right');return m.scene('Mirror',[right,m.mirror(right,'x',0).key('left')]);",['对称平面、对应ID与左右世界bounds；修改来源后复验关系。'],['m.mirror为世界烘焙、失去recipe；m.pair只以±1调用回调。'],['refine.contact.direction'],['mirror','symmetry','镜像','对称']);
leaf('organize.repeat.array','organize.repeat','选择等距或格阵副本','区分单独语义件与局部几何array。','数量和步长是设计参数。',['m.repeat','m.grid','Part.clone','modifier.array'].map(api),"const copies=m.repeat(m.box(.12,.2,.2),4,[.3,0,0]);copies.forEach((p,i)=>p.key('peg.'+i));return m.scene('Repeat',copies);",observed,['克隆保留key，加入场景前逐件重设；modifier.array在本件局部求值。'],['organize.repeat.path'],['array','grid','repeat','阵列','重复']);
leaf('organize.repeat.path','organize.repeat','沿路径重复并保持方向角色','先明确路径的切向、外侧与来源轴。','链节、履带或沿曲线副本需要稳定朝外。',[api('m.wrapPath'),api('m.beltPath'),api('m.pathArray'),action('check_roles')],scene("m.tube([[-.6,0,0],[0,.3,0],[.6,0,0]],.025,10).key('path.sample')"),['检查每实例forward/outward角色和目标外侧；首尾、弯段都需证据。'],['先读取路径动作合同；此基础例仅画参考管，不假定未读的路径重复参数。'],['refine.contact.direction','construct.surface.sweep'],['path roles','patharray','belt','wrap','履带','路径重复','朝外','方向角色']);
leaf('organize.contact.align','organize.contact','按目标边界放置原点','目标世界AABB是定位参考。','需要一次性对齐面或中心。',[api('m.align')],"const base=m.box(1,.3,.6).key('base');const cap=m.align(m.box(.2,.2,.2),base,{y:'max',offset:.1}).key('cap');return m.scene('Align',[base,cap]);",['diagnose pair核对目标间隙，不能仅靠AABB重叠判断接触。'],['align不补自身半厚度，不是持久约束；目标变后需重算。'],['organize.contact.attach','refine.contact.separation'],['align','对齐']);
leaf('organize.contact.attach','organize.contact','让附件或路径跟随表面','以目标ID与射线命中保存持续关系。','目标尺寸或TRS改变后仍应贴附。',[api('m.surfaceAttach'),api('m.surfacePath')],"const b=m.box(1.2,.3,.7).key('body');const badge=m.surfaceAttach(b,{type:'box',params:{w:.2,h:.04,d:.15}},{anchor:[0,1,0],direction:[0,-1,0],offset:.025}).key('badge');return m.scene('Attach',[b,badge]);",['表面射线命中点/法线、附件半厚度和物理间隙；目标改参后复验。'],['source原点放在命中+offset；target/world空间和尺寸语义先读精确合同。'],['refine.contact.projection'],['surfaceattach','surfacepath','attach','附着','贴附']);
leaf('organize.contact.clearance','organize.contact','确认净空随目标变化','将切口关系与目标半径/位姿绑定后核验。','间隙要求不应随目标修改失效。',[action('diagnose')],scene("m.tyre({outerRadius:.4,rimRadius:.25,width:.2,segments:24}).key('wheel')"),['目标驱动改参前后剖面；pair结果的coverage与unknownReasons。'],['几何切口适用边界见构造净空叶；AABB间隙不能替代表面证据。'],['construct.void.clearance','refine.contact.separation'],['clearance','gap','间隙','净空']);
leaf('refine.contour.dimensions','refine.contour','修改保留的尺寸参数','先inspect真实recipe.params再改参。','要改宽高半径等已有设计参数。',[action('inspect'),action('edit'),api('m.recipe')],scene("m.box(.9,.3,.5).key('body')"),observed,['params对象深合并、数组整体替换；修改需当前assetId与版本守卫。'],['refine.scope.parameters'],['dimensions','parameters','尺寸','改参']);
leaf('refine.contour.silhouette','refine.contour','用截面修正轮廓比例','先固定机位，再改控制轮廓的站点。','俯视/侧视中的局部比例不合目标。',[action('capture'),action('inspect')],scene("m.sectionLoft([{z:-.5,w:.9,h:.4},{z:.5,w:.4,h:.2}],{profile:[[-1,0],[1,0],[1,1],[-1,1]]}).key('body')"),['固定camera/span/尺寸同条件前后图；对应截面和世界bounds。'],['轮廓证据只适用于所采机位和当前hash；先读取截面字段合同。'],['construct.profile.stations','refine.scope.candidate'],['silhouette','proportion','轮廓','比例']);
leaf('refine.contour.topology','refine.contour','在明确基拓扑上局部修改','先读共享顶点/面索引，必要时显式烘焙。','现有recipe不能表达局部顶点或切分。',[api('m.bake'),api('m.splitAt'),action('edit')],"return m.scene('Split',m.splitAt(m.box(1,.6,.4),'y',0));",['改前恢复点、改后基拓扑与开放边诊断、相关机位图。'],['bake失去recipe；splitAt不封切面；mesh编辑仅叶且索引为base-local。'],['refine.surface.boundaries'],['topology','bake','拓扑','顶点']);
leaf('refine.contact.separation','refine.contact','检查两件距离或交叠','精确ID的pair查询说明证据覆盖。','接触、间隙或穿插需要几何依据。',[action('diagnose')],scene("m.merge([m.box(.5,.2,.4).key('a'),m.box(.2,.2,.2).at(0,.205,0).key('b')]).key('pair')"),['diagnose pair返回的coverage/result/unknownReasons，必要时剖面复验。'],['AABB相交不证明网格穿插；unknown不等于通过。'],['organize.contact.align','organize.contact.clearance'],['distance','intersection','gap','距离','穿插']);
leaf('refine.contact.projection','refine.contact','检查表面命中与法线','世界射线或点投射核对实际表面。','附件位置或偏移方向需要定位。',[action('diagnose')],scene("m.box(1,.4,.6).key('surface')"),['diagnose surface的ray/project/nearest命中点、法线和覆盖。'],['查询空间为世界；recipe的target空间需要先转换和读合同。'],['organize.contact.attach','refine.surface.normals'],['ray','project','projection','投射','射线']);
leaf('refine.contact.direction','refine.contact','核验路径方向与对称角色','比较切向、外侧参考和镜像对应关系。','重复件朝内、翻向或左右关系不明。',[action('diagnose')],scene("m.box(.2,.06,.12).rot(0,.4,0).key('direction.sample')"),['路径每实例forward/outward及引用外侧结果；对称pairs及平面结果。'],['方向检查适用声明的路径和角色；没有声明时不能推断设计意图。'],['organize.repeat.path','organize.repeat.mirror'],['check_roles','path roles','direction','方向角色','朝外','左右']);
leaf('refine.surface.normals','refine.surface','区分法线着色与真实厚度','先定位绕序、法线和开放面。','出现背面、黑面或厚度方向问题。',[api('Part.shade')],scene("m.rbox(.8,.3,.5,.03).shade('flat').key('body')"),['normal模式真实图、朝向/边界诊断；当前hash和局部ID。'],['shade只改着色，不增面、不封口；doubleSided不修法线。'],['construct.surface.patch','construct.void.wall'],['normals','shade','法线','朝向']);
leaf('refine.surface.curvature','refine.surface','明确曲率是否要改几何','倒角、着色平滑和几何细分分开选。','轮廓和高光需要更柔和的过渡。',[api('modifier.subsurf')],scene("m.box(.6,.4,.5).mods([{type:'subsurf',levels:1,crease:true}]).key('body')"),['固定机位轮廓、世界尺寸及面数前后对照。'],['subsurf改变几何和尺寸；每层三角面数约乘4，受预算限制。'],['construct.solid.block','refine.surface.normals'],['subsurf','smooth','curvature','曲率','细分']);
leaf('refine.surface.boundaries','refine.surface','核对开放边界和退化面','以局部part证据定位拓扑边界。','切分、手工网格或加厚后需要复验。',[action('diagnose')],scene("m.mesh([0,0,0,1,0,0,0,1,0]).key('open')"),['part诊断的拓扑、boundary和unknownReasons；必要时剖面。'],['开放曲面可以是设计结果；按该任务要求判断，不自动当缺陷。'],['refine.contour.topology','construct.void.wall'],['boundary','degenerate','边界','退化']);
leaf('refine.material.color','refine.material','设置颜色与发光','对明确ID设置材质数据。','需要基础颜色或发光强调。',['m.mat','Part.mat','m.paint','m.matte','m.emitter'].map(api),scene("m.box(.6,.3,.4).mat(m.paint('#607f96')).key('body')"),['material模式当前hash真实图；同机位对照。'],['返回材质数据，由Part.mat应用；预设名称不代表纹理采样。'],['refine.material.response'],['color','emissive','颜色','发光']);
leaf('refine.material.response','refine.material','调整表面反射响应','从材质合同读取metalness/roughness默认。','形体已正确，反射或粗糙感需要调整。',['m.metal','m.chrome','m.gold','m.carbon','m.rubber','m.leather','m.bone','m.ceramic'].map(api),scene("m.sphere(.3,.3,.3,24,12).mat(m.metal()).key('body')"),['material模式真实图；同光照/机位检查高光和暗部。'],['仅支持合同中的材质字段；不推断完整Shader或贴图能力。'],['refine.material.color'],['roughness','metalness','metal','反射','粗糙']);
leaf('refine.material.transparency','refine.material','核验透明与双面显示','透明参数只影响显示，不创造壳体。','透光部件需要检查遮挡和背面。',[api('m.glass')],scene("m.box(.6,.4,.2).mat(m.glass()).key('glass')"),['material图检查透光/遮挡；法线或厚度另取几何证据。'],['m.glass()无参数；定制用m.mat；透明不修开放边界。'],['construct.void.wall','refine.surface.normals'],['glass','transparent','玻璃','透明']);
leaf('refine.scope.parameters','refine.scope','只改已读到的参数','inspect决定可编辑字段。','局部recipe参数能表达此次修改。',[action('inspect'),action('edit')],scene("m.box(.8,.3,.5).key('body')"),observed,['写入有assetId和当前revision/hash；冲突后刷新，不沿用旧守卫。'],['refine.contour.dimensions'],['parameter edit','局部改参']);
leaf('refine.scope.module','refine.scope','只修订一个模块生成器','分页局部源码→暂存→同范围候选→带守卫替换。','改一组的生成结构并保持其他组。',[action('module_source'),action('save_module_source'),action('trial'),action('accept_trial')],scene("m.merge([m.box(.6,.2,.4).key('module.base')]).key('module')"),['比较目标模块前后图和外部依赖；其他模块身份/世界几何保持。'],['先读模块精确动作合同；候选只在接受后提交，基线变化拒绝。'],['organize.frame.module','refine.scope.candidate'],['module edit','revise_module','module_source','模块编辑','局部生成器']);
leaf('refine.scope.candidate','refine.scope','试验后再接受候选','operations或code/sourceId明确二选一。','改动需要同条件比较、验证或撤销。',['trial','accept_trial','discard_trial','validate','source'].map(action),scene("m.box(.6,.3,.4).key('candidate')"),['trial诊断与同camera前后PNG；读取图后决定accept/discard。'],['trial不提交；accept_trial要求基线仍相同；源码覆写需显式rebase语义。'],['refine.scope.parameters','refine.scope.module'],['trial','candidate','候选','试验']);
for(const [id,contracts] of [
 ['organize.frame.hierarchy',[action('tree'),action('assembly'),action('edit')]],
 ['organize.frame.pivot',[action('edit'),action('assembly')]],
 ['organize.frame.module',[action('tree'),action('module_source'),action('save_module_source'),action('set_control')]],
 ['refine.scope.module',[action('set_control')]],
 ['refine.contact.direction',[api('Part.roles'),action('check_roles')]],
])nodes.get(id).contracts.push(...contracts);
function breadcrumbs(id){const out=[];for(let item=nodes.get(id);item;item=nodes.get(item.parent))out.unshift({id:item.id,title:item.title});return out;}
function describe(item){return {id:item.id,parent:item.parent,title:item.title,breadcrumbs:breadcrumbs(item.id),summary:item.summary,when:item.when};}
function entry(id){const item=nodes.get(id);return {id,title:item.title,summary:item.summary,when:item.when,kind:item.children.length?'branch':'leaf',expand:expand(id)};}
function descendantCount(id){return nodes.get(id).children.reduce((count,child)=>count+1+descendantCount(child),0);}
function exampleFor(item){
 if(typeof item.code!=='string')return {language:'json',code:null,readContracts:contractActions(item).map(x=>x.contract),purpose:'按明确原生合同构造和局部编辑；本项无旧脚本样例。'};
 const names=new Set([...item.code.matchAll(/\bm\.[A-Za-z]\w*(?:\.[A-Za-z]\w*)?/g)].map(match=>match[0]));
 for(const match of item.code.matchAll(/\.(at|rot|scaleTo|mat|mods|shade|nameAs|key|clone)\s*\(/g))names.add('Part.'+match[1]);
 for(const match of item.code.matchAll(/type\s*:\s*['"](mirror|array|subsurf|solidify)['"]/g))names.add('modifier.'+match[1]);
 return {language:'javascript',code:item.code,readContracts:[...names].map(api),purpose:'中性几何样例；参数和语义先读取对应函数合同。'};
}
function contractActions(item){const card=decisionByNode(item.id);return (card?[card.primary,...card.details]:item.contracts).map(contract=>({id:contract.args.query,kind:contract.args.topic==='api'?'function':'action',contract}));}
const normal=value=>value.normalize('NFKC').trim().toLowerCase();
const aliases=[
 ['organize.repeat.path',['path roles','patharray','beltpath','wrappath','belt','track','chain','履带','链节','沿路径','路径重复']],
 ['refine.contact.direction',['check_roles','direction role','outward','outside','forward','朝外','外侧','方向角色']],
 ['refine.scope.module',['module edit','module_source','save_module_source','revise_module','模块编辑','局部生成器','局部源码']],
 ['organize.frame.hierarchy',['reparent','hierarchy','group','层级','重挂','分组']],
 ['organize.frame.pivot',['pivot','local frame','枢轴','局部框架']],
 ['organize.repeat.mirror',['mirrorof','symmetry','mirror','对称','镜像']],
 ['construct.profile.stations',['sectionloft','loft','截面','放样']],
 ['construct.void.wall',['thickness','solidify','wall','壁厚','加厚']],
 ['organize.contact.attach',['surfaceattach','surfacepath','attach','贴附','附着']],
 ['construct.void.clearance',['clearance','cutout','净空','切口']],
];
function inScope(id,root){return breadcrumbs(id).some(crumb=>crumb.id===root);}
function search(query,root,limit){
 const q=positiveIntent(query),tokens=q.match(/[a-z0-9_]+/g)||[],ranked=[],preferred=new Map(rankDecisions(query).matches.map(m=>[m.card.node,m.score]));
  if(!q)return {total:0,matches:[]};
 for(const item of nodes.values()){
  if(item.id==='root'||!inScope(item.id,root)||preferred.size&&!preferred.has(item.id))continue;
  const id=normal(item.id),text=normal([item.title,item.summary,item.when,...item.terms,...(item.contracts||[]).map(c=>c.args.query)].join(' '));
  let score=id===q?80:id.startsWith(q)?30:0;
  if(q&&text.includes(q))score+=12;
   if(preferred.has(item.id))score+=100+preferred.get(item.id);
  for(const token of tokens)if(token.length>1&&text.includes(token))score+=2;
  for(const term of item.terms)if(q.includes(normal(term)))score+=5;
  for(const [target,terms]of aliases)if(target===item.id)for(const term of terms)if(q.includes(term))score+=8;
  if(score>0){if(!item.children.length)score+=1;ranked.push({item,score});}
 }
 ranked.sort((a,b)=>b.score-a.score||a.item.id.localeCompare(b.item.id,'en'));
 return {total:ranked.length,matches:ranked.slice(0,limit).map(({item})=>({...entry(item.id),path:breadcrumbs(item.id)}))};
}
function invalid(message){return {ok:false,schemaVersion:SCHEMA_VERSION,code:'invalid_request',message,next:[expand('root')]};}
/** One direct level, or bounded keyword paths. No recursive tree or contract dump. */
for(const card of capabilityDecisions){if(!nodes.has(card.node))leaf(card.node,card.parent,card.title,card.summary,card.when,[],card.code,card.evidence,[card.avoid]);const item=nodes.get(card.node);Object.assign(item,{title:card.title,summary:card.summary,when:card.when,terms:[...new Set([...item.terms,...card.terms])],code:card.code,requiredEvidence:card.evidence,validityScope:[card.avoid]});const old=item.contracts;item.contracts=[card.primary,...card.details,...old.filter(c=>![card.primary,...card.details].some(n=>JSON.stringify(n)===JSON.stringify(c)))];}
export function navigateCapabilities(options={}){
 if(!options||typeof options!=='object'||Array.isArray(options))return invalid('参数必须为对象。');
 const {node='root',query,limit=4}=options;
 if(typeof node!=='string'||node.length>128||!node.trim())return invalid('node为1..128字符的稳定节点ID。');
 if(query!==undefined&&(typeof query!=='string'||query.length>256))return invalid('query最多256字符。');
 if(!Number.isSafeInteger(limit)||limit<1||limit>MAX_SEARCH)return invalid('limit为1..6整数，只控制搜索路径数。');
 const id=node.trim(),item=nodes.get(id),q=query?.trim()||'';
 if(!item){
  const found=search(q||id,'root',limit);
  return clone({ok:false,schemaVersion:SCHEMA_VERSION,code:'unknown_node',requestedNode:id,node:describe(nodes.get('root')),children:[],actions:[],matches:found.matches,suggestions:found.total?[]:nodes.get('root').children.map(entry),omitted:{matches:Math.max(0,found.total-found.matches.length)},next:found.matches.length?found.matches.map(m=>m.expand):[expand('root')],maxCharacters:MAX_CHARACTERS});
 }
 const result={ok:true,schemaVersion:SCHEMA_VERSION,node:describe(item),children:[],actions:[],links:[],omitted:{descendants:descendantCount(id),contractDetails:0},next:[],maxCharacters:MAX_CHARACTERS};
 if(q){
  const found=search(q,id,limit);Object.assign(result,{query:q,searchMethod:'keyword-alias',matches:found.matches,total:found.total});
  result.omitted.matches=found.total-found.matches.length;result.next=found.matches.map(m=>m.expand);result.recommendation=recommendCapability({intent:q,doc:options.contextDoc||null,id:options.id||null,radius:options.radius});if(result.recommendation.primary&&!result.recommendation.requiresChoice)result.next=[result.recommendation.next];
  if(!found.total&&!result.recommendation.primary){result.suggestions=(item.children.length?item.children:nodes.get('root').children).map(entry);result.next=[expand(id)];}
 }else if(item.children.length){result.children=item.children.map(entry);result.omitted.descendants-=item.children.length;result.next=result.children.map(child=>child.expand);}
 else{result.actions=contractActions(item);const card=decisionByNode(item.id);if(card)result.recommendation=recommendCapability({intent:card.title,node:id,doc:options.contextDoc||null,id:options.id||null,radius:options.radius});result.links=item.links.map(target=>({...entry(target),path:breadcrumbs(target)}));result.example=exampleFor(item);result.requiredEvidence=item.requiredEvidence;result.validityScope=item.validityScope;result.omitted.contractDetails=result.actions.length;result.next=result.actions.map(a=>a.contract);}
 if(JSON.stringify(result).length>MAX_CHARACTERS)throw new Error('capability navigation exceeds declared JSON budget');
 return clone(result);
}
export function capabilityPathsForContract(query){return [...nodes.values()].filter(item=>item.contracts?.some(contract=>contract.args.topic==='api'&&contract.args.query===query)).map(item=>item.id);}
export const capabilityTreeLimits=Object.freeze({maxChildren:MAX_CHILDREN,maxSearch:MAX_SEARCH,maxCharacters:MAX_CHARACTERS});
