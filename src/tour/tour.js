import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import './tour.css';

/* ---------- where the 3D assets live (Cloudflare R2 in production) ---------- */
const TYPE = (location.pathname.match(/\/tour\/([\w-]+)/) || [null, 'e-type'])[1];
const ASSET_ROOT = (import.meta.env.VITE_TOUR_ASSET_BASE || '/tour-assets').replace(/\/$/, '');
// Assets are cached as immutable, so every asset update must ship under a new version folder.
const ASSET_VERSION = { 'g-type': 'v7', 'e-type': 'v3', 'm-type': 'v4' };
const BASE = `${ASSET_ROOT}/${TYPE}/${ASSET_VERSION[TYPE] || 'v2'}/`;
const TYPE_LABEL = TYPE.replace(/-type$/i, '').toUpperCase() + '-Type';
document.title = `TIMOR CREST · ${TYPE_LABEL} 3D 둘러보기`;
for (const [id, text] of [['brandType', `${TYPE_LABEL} · 3D 둘러보기`], ['startTitle', `${TYPE_LABEL} 세대 둘러보기`]]) {
  const el = document.getElementById(id); if (el) el.textContent = text;
}
const url = (p) => (/^https?:/.test(p) ? p : BASE + p);

const isTouch = matchMedia('(pointer:coarse)').matches;
if (isTouch) {
  document.body.classList.add('touch');
  document.getElementById('keys').innerHTML = '<span><kbd>화면 왼쪽 드래그</kbd></span><span>이동</span><span><kbd>화면 오른쪽 드래그</kbd></span><span>시점 회전</span>';
}

/* ---------- renderer / scene ---------- */
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb4c4);
// Fixed viewing settings (not adjustable by visitors).
const FOV = 90;
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 2000); // near 0.1: better depth precision on phones (walk radius is 0.17)
camera.rotation.order = 'YXZ';

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = FOV;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

/* ---------- loading ---------- */
const manager = new THREE.LoadingManager();
const bar = document.querySelector('#bar i'), pct = document.getElementById('pct'), go = document.getElementById('go');
manager.onProgress = (_, done, total) => {
  const p = Math.round(done / total * 100);
  bar.style.width = p + '%'; pct.textContent = '공간을 불러오는 중… ' + p + '%';
};
const ktx2 = new KTX2Loader(manager)
  .setTranscoderPath(`https://cdn.jsdelivr.net/npm/three@0.${THREE.REVISION}.0/examples/jsm/libs/basis/`)
  .detectSupport(renderer);
const gltf = new GLTFLoader(manager).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
const texLoader = new THREE.TextureLoader(manager);
const lazyLoader = texLoader;

function finishTex(t) {
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (t.isCompressedTexture) {
    t.minFilter = t.mipmaps && t.mipmaps.length > 1 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  } else {
    t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  }
  return t;
}
function loadTex(u) {
  const full = url(u);
  const loader = full.endsWith('.ktx2') ? ktx2 : texLoader;
  return new Promise((res, rej) => loader.load(full, t => res(finishTex(t)), undefined, rej));
}
const loadGLB = (u) => new Promise((res, rej) => gltf.load(url(u), res, undefined, rej));

const data = await (await fetch(url('scene.json'))).json();
const groupMats = {};       // group -> [materials] (for variant swap)
const variantCache = {};    // url -> texture

