import {assessMaterialTask} from './src/host/material-task.js';
import {createMaterialReviewStore} from './src/host/material-review.js';
import {createMaterialTaskOperations} from './src/host/material-task-operations.js';
import {createMaterialOperations} from './src/host/material-operations.js';
import {createMaterialAssets} from './src/host/material-assets.js';
import {transactionalService} from './src/host/transaction-service.js';
import {modelReceipt} from './src/host/agent-receipt.js';
import {readScenePage} from './src/host/scene-read.js';
import {diagnosticPage} from './src/host/probe-page.js';
import {evaluationSnapshot} from './src/host/snapshot-view.js';
import {createNativeBackend} from './src/host/native-backend.js';
import {createNativeOperations} from './src/host/native-operations.js';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { generateShowpiece, templateCatalog, buildSpec } from './src/host/generate.js';
import { runModelerScript, SAMPLE_SCRIPT } from './src/host/script.js';
import { analyzeDoc, diffDocs } from './src/host/analyze.js';
import { rasterDoc, diffRaster, formatTextPreview, DEFAULT_TEXT_VIEWS, TEXT_CHANNELS } from './src/host/raster.js';
import { renderDoc as renderDocPng } from './src/host/softrender.js';
import { auditDoc, groupBy } from './src/host/audit.js';
import { auditAssembly, auditVisibility, auditFraming, robustBounds } from './src/host/assembly.js';
import { auditCoplanar } from './src/host/intersect.js';
import { decodePng, compareImages, compareColour } from './src/host/png.js';
import { verifySpec, mirrorAudit } from './src/host/spec.js';
import { geometryVerdict } from './src/host/verdict.js';
import { normalizeDoc, contentHash } from './src/host/workspace.js';
import {createResources} from './src/host/resources.js';
import {modelScope,executeInModelScope,executionSession,validateSessionId,lazyService} from './src/host/model-scope.js';
import { createModelerOperations } from './src/host/operations.js';
import { createEvidenceStore } from './src/host/evidence.js';
import {createRenderWorker} from './src/host/render-worker.js';
import {readBuildInfo} from './src/host/build-info.js';
import { createProbeLog, summariseArgs, summariseResult } from './src/host/probe-log.js';
import {toolValue} from './src/host/tool-value.js';
import {sourceFailure} from './src/host/source-store.js';
import {createModelViews,assertViewAction} from './src/host/view-state.js';
import { evaluateDoc, KERNEL_VERSION } from './src/host/kernel.js';
import {buildDeliveryPackage} from './src/host/delivery-package.js';
import {publishDeliveryPackage} from './src/host/delivery-store.js';
import { compareToReference } from './src/host/reference.js';
import { findAnomalies, isolateComponent, diffComponents, analyseComponents, probeInContext } from './src/host/probe.js';
import { getModelerGuide, guideRef, MODELER_GUIDE_PROMPT } from './src/host/guide-system.js';
import { OBSERVATION_MODES, DISPLAY_MODES } from './src/host/observation-stage.js';
import {CAPTURE_PURPOSES} from './src/host/observation-purpose.js';

export const name = '@local/dsh-modeler';
export const inject = ['tools'];

// Every surface (MCP tool, TCP op) goes through here, so a change cannot land in
// one path and be forgotten in the other - which is exactly what happened when the
// script op briefly lacked the verdict.
function verdictFor(doc, opts={}) { return geometryVerdict(doc, opts); }

const VERSION = 1;
const STORE = path.join(os.homedir(), '.dsh', 'modeler-scene.json');
const KINDS = new Set(['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'custom']);
// the scripts that make up the model library live next to this module
const PROJECT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'live');
// Producer version is self-description only; the consumer gates on delivery schemaVersion.
const MODELER_VERSION = (() => { try { return JSON.parse(fs.readFileSync(path.resolve(PROJECT_DIR, '..', 'package.json'), 'utf8')).version || null } catch { return null } })();

const clone = (v) => JSON.parse(JSON.stringify(v));
const safe = (v) => toolValue(v);
function writeBase(args={}){
 if(args.expectedRevision===undefined&&args.expectedHash===undefined)throw Object.assign(new Error('写入需要 expectedRevision 或 expectedHash；先 modeler_workbench status 取得基线'),{code:'missing_base'});
 if(args.assetId!==undefined){const scope=modelScope();const service=scope.service||(scope.assetId?scope.resources.forAsset(scope.assetId):scope.resources.getSession(scope.sessionId));if(args.assetId!==service.metadata().assetId)throw Object.assign(new Error('会话当前资源已改变，拒绝旧资源编辑'),{code:'binding_conflict'});}
 return {expectedRevision:args.expectedRevision,expectedHash:args.expectedHash};
}


function initialDoc() {
  const doc = { version: 1, nextId: 1, objects: [] };
  const add = (kind, name, position, color, metalness = 0.1, roughness = 0.5) => {
    doc.objects.push({
      id: 'obj_' + doc.nextId++,
      name,
      kind,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: { color, metalness, roughness, opacity: 1 },
    });
  };
  add('box', 'Blockout Cube', [0, 0.5, 0], '#7aa2f7');
  add('sphere', 'Metal Sphere', [1.7, 0.62, 0], '#e0af68', 0.6, 0.22);
  add('cylinder', 'Column', [-1.7, 0.6, 0], '#9ece6a');
  add('torus', 'Ring', [0, 0.72, -1.8], '#bb9af7');
  return doc;
}

function vec(v, fallback) {
  if (!Array.isArray(v) || v.length !== 3 || !v.every((n) => Number.isFinite(Number(n)))) return [...fallback];
  return v.map(Number);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, Number(v)));
}

function validGeometryData(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.positions)) return null;
  if (input.positions.length < 9 || input.positions.length % 9 !== 0 || input.positions.length > 3_000_000) return null;
  if (!input.positions.every((n) => Number.isFinite(Number(n)))) return null;
  return { positions: input.positions.map(Number) };
}

function validateDoc(input) {
  if (!input || typeof input !== 'object' || input.version !== VERSION || !Array.isArray(input.objects)) {
    throw new Error('场景必须是 {version:1, objects:[...]}');
  }
  const ids = new Set();
  const objects = input.objects.map((o) => {
    if (!o || typeof o !== 'object' || typeof o.id !== 'string' || !o.id) throw new Error('对象缺少 id');
    if (ids.has(o.id)) throw new Error('重复对象 id: ' + o.id);
    ids.add(o.id);
    if (!KINDS.has(o.kind)) throw new Error('未知 kind: ' + String(o.kind));
    return {
      id: o.id,
      name: typeof o.name === 'string' && o.name.trim() ? o.name.slice(0, 80) : o.kind,
      kind: o.kind,
      position: vec(o.position, [0, 0.5, 0]),
      rotation: vec(o.rotation, [0, 0, 0]),
      scale: vec(o.scale, [1, 1, 1]).map((n) => Math.max(0.001, n)),
      params: o.params && typeof o.params === 'object' ? clone(o.params) : {},
      modifiers: Array.isArray(o.modifiers) ? o.modifiers.filter((m) => m && ['subsurf','mirror','array','solidify'].includes(m.type)).slice(0,8) : [],
      shading: o.shading === 'flat' ? 'flat' : 'smooth',
      geometryData: validGeometryData(o.geometryData),
      material: {
        color: /^#[0-9a-f]{6}$/i.test(o.material?.color || '') ? o.material.color : '#c0c7d4',
        metalness: clamp(o.material?.metalness ?? 0.1, 0, 1),
        roughness: clamp(o.material?.roughness ?? 0.5, 0, 1),
        opacity: clamp(o.material?.opacity ?? 1, 0.05, 1),
        emissive: /^#[0-9a-f]{6}$/i.test(o.material?.emissive || '') ? o.material.emissive : '#000000',
        emissiveIntensity: clamp(o.material?.emissiveIntensity ?? 0, 0, 20),
        clearcoat: Boolean(o.material?.clearcoat),
        doubleSided: Boolean(o.material?.doubleSided),
      },
    };
  });
  return {
    version: 1,
    nextId: Number.isSafeInteger(input.nextId) && input.nextId > 0 ? input.nextId : objects.length + 1,
    objects,
    meta: input.meta && typeof input.meta === 'object' ? clone(input.meta) : null,
  };
}


const renderJson = (_args, value) => [
  { type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) },
];
const output = { schema: { type: 'object', additionalProperties: true }, render: renderJson };

const renderClientState=new Proxy({}, {get:(_t,key)=>modelScope().clientState[key],set:(_t,key,value)=>{modelScope().clientState[key]=value;return true;}});

function createRenderBridge() {
  let pending = null;
  const waiters = new Set();
  const notify = () => { for (const w of waiters) w(); waiters.clear(); };
  return {
    close(){if(pending){clearTimeout(pending.timer);pending.reject(new Error('renderer context disposed'));pending=null;}for(const w of waiters)w();waiters.clear();},
    request(opts) {
      return new Promise((resolve, reject) => {
        if (pending) return reject(new Error('renderer busy'));
        const timer = setTimeout(() => { pending = null; reject(new Error('render timeout: no current-version DSH renderer answered')); }, 30000);
        pending = { ...opts, resolve, reject, timer, id: String(Date.now()) + Math.random().toString(16).slice(2) };
        notify();
      });
    },
    wait(ms = 500) {
      if (pending) return Promise.resolve(pending);
      return new Promise((resolve) => {
        const timer = setTimeout(() => { waiters.delete(wake); resolve(null); }, ms);
        const wake = () => { clearTimeout(timer); waiters.delete(wake); resolve(pending); };
        waiters.add(wake);
      });
    },
    resolve(id, data) {
      if (!pending || String(pending.id) !== String(id)) return false;
      clearTimeout(pending.timer);
      const p = pending; pending = null;
      if(!data || data.assetId!==p.assetId || data.contentHash!==p.contentHash || data.revision!==p.revision){p.reject(new Error('renderer returned a different asset version'));return false;}
      p.resolve(data); return true;
    },
  };
}

