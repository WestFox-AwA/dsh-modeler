import {auditDoc} from './audit.js';
import {findAnomalies} from './probe.js';
import {verifySpec} from './spec.js';
import {evaluateDoc,KERNEL_VERSION} from './kernel.js';

const stable=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]))):v;
export function geometryVerdict(source,{findings=false,clientAgeMs=null}={}) {
 const doc=evaluateDoc(source);const audit=auditDoc(doc).summary;const spec=verifySpec(source);
 const materials=new Map();
 for(const o of doc.objects){const sig=JSON.stringify(stable(o.material||{}));const g=materials.get(sig)||{material:o.material,objects:0,ids:[]};g.objects++;g.ids.push(o.sourceId||o.id);materials.set(sig,g);}
 const groups=[...materials.values()];const objectCount=doc.objects.length;
 const verdict={
  kernelVersion:KERNEL_VERSION,
  audit:{openObjects:audit.openObjects,invertedObjects:audit.invertedObjects,windingConflicts:audit.windingConflicts,
   degenerateTriangles:audit.degenerateTriangles,triangles:audit.triangles,
   ok:audit.openObjects===0&&audit.invertedObjects===0,
   scope:'已求值网格的封闭/整体朝向计数，不等于流形性、装配意图或造型质量验收'},
  spec:spec.declared?{declared:true,passed:spec.passed,failed:spec.summary.failed,failures:(spec.failures||[]).slice(0,6).map(c=>({label:c.label,deltaMm:c.deltaMm})),scope:'仅声明的数值条件'}:{declared:false,passed:null},
  scene:{objects:objectCount,rootObjects:source.objects.length,materials:groups.length,triangles:audit.triangles,
   mergeAfter:groups.length,mergeEstimateScope:'仅完整材质分组下界；实际还须检查编辑/运动/显隐边界，不表示已合并绘制',
   mergePlan:groups.filter(g=>g.objects>1).slice(0,8).map(g=>({material:g.material,objects:g.objects,ids:g.ids.slice(0,12)})),
   advice:objectCount>48?'建议按完整材质与编辑/运动边界保留子件地合并/组织组合件或渲染批次；不要删除零件。保留语义子件、生成参数和修改器，不把色号相同当成材质相同。':null},
  transport:{clientOnline:typeof clientAgeMs==='number'&&clientAgeMs>=0&&clientAgeMs<4000},
  appearance:{verified:false,captured:false,reviewed:false,status:'not-reviewed',reason:'在线只表示可通信；外观判断须另取绑定内容版本的实际图像与针对性评价'},
  quality:{assessed:false,reason:'面数、对象数、几何告警和数值规格不能独立评价造型'},
 };
 if(findings){const p=findAnomalies(doc);verdict.findings={defects:p.summary.defects,ambiguous:p.summary.ambiguous,byCode:p.summary.byCode,
  top:p.findings.slice(0,6).map(f=>({code:f.code,severity:f.severity,objectId:f.objectId,objectName:f.objectName,componentIndex:f.componentIndex,message:f.message}))};
  const sizes=(p.components||[]).map(c=>c.triangles).sort((a,b)=>a-b);
  verdict.detail={components:sizes.length,objects:objectCount,componentsPerObject:objectCount?+(sizes.length/objectCount).toFixed(2):null,
   medianComponentTriangles:sizes.length?sizes[Math.floor(sizes.length/2)]:0,
   smallComponentShare:sizes.length?+(sizes.filter(n=>n<=32).length/sizes.length).toFixed(2):null,
   note:'仅几何分量/打包统计；改变合组方式即可改变比值，不能据此评价精细程度'};
 }
 return verdict;
}
