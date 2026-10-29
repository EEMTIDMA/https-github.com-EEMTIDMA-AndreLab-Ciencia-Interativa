"use strict";
/* =========================================================
ANDRELAB — GRAVITAÇÃO UNIVERSAL 3D
Arquivo completo: aula.js
Importação dinâmica do Three.js
Seis etapas de aprendizagem interativa
========================================================= */
let THREE = null;
let OrbitControls = null;
const G = 6.67430e-11;
const INITIAL = { massA: 5, massB: 5, distance: 2 };
const TOTAL_SLIDES = 6;
const ORBIT = {
centerX: -1.15,
radiusX: 2.65,
radiusZ: 1.18,
verticalAmplitude: 0.16,
angularSpeed: 0.42
};
let currentSlide = 1;
let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let earth = null;
let moon = null;
let sunGlow = null;
let orbitLine = null;
let arrowA = null;
let arrowB = null;
let starField = null;
let animationFrame = 0;
let orbitAngle = Math.PI / 4;
let motionPaused = false;
let lastTime = 0;
let resizeObserver = null;
let textureLoader = null;
let texturesLoaded = 0;
let textureErrors = 0;
let rendererReady = false;
let sceneInitialized = false;
const reducedMotion = window.matchMedia(
"(prefers-reduced-motion: reduce)"
).matches;
const $ = (id) => document.getElementById(id);
const ui = {
status: $("status3D"),
progressFill: $("progressFill"),
progressLabel: $("progressLabel"),
slideCounter: $("slideCounter"),
previous: $("previousSlide"),
next: $("nextSlide"),
stepLinks: [...document.querySelectorAll(".step-link")],
footerDots: [...document.querySelectorAll(".footer-dot")],
massA: $("simMassA"),
massB: $("simMassB"),
distance: $("simDist"),
txtMassA: $("txtMassA"),
txtMassB: $("txtMassB"),
txtDist: $("txtDist"),
txtForce: $("txtForce"),
mathResult: $("mathResult"),
equation: $("equationSubstitution"),
forceDescription: $("forceDescription"),
toggleOrbit: $("toggleOrbit"),
resetCamera: $("resetCamera"),
resetSimulation: $("resetSimulation"),
simulationCaption: $("simulationCaption"),
hypothesisInitialDistance: $("hypothesisInitialDistance"),
experimentR1: $("experimentR1"),
experimentR2: $("experimentR2"),
experimentF1: $("experimentF1"),
experimentF2: $("experimentF2"),
testHypothesis: $("testHypothesis"),
hypothesisFeedback: $("hypothesisFeedback"),
hypothesisText: $("hypothesisText"),
openSimulator: $("openSimulator"),
quizForm: $("quizForm"),
quizFeedback: $("quizFeedback"),
completionCard: $("completionCard")
};
/* =========================================================
1. FUNÇÕES AUXILIARES
========================================================= */
function formatDecimal(value, digits = 1) {
return Number(value).toLocaleString("pt-BR", {
minimumFractionDigits: digits,
maximumFractionDigits: digits
});
}
function formatScientific(value, digits = 3) {
if (!Number.isFinite(value) || value === 0) {
return "0";
}
const exponent = Math.floor(Math.log10(Math.abs(value)));
const coefficient = value / Math.pow(10, exponent);
const superscripts = {
"-": "⁻",
"0": "⁰",
"1": "¹",
"2": "²",
"3": "³",
"4": "⁴",
"5": "⁵",
"6": "⁶",
"7": "⁷",
"8": "⁸",
"9": "⁹"
};
const exponentText = String(exponent)
.split("")
.map((character) => superscripts[character] || character)
.join("");
return `${formatDecimal(coefficient, digits)} × 10${exponentText}`;
}
function calculateForce(massA, massB, distance) {
const m1 = massA * 1e20;
const m2 = massB * 1e20;
const r = distance * 1e6;
return (G * m1 * m2) / (r * r);
}
function currentParameters() {
return {
massA: Number(ui.massA?.value ?? INITIAL.massA),
massB: Number(ui.massB?.value ?? INITIAL.massB),
distance: Number(ui.distance?.value ?? INITIAL.distance)
};
}
function setStatus(message) {
if (ui.status) {
ui.status.textContent = message;
}
}
function setText(element, value) {
if (element) {
element.textContent = value;
}
}
/* =========================================================
2. CRIAÇÃO DA CENA 3D E IMPORTAÇÃO DINÂMICA
========================================================= */
async function createScene() {
const initialSlot = $("sceneSlot1");
if (!initialSlot) {
setStatus("Não foi possível encontrar a área 3D.");
return;
}
try {
setStatus("Carregando o laboratório 3D...");
/*
Importações dinâmicas.
O esm.sh resolve a dependência interna "three"
utilizada pelo módulo OrbitControls.
*/
const threeModule = await import(
"https://esm.sh/three@0.180.0"
);
const controlsModule = await import(
"https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js"
);
THREE = threeModule;
OrbitControls = controlsModule.OrbitControls;
if (!THREE || !OrbitControls) {
throw new Error("Os módulos do Three.js não foram carregados.");
}
scene = new THREE.Scene();
scene.background = new THREE.Color("#02050d");
scene.fog = new THREE.FogExp2("#02050d", 0.008);
camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150);
camera.position.set(0, 2.2, 8.2);
renderer = new THREE.WebGLRenderer({
antialias: true,
alpha: false,
powerPreference: "high-performance"
});
renderer.setPixelRatio(
Math.min(window.devicePixelRatio || 1, 1.8)
);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.setClearColor("#02050d", 1);
renderer.domElement.setAttribute(
"aria-label",
"Cena tridimensional interativa da Terra, Lua e gravitação"
);
renderer.domElement.setAttribute("role", "img");
renderer.domElement.tabIndex = 0;
initialSlot.replaceChildren(renderer.domElement);
controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 3.2;
controls.maxDistance = 15;
controls.enablePan = false;
controls.autoRotate = false;
controls.target.set(0, 0, 0);
controls.update();
addLighting();
addStars();
addCelestialBodies();
addOrbitPath();
addForceArrows();
textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin("anonymous");
rendererReady = true;
sceneInitialized = true;
loadPlanetTextures();
if (typeof ResizeObserver !== "undefined") {
resizeObserver = new ResizeObserver(resizeRenderer);
resizeObserver.observe(initialSlot);
}
window.addEventListener("resize", resizeRenderer);
initialSlot.querySelector(".scene-loading")?.remove();
resizeRenderer();
updatePhysics();
showSlide(1);
if (reducedMotion) {
motionPaused = true;
setStatus("Modo de movimento reduzido ativo.");
} else {
setStatus("Laboratório 3D pronto para explorar.");
}
lastTime = 0;
animate(0);
} catch (error) {
console.error(
"[AndreLab] Erro ao iniciar o ambiente 3D:",
error
);
rendererReady = false;
setStatus(
"Não foi possível carregar o 3D. Verifique a conexão, o WebGL e o console do navegador."
);
document.querySelectorAll(".scene-loading").forEach((element) => {
element.textContent =
"Não foi possível iniciar o 3D. Verifique a conexão com a internet e tente recarregar a página.";
});
}
}
/* =========================================================
3. ILUMINAÇÃO
========================================================= */
function addLighting() {
const ambient = new THREE.HemisphereLight(
0x8bb8ff,
0x080b18,
1.5
);
scene.add(ambient);
const sunlight = new THREE.DirectionalLight(0xfff1d1, 3.4);
sunlight.position.set(-5, 3, 5);
scene.add(sunlight);
const blueFill = new THREE.PointLight(0x2c72ff, 15, 35);
blueFill.position.set(4, 1, -5);
scene.add(blueFill);
const purpleFill = new THREE.PointLight(0x8b5cf6, 8, 30);
purpleFill.position.set(-4, -3, -3);
scene.add(purpleFill);
const distantSun = new THREE.PointLight(0xffe5bd, 60, 100);
distantSun.position.set(-5, 4, 6);
scene.add(distantSun);
}
/* =========================================================
4. CAMPO DE ESTRELAS
========================================================= */
function addStars() {
const count = 1600;
const positions = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
const radius = 18 + Math.random() * 65;
const theta = Math.random() * Math.PI * 2;
const u = Math.random() * 2 - 1;
const phi = Math.acos(u);
positions[i * 3] =
radius * Math.sin(phi) * Math.cos(theta);
positions[i * 3 + 1] = radius * Math.cos(phi);
positions[i * 3 + 2] =
radius * Math.sin(phi) * Math.sin(theta);
const brightness = 0.45 + Math.random() * 0.55;
colors[i * 3] = brightness * (0.72 + Math.random() * 0.28);
colors[i * 3 + 1] = brightness * (0.78 + Math.random() * 0.22);
colors[i * 3 + 2] = brightness;
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute(
"position",
new THREE.BufferAttribute(positions, 3)
);
geometry.setAttribute(
"color",
new THREE.BufferAttribute(colors, 3)
);
const material = new THREE.PointsMaterial({
size: 0.09,
vertexColors: true,
transparent: true,
opacity: 0.88,
sizeAttenuation: true,
depthWrite: false
});
starField = new THREE.Points(geometry, material);
scene.add(starField);
}
/* =========================================================
5. TEXTURAS ALTERNATIVAS
========================================================= */
function makeFallbackEarthTexture() {
const canvas = document.createElement("canvas");
canvas.width = 1024;
canvas.height = 512;
const context = canvas.getContext("2d");
const gradient = context.createLinearGradient(0, 0, 1024, 512);
gradient.addColorStop(0, "#062b72");
gradient.addColorStop(0.45, "#1484bb");
gradient.addColorStop(1, "#061a49");
context.fillStyle = gradient;
context.fillRect(0, 0, canvas.width, canvas.height);
context.fillStyle = "#24734f";
for (let i = 0; i < 50; i++) {
const x =
(Math.sin(i * 91.7) * 0.5 + 0.5) * canvas.width;
const y =
(Math.cos(i * 47.1) * 0.5 + 0.5) * canvas.height;
const rx = 12 + (i % 6) * 11;
const ry = 6 + (i % 5) * 5;
context.beginPath();
context.ellipse(
x,
y,
rx,
ry,
Math.sin(i) * 0.8,
0,
Math.PI * 2
);
context.fill();
}
const texture = new THREE.CanvasTexture(canvas);
texture.colorSpace = THREE.SRGBColorSpace;
return texture;
}
function makeFallbackMoonTexture() {
const canvas = document.createElement("canvas");
canvas.width = 512;
canvas.height = 256;
const context = canvas.getContext("2d");
context.fillStyle = "#9ca3af";
context.fillRect(0, 0, canvas.width, canvas.height);
for (let i = 0; i < 180; i++) {
const x = Math.random() * canvas.width;
const y = Math.random() * canvas.height;
const radius = 2 + Math.random() * 13;
context.beginPath();
context.arc(x, y, radius, 0, Math.PI * 2);
context.fillStyle = i % 2 === 0
? "rgba(42,48,62,0.38)"
: "rgba(240,243,250,0.26)";
context.fill();
}
const texture = new THREE.CanvasTexture(canvas);
texture.colorSpace = THREE.SRGBColorSpace;
return texture;
}
/* =========================================================
6. TERRA, LUA E ATMOSFERA
========================================================= */
function addCelestialBodies() {
const earthGeometry = new THREE.SphereGeometry(0.78, 72, 72);
const earthMaterial = new THREE.MeshStandardMaterial({
map: makeFallbackEarthTexture(),
roughness: 0.93,
metalness: 0.02
});
earth = new THREE.Mesh(earthGeometry, earthMaterial);
earth.position.set(ORBIT.centerX, 0, 0);
earth.rotation.z = 0.12;
scene.add(earth);
const atmosphereGeometry = new THREE.SphereGeometry(0.81, 64, 64);
const atmosphereMaterial = new THREE.MeshBasicMaterial({
color: 0x258aff,
transparent: true,
opacity: 0.12,
side: THREE.BackSide,
blending: THREE.AdditiveBlending,
depthWrite: false
});
const atmosphere = new THREE.Mesh(
atmosphereGeometry,
atmosphereMaterial
);
earth.add(atmosphere);
const moonGeometry = new THREE.SphereGeometry(0.25, 56, 56);
const moonMaterial = new THREE.MeshStandardMaterial({
map: makeFallbackMoonTexture(),
color: 0xd2d7e0,
roughness: 1,
metalness: 0
});
moon = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moon);
const glowGeometry = new THREE.SphereGeometry(0.3, 32, 32);
const glowMaterial = new THREE.MeshBasicMaterial({
color: 0xff8a36,
transparent: true,
opacity: 0.9
});
sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
sunGlow.position.set(-4.3, 2.5, -4.5);
sunGlow.visible = false;
scene.add(sunGlow);
updateOrbitPosition();
}
function loadTexture(url, onSuccess) {
if (!textureLoader || !renderer) return;
textureLoader.load(
url,
(texture) => {
texture.colorSpace = THREE.SRGBColorSpace;
texture.anisotropy = Math.min(
renderer.capabilities.getMaxAnisotropy(),
8
);
onSuccess(texture);
texturesLoaded++;
updateTextureStatus();
},
undefined,
(error) => {
textureErrors++;
console.warn(
"[AndreLab] Textura indisponível:",
url,
error
);
updateTextureStatus();
}
);
}
function loadPlanetTextures() {
loadTexture(
"https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
(texture) => {
if (earth?.material?.map) {
earth.material.map.dispose();
}
earth.material.map = texture;
earth.material.needsUpdate = true;
}
);
loadTexture(
"https://threejs.org/examples/textures/planets/moon_1024.jpg",
(texture) => {
if (moon?.material?.map) {
moon.material.map.dispose();
}
moon.material.map = texture;
moon.material.needsUpdate = true;
}
);
}
function updateTextureStatus() {
if (texturesLoaded > 0) {
setStatus("Laboratório 3D pronto · texturas carregadas.");
} else if (textureErrors > 0) {
setStatus("3D ativo com texturas alternativas.");
}
}
/* =========================================================
7. ÓRBITA
========================================================= */
function addOrbitPath() {
const points = [];
const segments = 240;
for (let i = 0; i <= segments; i++) {
const angle = (i / segments) * Math.PI * 2;
points.push(
new THREE.Vector3(
ORBIT.centerX + Math.cos(angle) * ORBIT.radiusX,
Math.sin(angle) * ORBIT.verticalAmplitude,
Math.sin(angle) * ORBIT.radiusZ
)
);
}
const geometry = new THREE.BufferGeometry().setFromPoints(points);
const material = new THREE.LineDashedMaterial({
color: 0x4d9cff,
transparent: true,
opacity: 0.38,
dashSize: 0.12,
gapSize: 0.09
});
orbitLine = new THREE.Line(geometry, material);
orbitLine.computeLineDistances();
scene.add(orbitLine);
}
function updateOrbitPosition() {
if (!moon) return;
moon.position.set(
ORBIT.centerX + Math.cos(orbitAngle) * ORBIT.radiusX,
Math.sin(orbitAngle * 1.5) * ORBIT.verticalAmplitude,
Math.sin(orbitAngle) * ORBIT.radiusZ
);
}
/* =========================================================
8. VETORES DA FORÇA GRAVITACIONAL
========================================================= */
function createArrow(color) {
const arrow = new THREE.ArrowHelper(
new THREE.Vector3(1, 0, 0),
new THREE.Vector3(0, 0, 0),
0.6,
color,
0.17,
0.1
);
scene.add(arrow);
return arrow;
}
function addForceArrows() {
arrowA = createArrow(0x4de0a3);
arrowB = createArrow(0xa78bfa);
updateForceArrows();
}
function updateForceArrows() {
if (!earth || !moon || !arrowA || !arrowB) return;
const a = earth.position.clone();
const b = moon.position.clone();
const direction = b.clone().sub(a).normalize();
const separation = a.distanceTo(b);
const arrowLength = Math.max(
0.24,
Math.min(0.9, separation * 0.27)
);
arrowA.position.copy(a);
arrowA.setDirection(direction);
arrowA.setLength(
arrowLength,
arrowLength * 0.27,
arrowLength * 0.18
);
arrowB.position.copy(b);
arrowB.setDirection(direction.clone().negate());
arrowB.setLength(
arrowLength,
arrowLength * 0.27,
arrowLength * 0.18
);
const showVectors = currentSlide === 2 || currentSlide === 3;
arrowA.visible = showVectors;
arrowB.visible = showVectors;
}
/* =========================================================
9. ATUALIZAÇÃO VISUAL DOS CORPOS
========================================================= */
function updateCelestialPositions() {
if (!earth || !moon) return;
const { massA, massB, distance } = currentParameters();
if (currentSlide === 3) {
const separation = 1.2 + distance * 0.58;
earth.position.set(-separation / 2, 0, 0);
moon.position.set(separation / 2, 0, 0);
earth.scale.setScalar(0.58 + (massA / 10) * 0.4);
moon.scale.setScalar(0.3 + (massB / 10) * 0.22);
if (orbitLine) orbitLine.visible = false;
setText(
ui.simulationCaption,
`Massas ${formatDecimal(massA)} e ${formatDecimal(massB)} · distância ${formatDecimal(distance)} × 10⁶ m`
);
} else {
earth.scale.setScalar(1);
moon.scale.setScalar(1);
earth.position.set(ORBIT.centerX, 0, 0);
if (currentSlide === 1) {
updateOrbitPosition();
if (orbitLine) orbitLine.visible = true;
} else {
moon.position.set(1.65, 0, 0);
if (orbitLine) orbitLine.visible = false;
}
}
updateForceArrows();
}
/* =========================================================
10. REDIMENSIONAMENTO E MOVIMENTAÇÃO DO CANVAS
========================================================= */
function resizeRenderer() {
if (!renderer || !camera) return;
/* O canvas permanece no slot 3D mais recente enquanto as etapas 4–6
   são exibidas. Medimos o pai real do canvas, não o número da etapa. */
const activeSlot = renderer.domElement?.parentElement;
if (!activeSlot || !activeSlot.isConnected) return;
const rect = activeSlot.getBoundingClientRect();
if (rect.width <= 0 || rect.height <= 0) return;
const width = Math.max(1, Math.floor(rect.width));
const height = Math.max(250, Math.floor(rect.height));
renderer.setSize(width, height, false);
camera.aspect = width / height;
camera.updateProjectionMatrix();
}
function moveSceneToSlide(slideNumber) {
if (!renderer) return;
const targetSlot = $("sceneSlot" + slideNumber);
/* Há cenas 3D apenas nas etapas 1, 2 e 3. Nas demais, preservamos o
   canvas no último slot sem bloquear a navegação nem tentar redimensionar
   uma área inexistente. Ao voltar a uma etapa 3D, o canvas é reposicionado. */
if (!targetSlot) {
  if (resizeObserver) resizeObserver.disconnect();
  return;
}
targetSlot.replaceChildren(renderer.domElement);
if (resizeObserver) {
resizeObserver.disconnect();
resizeObserver.observe(targetSlot);
}
/* Aguarda o navegador aplicar a visibilidade da etapa antes de medir. */
requestAnimationFrame(() => {
  resizeRenderer();
  updateCelestialPositions();
});
}
/* =========================================================
11. ANIMAÇÃO CONTÍNUA
========================================================= */
function animate(time = 0) {
animationFrame = requestAnimationFrame(animate);
const delta = lastTime
? Math.min((time - lastTime) / 1000, 0.05)
: 0;
lastTime = time;
if (!motionPaused && !reducedMotion) {
orbitAngle += delta * ORBIT.angularSpeed;
}
if (
currentSlide === 1 &&
!motionPaused &&
!reducedMotion
) {
updateOrbitPosition();
updateForceArrows();
}
if (earth && !motionPaused && !reducedMotion) {
earth.rotation.y += delta * 0.025;
if (moon) {
moon.rotation.y += delta * 0.04;
}
if (starField) {
starField.rotation.y += delta * 0.0015;
}
if (sunGlow) {
sunGlow.material.opacity =
0.78 + Math.sin(time * 0.001) * 0.1;
}
}
if (controls) {
controls.update();
}
if (rendererReady && scene && camera) {
renderer.render(scene, camera);
}
}
/* =========================================================
12. NAVEGAÇÃO PELAS SEIS ETAPAS
========================================================= */
function showSlide(number) {
const nextNumber = Math.max(
1,
Math.min(TOTAL_SLIDES, Number(number) || 1)
);
currentSlide = nextNumber;
document.querySelectorAll(".slide").forEach((slide) => {
const slideNumber = Number(
slide.id.replace("screen", "")
);
const isActive = slideNumber === currentSlide;
slide.classList.toggle("active", isActive);
slide.hidden = !isActive;
});
ui.stepLinks.forEach((button) => {
const isActive =
Number(button.dataset.goto) === currentSlide;
button.classList.toggle("active", isActive);
if (isActive) {
button.setAttribute("aria-current", "step");
} else {
button.removeAttribute("aria-current");
}
});
ui.footerDots.forEach((dot, index) => {
dot.classList.toggle(
"active",
index + 1 === currentSlide
);
});
if (ui.progressFill) {
ui.progressFill.style.width =
`${(currentSlide / TOTAL_SLIDES) * 100}%`;
}
setText(
ui.progressLabel,
`Etapa ${currentSlide} de ${TOTAL_SLIDES}`
);
setText(
ui.slideCounter,
`${String(currentSlide).padStart(2, "0")} / ${String(TOTAL_SLIDES).padStart(2, "0")}`
);
if (ui.previous) {
ui.previous.disabled = currentSlide === 1;
}
if (ui.next) {
ui.next.disabled = currentSlide === TOTAL_SLIDES;
ui.next.textContent = currentSlide === TOTAL_SLIDES
? "Trilha concluída"
: "Próxima etapa →";
}
moveSceneToSlide(currentSlide);
if (currentSlide === 4) {
updatePhysics();
}
if (currentSlide === 5) {
updateHypothesisSummary();
}
if (currentSlide === 6 && ui.completionCard && !quizState.finished) {
ui.completionCard.hidden = true;
}
}
ui.previous?.addEventListener("click", () => {
showSlide(currentSlide - 1);
});
ui.next?.addEventListener("click", () => {
showSlide(currentSlide + 1);
});
ui.stepLinks.forEach((button) => {
button.addEventListener("click", () => {
showSlide(Number(button.dataset.goto));
});
});
ui.openSimulator?.addEventListener("click", () => {
showSlide(3);
});
/* =========================================================
13. CÁLCULO DA GRAVITAÇÃO UNIVERSAL
========================================================= */
function updatePhysics() {
if (!ui.massA || !ui.massB || !ui.distance) return;
const { massA, massB, distance } = currentParameters();
const force = calculateForce(massA, massB, distance);
const forceText = `${formatScientific(force)} N`;
setText(ui.txtMassA, formatDecimal(massA));
setText(ui.txtMassB, formatDecimal(massB));
setText(ui.txtDist, formatDecimal(distance));
setText(ui.txtForce, forceText);
setText(ui.mathResult, forceText);
setText(
ui.equation,
`F = (6,67430 × 10⁻¹¹) · (${formatDecimal(massA)} × 10²⁰ kg) · (${formatDecimal(massB)} × 10²⁰ kg) / (${formatDecimal(distance)} × 10⁶ m)²`
);
setText(
ui.forceDescription,
"Resultado calculado com massas em kg e distância em m."
);
updateCelestialPositions();
updateHypothesisSummary();
}
[ui.massA, ui.massB, ui.distance].forEach((input) => {
input?.addEventListener("input", updatePhysics);
});
ui.resetSimulation?.addEventListener("click", () => {
if (ui.massA) ui.massA.value = String(INITIAL.massA);
if (ui.massB) ui.massB.value = String(INITIAL.massB);
if (ui.distance) ui.distance.value = String(INITIAL.distance);
updatePhysics();
});
/* =========================================================
14. CONTROLES DA CENA
========================================================= */
ui.toggleOrbit?.addEventListener("click", () => {
motionPaused = !motionPaused;
if (ui.toggleOrbit) {
ui.toggleOrbit.textContent = motionPaused
? "▶ Retomar movimento"
: "Ⅱ Pausar movimento";
}
setStatus(
motionPaused
? "Movimento pausado."
: "Movimento retomado."
);
});
ui.resetCamera?.addEventListener("click", () => {
if (!camera || !controls) return;
camera.position.set(0, 2.2, 8.2);
controls.target.set(0, 0, 0);
controls.update();
});
/* =========================================================
15. INVESTIGAÇÃO DE HIPÓTESE
========================================================= */
function updateHypothesisSummary() {
if (!ui.experimentR1 || !ui.experimentR2) return;
const { massA, massB, distance } = currentParameters();
const initialForce = calculateForce(
massA,
massB,
distance
);
const doubledDistance = distance * 2;
const finalForce = calculateForce(
massA,
massB,
doubledDistance
);
setText(
ui.hypothesisInitialDistance,
`${formatDecimal(distance)} × 10⁶ m`
);
setText(
ui.experimentR1,
`${formatDecimal(distance)} × 10⁶ m`
);
setText(
ui.experimentR2,
`${formatDecimal(doubledDistance)} × 10⁶ m`
);
setText(
ui.experimentF1,
`${formatScientific(initialForce)} N`
);
setText(
ui.experimentF2,
`${formatScientific(finalForce)} N`
);
}
ui.testHypothesis?.addEventListener("click", () => {
const selected = document.querySelector(
'input[name="hypothesis"]:checked'
);
const feedback = ui.hypothesisFeedback;
if (!feedback) return;
feedback.hidden = false;
if (!selected) {
feedback.className = "feedback-panel incorrect";
feedback.textContent =
"Selecione uma previsão antes de testar sua hipótese.";
return;
}
if (selected.value === "quarter") {
feedback.className = "feedback-panel correct";
feedback.textContent =
"Sua previsão está correta! Como F é inversamente proporcional a r², " +
"dobrar a distância faz a força passar para 1/2² = 1/4 do valor inicial.";
} else {
feedback.className = "feedback-panel incorrect";
feedback.textContent =
"Ainda não. Observe o expoente 2 da distância na fórmula. " +
"Quando a distância dobra, o denominador fica quatro vezes maior. " +
"Tente novamente.";
}
const explanation = ui.hypothesisText?.value.trim();
if (explanation) {
feedback.textContent +=
` Sua justificativa registrada nesta sessão: “${explanation}”.`;
}
});
/* =========================================================
16. QUIZ INTERATIVO — AVALIAÇÃO FINAL
========================================================= */
const quizState = {
  current: 0,
  confirmed: new Set(),
  finished: false
};
const quiz = {
  form: document.querySelector("#quizForm"),
  questions: [],
  previous: document.querySelector("#quizPrevious"),
  confirm: document.querySelector("#quizConfirm"),
  next: document.querySelector("#quizNext"),
  finish: document.querySelector("#quizFinish"),
  feedback: document.querySelector("#quizFeedback"),
  progressLabel: document.querySelector("#quizProgressLabel"),
  scorePreview: document.querySelector("#quizScorePreview"),
  progressBar: document.querySelector("#quizProgressBar"),
  progressFill: document.querySelector("#quizProgressFill"),
  stepDots: [...document.querySelectorAll("#quizStepDots span")],
  resultCard: document.querySelector("#completionCard"),
  resultSummary: document.querySelector("#quizResultSummary"),
  resultDetails: document.querySelector("#quizResultDetails"),
  review: document.querySelector("#quizReview"),
  retry: document.querySelector("#quizRetry")
};
quiz.questions = quiz.form ? [...quiz.form.querySelectorAll(".quiz-question")] : [];