function startLiveBridge(service, renderBridge, operations, runScoped) {
  let viewCache = { key: '', payload: null };
  const port = Number(process.env.MODELER_BRIDGE_PORT || 43119);
  const server = net.createServer((socket) => {
    socket.setNoDelay(true);
    let buffer = '';
    socket.on('error', () => {});
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let i;
      while ((i = buffer.indexOf(String.fromCharCode(10))) >= 0) {
        const line = buffer.slice(0, i); buffer = buffer.slice(i + 1);
        if (!line.trim()) continue;
        const t0 = performance.now();
        let msg = null;
        try { msg = JSON.parse(line); } catch (_) { socket.write(JSON.stringify({ ok: false, error: 'bad json' }) + String.fromCharCode(10)); continue; }
        (async () => {
          try {
            const explicit=msg.sessionId;
            if(!explicit&&!msg.assetId&&msg.op!=='ping')throw Object.assign(new Error('桥接请求需要sessionId或assetId；不再使用全局当前模型'),{code:'session_required'});
            return await runScoped(explicit||'session-resource-browser',async()=>{
            const id = msg.id ?? null;
            let payload;
            if (msg.op === 'ping') payload = { pong: true };
            else if (msg.op === 'status') payload = { bridge: '43119', clientVersion: renderClientState.version, clientSeenMs: renderClientState.lastSeen ? Date.now() - renderClientState.lastSeen : null, renders: renderClientState.renders, camera: renderClientState.camera || null };
            else if (msg.op === 'workbench') {
              // Bridge protocol fields stay out of the command payload; everything
              // else (code/project/guards/operations…) becomes that command's args.
              const { op: _op, args: _args, id: _msgId, ...flat } = msg;
              payload = await operations.execute(msg.action || 'status', { ...flat, ...(msg.args || {}) });
            }
            else if (msg.op === 'get') { payload = service.snapshot(); }
            else if (msg.op === 'views') {
              const snap = service.snapshot();
              const wantedViews=msg.views===undefined?(msg.camera?['custom']:['front']):(Array.isArray(msg.views)?msg.views:String(msg.views).split(',').map(v=>v.trim()).filter(Boolean));
               const options={views:wantedViews,camera:msg.camera,cols:msg.cols??48,rows:msg.rows??22,samples:msg.samples,cellAspect:msg.cellAspect,faces:msg.faces};
               const key=JSON.stringify({assetId:snap.assetId,hash:snap.contentHash,options,shade:!!msg.shade,legend:!!msg.legend});
               if(viewCache.key===key)payload=viewCache.payload;
               else{
                 const r=rasterDoc(snap.doc,options),views={};
                 for(const [name,v] of Object.entries(r.views))views[name]={part:v.part,shade:msg.shade?v.shade:undefined,coverage:v.coverage,symmetry:v.symmetry,camera:v.camera||null,projection:v.projection};
                 payload={revision:snap.revision,contentHash:snap.contentHash,assetId:snap.assetId,metrics:r.metrics,legend:msg.legend?r.legend:undefined,views};viewCache={key,payload};
               }
             } else if (msg.op === 'preview') {
              // fast text preview: no PNG, no visibility sweep, no scene mutation
              const code = msg.code ?? (msg.path ? fs.readFileSync(msg.path, 'utf8') : null);
              const doc = code ? runModelerScript(code) : service.snapshot().doc;
              const raster = rasterDoc(doc, {
                views: msg.views || undefined,camera:msg.camera,
                cols: msg.cols, rows: msg.rows, samples: msg.samples,
                cellAspect: msg.cellAspect, faces: msg.faces,
              });
              const channel = msg.channel || 'both';
              payload = {
                ok: true,
                revision: service.snapshot().revision,
                temporary: Boolean(code),
                metrics: raster.metrics,
                legend: raster.legend,
                objectLegend: raster.objectLegend,
                warnings: raster.warnings,
                diagnostics: Object.fromEntries(Object.entries(raster.views).map(([k, v]) => [k, v.diagnostics])),
                text: formatTextPreview(raster, { channel, maxChars: msg.maxChars }),
              };
            } else if (msg.op === 'reference') {
              const code = msg.code ?? (msg.path ? fs.readFileSync(msg.path, 'utf8') : null);
              const doc = code ? runModelerScript(code) : service.snapshot().doc;
              if (!msg.ref) throw new Error('reference 需要 --ref <图片路径>');
              const refPath = path.isAbsolute(msg.ref) ? msg.ref : path.resolve(msg.ref);
              const report = compareToReference(doc, refPath, { view: msg.view || 'front', threshold: msg.threshold });
              payload = {
                ok: true,
                view: report.view,
                anchor: report.anchor,
                reference: report.reference,
                model: report.model,
                comparison: report.comparison,
                map: report.map,
              };
            } else if (msg.op === 'open') {
              payload = await operations.execute('open',{...msg,project:msg.project||msg.file,expectedRevision:msg.expectedRevision});
            } else if (msg.op === 'spec') {
              const code = msg.code ?? (msg.path ? fs.readFileSync(msg.path, 'utf8') : null);
              const doc = code ? runModelerScript(code) : service.snapshot().doc;
              const declared = typeof msg.spec === 'string' ? JSON.parse(msg.spec) : msg.spec;
              const target = declared ? { ...doc, meta: { ...(doc.meta || {}), spec: declared } } : doc;
              payload = { ok: true, ...verifySpec(target, { tolerance: msg.tolerance }) };
            } else if (msg.op === 'parity') {
              // The panel is the truth about appearance. This renders the same
              // document from the same eye in both paths and reports how far the
              // software preview is from what the panel actually shows.
              const snap = service.snapshot();
              if(msg.code)throw new Error('临时脚本不能与客户端当前资产混合对拍；请先提交或使用preview');
              const doc=snap.doc;
              const width = msg.width || 640, height = msg.height || 480;
              const b = analyzeDoc(doc).summary.bounds || { min: [0, 0, 0], max: [0, 0, 0] };
              const centre = [0, 1, 2].map((k) => (b.min[k] + b.max[k]) / 2);
              const radius = Math.max(0.5, Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) * 0.5);
              const dir = [0.78, 0.36, 0.86];
              const len = Math.hypot(...dir);
              const eye = msg.eye || centre.map((c, k) => c + (dir[k] / len) * radius * 2.6);
              const target = msg.target || centre;
              const fov = msg.fov || 45;
              const recent = renderClientState.lastSeen && Date.now() - renderClientState.lastSeen < 4000;
              if (!recent) {
                payload = { ok: false, code: 'no-client', error: '面板没有心跳：外观真值不可用，拒绝用软件路径代替' };
              } else {
                const stamp = Date.now();
                let clientPath;
                const softPath = path.join(os.homedir(), '.dsh', 'modeler-parity-soft-' + stamp + '.png');
                const captured=await operations.execute('capture',{width,height,view:'iso',mode:'material',eye,target,fov,expectedHash:snap.contentHash});
                 clientPath=captured.evidence.path;
                 renderDocPng(doc, { width, height, fov, eye, target, viewKey: 'parity', path: softPath, ssaa: 1, noGrid: true });
                const a = decodePng(fs.readFileSync(clientPath));
                const c2 = decodePng(fs.readFileSync(softPath));
                const cmp = compareImages(a, c2, { thresholdA: msg.thresholdA ?? 24, thresholdB: msg.thresholdB ?? 10, tolerance: msg.tolerance ?? 1 });
                const colour = compareColour(a, c2, { cols: 4, rows: 3 });
                // a transparent material is a window in the panel and a surface here:
                // the silhouettes are not comparable, and that is reported rather than
                // scored
                const hasTransparency = (evaluateDoc(doc).objects || []).some((o) => Number(o.material?.opacity ?? 1) < 1);
                const minBoundary = Number(msg.minBoundary ?? 0.97);
                const supported = !hasTransparency;
                const passed = supported ? cmp.boundaryAgreement >= minBoundary : null;
                payload = {
                  ok: true,
                  supported,
                  passed,
                  thresholds: { boundaryAgreement: minBoundary, tolerance: cmp.tolerance },
                  comparison: cmp,
                  colour: {
                    ...colour,
                    diagnostic: true,
                    note: 'colour is reported, never passed: the panel lights the scene with its own rig, and measured hue agreement is 50-62 %, which is why colour must be judged in the panel',
                  },
                  camera: { eye, target, fov, width, height },
                  clientPng: clientPath, softwarePng: softPath,
                  note: supported
                    ? 'the claim is silhouette agreement within one pixel; colour and shading differ by design'
                    : 'transparent material: panel is see-through, software path draws a surface - not comparable',
                };
              }
            } else if (msg.op === 'probe') {
              const code = msg.code ?? (msg.path ? fs.readFileSync(msg.path, 'utf8') : null);
              const doc = code ? runModelerScript(code) : service.snapshot().doc;
              if (msg.object && msg.inContext) {
                const ctx = probeInContext(doc, { objectId: msg.object, componentIndex: msg.component ?? 0 }, {
                  cols: msg.cols, rows: msg.rows, views: msg.views,
                });
                payload = {
                  ok: true, inContext: true,
                  object: ctx.objectName, componentIndex: ctx.componentIndex,
                  triangles: ctx.triangles, centre: ctx.centre, size: ctx.size, bounds: ctx.bounds,
                  legend: ctx.legend,
                  text: formatTextPreview(ctx.preview, { channel: msg.channel || 'color' }),
                  metrics: ctx.preview.metrics,
                };
              } else if (msg.object) {
                // isolate one connected component: the local-view equivalent
                const isolated = isolateComponent(doc, { objectId: msg.object, componentIndex: msg.component ?? 0 }, {
                  cols: msg.cols, rows: msg.rows, views: msg.views,
                });
                payload = {
                  ok: true,
                  object: isolated.objectName, componentIndex: isolated.componentIndex,
                  triangles: isolated.triangles, closed: isolated.closed, outward: isolated.outward,
                  volume: isolated.volume, boundaryEdges: isolated.boundaryEdges,
                  windingConflicts: isolated.windingConflicts, size: isolated.size,
                  text: msg.text === false ? undefined : formatTextPreview(isolated.preview, { channel: msg.channel || 'both' }),
                  metrics: isolated.preview.metrics,
                };
              } else {
                payload = { ok: true, ...findAnomalies(doc, { limit: msg.limit }) };
              }
            } else if (msg.op === 'diffparts') {
              const read = (spec) => spec ? runModelerScript(fs.readFileSync(spec, 'utf8')) : service.snapshot().doc;
              const before = read(msg.a);
              const after = msg.b ? read(msg.b) : (msg.code ? runModelerScript(msg.code) : service.snapshot().doc);
              payload = { ok: true, ...diffComponents(before, after) };
            } else if (msg.op === 'check') {
              const code = msg.code ?? (msg.path ? fs.readFileSync(msg.path, 'utf8') : null);
              if (!code) throw new Error('check needs code or path');
              const tBuild = performance.now();
              const doc = runModelerScript(code);
              const buildMs = performance.now() - tBuild;
              const result={doc,revision:null,assetId:null,contentHash:contentHash(normalizeDoc(doc,{evaluate:false}))};
              const analysis = analyzeDoc(result.doc);
              const r = rasterDoc(result.doc, { cols: msg.cols || 44, rows: msg.rows || 20, views: ['front', 'side'] });
              const b = analysis.summary.bounds || { size: [0,0,0], min: [0,0,0] };
              const [L,H,W] = [b.size[2], b.size[1], b.size[0]];
              // geometry health: an inside-out or open shell renders as a
              // shell you can see through, so it must fail the gate.
              const audit = auditDoc(result.doc);
              const auditGroups = groupBy(audit).slice(0, 8);
              // length and height from the trimmed extent: antennas and masts
              // must not decide whether a vehicle is proportional
              const rb = robustBounds(result.doc);
              const rH = rb.size[1], rL = rb.size[2], rW = rb.size[0];
              const pL = rW > 0 ? rL / rW : 0;
              const pH = rW > 0 ? rH / rW : 0;
              const spec = verifySpec(result.doc);
              const checks = {
                grounded: b.min[1] >= -0.02,
                // a shell that is not watertight renders as a window into its own interior:
                // both failures, not just the inverted one, must close the gate
                closed: audit.summary.invertedObjects === 0 && audit.summary.openObjects === 0,
                proportion: spec.declared ? spec.passed : null,
                symmetry: null,
                coverage: null,
                noWarnings: analysis.warnings.length === 0,
                // a declared spec is the only meaningful proportion check; without
                // one this stays null instead of inventing a pass
                spec: spec.declared ? spec.passed : null,
              };
              // The 26-direction sweep and the framing pass cost seconds on a large
              // model; one real session hit a 21 s timeout here and gave up on the
              // official check. They are opt-in now (`--deep`), and the fast path
              // still reports the audit and the spec.
              const decay = { deep: msg.deep === true };
              try { decay.assembly = auditAssembly(result.doc).summary; } catch (e) { decay.assembly = { error: String(e.message) }; }
              if (msg.deep === true) {
                try {
                  const frame = await auditFraming(result.doc, { res: 300, path: path.join(os.homedir(), '.dsh', 'probe', 'frame.png') });
                  decay.framing = frame.summary;
                  decay.framingShare = frame.share.slice(0, 10);
                  decay.hiddenFromCamera = frame.hiddenByName;
                } catch (e) { decay.framing = { error: String(e.message) }; }
                try {
                  const cop = auditCoplanar(result.doc);
                  decay.coplanar = cop.summary;
                  decay.coplanarWorst = cop.pairs.slice(0, 6);
                } catch (e) { decay.coplanar = { error: String(e.message) }; }
                try {
                  const vis = await auditVisibility(result.doc, { res: 240, path: path.join(os.homedir(), '.dsh', 'probe', 'vis.png') });
                  decay.visibility = vis.summary; decay.invisibleByName = vis.byName;
                } catch (e) { decay.visibility = { error: String(e.message) }; }
              }
              const scored = Object.entries(checks).filter(([, v]) => v !== null);
              const score = null; // measurements are not an aesthetic score
              let image = null;
              let cameraSource = 'none';
              let cameraInfo = null;
              if (msg.render !== false) {
                const target = path.join(os.homedir(), '.dsh', 'modeler-check-' + Date.now() + '.png');
                // default: render from the live client camera, so a screenshot from the
                // panel and a software render are directly comparable
                const wantCam = msg.camFromClient === true || msg.camFromClient === 'true';
                const cam = wantCam && renderClientState.camera ? renderClientState.camera : null;
                const info = renderDocPng(result.doc, {
                  width: msg.width || 1200, height: msg.height || 900, path: target,
                  fit: msg.fit || (msg.mode === 'contact' ? 1.85 : 1.5),
                  mode: msg.mode === 'contact' ? 'contact' : 'hero', ssaa: msg.ssaa,
                  ...(cam ? { eye: cam.eye, target: cam.target, fov: cam.fov } : {}),
                });
                image = info.path;
                // never leave the viewer guessing which camera produced the shot
                cameraSource = cam ? 'client' : (wantCam ? 'preset (client camera unavailable)' : 'preset');
                cameraInfo = { eye: info.eye, center: info.center, fov: info.fov };
              }
              payload = {
                revision: result.revision,contentHash:result.contentHash,assetId:result.assetId,
                buildMs: Number(buildMs.toFixed(2)),
                score,qualityAssessed:false,temporary:true,
                checks,
                spec,
                summary: analysis.summary,
                warnings: analysis.warnings.slice(0, 8),
                audit: { summary: audit.summary, groups: auditGroups },
                part: r.views.front?.part || null,
                image,
                cameraSource,
                camera: cameraInfo,
                assembly: decay.assembly,
                visibility: decay.visibility,
                coplanar: decay.coplanar,
                coplanarWorst: decay.coplanarWorst,
                framing: decay.framing,
                framingShare: decay.framingShare,
                hiddenFromCamera: decay.hiddenFromCamera,
                metrics: {
                  lengthOverWidth: +pL.toFixed(2), heightOverWidth: +pH.toFixed(2),
                  trim: rb.trim, rawHeight: +H.toFixed(2), robustHeight: +rH.toFixed(2),
                  limits:null,meaning:'比例数值仅作观测；容差来自声明的spec，不使用普遍车型门槛',
                },
              };
            } else if (msg.op === 'score') {
              const snap=service.snapshot();payload={revision:snap.revision,contentHash:snap.contentHash,score:null,reason:'造型质量不由统一分数判定',verdict:verdictFor(snap.doc)};
            } else if (msg.op === 'batch') {
              const scripts = Array.isArray(msg.scripts) ? msg.scripts.slice(0, 24) : [];
              if (!scripts.length) throw new Error('batch needs scripts[]');
              const views = String(msg.views || 'front').split(',').map((v) => v.trim()).filter(Boolean);
              const results = [];
              const docs = [];
              for (const item of scripts) {
                const code = item.code ?? (item.path ? fs.readFileSync(item.path, 'utf8') : '');
                const doc = runModelerScript(code);
                docs.push(doc);
                const r = rasterDoc(doc, { cols: msg.cols || 40, rows: 18, views });
                const a = analyzeDoc(doc);
                results.push({
                  name: String(item.name || 'variant').slice(0, 40),
                  triangles: a.summary.triangles,
                  bounds: a.summary.bounds ? a.summary.bounds.size : null,
                  coverage: r.views[views[0]]?.coverage ?? null,
                  symmetry: r.views.front?.symmetry ?? null,
                  warnings: a.warnings.length,
                  part: msg.chars ? (r.views[views[0]]?.part || null) : undefined,
                });
              }
              payload = { count: results.length, results };
              if (msg.apply) {
                const pick = Math.max(0, Math.min(results.length - 1, Number(msg.pick || 0)));
                const applied = await service.replace(docs[pick],writeBase(msg));
                payload.applied = { index: pick, name: results[pick].name, revision: applied.revision };
              }
            } else if (msg.op === 'metrics') {
              const snap = service.snapshot();
              const r = rasterDoc(snap.doc, { cols: 40, rows: 18 });
              payload = { revision: snap.revision, metrics: r.metrics, warnings: analyzeDoc(snap.doc).warnings };
            } else if (msg.op === 'setScript') {
              const code=msg.code??(msg.path?fs.readFileSync(msg.path,'utf8'):'');
              payload=await operations.execute('script',{...msg,code,expectedRevision:msg.expectedRevision});
            } else if (msg.op === 'setDoc') {
              const result = await service.replace(msg.doc,{...writeBase(msg),source:'edit',rebase:msg.rebase===true,discardOverrides:msg.discardOverrides===true});
              payload = { revision: result.revision, objects: result.doc.objects.length };
            } else if (msg.op === 'dump') {
              const snap = service.snapshot();
              const target = msg.path || 'preview/scene-data.js';
              fs.writeFileSync(target, 'window.__SCENE__ = ' + JSON.stringify(snap.doc) + ';' + String.fromCharCode(10));
              payload = { path: target, revision: snap.revision, objects: snap.doc.objects.length };
            } else if (msg.op === 'render') {
              const r=await operations.execute('capture',msg);payload={...r,image:r.evidence.path,path:r.evidence.path,source:'three-r160',cameraSource:'captured',camera:r.evidence.camera};
            } else throw new Error('unknown op ' + msg.op);
            socket.write(JSON.stringify({ id, ok: true, ...payload, ms: Number((performance.now() - t0).toFixed(3)) }) + String.fromCharCode(10));
            },{assetId:msg.assetId});
          } catch (e) {
            socket.write(JSON.stringify({id:msg.id??null,ok:false,error:String(e?.message||e),code:e.code||null,current:e.current?{assetId:e.current.assetId,revision:e.current.revision,contentHash:e.current.contentHash}:null})+String.fromCharCode(10));
          }
        })();
      }
    });
  });
  server.on('error', (e) => { try { console.error('[modeler] live bridge: ' + e.message); } catch (_) {} });
  server.listen(port, '127.0.0.1', () => {
    try { fs.writeFileSync(path.join(os.homedir(), '.dsh', 'modeler-bridge.json'), JSON.stringify({ port, pid: process.pid })); } catch (_) {}
  });
  return () => { try { server.close(); } catch (_) {} };
}

