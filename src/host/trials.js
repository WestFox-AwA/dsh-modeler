import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {attachDesignPlan} from './design-plan.js';
import {runModelerScript} from './script.js';
import {contentHash,normalizeDoc} from './workspace.js';
import {analyzeDoc,diffDocs,boundsOf} from './analyze.js';
import {evaluateDoc} from './kernel.js';
import {diagnoseDoc} from './diagnostics.js';
import {createEvidenceStore} from './evidence.js';
import {observationForEdit,resolveCaptureSelection} from './observation-purpose.js';
import {resolveCamera} from './camera.js';
import {formatTextPreview,rasterDoc} from './raster.js';
import {moduleReplacement} from './module-source.js';
import {checkRolesDoc} from './role-checks.js';

const clone = (value) => JSON.parse(JSON.stringify(value));
const fail = (message, code = 'trial_invalid') => Object.assign(new Error(message), { code });
const HASH = /^[0-9a-f]{64}$/;
const TRIAL_ID = /^trial_[A-Za-z0-9_-]{1,120}$/;
const ASSET_SEGMENT = /^[A-Za-z0-9_-]{1,160}$/;
const TRIAL_SCHEMA = 'dsh-modeler/trial';
const TRIAL_VERSION = 1;
const MAX_CANDIDATES = 24;
const MAX_PLAN_BYTES = 500_000;
const MAX_CANDIDATE_BYTES = 16 * 1024 * 1024;
const MAX_CANDIDATE_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_METADATA_BYTES = 128 * 1024;
const OBSERVATION_KEYS = new Set(['purpose', 'view', 'camera', 'mode', 'displayMode', 'lighting', 'isolate', 'context', 'section', 'width', 'height', 'source', 'expectedHash', 'expectedRevision']);

const byteLength = (value) => Buffer.byteLength(JSON.stringify(value));
const cameraInput = (camera) => ({
  eye: camera.eye,
  target: camera.target,
  up: camera.up,
  projection: camera.projection,
  fov: camera.fov,
  ...(camera.projection === 'orthographic' ? { span: camera.span } : {}),
});
const finiteVector = (value) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

function selectedBounds(doc, isolate, context = []) {
  const evaluated = evaluateDoc(doc);
  const selectors = [isolate, ...(Array.isArray(context) ? context : [])].filter(Boolean);
  const positions = [];
  for (const object of evaluated.objects) {
    if (object.visible === false) continue;
    const selected = !selectors.length || selectors.some((id) => object.editableId === id || object.id === id || object.semanticId === id || object.parentIds?.includes(id));
    if (!selected) continue;
    for (const position of object.geometryData?.positions || []) positions.push(position);
  }
  return boundsOf(positions);
}

function unionBounds(bounds) {
  const present = bounds.filter(Boolean);
  if (!present.length) return null;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const bound of present) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], bound.min[i]);
      max[i] = Math.max(max[i], bound.max[i]);
    }
  }
  return { min, max };
}

function assertSafeAssetId(assetId) {
  if (typeof assetId !== 'string' || !ASSET_SEGMENT.test(assetId)) throw fail('assetId必须是安全的单一路径段', 'invalid_path');
  return assetId;
}

function assertTrialId(id) {
  if (typeof id !== 'string' || !TRIAL_ID.test(id)) throw fail('候选id无效', 'invalid_id');
  return id;
}

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail(`${name}需要对象`);
  return value;
}

function copyMetadata(value) {
  const out = clone(value || {});
  if (byteLength(out) > MAX_METADATA_BYTES) throw fail('候选元数据超出预算', 'trial_budget');
  return out;
}

const compactReceipt=receipt=>receipt?Object.fromEntries(['id','assetId','revision','contentHash','candidateId','candidateHash','baseRevision','baseHash','clientBuildId','kernelVersion','path','imageHash','view','mode','displayMode','observationSelection','lighting','width','height','camera','runtime','capturedAt','captured','reviewed','qualityApproved'].filter(key=>receipt[key]!==undefined).map(key=>[key,receipt[key]])):null;
const compactComparison=(value,withCandidates=true)=>value?{sameCamera:value.sameCamera,camera:value.camera,mode:value.mode,displayMode:value.displayMode,observationSelection:value.observationSelection,lighting:value.lighting||null,width:value.width,height:value.height,isolate:value.isolate,context:value.context,section:value.section,before:compactReceipt(value.before),...(withCandidates?{candidates:value.candidates.map(c=>({id:c.id,candidateHash:c.candidateHash,after:compactReceipt(c.after)}))}:{after:compactReceipt(value.after)}),baselineHadVisibleGeometry:value.baselineHadVisibleGeometry,reviewed:false,qualityApproved:false}:null;

