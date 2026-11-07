import {AsyncLocalStorage} from 'node:async_hooks';

const context=new AsyncLocalStorage();
export function validateSessionId(value){
 if(typeof value!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,159}$/.test(value))throw Object.assign(new Error('需要明确的聊天sessionId；从当前会话工具调用自动取得，界面请选择会话。'),{code:'session_required'});
 return value;
}
export function modelScope(){const scope=context.getStore();if(!scope)throw Object.assign(new Error('当前建模操作缺少会话/资源作用域'),{code:'session_required'});return scope;}
export function executeInModelScope(scope,operation){return context.run(scope,operation);}
export function executionSession(exec,agents){
 // Framework Agent.id and Session.id are the same identity. Never accept a model
 // argument as a replacement for the actual dispatching Agent.
 const agent=exec?.agent||agents?.currentInitiator?.();return validateSessionId(agent?.id);
}
export function lazyService(resolve){
 return new Proxy({}, {get(_target,key){const service=resolve();const value=service[key];return typeof value==='function'?value.bind(service):value;}});
}