export function apply(ctx) {
  ctx.inject(['systemPrompt'],p=>{
    // One brief guide section owns the entry pointer and the material autoprep
    // essentials; there is no second material section.
    const text=typeof MODELER_GUIDE_PROMPT==='string'?MODELER_GUIDE_PROMPT.trim():'';
    if(text)p.systemPrompt?.section?.({name:'modeler:guide',order:1530,text});
  });
  const guide={get:id=>getModelerGuide({id}),ref:id=>guideRef(id)};
  const resources=createResources({directory:path.join(os.homedir(),'.dsh','modeler-resources'),legacyStorePath:STORE});
  const nativeBackend=createNativeBackend({root:path.join(os.homedir(),'.dsh','modeler-native')});
  const appearance=createMaterialAssets({directory:path.join(os.homedir(),'.dsh','modeler-materials','images'),backend:nativeBackend});
  const nativeOperations=createNativeOperations({backend:nativeBackend,resources,appearance,displayWorkerFile:path.resolve(PROJECT_DIR,'..','src','host','display-worker.js'),directory:path.join(os.homedir(),'.dsh','modeler-native-jobs')});
  const scopes=new Map(),evidences=new Map(),reviewStores=new Map();
  const materialReviews={list:args=>reviewFor(args.assetId).list(args),review:(args,doc)=>reviewFor(args.assetId).review(args,doc),validate:(args,doc)=>reviewFor(args.assetId).validate(args,doc)};
  function reviewFor(assetId){if(!/^[a-f0-9-]{36}$/.test(assetId||''))throw Error('Invalid review asset');let v=reviewStores.get(assetId);if(!v){v=createMaterialReviewStore({directory:path.join(os.homedir(),'.dsh','modeler-material-reviews',assetId),expectedBuildId:buildInfo.clientBuildId,evidenceLookup:(id)=>getEvidence().get(id)});reviewStores.set(assetId,v);}return v;}
  const views=createModelViews(resources);
  const buildInfo=readBuildInfo(path.resolve(PROJECT_DIR,'..'));
  const service=lazyService(()=>{
    const scope=modelScope();
    if(!scope.service){const raw=scope.assetId?resources.forAsset(scope.assetId):resources.getSession(scope.sessionId);scope.service=transactionalService(raw,nativeOperations);}
    return scope.service;
  });
  const renderBridge=lazyService(()=>modelScope().bridge);
  const snapshotOverrides=new WeakMap();
  const renderWorker=createRenderWorker({root:path.resolve(PROJECT_DIR,'..'),buildInfo,snapshot:request=>{const candidate=snapshotOverrides.get(request);if(candidate)return evaluationSnapshot(appearance.snapshot(candidate));const raw=resources.forAsset(request.assetId),identity=raw.metadata();return nativeOperations.displayJSON(raw).then(sceneJson=>({...identity,sceneJson}));}});
  const renderSnapshot=async(snapshot,request)=>{snapshotOverrides.set(request,snapshot);try{return await renderWorker.capture(request);}finally{snapshotOverrides.delete(request);}};
  const probe=createProbeLog({directory:path.join(os.homedir(),'.dsh','modeler-probe'),sessionLabel:'dsh-modeler'});
  const scopedProbe={record:entry=>{const scope=modelScope();probe.record({...entry,chatSessionId:scope.sessionId,callId:scope.execution?.callId,rootCallId:scope.execution?.rootCallId});},recordCode:code=>probe.recordCode(code),read:options=>probe.read({...options,chatSessionId:modelScope().sessionId}),review:options=>probe.review({...options,chatSessionId:modelScope().sessionId})};
  const getEvidence=()=>{
    const assetId=service.metadata().assetId;
    let evidence=evidences.get(assetId);if(!evidence){
      evidence=createEvidenceStore({directory:path.join(os.homedir(),'.dsh','modeler-evidence'),snapshot:()=>resources.forAsset(assetId).metadata(),expectedBuildId:buildInfo.clientBuildId,requestCapture:async request=>{
        if(request.source!=='viewport')return renderWorker.capture(request);
        const bridge=modelScope().bridge,frames=[];for(const frame of request.requests)frames.push(await bridge.request({...request,...frame,requests:undefined}));return {frames};
      }});evidences.set(assetId,evidence);while(evidences.size>64)evidences.delete(evidences.keys().next().value);
    }return evidence;
  };
  const evidence=lazyService(getEvidence);
  function stateFor(sessionId){
    let value=scopes.get(sessionId);if(!value){
      const clientState={lastSeen:0,version:0,renders:0},bridge=createRenderBridge();
      value={sessionId,clientState,bridge,operations:createModelerOperations(service,{projectDir:PROJECT_DIR,evidence,clientState,probe:scopedProbe,resourceContext:{resources,sessionId},sourceDirectory:path.join(os.homedir(),'.dsh','modeler-sources'),renderSnapshot,evidenceDirectory:path.join(os.homedir(),'.dsh','modeler-evidence'),buildInfo,renderControl:renderWorker,nativeControl:nativeOperations,guide})};
      value.materialTasks=createMaterialTaskOperations({service,engine:nativeOperations,evidence,reviews:materialReviews,directory:path.join(os.homedir(),'.dsh','modeler-material-deliveries'),imageUrl:r=>'/api/modeler/image?sessionId='+encodeURIComponent(modelScope().sessionId)+'&assetId='+encodeURIComponent(r.assetId)+'&key='+r.contentHash.slice(0,16)+'-'+r.id});
       value.materials=createMaterialOperations({service,engine:nativeOperations,assets:appearance,renderSnapshot,directory:path.join(os.homedir(),'.dsh','modeler-evidence'),taskOperations:value.materialTasks,guide});
       scopes.set(sessionId,value);
    }return value;
  }
  function runScoped(sessionId,fn,options={}){const sid=validateSessionId(sessionId),state=stateFor(sid);return executeInModelScope({...state,resources,...options,service:null},fn);}
  const deliveryActions=new Set(['assetId','expectedHash','expectedRevision']);
  const operations={async execute(action,args={}){
    const scope=modelScope();
    if(scope.viewId){
      const view=views.describe(scope.sessionId,scope.viewId);assertViewAction(view,action,args);
      if(action==='browse'){views.browse(scope.sessionId,scope.viewId,args.assetId);scope.assetId=args.assetId;scope.service=null;return {ok:true,...resources.forAsset(args.assetId).metadata(),view:views.describe(scope.sessionId,scope.viewId),changedWorkTarget:false};}
      if(action==='follow_work'){views.follow(scope.sessionId,scope.viewId);scope.assetId=undefined;scope.service=null;return {ok:true,view:views.describe(scope.sessionId,scope.viewId),changedWorkTarget:false};}
      if(action==='adopt_browse'){const adopted=views.adopt(scope.sessionId,scope.viewId,args);scope.assetId=undefined;scope.service=null;return {ok:true,...adopted.snapshot,view:adopted.view,changedWorkTarget:true};}
      if(action==='open')throw Object.assign(new Error('面板打开作品请用browse；改变任务目标请明确adopt_browse'),{code:'explicit_adoption_required'});
      if(action==='new'||action==='fork'){const result=await scope.operations.execute(action,args);views.follow(scope.sessionId,scope.viewId);scope.assetId=undefined;scope.service=null;return result;}
    }
    if(action==='snapshot')return {ok:true,...await service.displaySnapshot()};
     if(action==='delivery'){if(!args||typeof args!=='object'||Array.isArray(args))throw Object.assign(new Error('delivery 的 args 必须是对象'),{code:'invalid_argument'});for(const key of Object.keys(args))if(!deliveryActions.has(key))throw Object.assign(new Error('delivery 不接受字段 '+key+'；只接受 assetId/expectedHash/expectedRevision'),{code:'invalid_argument',detail:{field:key}});if(typeof args.assetId!=='string'||!args.assetId.trim()||args.assetId.length>200)throw Object.assign(new Error('delivery 需要非空 assetId 固定确切版本'),{code:'invalid_argument',detail:{field:'assetId'}});if(typeof args.expectedHash!=='string'||!/^[a-f0-9]{64}$/.test(args.expectedHash))throw Object.assign(new Error('delivery 需要 64 位小写 sha256 expectedHash 固定确切版本'),{code:'invalid_argument',detail:{field:'expectedHash'}});if(args.expectedRevision!==undefined&&(!Number.isSafeInteger(args.expectedRevision)||args.expectedRevision<0))throw Object.assign(new Error('expectedRevision 必须是非负整数'),{code:'invalid_argument',detail:{field:'expectedRevision'}});const current=service.snapshot(),meta=service.metadata?service.metadata():current,identity={assetId:meta.assetId,revision:meta.revision,contentHash:meta.contentHash};const changed=()=>Object.assign(new Error('调用者提供的版本与当前来源不一致；重新取得当前版本后再生成交付包'),{code:'conflict',current:identity});if(args.assetId!==identity.assetId)throw Object.assign(new Error('当前会话已切换资源，拒绝为旧资源生成交付包'),{code:'binding_conflict',current:identity});if(args.expectedHash!==identity.contentHash)throw changed();if(args.expectedRevision!==undefined&&args.expectedRevision!==identity.revision)throw changed();const delivery=publishDeliveryPackage(buildDeliveryPackage(current,{producerVersion:MODELER_VERSION,loadImage:hash=>appearance.load(hash).image}));return {ok:true,...identity,delivery};}
     if(action==='materials')return scope.materials.execute(args);
     return scope.operations.execute(action,args);
  }};
  function registerModelTool(tool){
    const body=tool.execute.bind(tool);tool.execute=async(args={},execution)=>{
      try{const sessionId=executionSession(execution,ctx.get('agents'));return await runScoped(sessionId,async()=>{const value=await body(args,execution),nativeAlias=tool.name==='modeler_workbench'&&args.action==='geometry',fullScene=tool.name==='modeler_scene'&&args.includeDoc===true,projected=nativeAlias?modelReceipt('modeler_geometry',args.args||{},value,{hardCapChars:31500}):!fullScene&&!(tool.name==='modeler_scene'&&args.op==='read')&&['modeler_scene','modeler_geometry','modeler_probe'].includes(tool.name)?modelReceipt(tool.name,args,value,{hardCapChars:31500}):value;return toolValue({...projected,sessionId,...(value?.assetId?{resourceId:value.assetId}:{})});},{execution});}
      catch(error){return {ok:false,error:error.message,code:error.code||null,...(error.detail?{detail:error.detail}:{})};}
    };
    return ctx.tools.register(tool);
  }
  function registerModelFetch(definition){
    const body=definition.fetch;return uiCtxConnectionRegister({...definition,async fetch(request,...rest){
      try{
        const url=new URL(request.url,'http://local');const identities=[url.searchParams.get('sessionId'),request.headers.get('x-modeler-session')].filter(v=>v!==null);
        if(request.method==='POST'){
          if(Number(request.headers.get('content-length')||0)>16*1024*1024)throw new Error('Request too large');
          try{const declared=(await request.clone().json()).sessionId;if(declared!==undefined)identities.push(declared);}catch(error){if(error.code)throw error;}
        }
        const sid=validateSessionId(identities[0]);if(identities.some(id=>id!==sid))throw Object.assign(new Error('请求中的会话身份不一致'),{code:'session_conflict'});
        if(request.method==='POST'&&['/api/modeler/workbench','/api/modeler/projects'].includes(url.pathname)){const payload=await request.clone().json().catch(()=>null);if(payload?.action==='open'||url.pathname==='/api/modeler/projects')throw Object.assign(new Error('浏览请使用带viewId的browse；设为工作资源请明确采用'),{code:'explicit_adoption_required'});}
        let viewId=url.searchParams.get('viewId')||null,requestPayload=null;
        if(request.method==='POST'){const payload=await request.clone().json().catch(()=>null);requestPayload=payload;if(payload?.viewId!==undefined){if(viewId&&viewId!==payload.viewId)throw Object.assign(new Error('请求的视图身份不一致'),{code:'view_conflict'});viewId=payload.viewId;}}
        const pureWorkbench=request.method==='POST'&&url.pathname==='/api/modeler/workbench'&&requestPayload&&typeof requestPayload==='object'&&(['help','guide','status','begin','projects','catalog'].includes(requestPayload.action)||requestPayload.action==='materials'&&requestPayload.args?.op==='help'||requestPayload.action==='geometry'&&requestPayload.args?.op==='help');
        const options=viewId?{viewId,assetId:views.describe(sid,viewId).viewAssetId||undefined}:{};
        // Pure docs/identity requests must not create a panel resource just because
        // they carry a viewId; explicit GET snapshots may still initialize later.
        if(viewId&&options.assetId===undefined&&!pureWorkbench){resources.getSession(sid);options.assetId=views.describe(sid,viewId).viewAssetId;}
        if(viewId&&views.describe(sid,viewId).mode==='browse'&&request.method==='POST'&&!['/api/modeler/workbench','/api/modeler/render','/api/modeler/evidence'].includes(url.pathname))throw Object.assign(new Error('浏览视图只读'),{code:'browsing_readonly'});
        return await runScoped(sid,()=>body(request,...rest),options);
      }catch(error){return new Response(JSON.stringify({ok:false,error:error.message,code:error.code||null}),{status:400,headers:{'content-type':'application/json; charset=utf-8'}});}
    }});
  }
  let uiCtxConnectionRegister;
  try{globalThis.__modelerBridgeStop?.();}catch{}
  ctx.effect(()=>{const stop=startLiveBridge(service,renderBridge,operations,runScoped);globalThis.__modelerBridgeStop=stop;return ()=>{try{probe.close();}catch{}void nativeOperations.close().catch(e=>console.error('[modeler] native cleanup: '+e.message));for(const scope of scopes.values()){scope.operations.close?.();scope.bridge.close();}void renderWorker.close().catch(e=>console.error('[modeler] render cleanup: '+e.message));stop();};},'modeler scoped live bridge');

  // Tools that bypass the command layer are still worth seeing in a retrospective.
  // Wrapping in place keeps their schema untouched; a wrapper failure must never
  // change what the tool returns.
  function instrumentTool(tool, name) {
    try {
      const original = tool.execute.bind(tool);
      tool.execute = async (args = {}) => {
        const started = performance.now();
        try {
          const result = await original(args);
          try { scopedProbe.record({ action: 'tool:' + name, ms: performance.now() - started, ok: result?.ok !== false, args: summariseArgs('tool:' + name, args), facts: summariseResult(result) }); } catch (_) {}
          return result;
        } catch (error) {
          try { scopedProbe.record({ action: 'tool:' + name, ms: performance.now() - started, ok: false, code: error?.code || 'error', error: String(error?.message || error), args: summariseArgs('tool:' + name, args) }); } catch (_) {}
          throw error;
        }
      };
    } catch (_) { /* an unmodifiable tool simply stays uninstrumented */ }
    return tool;
  }

  registerModelTool(defineTool({
    name:'modeler_material',description:'定义、编辑和分配材质；help默认给materials指南与精确合同。所有正常入口自动准备实际显示数据，预览与应用使用同一当前版本配方，普通使用无需另调bake。recipe返回可编辑材质，put/assign支持库复用；delivery/fidelity用于诊断，角色审核为可选。',
    parameters:{recipeVersion:{type:'number',enum:[2,3],description:'配方构造版本；默认当前3，显式2保留旧语义。recipe、author、preview、program使用同一版本构造器。'},role:{type:'string',description:'明确材质角色ID；inspect_roles/review指定要观察的同源角色。'},scope:{type:'string',enum:['working','close'],description:'整件PBR工作视图或代表性物理近景。'},span:{type:'number',description:'inspect_roles close正交全高.005..2米；默认按源过程尺度选择。'},evidenceId:{type:'string',description:'review使用当前作品真实PBR采集回执id。'},verdict:{type:'string',enum:['accept','reject','unknown'],description:'看原图后明确接受、拒绝或未知；采集不自动接受。'},note:{type:'string',description:'review填写1..512字符的具体可见结果与局限。'},roles:{type:'array',items:{type:'object',additionalProperties:true},description:'finish批量1..64角色：{role,recipe,params,ids,options?}、{role,spec:自定义空间材质,ids,options?}或{role,uniform:常量spec,reason,ids}；同一次事务，明确目标总数仍受256源与16M像素预算。'},delivery:{type:'string',enum:['auto','atlas','hybrid'],description:'author/preview：默认auto将可分离微细节做独立米制平铺；atlas保留整件烘焙；hybrid不能证明可分离时拒绝，不丢蒙版。'},detailResolution:{type:'number',description:'独立共享细节图边长64..1024，默认256；与宏观图合计仍受16M像素限制。'},detailSize:{type:'number',description:'细节平铺块的实际米数；默认按已声明波长计算，不改变高度或波长。'},detailProjection:{type:'string',enum:['box','xy','xz','yz'],description:'细节独立坐标投影；默认box，明确平面可用xy/xz/yz。'},fidelity:{type:'string',enum:['warn','strict'],description:'默认warn返回不足/未知；strict拒绝采样不足或声明变化未保留，不提交。'},offset:{type:'number',description:'delivery分页起点。'},limit:{type:'number',description:'delivery返回1..32对象，默认8。'},topic:{type:'string',enum:['surface','delivery','task'],description:'help topic:surface给精确分层信号/映射合同。'},view:{type:'string',enum:['front','side','top','iso','back','left','bottom'],description:'preview机位，默认iso；camera可固定同条件。'},recipe:{type:'string',description:'通用表面配方ID，recipes查询可用项。'},query:{type:'string',description:'recipes按工艺/用途过滤。'},params:{type:'object',additionalProperties:true,description:'配方参数；recipe返回精确字段、方向与尺度单位。'},ids:{type:'array',items:{type:'string'},description:'明确的1..32个原生叶ID，author/assign/bake整批原子处理。'},uv:{type:'string',enum:['smart','cube','preserve'],description:'author默认smart展开；preserve明确保留已有UV。'},bake:{type:'boolean',description:'兼容source-only选项：false只保存源/分配，首次显示仍由系统自动准备，不要求作者另调bake。'},camera:{type:'object',additionalProperties:true,description:'preview固定相机，与capture相同。'},mode:{type:'string',enum:['material','orientation','roughness','metalness','albedo','normal','final_normal'],description:'preview观察通道；默认material。'},width:{type:'number',description:'preview宽64..2400默认800。'},height:{type:'number',description:'preview高64..2400默认600。'},op:{type:'string',enum:['help','task','finish','inspect_roles','review','complete','recipes','recipe','author','preview','delivery','fidelity','list','get','import_image','put','assign','info','uv_info','bake','job','cancel'],description:'recipes/recipe查询配方；author批量制作、赋值并烘焙（默认smart UV/res256）；preview返回同源PNG不改作品；put/assign保留源编辑，job/cancel管理作业。'},assetId:{type:'string',description:'绑定当前资源。'},expectedHash:{type:'string',description:'写入的当前内容hash，与expectedRevision至少一项。'},expectedRevision:{type:'number',description:'当前版本。'},materialId:{type:'string',description:'稳定材质名称；put/get/assign使用。'},materialRevision:{type:'number',description:'可选材质版本比较，首次0。'},spec:{type:'object',additionalProperties:true,description:'PBR常量、surface宏观分层、detail独立米制细节或图片通道；help topic:surface/delivery给精确字段。'},path:{type:'string',description:'import_image：本机8位PNG绝对路径，最大2048边长。'},id:{type:'string',description:'对象ID；分配、Shader/UV查询或烘焙。'},selectionId:{type:'string',description:'可选已命名面区；不填分配整个对象。'},selection:{type:'object',additionalProperties:true,description:'可选原生面选区。'},featureId:{type:'string',description:'局部材质特征ID。'},channels:{type:'array',items:{type:'string',enum:['baseColor','roughness','metalness','normal','ao','emissive','clearcoat','clearcoatRoughness']},description:'烘焙通道，默认baseColor/roughness/metalness/normal。'},resolution:{type:'number',description:'烘焙边长64..2048，默认512。'},samples:{type:'number',description:'Cycles样本1..128，默认16。'},margin:{type:'number',description:'烘焙边距像素0..64，默认8。'},uvName:{type:'string',description:'目标UV集，默认活动集。'},wait:{type:'boolean',description:'小作业true直接等待，默认返回jobID。'},jobId:{type:'string',description:'job/cancel的受管作业ID。'}},output,isConcurrencySafe:()=>false,timeoutMs:600000,
    async execute(args={}){return operations.execute('materials',args);}
  }));

  registerModelTool(instrumentTool(defineTool({
    name: 'modeler_scene',
    description: '读取或编辑当前会话资源；默认有界对象目录，read分页读取源/网格，includeDoc明确要完整文档。',
    parameters: {
      op: { type: 'string', enum: ['get', 'read', 'replace', 'add', 'update', 'remove', 'reset'], description: 'get 读场景；replace 整体替换；add 添加对象；update 按 id 改；remove 删除；reset 回初始场景。' },
      path:{type:'string',description:'read字段路径：object/source/features/mesh/meta及其子字段，如mesh.vertices。'},offset:{type:'number',description:'read分页起点。'},count:{type:'number',description:'read数组项1..64，默认24；字符串可1..6000字符。'},includeDoc:{type:'boolean',description:'显式请求完整doc；默认只返回有界对象目录，详情优先read分页。'},
      doc: { type: 'object', additionalProperties: true, description: 'replace 的完整场景 {version:1,nextId,objects}。' },
      id: { type: 'string', description: 'update/remove 的对象 id。' },
      kind: { type: 'string', enum: ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane'], description: 'add 的几何类型。' },
      name: { type: 'string', description: '对象名称。' },
      position: { type: 'array', items: { type: 'number' }, description: '[x,y,z]，单位米。' },
      rotation: { type: 'array', items: { type: 'number' }, description: '[x,y,z] 弧度。' },
      scale: { type: 'array', items: { type: 'number' }, description: '[x,y,z]。' },
      material: { type: 'object', additionalProperties: true, description: '{color:"#rrggbb", metalness, roughness, opacity}。' },
      assetId:{type:'string',description:'可选：绑定要编辑的资源ID；会话已切换资源时拒绝旧编辑。'},
      expectedRevision:{type:'number',description:'写入基线 revision，与 expectedHash 至少提供一项。'},
      expectedHash:{type:'string',description:'内容基线 hash。'},
    },
    output,
    isConcurrencySafe: () => false,
    timeoutMs: 15000,
    async execute(args = {}) {
      try {
        const op = args.op || 'get';
        let result;
        if(!['get','read'].includes(op))writeBase(args);
        if(op==='read')return readScenePage(service.snapshot(),args);
        if (op === 'get') result = service.snapshot();
        else if (op === 'replace') result = await service.replace(args.doc,{...writeBase(args),source:'edit'});
        else if (op === 'add') result = await service.add(args);
        else if (op === 'update') result = await service.update(args);
        else if (op === 'remove') result = await service.remove(args);
        else if (op === 'reset') result = await service.replace(service.initial(), {...writeBase(args),discardOverrides:true});
        else throw new Error('未知 op: ' + op);
        return {
          ok: true,
          op,
          revision: result.revision,contentHash:result.contentHash,assetId:result.assetId,
          initialized: result.initialized,
          updatedAt: result.updatedAt,
          objectCount: result.doc.objects.length,
          doc: result.doc,
          object: result.object || null,
          store: service.store,
        };
      } catch (e) {
        return { ok: false, error: String(e?.message || e), code: e?.code || null, ...(e?.detail?{detail:e.detail}:{}), current:e?.current?{assetId:e.current.assetId,revision:e.current.revision,contentHash:e.current.contentHash}:null };
      }
    },
  }), 'scene'));

  registerModelTool(instrumentTool(defineTool({
    name: 'modeler_generate',
    description: '一条指令生成完整 showpiece 模型（超跑 / 太空拦截机 / 飞行员头盔），带分层几何、PBR 材质、灯带与镜头参数；直接替换建模台场景。适合先出完整造型，再用 modeler_scene 局部改。',
    parameters: {
      template: { type: 'string', enum: ['hypercar', 'interceptor', 'helmet', 'xenotype', 'neon'], description: 'hypercar=低趴超跑；interceptor=折面太空战机；helmet=飞行员头盔；xenotype=SDF 异形半身像；neon=霓虹街区。' },
      title: { type: 'string', description: '作品名。' },
      paint: { type: 'string', description: '车漆主色 #rrggbb（hypercar）。' },
      accent: { type: 'string', description: '强调色/灯光 #rrggbb。' },
      hull: { type: 'string', description: '战机壳体色 #rrggbb（interceptor）。' },
      shell: { type: 'string', description: '头盔壳体色 #rrggbb（helmet）。' },
      assetId:{type:'string',description:'可选：绑定要编辑的资源ID；会话已切换资源时拒绝旧编辑。'},
      expectedRevision: { type:'number',description:'写入基线 revision；与 expectedHash 至少提供一项。' },
      expectedHash:{type:'string',description:'可替代 revision 的内容基线 hash。'},
    },
    output,
    isConcurrencySafe: () => false,
    timeoutMs: 20000,
    async execute(args = {}) {
      try {
        const template = args.template || 'hypercar';
        const palette = {};
        for (const k of ['paint', 'accent', 'hull', 'shell']) {
          if (typeof args[k] === 'string' && /^#[0-9a-f]{6}$/i.test(args[k])) palette[k] = args[k];
        }
        const built = generateShowpiece(template, { ...palette, title: args.title });
        const result = await service.replace(built.doc,writeBase(args));
        return {
          ok: true,
          template: built.template,
          title: built.title,
          revision: result.revision,contentHash:result.contentHash,assetId:result.assetId,
          objectCount: result.doc.objects.length,
          triangles: Math.round(built.triangles),
          objects: result.doc.objects.map((o) => o.name),
          catalog: templateCatalog(),
          store: service.store,
        };
      } catch (e) {
        return { ok: false, error: String(e?.message || e), code: e?.code || null, ...(e?.detail?{detail:e.detail}:{}), current:e?.current?{assetId:e.current.assetId,revision:e.current.revision,contentHash:e.current.contentHash}:null };
      }
    },
  }), 'generate'));

  registerModelTool(instrumentTool(defineTool({
    name: 'modeler_build',
    description: '用结构化几何 spec 生成任意模型：支持 box / sphere / cylinder / cone / torus / lathe / extrude / loft / spherePatch / mesh，逐件材质、位置、旋转、缩放；一条调用产出完整场景。',
    parameters: {
      spec: { type: 'object', additionalProperties: true, description: '场景 spec：{title, stage, camera, fit, parts:[{type,name,position,rotation,scale,material,...}]}。材质可为 paint/carbon/glass/metal/chrome/gold/rubber/bone/ceramic/emissive/light，或 {color,metalness,roughness,opacity,emissive,emissiveIntensity}。' },
      assetId:{type:'string',description:'可选：绑定要编辑的资源ID；会话已切换资源时拒绝旧编辑。'},
      expectedRevision: { type:'number',description:'写入基线 revision；与 expectedHash 至少提供一项。' },
      expectedHash:{type:'string',description:'可替代 revision 的内容基线 hash。'},
    },
    output,
    isConcurrencySafe: () => false,
    timeoutMs: 30000,
    async execute(args = {}) {
      try {
        const built = buildSpec(args.spec || {});
        const result = await service.replace(built.doc,writeBase(args));
        return {
          ok: true,
          title: built.title,
          revision: result.revision,contentHash:result.contentHash,assetId:result.assetId,
          objectCount: result.doc.objects.length,
          triangles: Math.round(built.triangles),
          objects: result.doc.objects.map((o) => o.name),
          store: service.store,
        };
      } catch (e) {
        return { ok: false, error: String(e?.message || e), code: e?.code || null, ...(e?.detail?{detail:e.detail}:{}), current:e?.current?{assetId:e.current.assetId,revision:e.current.revision,contentHash:e.current.contentHash}:null };
      }
    },
  }), 'build'));

  registerModelTool(defineTool({
    name: 'modeler_script',
    description: '运行并保存程序化资产，保留生成源与语义部件。兼容旧m脚本的原有轴/材质语义；新的持久编辑使用modeler_geometry program(apiVersion:3)，函数合同用help查询。',
    parameters: {
      code: { type: 'string', description: '脚本正文。例：return m.scene("Study",[m.box(1,1,1).key("body")]); 与sourceId只选一个。' },
      sourceId:{type:'string',description:'save_source/patch_source返回的内容标识，避免重传完整源码。'},
      assetId:{type:'string',description:'可选：绑定要编辑的资源ID；会话已切换资源时拒绝旧编辑。'},
      expectedRevision: { type:'number',description:'写入基线 revision；与 expectedHash 至少提供一项。' },
      expectedHash:{type:'string',description:'可替代 revision 的内容基线 hash。'},
    },
    output,
    isConcurrencySafe: () => false,
    timeoutMs: 15000,
    async execute(args = {}) {
      try {
        return await operations.execute('script',{...args,expectedRevision:args.expectedRevision});
      } catch (e) {
        return { ok: false,error:String(e?.message||e),code:e?.code||null,recovery:sourceFailure(e) };
      }
    },
  }));

  registerModelTool(instrumentTool(defineTool({
    name: 'modeler_probe',
    description: '诊断已求值网格的几何分量与边界、朝向、重合面，支持隔离和前后比较。连通分量不等于原语义件；参数和语义件用 workbench inspect。',
    parameters: {
      action: { type: 'string', description: 'findings(默认)=列出缺陷；isolate=隔离一个分量；diff=对比两次构建；spec=按声明规格核对；mirror=镜像审计（逐个说明无对应件的原因）' },
      spec: { type: 'object', additionalProperties: true, description: 'spec 动作的声明规格：{length,width,height,tolerance,symmetric,centreOnX,mirror,mirrorExcept,parts}' },
      tolerance: { type: 'number', description: 'spec 的默认容差（米），默认 0.01' },
      object: { type: 'string', description: 'isolate 用的对象名或 id（配 component）' },
      component: { type: 'number', description: 'isolate 用的分量号，默认 0' },
      code: { type: 'string', description: '可选：先用这段脚本构建，不提交当前场景' },
      before: { type: 'string', description: 'diff 的基准脚本正文；省略则与当前场景比较' },
      after: { type: 'string', description: 'diff 的新脚本正文；省略则与当前场景比较' },
      cols: { type: 'number', description: 'isolate 的列数，默认 76' },
      rows: { type: 'number', description: 'isolate 的行数，默认 30' },
      offset:{type:'number',description:'诊断列表分页起点，默认0。'},
      limit: { type: 'number', description: '诊断列表每页1..64，默认12；next取后续。' },
    },
    output,
    isConcurrencySafe: () => true,
    timeoutMs: 20000,
    async execute(args = {}) {
      try {
        const action = String(args.action || 'findings');
        const current = () => service.snapshot().doc;
        const make = (code) => (code ? runModelerScript(String(code)) : current());
        if (action === 'isolate') {
          if (!args.object) return { ok: false, error: 'isolate 需要 object' };
          const iso = isolateComponent(make(args.code), { objectId: String(args.object), componentIndex: args.component ?? 0 }, {
            cols: args.cols, rows: args.rows,
          });
          return safe({
            ok: true, object: iso.objectName, componentIndex: iso.componentIndex,
            triangles: iso.triangles, closed: iso.closed, outward: iso.outward,
            volume: iso.volume, boundaryEdges: iso.boundaryEdges, windingConflicts: iso.windingConflicts,
            size: iso.size, bounds: iso.bounds,
            text: formatTextPreview(iso.preview, { channel: 'both' }),
          });
        }
        if (action === 'mirror') {
          const doc = make(args.code);
          return safe(diagnosticPage({ok:true,...mirrorAudit(doc,{tolerance:args.tolerance,search:args.search})},args));
        }
        if (action === 'spec') {
          const declared = typeof args.spec === 'string' ? JSON.parse(args.spec) : args.spec;
          const doc = make(args.code);
          const target = declared ? { ...doc, meta: { ...(doc.meta || {}), spec: declared } } : doc;
          return safe(diagnosticPage({ok:true,...verifySpec(target,{tolerance:args.tolerance})},args));
        }
        if (action === 'diff') {
          const before = make(args.before);
          const after = args.after ? runModelerScript(String(args.after)) : current();
          const d = diffComponents(before, after);
          return safe(diagnosticPage({ok:true,...d,counts:Object.fromEntries(Object.entries(d).filter(([k])=>k!=='summary').map(([k,v])=>[k,Array.isArray(v)?v.length:v]))},args));
        }
        const offset=args.offset??0,limit=args.limit??12;if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>64)throw Object.assign(Error('诊断分页无效'),{code:'invalid_page',detail:{field:'offset/limit'}});const r = findAnomalies(make(args.code), { limit: offset+limit });
        return safe(diagnosticPage({ok:true,...r},args));
      } catch (e) {
        return {ok:false,error:String(e?.message||e),code:e.code||null,...(e.detail?{detail:e.detail}:{})};
      }
    },
  }), 'probe'));

  registerModelTool(defineTool({
    name: 'modeler_inspect',
    description: '读取当前资产版本、语义部件、参数、求值统计与几何发现。数值规格与外观评价分开；局部网格与源码详情通过 workbench inspect 展开。',
    parameters: {
      id:{type:'string',description:'只展开这个语义部件或组；省略列有界部件目录。'},
      parameter:{type:'string',description:'只取recipe.params这个字段，可用offset/count读取数组。'},
      offset:{type:'number',description:'参数数组起始下标。'},count:{type:'number',description:'参数数组最多16项。'},
      includeScript: { type: 'boolean', description: '兼容源码摘录；完整分页源码请用workbench source。' },
    },
    output,
    isConcurrencySafe: () => true,
    timeoutMs: 10000,
    async execute(args = {}) {
      return await operations.execute('inspect',args);
    },
  }));

  registerModelTool(defineTool({
    name:'modeler_workbench',
    description:'管理资源、历史与观察；guide按id读取主指南(main)或局部指南，help默认打开main指南并按topic给精确合同，不需要先建资源；新建和局部编辑用modeler_geometry。legacy_api显式查询旧脚本合同。delivery生成稳定的版本化交付包（Modeler→消费者导入用），不属于建模写入。',
    parameters:{action:{type:'string',description:'guide(id:main/resources/explore/construct/assembly/edit/materials/delivery/legacy)或help(topic/query)先读指南与精确合同；begin/status读取会话绑定；advise/plan；surface(op:create/shape/compare/attach/region/inspect)，候选trial_get/list/observe/diagnose/compare/accept_trial；构造script，局部edit/sculpt，观察capture；delivery生成版本化交付包'},args:{type:'object',additionalProperties:true,description:'guide用id(main/resources/explore/construct/assembly/edit/materials/delivery/legacy)；help用topic/query；自然检索用query，状态建议用intent+id，起步用task；plan用parts职责列表。写入含expectedRevision或expectedHash，精确动作参数由help query动作名展开。delivery必填assetId/expectedHash、可选expectedRevision(>=0)，固定要交付的确切版本。'}},
    output,isConcurrencySafe:()=>false,timeoutMs:60000,
    async execute(a={}){try{return safe(await operations.execute(a.action||'help',a.args||{}));}catch(e){return {ok:false,error:e.message,code:e.code||null,...(e.detail?{detail:e.detail}:{}),current:e.current?{assetId:e.current.assetId,revision:e.current.revision,contentHash:e.current.contentHash}:null};}}
  }));

  registerModelTool(defineTool({
    name:'modeler_geometry',description:'持久建模与局部编辑。program默认API3；.mat(spatialSpec)、工艺helper与.finish共用自动材质准备，不要求额外烘焙或角色审核。help默认给construct指南与精确合同（topic或m.*查询）；select/feature/update保留局部可编辑性；长任务用job取得结果。',
    parameters:{expectedTopologyStamp:{type:'string',description:'orientation可固定当前求值拓扑身份。'},probes:{type:'array',items:{type:'object',additionalProperties:true},description:'orientation可给世界坐标外向/内向探针，最多32。'},interface:{type:'object',additionalProperties:true,description:'save_interface的命名接口：cylinderEnd/boundsFace/frame/selection。'},sourceInterface:{type:'string',description:'attach：源的命名接口。'},targetInterface:{type:'string',description:'attach：目标的命名接口。'},flip:{type:'boolean',description:'attach默认true令两端法线相对。'},detail:{type:'string',enum:['full'],description:'显式请求完整业务回执；默认摘要，常规坐标读取优先分页。'},transformPolicy:{type:'string',enum:['auto','preserve','reset'],description:'换源TRS策略：auto检查网格/轴变更歧义；preserve保留未声明TRS；reset未声明TRS取0/0/1。'},observe:{type:'object',additionalProperties:true,description:'局部反馈{selection,geometry?,capture?}；默认数量/范围摘要，显式请求覆盖或图像。'},feedback:{type:'boolean',description:'写入后默认带局部反馈；false只返回源/版本结果。'},target:{type:'string',description:'align引用工作框架的目标对象ID。'},anchor:{type:'array',items:{type:'number'},description:'align源本地挂点，默认原点。'},align:{type:'boolean',description:'align是否将源朝向对正工作框架，默认true；false仅平移。'},clear:{type:'boolean',description:'align清除已保存关系，保留当前姿态。'},apiVersion:{type:'number',description:'program语法版本：默认3，同程序.finish/真实m.paint等工艺；显式1/2保留旧原生材质/轴语义，旧modeler_script不变。'},topic:{type:'string',description:'help主题start/construct/transforms/mesh/materials/select/edit/relations/capture/stage；可精确Part.at等。'},geometry:{type:'boolean',description:'显式返回当页实际选区覆盖；默认只给摘要，true默认12元素并与当前hash绑定。'},frameId:{type:'string',description:'feature/align引用命名工作框架。'},up:{type:'array',items:{type:'number'},description:'frame正交化参考方向。'},relation:{type:'object',additionalProperties:true,description:'作者声明join/coaxial/outside/nonIntersection/gap/halfspace/wallThickness/envelope条件；失败返回具体对象与冲突位置，不自行改设计。'},section:{type:'object',additionalProperties:true,description:'pick可带实际观察截面{axis:x|y|z,value}。'},parameter:{type:'string',description:'inspect参数路径，如source.points/source.rows/source.vertices或features；默认有界摘要。'},offset:{type:'number',description:'参数数组分页起点。'},count:{type:'number',description:'status/inspect分页数量1..64。'},origin:{type:'array',items:{type:'number'},description:'pick世界射线起点。'},direction:{type:'array',items:{type:'number'},description:'pick世界方向。'},point:{type:'array',items:{type:'number'},description:'pick世界近表面点；与射线互斥。'},maxDistance:{type:'number',description:'pick最大世界距离。'},camera:{type:'object',additionalProperties:true,description:'pick用实际观察相机eye/target/up/fov/aspect或正交span。'},screen:{type:'array',items:{type:'number'},description:'pick图像归一化坐标[u,v]，左上0,0。'},code:{type:'string',description:'program v2：世界Y-up，地面XZ；return m.scene(title,parts)。旋转体默认局部Z，可axis明确；材质为颜色/JSON。help取合同。'},mode:{type:'string',enum:['append','upsert'],description:'program默认append；upsert更新同ID生成源，保留局部新增特征；冲突拒绝，其余源不删。'},stage:{type:'object',additionalProperties:true,description:'scene真实渲染配置：background/exposure/hemisphere/lights/floor/shadows。'},op:{type:'string',enum:['help','orientation','status','capabilities','relations','relation','remove_relation','align','frame','save_frame','feedback','create','program','scene','rebuild','adopt','pick','select','inspect','save_selection','save_interface','interfaces','attach','feature','update','remove_feature','job','cancel'],description:'直接执行建模动作，不要求begin或计划。capabilities取当前后端精确合同。'},id:{type:'string',description:'精确对象ID；create新ID，其他动作选现有源。'},source:{type:'object',additionalProperties:true,description:'声明式源：box{size:[x,y,z]}、cylinder{radius,depth}（轴Z）、mesh{vertices,faces}、loft{sections}、extrude{profile,depth}、curve{points}、controlGrid{rows}等。'},objects:{type:'array',items:{type:'object',additionalProperties:true},description:'一次创建1–64项{id,source,features?,position?,rotation?,scale?,material?}。'},feature:{type:'object',additionalProperties:true,description:'有序特征{id?,type,...}，如bevel{width,segments,selection}、boolean{operation,target}、inset/extrude/solidify/subdivision/uv；target是同资产源ID。'},features:{type:'array',items:{type:'object',additionalProperties:true},description:'create时的初始特征栈。'},selection:{type:'object',additionalProperties:true,description:'{domain:vertices|edges|faces,where:{bounds?,near?,normal?,boundary?,angle?,length?}}；条件在源局部空间。显式ids需topologyStamp，返回有界身份。'},selectionId:{type:'string',description:'已命名保存的选区。'},name:{type:'string',description:'save_selection的名称。'},featureId:{type:'string',description:'update/remove_feature的特征ID。'},params:{type:'object',additionalProperties:true,description:'update指定特征参数补丁。'},sourceParams:{type:'object',additionalProperties:true,description:'update源参数补丁；改网格/轴时transformPolicy明确旧TRS处理。'},position:{type:'array',items:{type:'number'},description:'局部XYZ米。'},rotation:{type:'array',items:{type:'number'},description:'局部XYZ弧度。'},scale:{type:'array',items:{type:'number'},description:'局部XYZ缩放。'},material:{type:'object',additionalProperties:true,description:'材质字段。'},visible:{type:'boolean',description:'update对象显隐。'},parentId:{type:'string',description:'create加入现有组合件。'},jobId:{type:'string',description:'job/cancel使用返回作业ID。'},wait:{type:'boolean',description:'默认异步返回；小操作可true等待。'},assetId:{type:'string',description:'绑定当前资源，防止错误目标。'},expectedHash:{type:'string',description:'写入基线hash，与expectedRevision至少一项。'},expectedRevision:{type:'number',description:'写入基线版本。'}},output,isConcurrencySafe:()=>false,timeoutMs:90000,
    async execute(args){return operations.execute('geometry',args);}
  }));
  const cameraParameter={type:'object',additionalProperties:true,description:'机位二选一：{eye:[x,y,z],target:[x,y,z],up?:[x,y,z]} 或 {azimuth:水平角度,elevation:仰角度,distance?:米,target?:[x,y,z]}；可另给projection:perspective|orthographic、fov:透视度数或span:正交全高。不要同时给eye与角度/distance。精确合同见help actions capture。'};
  registerModelTool(defineTool({
    name:'modeler_capture',description:'按观察用途采集真实Three PNG：purpose决定形体描边、网格线框或材质外观；也可显式指定displayMode/诊断mode。未作选择不启动渲染。支持机位、隔离与瞬态灯光；一次只采所选模式，不写资产。返回PNG路径、版本与实际观察选择回执。',
    parameters:{purpose:{type:'string',enum:[...CAPTURE_PURPOSES],description:'想检查什么：shape=形体/部件边界→outline；topology=三角面结构→surface_wireframe；appearance=材质/玻璃→normal。须提供purpose、显式displayMode或诊断mode之一；显式displayMode优先。'},selectionId:{type:'string',description:'isolate对象的已命名选区；局部高亮与取景。'},selection:{type:'object',additionalProperties:true,description:'isolate对象的局部选区(含特征结果)，显示实际覆盖并绑定当前版本。'},focusSelection:{type:'boolean',description:'有选区时默认聚焦选区，false保留对象取景。'},views:{type:'array',items:{type:'string',enum:['front','side','top','iso','back','left','bottom']},description:'1–4个默认机位；默认front/side/top。与camera互斥。'},camera:cameraParameter,
      width:{type:'number',description:'每张宽64–2400，默认1000'},height:{type:'number',description:'每张高64–2400，默认700'},mode:{type:'string',enum:[...OBSERVATION_MODES],description:'既有观察通道；默认material；normal仍为法线诊断，wire仍为旧材质线框；旧值全部保留'},displayMode:{type:'string',enum:[...DISPLAY_MODES],description:'按问题选：形体/部件边界用outline（白模+可见来源轮廓）；三角面/网格结构用surface_wireframe（白模+真实面线）；材质/玻璃用normal（默认）。outline和surface_wireframe均为无地板白模诊断；描边/网格线不是CAD拓扑证明。不要求每次三连拍。'},lighting:{type:'object',additionalProperties:true,description:'可选瞬态观察灯光/阴影/镜面地板；key/fill/rim.position是相对bounds中心的世界轴偏移，不是绝对原点；floor.position为世界坐标；environment.intensity为绝对值覆盖；精确字段见help actions capture；合并顺序：工作室默认→资产renderStage→显式字段；不写入资产'},
      isolate:{type:'string',description:'只渲染该语义部件或组合件'},context:{type:'array',items:{type:'string'},description:'可选邻接部件ID，最多12个；保留主模块构图并显示接口上下文。'},expectedHash:{type:'string',description:'可选的当前内容hash，用于固定要观察的版本'}},
    output,isConcurrencySafe:()=>false,timeoutMs:90000,
    async execute(args={}){try{return await operations.execute('capture',{...args,...(args.views||args.camera?{}:{views:['front','side','top']})});}catch(e){return {ok:false,error:e.message,code:e.code||null};}}
  }));

  const previousViews=new Map();
  registerModelTool(instrumentTool(defineTool({
    name: 'modeler_views',
    description: '已求值资产的字符诊断视图，观察轮廓、遮挡、深度与部件位置；不证明材质观感。真实图像用 modeler_capture。',
    parameters: {
      code: { type: 'string', description: '可选：先运行这段脚本，只预览不提交；省略则检查当前场景。' },
      camera:cameraParameter,
      views: { type: 'string', description: '逗号分隔：front,side,top,iso,back,left,bottom；默认四视图 front,side,top,iso' },
      channel: { type: 'string', description: 'part / color / shade / depth / facing / both(默认 color+shade+depth) / all / ansi' },
      cols: { type: 'number', description: '字符列数，20-1024，默认 80；返回真实列数，不静默截断' },
      rows: { type: 'number', description: '字符行数，10-512，默认 36' },
      cellAspect: { type: 'number', description: '字符格宽/行高，默认 0.5（等宽字体约 1:2）。它参与投影，决定形体是否被压扁' },
      samples: { type: 'number', description: '每字符格采样数 1-4，默认 2；更高更接近真实覆盖率' },
      faces: { type: 'string', description: 'front(默认，按外法线剔除) 或 double(显示双面，用于检查反面)' },
      includeLegend: { type: 'boolean', description: '是否返回调色盘图例' },
    },
    output:{schema:output.schema,render:(_args,value)=>[{type:'text',text:value?.ok===false?JSON.stringify(value):['```text',value.text||'','```',JSON.stringify({ok:value.ok,temporary:value.temporary,metrics:value.metrics,views:value.views,warnings:value.warnings})].join(String.fromCharCode(10))}]},
    isConcurrencySafe: () => true,
    timeoutMs: 12000,
    async execute(args = {}) {
      try {
        let doc = service.snapshot().doc;
        if (args.code) doc = runModelerScript(String(args.code));
        const wanted = args.views===undefined&&args.camera ? ['custom'] : String(args.views||DEFAULT_TEXT_VIEWS.join(',')).split(',').map(v=>v.trim()).filter(Boolean);
        const channel = String(args.channel || 'both');
        const raster = rasterDoc(doc, {
          views: wanted,camera:args.camera,cols: args.cols, rows: args.rows, samples: args.samples,
          cellAspect: args.cellAspect, faces: args.faces,
        });
        const current=service.metadata();
        const viewKey=modelScope().sessionId+':'+current.assetId,lastViews=previousViews.get(viewKey);
        const diff=(!args.code&&lastViews&&args.compare!==false)?diffRaster(lastViews.raster,raster):undefined;
        if(!args.code){previousViews.delete(viewKey);previousViews.set(viewKey,{assetId:current.assetId,contentHash:current.contentHash,raster});while(previousViews.size>4)previousViews.delete(previousViews.keys().next().value);}
        return safe({
          ok: true,
          temporary: Boolean(args.code),
          diff,
          metrics: raster.metrics,
          legend: args.includeLegend === false ? undefined : raster.legend,
          objectLegend: raster.objectLegend,
          warnings: raster.warnings,
          conventions: raster.conventions,
          text: formatTextPreview(raster, { channel }),
          views: Object.fromEntries(Object.entries(raster.views).map(([k, v]) => [k, {
            label: v.label,camera:v.camera||null,projection:v.projection,cols: v.cols, rows: v.rows, cellAspect: v.cellAspect,
            coverage: v.coverage, borderTouch: v.borderTouch, symmetry: v.symmetry,
            visible: v.visible, visibleCells: v.visibleCells, diagnostics: v.diagnostics,
            depthRange: v.depthRange, colorRuns: v.colorRuns,
          }])),
        });
      } catch (e) {
        return { ok: false, error: String(e?.stack || e?.message || e) };
      }
    },
  }), 'views'));

  ctx.inject(['connection'], (uiCtx) => {
    uiCtxConnectionRegister=definition=>uiCtx.connection.fetch.register(definition);
    const displayResponse=async(extra={},selectedService=service)=>{const json=await nativeOperations.displayJSON(selectedService),metadata=selectedService.metadata(),scope=modelScope(),tail={...extra,...metadata,sessionId:scope.sessionId,resourceId:metadata.assetId,...(scope.viewId?{view:views.describe(scope.sessionId,scope.viewId),workingAssetId:resources.binding(scope.sessionId),browsing:views.describe(scope.sessionId,scope.viewId).mode==='browse'}:{})};return new Response(json.slice(0,-1)+','+JSON.stringify(tail).slice(1),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});};
    const response = async (value, status = 200) => {if(value?.doc&&value.assetId===service.metadata().assetId&&value.contentHash===service.metadata().contentHash){const {doc,appearanceAssets,...rest}=value;return displayResponse(rest);}return new Response(JSON.stringify({...value,sessionId:modelScope().sessionId,...(value.assetId?{resourceId:value.assetId}:{}),...(modelScope().viewId?{view:views.describe(modelScope().sessionId,modelScope().viewId),workingAssetId:resources.binding(modelScope().sessionId),browsing:views.describe(modelScope().sessionId,modelScope().viewId).mode==='browse'}:{})}), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });};
    const requestJson = async (request) => {
      const len = Number(request.headers.get('content-length') ?? 0);
      if (len > 16 * 1024 * 1024) throw new Error('Request too large');
      return JSON.parse(await request.text());
    };
    registerModelFetch({path:'/api/modeler/image',methods:['GET'],requestBody:'buffered',async fetch(request){
      const url=new URL(request.url,'http://local'),assetId=service.metadata().assetId,key=url.searchParams.get('key');
      if(url.searchParams.get('assetId')!==assetId)throw Object.assign(new Error('图像不属于当前资源'),{code:'binding_conflict'});
      if(!/^[a-f0-9]{16}-[a-f0-9]{24}$/.test(key||''))return new Response('Invalid image key',{status:400});
      const file=path.join(os.homedir(),'.dsh','modeler-evidence',assetId,key+'.png');
      try{const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16*1024*1024)return new Response('Invalid image',{status:400});return new Response(fs.readFileSync(file),{headers:{'Content-Type':'image/png','Cache-Control':'no-store'}});}catch(error){if(error.code==='ENOENT')return new Response('Image not found',{status:404});throw error;}
    }});

    registerModelFetch({path:'/api/modeler/workbench',methods:['GET','POST'],requestBody:'buffered',async fetch(request){
      try{if(request.method==='GET')return displayResponse({ok:true});
        const body=await requestJson(request);if(body.action==='snapshot')return new Response(JSON.stringify({ok:true,...service.snapshot(),sessionId:modelScope().sessionId}),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});return response(await operations.execute(body.action,body.args||{}));
      }catch(e){return response({ok:false,error:e.message,code:e.code||null,...(e.detail?{detail:e.detail}:{}),current:e.current?{assetId:e.current.assetId,revision:e.current.revision,contentHash:e.current.contentHash}:null},e.code==='conflict'?409:400);}
    }});
    registerModelFetch({path:'/api/modeler/evidence',methods:['GET','POST'],requestBody:'buffered',async fetch(request){
      try{if(request.method==='GET')return response(await operations.execute('evidence'));return response({ok:true,evidence:evidence.accept(await requestJson(request))});}
      catch(e){return response({ok:false,error:e.message,code:e.code||null},400);}
    }});

    registerModelFetch({
      path: '/api/modeler/scene',
      methods: ['GET', 'POST'],
      requestBody: 'buffered',
      async fetch(request) {
        try {
          if (request.method === 'GET') return displayResponse({ok:true});
          const body = await requestJson(request);
          return response({ ok: true, ...await service.replace(body.doc,{...writeBase(body),source:'edit'}) });
        } catch (e) {
          if (e?.code === 'conflict') return response({ ok: false, code: 'conflict', error: 'revision conflict', current:{assetId:e.current.assetId,revision:e.current.revision,contentHash:e.current.contentHash} }, 409);
          return response({ ok: false, error: String(e?.message || e) }, 400);
        }
      },
    });

    registerModelFetch({
      path: '/api/modeler/script',
      methods: ['GET', 'POST'],
      requestBody: 'buffered',
      async fetch(request) {
        try {
          if (request.method === 'GET') {
            const snap = service.snapshot();
            return response({ ok: true, revision: snap.revision, script: snap.doc.meta?.script || SAMPLE_SCRIPT, analysis: analyzeDoc(snap.doc) });
          }
          const body = await requestJson(request);
          return response(await operations.execute('script',body));
        } catch (e) {
          return response({ ok: false, error: String(e?.stack || e?.message || e) }, 400);
        }
      },
    });

    registerModelFetch({
      path: '/api/modeler/projects',
      methods: ['GET', 'POST'],
      requestBody: 'buffered',
      async fetch(request) {
        try {
          if(request.method==='GET')return response(await operations.execute('projects'));
          const body=await requestJson(request);
          return response(await operations.execute('open',{...body,project:body.file||body.project,expectedRevision:body.expectedRevision}));
        } catch (e) {
          return response({ ok: false, error: String(e?.message || e) }, 400);
        }
      },
    });

    registerModelFetch({
      path: '/api/modeler/wait',
      methods: ['GET'],
      requestBody: 'buffered',
      async fetch(request) {
        const url = new URL(request.url, 'http://local');
        const since = Number(url.searchParams.get('since') || 0);
        const expectedAssetId=url.searchParams.get('assetId');
        const timeout = Math.max(50, Math.min(2000, Number(url.searchParams.get('timeout') || 400)));
        const first = service.metadata();
        if (first.revision !== since || (expectedAssetId && first.assetId!==expectedAssetId)) return displayResponse({ok:true});
        await new Promise((resolve) => {
          let done = false;
          const finish = () => { if (done) return; done = true; off(); resolve(); };
          const off = service.subscribe(finish);
          setTimeout(finish, timeout);
        });
        const latestView=modelScope().viewId?views.describe(modelScope().sessionId,modelScope().viewId):null;
        const latestService=latestView?.viewAssetId?resources.forAsset(latestView.viewAssetId):resources.getSession(modelScope().sessionId);
        const next=latestService.metadata();
        // An idle poll only needs an identity receipt. Serialising the complete
        // mesh every timeout multiplies memory/traffic without changing the UI.
        return next.revision!==since||(expectedAssetId&&next.assetId!==expectedAssetId)?displayResponse({ok:true},latestService):response({ok:true,...next,unchanged:true});
      },
    });

    registerModelFetch({
      path: '/api/modeler/render',
      methods: ['GET', 'POST'],
      requestBody: 'buffered',
      async fetch(request) {
        if (request.method === 'GET') {
          const url = new URL(request.url, 'http://local');
          renderClientState.lastSeen = Date.now();renderClientState.clientBuildId=url.searchParams.get('build');
          renderClientState.version = Math.max(renderClientState.version, Number(url.searchParams.get('client') || 0));
          if(renderClientState.clientBuildId!==buildInfo.clientBuildId)return response({ok:false,code:'stale_client',error:'建模台客户端版本已过期，请刷新整个页面以加载更新；不要重新生成模型。 / Modeler client is outdated; reload the page to load the update.',clientBuildId:buildInfo.clientBuildId,reportedClientBuild:renderClientState.clientBuildId},409);
          const cam = url.searchParams.get('cam');
          const target = url.searchParams.get('target');
          if (cam && target) {
            const nums = (v) => v.split(',').map(Number);
            renderClientState.camera = {
              eye: nums(cam),
              target: nums(target),
              fov: Number(url.searchParams.get('fov') || 46),
              at: Date.now(),
            };
          }
        }
        if (request.method === 'POST') {
          try {
            const body = await requestJson(request);
            const ok = renderBridge.resolve(body.id, body);
            return response({ ok });
          } catch (e) { return response({ ok: false, error: String(e?.message || e) }, 400); }
        }
        const pending = await renderBridge.wait(500);
        if (!pending) return new Response(null, { status: 204 });
        return response({
          ok: true, id: pending.id, width: pending.width, height: pending.height, view: pending.view,
          requestId:pending.requestId,eye:pending.eye,target:pending.target,fov:pending.fov,camera:pending.camera,source:'viewport',purpose:pending.purpose,mode:pending.mode,displayMode:pending.displayMode,lighting:pending.lighting,isolate:pending.isolate,context:pending.context||[],section:pending.section,
          revision:pending.revision,contentHash:pending.contentHash,assetId:pending.assetId,kernelVersion:pending.kernelVersion,
        });
      },
    });
  });
}