/* ---------- realistic reflections: material classes + box-projected room probes ---------- */
const IS_MOBILE = isTouch || Math.min(screen.width, screen.height) < 820;
const CLS = {
  polished: { r: 0.12, env: 1.0 }, stone: { r: 0.26, env: 0.9 }, lacquer: { r: 0.30, env: 0.8 },
  wood: { r: 0.42, env: 0.6 }, satin: { r: 0.55, env: 0.45 }, blackglass: { r: 0.03, env: 1.0 },
  steel: { metal: 1, color: 0x9d9a95, r: 0.32, env: 0.85, emis: 0.30 }, bronze: { metal: 1, color: 0x6b5442, r: 0.36, env: 1.0, emis: 0.55 },
  brass: { metal: 1, color: 0xd9ad6b, r: 0.24, env: 1.0, emis: 0.35 }, darkmetal: { metal: 1, color: 0x5a4c40, r: 0.32, env: 1.0, emis: 0.55 },
  // mirrors: pure reflection of the room probe (a baked mirror is only a flat stand-in colour and reads as a hole)
  mirror: { metal: 1, color: 0xf2f4f4, r: 0.02, env: 1.0, emis: 0 },
  // softer gold for thin frames/hardware: a very glossy thin metal edge sparkles while the camera moves
  brass_soft: { metal: 1, color: 0xd5ab6c, r: 0.42, env: 0.75, emis: 0.45 }
};
const MATCLS = {};
const put = (c, names) => names.forEach(n => MATCLS[n] = c);
put('polished', ['MAT_RI_MARBLE_FLOOR', 'MAT_RI_ENTRY_STONE', 'MAT_RI_CERAMIC_BASIN', 'porcelain', 'MAT_RI_CERAMIC_IVORY', 'MAT_RI_CERAMIC_TAUPE', 'ceramic_vase_01', 'ceramic_vase_04']);
put('stone', ['MAT_RI_STONE_SLAB', 'MAT_RI_STONE_SLAB_WALL', 'MAT_RI_STONE_TILE_WALL']);
put('lacquer', ['MAT_RI_CABINET_TAUPE', 'MAT_WEB_BUILTIN_IVORY', 'MAT_RI_APPLIANCE_WHITE']);
put('wood', ['MAT_RI_OAK_X', 'MAT_RI_OAK_Z', 'MAT_RI_WALNUT_ARCH_Z', 'MAT_RI_WALNUT_Z', 'MAT_RI_WALNUT_Y', 'fine_grained_wood.001', 'fine_grained_wood_0.001', 'side_table_01']);
put('satin', ['MAT_RI_CARCASS_DARK', 'MAT_RI_TRIM_WHITE', 'MAT_DOOR_LIGHT_GREY', 'MAT_WINDOW_FRAME_DARK_GREY', 'plastic_plastic', 'MI_Leather01', 'White_leather.001', 'leather_red_02.001', 'Material.009']);
put('blackglass', ['MAT_RI_APPLIANCE_GLASS', 'MAT_RI_TV_BLACK', 'BlackGlass']);
put('steel', ['MAT_RI_STEEL_BRUSHED']); put('bronze', ['MAT_RI_BRONZE_DARK']); put('brass', ['MAT_RI_BRASS']);
put('darkmetal', ['MI_MetalChromeScratched01', 'M_amalfi_darck_menal']);
// per-unit material classes shipped with the scene (e.g. G-type MAT_G_* names)
for (const [c, names] of Object.entries(data.matcls || {})) put(c, names);

const probe = { min: { value: new THREE.Vector3(-1e4, -1e4, -1e4) }, max: { value: new THREE.Vector3(1e4, 1e4, 1e4) }, pos: { value: new THREE.Vector3() } };
const BOX_CHUNK = THREE.ShaderChunk.envmap_physical_pars_fragment.replace(
  'reflectVec = inverseTransformDirection( reflectVec, viewMatrix );',
  'reflectVec = inverseTransformDirection( reflectVec, viewMatrix );\n\t\t\treflectVec = tcBoxProject( reflectVec );');
