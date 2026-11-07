export function diagnosticPage(result,args={}){
 const offset=args.offset??0,limit=args.limit??12;if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>64)throw Object.assign(Error('诊断分页offset需非负整数，limit需1..64'),{code:'invalid_page',detail:{field:'offset/limit'}});
 const out={...result},pages={};let more=false;for(const[k,v]of Object.entries(result)){if(!Array.isArray(v))continue;const total=k==='findings'?result.summary?.findings??v.length:result.counts?.[k]??v.length;out[k]=v.slice(offset,offset+limit);pages[k]={offset,returned:out[k].length,total,complete:offset+limit>=total};more||=!pages[k].complete;}
 out.pages=pages;out.complete=!more;if(more)out.next={tool:'modeler_probe',args:{...args,offset:offset+limit,limit}};return out;
}