export function createTrials({ service, sources, renderSnapshot = null, directory = null, buildInfo = null } = {}) {
  if (!service) throw fail('createTrials需要service'); // Lazy Host proxy methods resolve only inside a call scope.
  if (directory !== null && (typeof directory !== 'string' || !directory.trim())) throw fail('directory必须是非空路径', 'invalid_path');

  const candidates = new Map();
  let candidateBytes = 0;
  let planBytes = 0;
  const storageRoot = directory === null ? null : path.resolve(directory, 'trials');
  const loadedAssets = new Set();

  const metadata = () => {
    const value = typeof service.metadata === 'function' ? service.metadata() : service.snapshot();
    if (!value || typeof value !== 'object') throw fail('service没有返回有效版本元数据', 'service_invalid');
    if (value.assetId === undefined || value.revision === undefined || value.contentHash === undefined) throw fail('service版本元数据不完整', 'service_invalid');
    assertSafeAssetId(value.assetId);
    if (!Number.isSafeInteger(value.revision) || value.revision < 0 || !HASH.test(value.contentHash)) throw fail('service版本元数据无效', 'service_invalid');
    return { assetId: value.assetId, revision: value.revision, contentHash: value.contentHash };
  };

  const assetDirectory = (assetId) => {
    if (!storageRoot) return null;
    assertSafeAssetId(assetId);
    const root = path.resolve(storageRoot), dir = path.resolve(root, assetId);
    if (dir !== root && !dir.startsWith(root + path.sep)) throw fail('候选路径越界', 'invalid_path');
    return dir;
  };

  const candidateFile = (assetId, id) => {
    const dir = assetDirectory(assetId);
    return dir ? path.join(dir, `${assertTrialId(id)}.json`) : null;
  };

  const removeFile = (file) => {
    if (!file) return;
    try { fs.unlinkSync(file); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  };

  const writeAtomic = (file, payload) => {
    const dir = path.dirname(file);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    try {
      const stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) throw fail('候选文件不能是符号链接', 'invalid_path');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
    let fd;
    try {
      fd = fs.openSync(temporary, 'wx', 0o600);
      fs.writeFileSync(fd, payload, 'utf8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fd = undefined;
      fs.renameSync(temporary, file);
    } finally {
      if (fd !== undefined) {
        try { fs.closeSync(fd); } catch { /* best effort cleanup */ }
      }
      try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') { /* preserve the original failure */ } }
    }
  };

  const staleFor = (entry, current = metadata()) => entry.assetId !== current.assetId || entry.baseRevision !== current.revision || entry.baseHash !== current.contentHash;

  const publicMetadata = (entry, current = metadata()) => {
    const plan = entry.plan || {};
    const result = {
      id: entry.id,
      assetId: entry.assetId,
      revision: entry.baseRevision,
      baseRevision: entry.baseRevision,
      baseHash: entry.baseHash,
      contentHash: entry.candidateHash,
      candidateHash: entry.candidateHash,
      createdAt: entry.createdAt,
      bytes: entry.bytes,
      stale: staleFor(entry, current),
      status: entry.invalidReason ? 'invalid' : staleFor(entry, current) ? 'stale' : 'ready',
      qualityApproved: false,
      ...(entry.invalidReason ? { integrityError: entry.invalidReason } : {}),
      ...(entry.metadata?.summary ? { summary: clone(entry.metadata.summary) } : {}),
      ...(entry.metadata?.observation ? { observation: clone(entry.metadata.observation) } : {}),
      ...(entry.metadata?.diagnosticCount !== undefined ? { diagnosticCount: entry.metadata.diagnosticCount } : {}),
      ...(Array.isArray(plan.operations) ? { operationCount: plan.operations.length } : {}),
      ...(plan.sourceId ? { sourceId: plan.sourceId } : {}),
      ...(plan.moduleId ? { moduleId: plan.moduleId } : {}),
      ...(plan.frameMode ? { frameMode: plan.frameMode } : {}),
      ...(plan.rebase !== undefined ? { rebase: Boolean(plan.rebase) } : {}),
      ...(plan.discardOverrides !== undefined ? { discardOverrides: Boolean(plan.discardOverrides) } : {}),
    };
    return result;
  };

  const serializedRecord = (entry) => {
    const record = {
      schema: TRIAL_SCHEMA,
      schemaVersion: TRIAL_VERSION,
      id: entry.id,
      assetId: entry.assetId,
      baseRevision: entry.baseRevision,
      baseHash: entry.baseHash,
      candidateHash: entry.candidateHash,
      createdAt: entry.createdAt,
      plan: clone(entry.plan),
      metadata: clone(entry.metadata || {}),
      doc: clone(entry.doc),
    };
    const json = JSON.stringify(record) + '\n';
    const size = Buffer.byteLength(json);
    if (byteLength(record.plan) > MAX_PLAN_BYTES) throw fail('候选计划超出预算', 'trial_budget');
    if (size > MAX_CANDIDATE_BYTES) throw fail('候选文档超出预算', 'trial_budget');
    return { record, json, size };
  };

  const persistEntry = (entry) => {
    const serialized = serializedRecord(entry);
    if (!storageRoot) return serialized.size;
    const file = entry.file || candidateFile(entry.assetId, entry.id);
    writeAtomic(file, serialized.json);
    entry.file = file;
    return serialized.size;
  };

  const removeEntry = (entry) => {
    if (!entry) return;
    candidates.delete(entry.id);
    candidateBytes -= entry.bytes || 0;
    planBytes -= entry.planBytes || 0;
    if (candidateBytes < 0) candidateBytes = 0;
    if (planBytes < 0) planBytes = 0;
    if (entry.file) removeFile(entry.file);
  };

  const trim = () => {
    while (candidates.size > MAX_CANDIDATES || candidateBytes > MAX_CANDIDATE_TOTAL_BYTES) {
      const oldest = candidates.keys().next().value;
      if (oldest === undefined) break;
      removeEntry(candidates.get(oldest));
    }
  };

  const validateStoredRecord = (raw, expectedId, expectedAssetId) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw fail('候选记录不是对象', 'trial_integrity');
    if (raw.schema !== TRIAL_SCHEMA || raw.schemaVersion !== TRIAL_VERSION) throw fail('候选记录版本不受支持', 'trial_integrity');
    if (raw.id !== expectedId || !TRIAL_ID.test(raw.id)) throw fail('候选记录id不匹配', 'trial_integrity');
    if (raw.assetId !== expectedAssetId || !ASSET_SEGMENT.test(raw.assetId)) throw fail('候选记录资源不匹配', 'trial_integrity');
    if (!Number.isSafeInteger(raw.baseRevision) || raw.baseRevision < 0 || !HASH.test(raw.baseHash) || !HASH.test(raw.candidateHash)) throw fail('候选记录版本字段无效', 'trial_integrity');
    if (!raw.doc || typeof raw.doc !== 'object' || Array.isArray(raw.doc) || !raw.plan || typeof raw.plan !== 'object' || Array.isArray(raw.plan)) throw fail('候选记录缺少文档或计划', 'trial_integrity');
    const checked = normalizeDoc(raw.doc, { evaluate: false });
    if (contentHash(checked) !== raw.candidateHash || contentHash(raw.doc) !== raw.candidateHash) throw fail('候选文档hash不匹配', 'trial_integrity');
    if (raw.metadata !== undefined) copyMetadata(raw.metadata);
    const planSize = byteLength(raw.plan);
    if (planSize > MAX_PLAN_BYTES) throw fail('候选计划超出预算', 'trial_budget');
    return { ...raw, doc: clone(raw.doc), plan: clone(raw.plan), metadata: clone(raw.metadata || {}), planBytes: planSize };
  };

  const invalidEntry = (file, id, assetId, reason, raw = {}) => ({
    id,
    assetId,
    baseRevision: Number.isSafeInteger(raw.baseRevision) ? raw.baseRevision : 0,
    baseHash: typeof raw.baseHash === 'string' ? raw.baseHash : '0'.repeat(64),
    candidateHash: typeof raw.candidateHash === 'string' ? raw.candidateHash : '0'.repeat(64),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
    plan: raw.plan && typeof raw.plan === 'object' && !Array.isArray(raw.plan) ? clone(raw.plan) : {},
    metadata: {},
    doc: null,
    file,
    invalidReason: String(reason?.message || reason),
    bytes: 0,
    planBytes: 0,
  });

  const loadAsset = (assetId) => {
    if (!storageRoot || loadedAssets.has(assetId)) return;
    loadedAssets.add(assetId);
    const dir = assetDirectory(assetId);
    let names;
    try { names = fs.readdirSync(dir); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    const files = names.filter((name) => /^trial_[A-Za-z0-9_-]{1,120}\.json$/.test(name)).sort();
    for (const name of files) {
      if (candidates.size >= MAX_CANDIDATES || candidateBytes >= MAX_CANDIDATE_TOTAL_BYTES) break;
      const id = name.slice(0, -5), file = path.join(dir, name);
      let entry;
      try {
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_CANDIDATE_BYTES) throw fail('候选文件无效或超出预算', 'trial_integrity');
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
        entry = validateStoredRecord(raw, id, assetId);
        entry.file = file;
        entry.bytes = stat.size;
      } catch (error) {
        entry = invalidEntry(file, id, assetId, error);
        try { entry.bytes = fs.statSync(file).size; } catch { entry.bytes = 0; }
      }
      if(candidates.has(id)){const previous=candidates.get(id);candidateBytes-=previous.bytes||0;planBytes-=previous.planBytes||0;}
      candidates.set(id, entry);
      candidateBytes += entry.bytes || 0;
      planBytes += entry.planBytes || 0;
    }
    trim();
  };

  const ensureCurrentLoaded = () => {
    const current = metadata();
    loadAsset(current.assetId);
    return current;
  };

  const readStored = (entry) => {
    if (entry.invalidReason) throw fail(`候选文档完整性校验失败：${entry.invalidReason}`, 'trial_integrity');
    let doc = entry.doc;
    if (entry.file) {
      let stat;
      try {
        stat = fs.lstatSync(entry.file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_CANDIDATE_BYTES) throw fail('候选文件无效或超出预算', 'trial_integrity');
        const raw = JSON.parse(fs.readFileSync(entry.file, 'utf8'));
        const checked = validateStoredRecord(raw, entry.id, entry.assetId);
        doc = checked.doc;
        entry.plan = checked.plan;
        entry.metadata = checked.metadata;
        entry.planBytes = checked.planBytes;
        if (contentHash(doc) !== entry.candidateHash) throw fail('候选文档hash不匹配', 'trial_integrity');
        entry.bytes = stat.size;
      } catch (error) {
        entry.invalidReason = String(error?.message || error);
        throw Object.assign(error, { code: error.code || 'trial_integrity' });
      }
    }
    if (!doc || contentHash(doc) !== entry.candidateHash) throw fail('候选文档hash不匹配', 'trial_integrity');
    return clone(doc);
  };

  const lookup = (id) => {
    assertTrialId(id);
    const current = ensureCurrentLoaded();
    const entry = candidates.get(id);
    if (!entry || entry.assetId !== current.assetId) throw fail('候选不存在/已释放，请重新trial', 'trial_not_found');
    return entry;
  };

  function checkBase(base, args) {
    if (args.assetId !== undefined && args.assetId !== base.assetId) throw fail('会话已切换资源', 'binding_conflict');
    if (args.expectedRevision === undefined && !args.expectedHash) throw fail('trial需要expectedHash或expectedRevision', 'missing_base');
    if (args.expectedHash && args.expectedHash !== base.contentHash || args.expectedRevision !== undefined && args.expectedRevision !== base.revision) throw fail('试验基线已变化', 'conflict');
  }

  function candidate(base, args) {
    if (args.code !== undefined && typeof args.code !== 'string' || args.sourceId !== undefined && (typeof args.sourceId !== 'string' || !args.sourceId) || args.operations !== undefined && !Array.isArray(args.operations)) throw fail('候选源码/标识/operations参数类型错误');
    if (args.code !== undefined && args.sourceId !== undefined) throw fail('code与sourceId只选一个');
    if (args.moduleId !== undefined && args.operations !== undefined) throw fail('moduleId源码试验不能同时传operations；局部操作请直接使用operations明确ID');
    const hasOps = Array.isArray(args.operations), hasCode = typeof args.code === 'string' || typeof args.sourceId === 'string';
    if (hasOps === hasCode) throw fail('trial需要operations或code/sourceId之一');
    if (hasOps) {
      const c = service.candidate({ operations: args.operations, expectedHash: base.contentHash });
      if (base.doc.meta?.designPlan) attachDesignPlan(c.doc, base.doc.meta.designPlan);
      return { doc: c.doc, hash: c.contentHash, plan: { operations: clone(args.operations) } };
    }
    if (!sources || typeof sources.get !== 'function' || typeof sources.put !== 'function') throw fail('源码试验需要source store', 'source_store_unavailable');
    const code = args.code ?? sources.get(base.assetId, args.sourceId, base.doc.meta?.script), source = sources.put(base.assetId, code);
    if (args.moduleId !== undefined) {
      const operation = moduleReplacement(base.doc, args.moduleId, runModelerScript(code, { params: base.doc.meta?.generatorParams ?? {} }), code, args), c = service.candidate({ operations: [operation], expectedHash: base.contentHash });
      if (base.doc.meta?.designPlan) attachDesignPlan(c.doc, base.doc.meta.designPlan);
      return { doc: c.doc, hash: c.contentHash, operation, plan: { sourceId: source.sourceId, moduleId: args.moduleId, frameMode: args.frameMode || 'preserve' } };
    }
    const responsibilityPlan = args.designPlan === null ? null : args.designPlan || base.doc.meta?.designPlan || null;
    let rawDoc = normalizeDoc(runModelerScript(code, { params: base.doc.meta?.generatorParams ?? {} }));
    if (responsibilityPlan) rawDoc = attachDesignPlan(rawDoc, responsibilityPlan);
    else if (args.designPlan === null) delete rawDoc.meta.designPlan;
    const options = { source: 'generated', rebase: args.rebase === true, discardOverrides: args.discardOverrides === true };
    const prepared = service.candidateReplace(rawDoc, { ...options, expectedHash: base.contentHash });
    if (responsibilityPlan) attachDesignPlan(prepared.doc, responsibilityPlan);
    return { doc: prepared.doc, rawDoc, hash: prepared.contentHash, options, plan: { sourceId: source.sourceId, designPlan: responsibilityPlan, rebase: options.rebase, discardOverrides: options.discardOverrides } };
  }

  const candidateIdentity = (entry) => ({
    assetId: entry.assetId,
    revision: entry.baseRevision,
    contentHash: entry.candidateHash,
    candidateId: entry.id,
    candidateHash: entry.candidateHash,
    baseRevision: entry.baseRevision,
    baseHash: entry.baseHash,
  });

  const renderIdentity = (entry, doc) => ({ ...candidateIdentity(entry), doc: clone(doc) });
  const assertObservation = (value, name = 'observe') => {
    if (value === undefined || value === null) return null;
    assertObject(value, name);
    for (const key of Object.keys(value)) if (!OBSERVATION_KEYS.has(key)) throw fail(`未知${name}字段 ${key}`);
    return clone(value);
  };

  const captureStored = async (entry, captureArgs, { expectedCamera = null, doc = null } = {}) => {
    if (!renderSnapshot || !directory) throw fail('当前运行端没有候选截图能力', 'renderer_unavailable');
    const stored = doc || readStored(entry);
    const identity = candidateIdentity(entry);
    const snapshot = renderIdentity(entry, stored);
    const evidence = createEvidenceStore({
      directory,
      snapshot: () => ({ ...identity }),
      candidate: identity,
      candidateMetadata: identity,
      expectedBuildId: buildInfo?.clientBuildId,
      requestCapture: (request) => renderSnapshot(renderIdentity(entry, stored), request),
    });
    const request = { ...captureArgs };
    if (expectedCamera) request.camera = clone(expectedCamera);
    const result = await evidence.capture({ ...request, expectedHash: identity.contentHash, expectedRevision: identity.revision });
    const verified = readStored(entry);
    if (contentHash(verified) !== identity.contentHash) throw fail('候选在采集期间发生变化', 'stale_evidence');
    const bind = (receipt) => receipt && ({
      ...receipt,
      candidateId: entry.id,
      candidateHash: identity.contentHash,
      baseRevision: entry.baseRevision,
      baseHash: entry.baseHash,
      qualityApproved: false,
    });
    const bound=result?.captures ? { ...result, candidateId: entry.id, candidateHash: identity.contentHash, captures: result.captures.map(bind), qualityApproved: false } : bind(result);
    const previous=entry.bytes;entry.metadata={...entry.metadata,observation:{candidateId:entry.id,candidateHash:entry.candidateHash,baseHash:entry.baseHash,sameCamera:!!expectedCamera,frames:(bound.captures||[bound]).map(compactReceipt),captured:true,reviewed:false}};entry.bytes=persistEntry(entry);candidateBytes+=entry.bytes-previous;trim();return bound;
  };

  const captureBaseline = async (base, captureArgs, { expectedCamera = null } = {}) => {
    if (!renderSnapshot || !directory) throw fail('当前运行端没有候选截图能力', 'renderer_unavailable');
    const identity = { assetId: base.assetId, revision: base.revision, contentHash: base.contentHash, candidateId: null, candidateHash: base.contentHash, baseRevision: base.revision, baseHash: base.contentHash };
    const evidence = createEvidenceStore({
      directory,
      snapshot: () => ({ ...identity }),
      candidate: identity,
      candidateMetadata: identity,
      expectedBuildId: buildInfo?.clientBuildId,
      requestCapture: (request) => renderSnapshot({ ...clone(base), ...identity, doc: clone(base.doc) }, request),
    });
    const request = { ...captureArgs };
    if (expectedCamera) request.camera = clone(expectedCamera);
    const result = await evidence.capture({ ...request, expectedHash: base.contentHash, expectedRevision: base.revision });
    return result?.captures ? { ...result, candidateId: null, candidateHash: base.contentHash, qualityApproved: false, captures: result.captures.map((receipt) => ({ ...receipt, candidateId: null, candidateHash: base.contentHash, baseRevision: base.revision, baseHash: base.contentHash, qualityApproved: false })) } : { ...result, candidateId: null, candidateHash: base.contentHash, baseRevision: base.revision, baseHash: base.contentHash, qualityApproved: false };
  };

  const commonCompare = async (entries, observation, { stageMode = false } = {}) => {
    if (!entries.length) throw fail('compare至少需要一个候选');
    if (!renderSnapshot || !directory) throw fail('当前运行端没有候选截图能力', 'renderer_unavailable');
    const current = service.snapshot();
    const currentMeta = { assetId: current.assetId, revision: current.revision, contentHash: current.contentHash };
    for (const entry of entries) {
      if (entry.assetId !== currentMeta.assetId || entry.baseRevision !== currentMeta.revision || entry.baseHash !== currentMeta.contentHash) throw fail('候选基线已经变化', 'stale_trial');
      readStored(entry);
    }
    const width = observation.width === undefined ? (stageMode ? 720 : 1000) : observation.width;
    const height = observation.height === undefined ? (stageMode ? 480 : 700) : observation.height;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 64 || height < 64 || width > 2400 || height > 2400) throw fail('比较图像需64–2400整数');
    const isolate = observation.isolate ?? null, context = observation.context ?? [];
    const baselineBounds = selectedBounds(current.doc, isolate, context);
    const candidateBounds = entries.map((entry) => selectedBounds(readStored(entry), isolate, context));
    if (candidateBounds.some((bounds, index) => !bounds && entries[index])) throw fail('候选隔离对象没有可见几何', 'empty_geometry');
    const framing = unionBounds([baselineBounds, ...candidateBounds]);
    if (!framing) throw fail('比较对象没有可见几何', 'empty_geometry');
    const view = observation.view || (observation.camera ? 'custom' : 'iso');
    const resolved = resolveCamera(framing, { view, camera: observation.camera || {}, aspect: width / height, front: current.doc.meta?.front || [0, 0, 1] });
    const camera = cameraInput(resolved);
    const planned=observationForEdit({operations:entries.flatMap(entry=>entry.plan?.operations||[])},observation);
    const observationSelection=resolveCaptureSelection({...planned,mode:observation.mode||(stageMode?'clay':'material')});
    const request = {...planned,view,camera,width,height,mode:observationSelection.mode,displayMode:observationSelection.displayMode,isolate,context};
    delete request.expectedHash;
    delete request.expectedRevision;
    const baseline = baselineBounds ? await captureBaseline(current, request, { expectedCamera: camera }) : null;
    const candidateReceipts = [];
    for (const entry of entries) {
      const receipt = await captureStored(entry, request, { expectedCamera: camera });
      candidateReceipts.push({ id: entry.id, candidateHash: entry.candidateHash, after: receipt, evidence: receipt });
    }
    const after = service.metadata ? service.metadata() : service.snapshot();
    if (after.assetId !== currentMeta.assetId || after.revision !== currentMeta.revision || after.contentHash !== currentMeta.contentHash) throw fail('比较期间原资产变化，候选已过期', 'stale_trial');
    return {
      sameCamera: true,
      camera,
      mode: request.mode,
      displayMode: observationSelection.displayMode,
      observationSelection,
      lighting: request.lighting || null,
      width,
      height,
      isolate,
      context,
      ...(observation.section !== undefined ? { section: clone(observation.section) } : {}),
      baseline,
      candidates: candidateReceipts,
      before: baseline,
      ...(candidateReceipts.length === 1 ? { after: candidateReceipts[0].evidence } : {}),
      baselineHadVisibleGeometry: !!baselineBounds,
      reviewed: false,
      qualityApproved: false,
    };
  };

  async function stage(args = {}) {
    ensureCurrentLoaded();
    const base = service.snapshot();
    checkBase(base, args);
    const started = performance.now();
    const c = candidate(base, args), id = `trial_${crypto.randomUUID()}`;
    const queries = args.diagnostics ?? [];
    if (!Array.isArray(queries) || queries.length > 3) throw fail('每次trial最多3项局部diagnostics');
    const inspect = (doc, query) => ['path', 'symmetry', 'all'].includes(query.query) ? checkRolesDoc(doc, query) : diagnoseDoc(doc, query);
    const diagnostics = queries.map((query) => ({ query: clone(query), before: inspect(base.doc, query), after: inspect(c.doc, query) }));
    const topKeys = ['purpose', 'camera', 'view', 'mode', 'displayMode', 'lighting', 'isolate', 'context', 'section', 'width', 'height'], top = topKeys.filter((key) => args[key] !== undefined), aliases = [];
    if (args.observe !== undefined && args.compare !== undefined) throw fail('observe与compare只选一个');
    let observed = args.observe;
    if (observed === undefined && args.compare !== undefined) { if (args.compare === true) observed = {}; else if (args.compare === false) observed = null; else observed = args.compare; aliases.push('compare→observe'); }
    if (top.length) { if (observed !== undefined && observed !== null) throw fail('观察字段请统一放到observe，不能混用顶层和observe/compare'); observed = Object.fromEntries(top.map((key) => [key, args[key]])); aliases.push('top-level observation fields→observe'); }
    if (args.views !== undefined) throw fail('trial固定一个机位，请使用observe.view或observe.camera');
    if (observed !== undefined && observed !== null && (!observed || typeof observed !== 'object' || Array.isArray(observed))) throw fail('observe需要观察参数对象；help topic:actions query:trial');
    if (observed) for (const key of Object.keys(observed)) if (!topKeys.includes(key)) throw fail(`未知observe字段 ${key}；help topic:actions query:trial`);
    const observation = observed ? clone(observed) : null;
    const summary = analyzeDoc(c.doc).summary;
    const plan = { ...c.plan };
    const planSize = byteLength(plan);
    if (planSize > MAX_PLAN_BYTES) throw fail('候选操作超出预算', 'trial_budget');
    const entry = {
      id,
      assetId: base.assetId,
      baseRevision: base.revision,
      baseHash: base.contentHash,
      candidateHash: c.hash,
      createdAt: new Date().toISOString(),
      doc: clone(c.doc),
      plan,
      planBytes: planSize,
      metadata: {
        summary: clone(summary),
        diagnosticCount: diagnostics.length,
        ...(observation ? { observation: clone(observation) } : {}),
        aliases: clone(aliases),
      },
      file: null,
      bytes: 0,
    };
    const serialized = serializedRecord(entry);
    entry.bytes = serialized.size;
    if (candidateBytes + entry.bytes > MAX_CANDIDATE_TOTAL_BYTES && candidates.size >= MAX_CANDIDATES) throw fail('候选总存储超出预算', 'trial_budget');
    const currentBeforeStore = service.metadata ? service.metadata() : service.snapshot();
    if (currentBeforeStore.assetId !== base.assetId || currentBeforeStore.revision !== base.revision || currentBeforeStore.contentHash !== base.contentHash) throw fail('试验期间原资产变化，候选已过期', 'stale_trial');
    // The document and replay plan are committed as one candidate file before the
    // candidate is published in memory. A failed rename leaves no visible trial.
    persistEntry(entry);
    candidates.set(id, entry);
    candidateBytes += entry.bytes;
    planBytes += entry.planBytes;
    trim();

    let comparison = null;
    if (observation) {
      comparison = await commonCompare([entry], observation, { stageMode: true });
    }
    const current = service.metadata ? service.metadata() : service.snapshot();
    if (current.assetId !== base.assetId || current.revision !== base.revision || current.contentHash !== base.contentHash) throw fail('观察期间原资产变化，候选已过期', 'stale_trial');
    const text = observation ? null : formatTextPreview(rasterDoc(c.doc, { views: ['iso'], cols: 56, rows: 22, samples: 1 }), { channel: 'shade', maxChars: 3000 });
    const planReceipt = { id, assetId: base.assetId, baseRevision: base.revision, baseHash: base.contentHash, candidateHash: c.hash, ...plan };
    return {
      ok: true,
      id,
      assetId: base.assetId,
      baseRevision: base.revision,
      baseHash: base.contentHash,
      candidateHash: c.hash,
      changedCurrentAsset: false,
      summary,
      delta: diffDocs(base.doc, c.doc),
      diagnostics,
      comparison:compactComparison(comparison,false),
      inputAliases: aliases,
      observationContract: { canonicalField: 'observe', imagesRequested: !!observation, help: { action: 'help', args: { topic: 'actions', query: 'trial' } } },
      preview: text,
      elapsedMs: +(performance.now() - started).toFixed(2),
      next: { action: 'accept_trial', args: { id, assetId: base.assetId, expectedRevision: base.revision, expectedHash: base.contentHash }, alternative: { action: 'discard_trial', args: { id } } },
      qualityApproved: false,
      candidate: publicMetadata(entry, base),
      // Kept internal enough for accept's replay path; the public stage response
      // does not expose the candidate document.
      ...(planReceipt.designPlan ? { designPlan: clone(planReceipt.designPlan) } : {}),
    };
  }

  function snapshot(id) {
    const entry = lookup(id);
    const doc = readStored(entry);
    return { assetId: entry.assetId, revision: entry.baseRevision, contentHash: entry.candidateHash, doc };
  }

  function get(id) {
    return publicMetadata(lookup(id));
  }

  function list(options = {}) {
    assertObject(options, 'list参数');
    const current = ensureCurrentLoaded();
    if (options.assetId !== undefined && options.assetId !== current.assetId) throw fail('只能读取当前资源的候选', 'binding_conflict');
    const offset = options.offset === undefined ? 0 : options.offset;
    const limit = options.limit === undefined ? MAX_CANDIDATES : options.limit;
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_CANDIDATES) throw fail('候选分页参数无效');
    const all = [...candidates.values()].filter((entry) => entry.assetId === current.assetId).reverse();
    const items = all.slice(offset, offset + limit).map((entry) => publicMetadata(entry, current));
    return { items, total: all.length, nextOffset: offset + items.length < all.length ? offset + items.length : null };
  }

  function diagnose(id, query) {
    const entry = lookup(id), doc = readStored(entry);
    const input = typeof query === 'string' ? { query } : assertObject(query, 'diagnose query');
    const report = ['path', 'symmetry', 'all'].includes(input.query) ? checkRolesDoc(doc, input) : diagnoseDoc(doc, input);
    return { ok: true, id: entry.id, assetId: entry.assetId, revision: entry.baseRevision, baseRevision: entry.baseRevision, baseHash: entry.baseHash, contentHash: entry.candidateHash, candidateHash: entry.candidateHash, qualityApproved: false, ...report };
  }

  async function observe(args = {}) {
    assertObject(args, 'observe参数');
    const { id, ...captureArgs } = args;
    const entry = lookup(id);
    assertObservation(captureArgs, 'observe');
    const evidence = await captureStored(entry, captureArgs);
    return { ok: true, id: entry.id, assetId: entry.assetId, revision: entry.baseRevision, baseRevision: entry.baseRevision, baseHash: entry.baseHash, contentHash: entry.candidateHash, candidateHash: entry.candidateHash, evidence:evidence?.captures?{...evidence,captures:evidence.captures.map(compactReceipt)}:compactReceipt(evidence), qualityApproved: false };
  }

  async function compare(args = {}) {
    assertObject(args, 'compare参数');
    if (!Array.isArray(args.ids) || args.ids.length < 1 || args.ids.length > 4 || new Set(args.ids).size !== args.ids.length) throw fail('compare.ids需要1–4个不同候选id');
    const observation = assertObservation(args.observe, 'compare.observe');
    if (!observation) throw fail('compare需要observe参数');
    const entries = args.ids.map((id) => lookup(id));
    const first = entries[0];
    if (entries.some((entry) => entry.assetId !== first.assetId || entry.baseRevision !== first.baseRevision || entry.baseHash !== first.baseHash)) throw fail('compare候选必须来自同一资源和基线', 'candidate_binding_conflict');
    const comparison = await commonCompare(entries, observation);
    return { ok: true, assetId: first.assetId, baseRevision: first.baseRevision, baseHash: first.baseHash, ids: entries.map((entry) => entry.id), candidateHashes: entries.map((entry) => entry.candidateHash), ...compactComparison(comparison,true) };
  }

  function accept(args = {}) {
    assertObject(args, 'accept参数');
    const entry = lookup(args.id);
    const base = service.snapshot();
    checkBase(base, args);
    if (base.assetId !== entry.assetId || base.revision !== entry.baseRevision || base.contentHash !== entry.baseHash) throw fail('候选基线已经变化', 'stale_trial');
    const storedDoc = readStored(entry);
    const replay = candidate(base, entry.plan);
    if (replay.hash !== entry.candidateHash || contentHash(storedDoc) !== entry.candidateHash) throw fail('候选无法按原内容重建', 'trial_integrity');
    const label = args.label || args.reason || '接受局部试验';
    const result = entry.plan.operations || entry.plan.moduleId
      ? service.apply({ operations: entry.plan.operations || [replay.operation], expectedHash: entry.baseHash, expectedRevision: entry.baseRevision, label })
      : service.replace(replay.rawDoc, { ...replay.options, expectedHash: entry.baseHash, expectedRevision: entry.baseRevision, label });
    const finish=result=>{
    const observation = entry.metadata?.observation ? clone(entry.metadata.observation) : null;
    const reason = args.reason === undefined ? null : String(args.reason);
    let selectionPath=null,selectionWarning=null;if(storageRoot){try{selectionPath=path.join(assetDirectory(entry.assetId),'accepted',entry.id+'.json');writeAtomic(selectionPath,JSON.stringify({trialId:entry.id,assetId:entry.assetId,baseRevision:entry.baseRevision,baseHash:entry.baseHash,acceptedRevision:result.revision,acceptedContentHash:result.contentHash,reason,observation,qualityApproved:false,acceptedAt:new Date().toISOString()},null,2));}catch(error){selectionWarning='候选已提交，选择记录写入失败：'+error.message;selectionPath=null;}}
    removeEntry(entry);
    return { snapshot: result, trialId: entry.id, acceptedCandidateHash: entry.candidateHash, reason, observation,selectionPath,selectionWarning,qualityApproved: false, ...(entry.plan.sourceId && !entry.plan.moduleId ? { designPlanApplied: entry.plan.designPlan ?? null } : {}) };
    };return result&&typeof result.then==='function'?result.then(finish):finish(result);
  }

  function discard(value) {
    const id = typeof value === 'string' ? value : assertObject(value, 'discard参数').id;
    assertTrialId(id);
    const current = ensureCurrentLoaded();
    const entry = candidates.get(id);
    if (!entry || entry.assetId !== current.assetId) return { ok: true, id, discarded: false, changedCurrentAsset: false };
    removeEntry(entry);
    return { ok: true, id, discarded: true, changedCurrentAsset: false };
  }

  // Load only the service's currently bound asset. Other asset directories are
  // never enumerated, which keeps candidate ownership and path scope explicit.
  // Load lazily: service construction precedes the Host session AsyncLocal scope.

  return {
    stage,
    accept,
    discard,
    snapshot,
    get,
    list,
    diagnose,
    observe,
    compare,
    state: () => {
      const current = ensureCurrentLoaded();
      const owned = [...candidates.values()].filter((entry) => entry.assetId === current.assetId);
      return { candidates: owned.length, planBytes, candidateBytes, currentAssetId: current.assetId };
    },
  };
}