function boxProject(mat) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uBoxMin = probe.min; sh.uniforms.uBoxMax = probe.max; sh.uniforms.uProbePos = probe.pos;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTcWP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvTcWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uBoxMin; uniform vec3 uBoxMax; uniform vec3 uProbePos; varying vec3 vTcWP;
vec3 tcBoxProject(vec3 r) {
  vec3 a = (uBoxMax - vTcWP) / r; vec3 b = (uBoxMin - vTcWP) / r; vec3 f = max(a, b);
  float d = min(min(f.x, f.y), f.z);
  return normalize(vTcWP + r * d - uProbePos);
}`).replace('#include <envmap_physical_pars_fragment>', BOX_CHUNK);
  };
  mat.customProgramCacheKey = () => 'tcbox';
}
const reflective = [];   // materials that receive the current room probe
// Surfaces mounted a few mm in front of another (TV glass, pictures, downlight lenses, flush hardware) z-fight
// on GPUs with low depth precision; a polygon offset (in depth-buffer units, so it scales with the device)
// keeps the front surface in front. Level 2 sits above level 1 (e.g. a picture on its frame on wall panelling).
const DECAL = data.decal || {};
function decal(m, key) {
  const lv = DECAL[key];
  if (lv) { m.polygonOffset = true; m.polygonOffsetFactor = -lv; m.polygonOffsetUnits = -4 * lv; }
  return m;
}
function makeMat(name, baked) {
  const key = MATCLS[name] || DECAL[name] ? name : name.replace(/\.\d{3}$/, '');
  const c = CLS[MATCLS[key]];
  if (!c) return decal(new THREE.MeshBasicMaterial({ map: baked }), key);
  const m = decal(new THREE.MeshStandardMaterial({
    color: c.metal ? c.color : 0x000000, metalness: c.metal ? 1 : 0, roughness: IS_MOBILE ? Math.max(c.r, 0.08) : c.r,
    emissive: 0xffffff, emissiveMap: baked, emissiveIntensity: c.emis ?? 1, envMapIntensity: c.env
  }), key);
  m.userData.cls = MATCLS[key]; boxProject(m); reflective.push(m); return m;
}

const jobs = data.groups.map(async g => {
  const [glb, tex] = await Promise.all([loadGLB(g.glb), g.tex ? loadTex(g.tex) : null]);
  const mats = groupMats[g.name] = [];
  if (g.tex) variantCache[g.tex] = tex;
  let glassMat = null, glassRefl = null;
  if (g.kind === 'glass') {
    glassMat = new THREE.MeshBasicMaterial({ color: 0xdfe8ec, transparent: true, opacity: 0.10, depthWrite: false, side: THREE.DoubleSide });
    glassRefl = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.04, metalness: 0, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, envMapIntensity: 1.0, side: THREE.DoubleSide });
    boxProject(glassRefl); reflective.push(glassRefl);
    const ops = (data.openings || []).map(o => `(vWP.x>${o.min[0].toFixed(3)}&&vWP.x<${o.max[0].toFixed(3)}&&vWP.y>${o.min[1].toFixed(3)}&&vWP.y<${o.max[1].toFixed(3)}&&vWP.z>${o.min[2].toFixed(3)}&&vWP.z<${o.max[2].toFixed(3)})`);
    if (ops.length) {
      const cut = 'if (' + ops.join('||') + ') discard;';
      glassMat.onBeforeCompile = sh => {
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('void main() {', 'void main() {\n ' + cut);
      };
      const prev = glassRefl.onBeforeCompile;
      glassRefl.onBeforeCompile = sh => { prev(sh); sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'void main() {\n vec3 vWP = vTcWP; ' + cut); };
      glassRefl.customProgramCacheKey = () => 'tcbox-glass';
    }
  }
  const extra = [];
  glb.scene.traverse(o => {
    if (!o.isMesh) return;
    if (g.kind === 'baked') {
      if (g.opacity) {
        const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: g.opacity, depthWrite: false, side: THREE.DoubleSide });
        o.material = m; mats.push(m);
      } else {
        const m = makeMat(o.material?.name || '', tex); o.material = m; mats.push(m);
        if (m.isMeshStandardMaterial) o.geometry.computeVertexNormals();
      }
    } else if (g.kind === 'glass') {
      o.material = glassMat; o.renderOrder = 2;
      o.geometry.computeVertexNormals();
      const r = new THREE.Mesh(o.geometry, glassRefl); r.renderOrder = 3; r.matrixAutoUpdate = false; extra.push([o, r]);
    } else if (g.kind === 'pbr') {
      const m = o.material;
      if (m.map) { m.alphaTest = 0.4; m.transparent = false; }
      m.side = THREE.DoubleSide; m.envMapIntensity = 1.0; reflective.push(m);
    }
    o.matrixAutoUpdate = false; o.updateMatrix();
  });
  for (const [o, r] of extra) { r.matrix.copy(o.matrix); o.parent.add(r); }
  scene.add(glb.scene);
});

/* probes: equirect Cycles renders per room, prefiltered on demand */
const pmrem = new THREE.PMREMGenerator(renderer);
const probeLoader = new THREE.TextureLoader();
const probeCache = {};
let currentProbe = null;
const ENV_ROT = new THREE.Euler(0, data.panoYaw || 0, 0);
function probeFor(roomId) { return (data.probes || []).find(p => p.rooms.includes(roomId)); }
function setProbe(p) {
  if (!p || currentProbe === p.id) return;
  currentProbe = p.id;
  const apply = env => {
    if (currentProbe !== p.id) return;
    probe.min.value.fromArray(p.min); probe.max.value.fromArray(p.max); probe.pos.value.fromArray(p.p);
    for (const m of reflective) { m.envMap = env; m.envMapRotation.copy(ENV_ROT); m.needsUpdate = !m.userData.hadEnv; m.userData.hadEnv = true; }
  };
  if (probeCache[p.id]) return apply(probeCache[p.id]);
  probeLoader.load(url(p.url), t => {
    t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
    const env = pmrem.fromEquirectangular(t).texture; t.dispose();
    probeCache[p.id] = env; apply(env);
  });
}

if (data.pano) loadTex(data.pano).then(t => {
  if (!t.isCompressedTexture) t.flipY = true;   // KTX2 pano is stored pre-flipped
  t.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = t; scene.backgroundRotation.set(0, data.panoYaw || 0, 0);
});

await Promise.all(jobs);
pct.textContent = '준비 완료'; bar.style.width = '100%'; go.classList.add('ready');

/* ---------- collision ---------- */
const BLOCK = data.boxes.filter(b => b.k === 'block');
const FLOORS = data.boxes.filter(b => b.k === 'floor');
const R = 0.17, STEP = 0.32;
const EYE = 1.4; // fixed eye height (m)
const player = new THREE.Vector3(...data.spawn.p);
let yaw = data.spawn.yaw, pitch = 0, feet = player.y - EYE;

function floorAt(x, z, cur) {
  let best = null;
  for (const b of FLOORS) {
    if (x < b.min[0] || x > b.max[0] || z < b.min[2] || z > b.max[2]) continue;
    const top = b.max[1];
    if (top <= cur + STEP && (best === null || top > best)) best = top;
  }
  return best;
}
function hits(x, z, f) {
  for (const b of BLOCK) {
    if (b.max[1] < f + STEP + 0.02 || b.min[1] > f + 1.75) continue;
    const cx = Math.max(b.min[0], Math.min(x, b.max[0]));
    const cz = Math.max(b.min[2], Math.min(z, b.max[2]));
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < R * R) return true;
  }
  return false;
}
function tryMove(dx, dz) {
  const n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.05) || 1;
  for (let i = 0; i < n; i++) {
    const sx = dx / n, sz = dz / n;
    let nx = player.x + sx, nz = player.z;
    let f = floorAt(nx, nz, feet);
    if (f !== null && !hits(nx, nz, f)) { player.x = nx; feet = f; }
    nx = player.x; nz = player.z + sz;
    f = floorAt(nx, nz, feet);
    if (f !== null && !hits(nx, nz, f)) { player.z = nz; feet = f; }
  }
}

/* ---------- input ---------- */
const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; });
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

const startEl = document.getElementById('start'), cross = document.getElementById('cross');
let started = false;
function begin() {
  startEl.style.display = 'none'; started = true;
  if (!isTouch) canvas.requestPointerLock?.();
}
go.addEventListener('click', begin);
canvas.addEventListener('click', () => { if (started && !isTouch && document.pointerLockElement !== canvas) canvas.requestPointerLock?.(); });
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  cross.style.display = locked ? 'block' : 'none';
  document.getElementById('hint').innerHTML = locked
    ? '<kbd>W A S D</kbd> 이동 · 마우스 시점 · <kbd>Shift</kbd> 빠르게 · <kbd>Esc</kbd> 커서 해제'
    : '화면을 클릭하면 다시 둘러볼 수 있습니다 · 옵션은 오른쪽에서 선택';
});
addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas) return;
  yaw -= e.movementX * 0.0022; pitch -= e.movementY * 0.0022;
  pitch = Math.max(-1.35, Math.min(1.35, pitch));
});

// touch: floating joystick on the left half, drag-to-look on the right half (Touch Events, multi-touch safe)
const joy = document.getElementById('joy'), knob = joy.querySelector('i');
let joyV = { x: 0, y: 0 };
if (isTouch) {
  const RAD = 58;
  let moveT = null, lookT = null, origin = null, last = null;
  const onUI = el => el && el.closest && el.closest('.panel, button, #opts, #mapwrap, #optToggle, #start, a, input, label');
  const setKnob = (x, y) => { knob.style.transform = `translate(${x * 40}px,${y * 40}px)`; };
  const resetJoy = () => { moveT = null; joyV = { x: 0, y: 0 }; setKnob(0, 0); joy.classList.remove('active'); joy.style.left = ''; joy.style.top = ''; };
  addEventListener('touchstart', e => {
    if (!started) return;
    let used = false;
    for (const t of e.changedTouches) {
      if (onUI(t.target)) continue;
      if (moveT === null && t.clientX < innerWidth * 0.5) {
        moveT = t.identifier; origin = { x: t.clientX, y: t.clientY }; used = true;
        joy.classList.add('active'); joy.style.left = (t.clientX - 66) + 'px'; joy.style.top = (t.clientY - 66) + 'px'; setKnob(0, 0);
      } else if (lookT === null) { lookT = t.identifier; last = { x: t.clientX, y: t.clientY }; used = true; }
    }
    if (used) e.preventDefault();
  }, { passive: false });
  addEventListener('touchmove', e => {
    let used = false;
    for (const t of e.changedTouches) {
      if (t.identifier === moveT) {
        let x = (t.clientX - origin.x) / RAD, y = (t.clientY - origin.y) / RAD;
        const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
        joyV = { x, y }; setKnob(x, y); used = true;
      } else if (t.identifier === lookT) {
        yaw += (t.clientX - last.x) * 0.0055; pitch += (t.clientY - last.y) * 0.0055;
        pitch = Math.max(-1.35, Math.min(1.35, pitch)); last = { x: t.clientX, y: t.clientY }; used = true;
      }
    }
    if (used) e.preventDefault();
  }, { passive: false });
  const end = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveT) resetJoy();
      if (t.identifier === lookT) lookT = null;
    }
  };
  addEventListener('touchend', end); addEventListener('touchcancel', end);
}

/* ---------- viewpoints ---------- */
const viewsEl = document.getElementById('views');
let flyTo = null;
data.views.forEach((v, i) => {
  const b = document.createElement('button'); b.textContent = v.label;
  b.onclick = () => teleport(v.p[0], v.p[2], v.yaw);
  viewsEl.appendChild(b);
});
function teleport(x, z, toYaw) {
  const f = floorAt(x, z, 99);
  if (f === null) return;
  flyTo = { from: player.clone(), to: new THREE.Vector3(x, f + EYE, z), y0: yaw, y1: toYaw ?? yaw, t: 0, f };
  if (flyTo.y1 - flyTo.y0 > Math.PI) flyTo.y1 -= Math.PI * 2;
  if (flyTo.y0 - flyTo.y1 > Math.PI) flyTo.y1 += Math.PI * 2;
}

window.__tc = { // small hook for automated QA screenshots
  go(i, p = 0) { const v = data.views[i]; const f = floorAt(v.p[0], v.p[2], 99); player.set(v.p[0], f + EYE, v.p[2]); feet = f; yaw = v.yaw; pitch = p; flyTo = null; },
  look(y, p) { yaw = y; pitch = p; }, at(x, z, y) { const f = floorAt(x, z, 99); player.set(x, f + EYE, z); feet = f; yaw = y; flyTo = null; }, get pos() { return [player.x, player.y, player.z, yaw, pitch]; }
};

/* ---------- options ---------- */
const optList = document.getElementById('optList'), totalEl = document.getElementById('total');
const sel = {};
const won = n => (n > 0 ? '+' : '') + '₩' + n.toLocaleString('ko-KR');
data.options.forEach(op => {
  sel[op.id] = 0;
  const g = document.createElement('div'); g.className = 'grp';
  g.innerHTML = `<div class="t"><span>${op.label}</span><span>${op.area || ''}</span></div>`;
  op.choices.forEach((c, i) => {
    const b = document.createElement('button'); b.className = 'ch' + (i === 0 ? ' on' : '');
    b.innerHTML = `<span class="sw" style="background:${c.swatch}"></span><span class="nm">${c.label}</span><span class="pr">${c.price ? won(c.price) : '기본'}</span>`;
    b.onclick = async () => {
      g.querySelectorAll('.ch').forEach(x => x.classList.remove('on')); b.classList.add('on');
      sel[op.id] = i; updateTotal();
      for (const [group, url] of Object.entries(c.tex)) {
        const ms = groupMats[group]; if (!ms) continue;
        const t = variantCache[url] || (variantCache[url] = await loadTex(url));
        for (const m of ms) {
          if (m.isMeshStandardMaterial) m.emissiveMap = t; else m.map = t;
          if (c.rough !== undefined && m.isMeshStandardMaterial) m.roughness = c.rough;
          m.needsUpdate = true;
        }
      }
    };
    g.appendChild(b);
    // prefetch variants in background
    if (i > 0) setTimeout(() => Object.values(c.tex).forEach(u => { if (!variantCache[u]) loadTex(u).then(t => variantCache[u] = t); }), 1500);
  });
  optList.appendChild(g);
});
function updateTotal() {
  let s = 0; data.options.forEach(op => s += op.choices[sel[op.id]].price || 0);
  totalEl.textContent = '₩' + s.toLocaleString('ko-KR');
}
/* ---------- panel toggles (options / floor plan) ---------- */
function bindToggle(btnId, hideClass, on) {
  const btn = document.getElementById(btnId);
  const set = (v) => {
    on = v;
    document.body.classList.toggle(hideClass, !on);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
  };
  btn.onclick = () => set(!on);
  set(on);
}
const smallScreen = matchMedia('(max-width:900px)').matches;
bindToggle('optToggle', 'hide-opts', !smallScreen);
bindToggle('mapToggle', 'hide-map', true);

/* ---------- minimap ---------- */
const map = document.getElementById('map'), mc = map.getContext('2d');
const W = data.plan.walls, bnd = data.plan.bounds; // [minX,minZ,maxX,maxZ]
const pad = 18, S = (map.width - pad * 2) / Math.max(bnd[2] - bnd[0], bnd[3] - bnd[1]);
const ox = pad + ((map.width - pad * 2) - (bnd[2] - bnd[0]) * S) / 2, oz = pad + ((map.height - pad * 2) - (bnd[3] - bnd[1]) * S) / 2;
const mx = x => ox + (x - bnd[0]) * S, mz = z => oz + (z - bnd[1]) * S;
const planImg = document.createElement('canvas'); planImg.width = map.width; planImg.height = map.height;
{
  const c = planImg.getContext('2d');
  c.fillStyle = 'rgba(244,239,232,.08)';
  FLOORS.forEach(b => c.fillRect(mx(b.min[0]), mz(b.min[2]), (b.max[0] - b.min[0]) * S, (b.max[2] - b.min[2]) * S));
  c.fillStyle = 'rgba(244,239,232,.85)';
  W.forEach(b => c.fillRect(mx(b[0]), mz(b[1]), Math.max(1.5, (b[2] - b[0]) * S), Math.max(1.5, (b[3] - b[1]) * S)));
  c.font = '500 17px "Noto Sans KR", sans-serif'; c.fillStyle = 'rgba(244,239,232,.55)'; c.textAlign = 'center'; c.textBaseline = 'middle';
  data.rooms.forEach(r => c.fillText(r.label, mx((r.r[0] + r.r[2]) / 2), mz((r.r[1] + r.r[3]) / 2)));
}
function drawMap() {
  mc.clearRect(0, 0, map.width, map.height); mc.drawImage(planImg, 0, 0);
  const px = mx(player.x), pz = mz(player.z);
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const a = Math.atan2(fz, fx);
  mc.fillStyle = 'rgba(184,135,90,.28)'; mc.beginPath(); mc.moveTo(px, pz); mc.arc(px, pz, 46, a - 0.55, a + 0.55); mc.closePath(); mc.fill();
  mc.fillStyle = '#b8875a'; mc.beginPath(); mc.arc(px, pz, 7, 0, Math.PI * 2); mc.fill();
  mc.strokeStyle = '#f4efe8'; mc.lineWidth = 2.5; mc.stroke();
}
map.addEventListener('click', e => {
  const r = map.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width * map.width - ox) / S + bnd[0];
  const z = ((e.clientY - r.top) / r.height * map.height - oz) / S + bnd[1];
  if (floorAt(x, z, 99) !== null && !hits(x, z, floorAt(x, z, 99))) teleport(x, z);
});

/* ---------- room label ---------- */
const roomEl = document.getElementById('room');
let lastRoom = '';
function roomId() {
  for (const r of data.rooms) if (player.x >= r.r[0] && player.x <= r.r[2] && player.z >= r.r[1] && player.z <= r.r[3]) return r.id;
  return null;
}
function roomName() {
  for (const r of data.rooms) if (player.x >= r.r[0] && player.x <= r.r[2] && player.z >= r.r[1] && player.z <= r.r[3]) return r.label;
  return '';
}

/* ---------- loop ---------- */
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), right = new THREE.Vector3();
let bob = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (flyTo) {
    flyTo.t = Math.min(1, flyTo.t + dt / 0.9);
    const k = flyTo.t < .5 ? 2 * flyTo.t * flyTo.t : 1 - Math.pow(-2 * flyTo.t + 2, 2) / 2;
    player.lerpVectors(flyTo.from, flyTo.to, k); yaw = flyTo.y0 + (flyTo.y1 - flyTo.y0) * k; pitch *= 1 - k * 0.2;
    if (flyTo.t >= 1) { feet = flyTo.f; flyTo = null; }
  } else if (started) {
    let mxv = 0, mzv = 0;
    if (keys.KeyW || keys.ArrowUp) mzv += 1;
    if (keys.KeyS || keys.ArrowDown) mzv -= 1;
    if (keys.KeyD || keys.ArrowRight) mxv += 1;
    if (keys.KeyA || keys.ArrowLeft) mxv -= 1;
    mxv += joyV.x; mzv -= joyV.y;
    const len = Math.hypot(mxv, mzv);
    if (len > 0.05) {
      const sp = (keys.ShiftLeft || keys.ShiftRight ? 2.6 : 1.45) * dt / Math.max(1, len);
      fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      tryMove((fwd.x * mzv + right.x * mxv) * sp, (fwd.z * mzv + right.z * mxv) * sp);
      bob += dt * 7 * Math.min(1, len);
    }
    player.y += (feet + EYE - player.y) * Math.min(1, dt * 12);
  }
  camera.position.set(player.x, player.y + Math.sin(bob) * 0.012, player.z);
  camera.rotation.set(pitch, yaw, 0);
  const rn = roomName(); if (rn !== lastRoom) { lastRoom = rn; roomEl.textContent = rn || TYPE_LABEL; }
  const rid = roomId(); if (rid) setProbe(probeFor(rid));
  drawMap();
  renderer.render(scene, camera);
});