function getQuizSelection(question, index) {
  return question.querySelector(`input[name="quizAnswer${index + 1}"]:checked`);
}

function updateQuizInterface() {
  const total = quiz.questions.length;
  const index = quizState.current;
  const currentQuestion = quiz.questions[index];
  if (quiz.form) quiz.form.hidden = quizState.finished;
  const isConfirmed = quizState.confirmed.has(index);
  const answeredCount = quizState.confirmed.size;

  quiz.questions.forEach((question, questionIndex) => {
    question.hidden = questionIndex !== index;
    question.setAttribute("aria-current", questionIndex === index ? "step" : "false");
  });

  if (quiz.progressLabel) quiz.progressLabel.textContent = `QUESTÃO ${index + 1} DE ${total}`;
  if (quiz.scorePreview) quiz.scorePreview.textContent = `${answeredCount} de ${total} respostas confirmadas`;
  if (quiz.progressBar) quiz.progressBar.setAttribute("aria-valuenow", String(answeredCount));
  if (quiz.progressFill) quiz.progressFill.style.width = `${(answeredCount / Math.max(total, 1)) * 100}%`;
  quiz.stepDots.forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === index);
    dot.classList.toggle("completed", quizState.confirmed.has(dotIndex));
    dot.setAttribute("aria-current", dotIndex === index ? "step" : "false");
  });

  if (quiz.previous) quiz.previous.disabled = index === 0 || quizState.finished;
  if (quiz.confirm) {
    quiz.confirm.hidden = isConfirmed || quizState.finished;
    quiz.confirm.disabled = !getQuizSelection(currentQuestion, index) || quizState.finished;
  }
  if (quiz.next) {
    quiz.next.hidden = index === total - 1 || quizState.finished;
    quiz.next.disabled = !isConfirmed || quizState.finished;
  }
  if (quiz.finish) {
    quiz.finish.hidden = index !== total - 1 || quizState.finished;
    quiz.finish.disabled = !isConfirmed || quizState.finished;
  }

  if (quiz.feedback && !isConfirmed && !quizState.finished) quiz.feedback.hidden = true;
  if (currentQuestion && isConfirmed && quiz.feedback && !quizState.finished) {
    showQuizQuestionFeedback(currentQuestion, index);
  }
}

function showQuizQuestionFeedback(question, index) {
  if (!quiz.feedback) return;
  const selected = getQuizSelection(question, index);
  if (!selected) return;
  const isCorrect = selected.value === question.dataset.correct;
  quiz.feedback.hidden = false;
  quiz.feedback.className = `feedback-panel ${isCorrect ? "correct" : "incorrect"}`;
  quiz.feedback.textContent = isCorrect
    ? "Resposta registrada: você acertou! Continue para a próxima questão. O gabarito comentado será apresentado ao final."
    : "Resposta registrada: você errou. Não se preocupe: continue o quiz e confira o gabarito com as justificativas ao final.";
}

function confirmQuizAnswer() {
  if (quizState.finished) return;
  const index = quizState.current;
  const question = quiz.questions[index];
  if (!question || !getQuizSelection(question, index)) {
    if (quiz.feedback) {
      quiz.feedback.hidden = false;
      quiz.feedback.className = "feedback-panel partial";
      quiz.feedback.textContent = "Escolha uma alternativa antes de confirmar sua resposta.";
    }
    return;
  }
  quizState.confirmed.add(index);
  showQuizQuestionFeedback(question, index);
  updateQuizInterface();
}

function showQuizResult() {
  if (quizState.confirmed.size !== quiz.questions.length) {
    if (quiz.feedback) {
      quiz.feedback.hidden = false;
      quiz.feedback.className = "feedback-panel partial";
      quiz.feedback.textContent = "Confirme uma resposta para cada questão antes de ver o resultado final.";
    }
    return;
  }

  quizState.finished = true;
  const total = quiz.questions.length;
  let score = 0;
  const reviewItems = [];

  quiz.questions.forEach((question, index) => {
    const selected = getQuizSelection(question, index);
    const correct = question.dataset.correct;
    const isCorrect = Boolean(selected && selected.value === correct);
    const explanation = (question.dataset.explanation || "").trim();
    const correctOption = question.querySelector(`input[value="${correct}"]`);
    const correctLetter = correctOption?.closest(".quiz-option")?.querySelector(".option-letter")?.textContent || correct.toUpperCase();
    const selectedLetter = selected?.closest(".quiz-option")?.querySelector(".option-letter")?.textContent || "—";
    if (isCorrect) score += 1;
    question.classList.toggle("question-correct", isCorrect);
    question.classList.toggle("question-incorrect", !isCorrect);

    reviewItems.push(
      `<article class="quiz-review-item ${isCorrect ? "is-correct" : "is-incorrect"}">` +
      `<h4>Questão ${String(index + 1).padStart(2, "0")} — ${isCorrect ? "Acertou" : "Precisa revisar"}</h4>` +
      `<p class="quiz-review-question">${escapeQuizText(question.querySelector("h3")?.textContent || "")}</p>` +
      `<p><strong>Sua resposta:</strong> ${escapeQuizText(selectedLetter)}. ${escapeQuizText(selected?.closest(".quiz-option")?.querySelector(".option-text")?.textContent || "Não respondida")}</p>` +
      `<p><strong>Resposta correta:</strong> ${escapeQuizText(correctLetter)}. ${escapeQuizText(correctOption?.closest(".quiz-option")?.querySelector(".option-text")?.textContent || "")}</p>` +
      `<p class="quiz-review-explanation"><strong>Justificativa:</strong> ${escapeQuizText(explanation)}</p>` +
      `</article>`
    );
  });

  const percent = Math.round((score / Math.max(total, 1)) * 100);
  if (quiz.resultSummary) {
    quiz.resultSummary.textContent = score === total
      ? "Excelente! Você dominou os conceitos avaliados nesta aula."
      : score >= 3
        ? "Bom trabalho! Revise as justificativas das questões que errou para fortalecer sua compreensão."
        : "Continue aprendendo! Leia as explicações e retome as etapas da aula antes de tentar novamente.";
  }
  if (quiz.resultDetails) {
    quiz.resultDetails.innerHTML = `<div class="quiz-result-stat"><strong>${score}/${total}</strong><span>acertos</span></div><div class="quiz-result-stat"><strong>${percent}%</strong><span>aproveitamento</span></div><div class="quiz-result-stat"><strong>${total - score}</strong><span>para revisar</span></div>`;
  }
  if (quiz.review) quiz.review.innerHTML = `<h3>Correção comentada</h3>${reviewItems.join("")}`;
  if (quiz.resultCard) quiz.resultCard.hidden = false;
  if (quiz.feedback) {
    quiz.feedback.hidden = false;
    quiz.feedback.className = `feedback-panel ${score === total ? "correct" : score >= 3 ? "partial" : "incorrect"}`;
    quiz.feedback.textContent = `Quiz concluído: ${score} de ${total} acertos (${percent}%). Consulte a correção comentada abaixo.`;
  }
  updateQuizInterface();
  if (quiz.resultCard) quiz.resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function escapeQuizText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function resetQuiz() {
  if (quiz.form) quiz.form.hidden = false;
  quizState.current = 0;
  quizState.confirmed.clear();
  quizState.finished = false;
  quiz.questions.forEach((question) => {
    question.classList.remove("question-correct", "question-incorrect");
    question.querySelectorAll("input[type=radio]").forEach((input) => { input.checked = false; });
  });
  if (quiz.feedback) quiz.feedback.hidden = true;
  if (quiz.resultCard) quiz.resultCard.hidden = true;
  if (quiz.review) quiz.review.innerHTML = "";
  updateQuizInterface();
}

quiz.questions.forEach((question, index) => {
  question.querySelectorAll("input[type=radio]").forEach((input) => {
    input.addEventListener("change", () => {
      if (quizState.finished) return;
      quizState.confirmed.delete(index);
      question.classList.remove("question-correct", "question-incorrect");
      if (quiz.feedback) quiz.feedback.hidden = true;
      updateQuizInterface();
    });
  });
});
quiz.confirm?.addEventListener("click", confirmQuizAnswer);
quiz.previous?.addEventListener("click", () => {
  if (quizState.current > 0 && !quizState.finished) {
    quizState.current -= 1;
    updateQuizInterface();
  }
});
quiz.next?.addEventListener("click", () => {
  if (quizState.current < quiz.questions.length - 1 && quizState.confirmed.has(quizState.current)) {
    quizState.current += 1;
    updateQuizInterface();
  }
});
quiz.finish?.addEventListener("click", showQuizResult);
quiz.retry?.addEventListener("click", resetQuiz);
quiz.form?.addEventListener("submit", (event) => event.preventDefault());
if (quiz.questions.length) updateQuizInterface();

/* =========================================================
17. INICIALIZAÇÃO
========================================================= */
async function startLesson() {
updatePhysics();
if (!window.WebGLRenderingContext) {
setStatus(
"Este navegador não oferece suporte WebGL para o 3D."
);
document.querySelectorAll(".scene-loading").forEach((element) => {
element.textContent =
"WebGL não está disponível neste navegador.";
});
return;
}
await createScene();
}
startLesson();
/* =========================================================
18. LIMPEZA AO SAIR DA PÁGINA
========================================================= */
window.addEventListener("beforeunload", () => {
if (animationFrame) {
cancelAnimationFrame(animationFrame);
}
if (resizeObserver) {
resizeObserver.disconnect();
}
window.removeEventListener("resize", resizeRenderer);
if (controls) {
controls.dispose();
}
if (renderer) {
renderer.dispose();
}
});
