import * as THREE from 'three';

"use strict";

const $ = (id) => document.getElementById(id);
const slides = [...document.querySelectorAll('.slide')];
const sideLinks = [...document.querySelectorAll('.step-link')];
const dots = [...document.querySelectorAll('.slide-dot')];
let currentSlide = 1;

function goToSlide(n) {
  currentSlide = Math.max(1, Math.min(slides.length, n));
  slides.forEach((el, i) => {
    const active = i + 1 === currentSlide;
    el.hidden = !active;
    el.classList.toggle('active', active);
  });
  sideLinks.forEach((el, i) => el.classList.toggle('active', i + 1 === currentSlide));
  dots.forEach((el, i) => el.classList.toggle('active', i + 1 === currentSlide));
  $('prevSlide').disabled = currentSlide === 1;
  $('nextSlide').disabled = currentSlide === slides.length;
  $('nextSlide').textContent = currentSlide === slides.length ? 'Aula concluída ✓' : 'Próxima etapa →';
  if (currentSlide === 4) drawGraphs();
  if (currentSlide === 1 || currentSlide === 5) resizeScenes();
  document.querySelector('.lesson-content').scrollIntoView({behavior:'smooth', block:'start'});
}
sideLinks.forEach(b => b.addEventListener('click', () => goToSlide(Number(b.dataset.goto))));
dots.forEach(b => b.addEventListener('click', () => goToSlide(Number(b.dataset.dot))));
$('prevSlide').addEventListener('click', () => goToSlide(currentSlide - 1));
$('nextSlide').addEventListener('click', () => goToSlide(currentSlide + 1));

/* Gráficos didáticos em canvas */
function drawChart(canvasId, config) {
  const canvas = $(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h);
  const pad = {l:58,r:22,t:24,b:48};
  const x0=pad.l, y0=h-pad.b, x1=w-pad.r, y1=pad.t;
  ctx.strokeStyle='#e3eaf3'; ctx.lineWidth=1;
  for(let i=0;i<=5;i++){
    const x=x0+(x1-x0)*i/5; ctx.beginPath();ctx.moveTo(x,y1);ctx.lineTo(x,y0);ctx.stroke();
    const y=y0-(y0-y1)*i/5; ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke();
  }
  ctx.strokeStyle='#334a65';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x0,y1);ctx.lineTo(x0,y0);ctx.lineTo(x1,y0);ctx.stroke();
  ctx.fillStyle='#334a65';ctx.font='16px Arial';ctx.textAlign='center';
  ctx.fillText(config.xLabel,(x0+x1)/2,h-10);
  ctx.save();ctx.translate(18,(y0+y1)/2);ctx.rotate(-Math.PI/2);ctx.fillText(config.yLabel,0,0);ctx.restore();
  ctx.textAlign='center';ctx.font='13px Arial';ctx.fillStyle='#536982';
  for(let i=0;i<=5;i++){ctx.fillText(String(i),x0+(x1-x0)*i/5,y0+22);}
  ctx.strokeStyle=config.color;ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();
  for(let i=0;i<=100;i++){
    const t=i/100;
    const x=x0+(x1-x0)*t;
    const y=y0-(y0-y1)*config.fn(t);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.stroke();
  ctx.fillStyle=config.color;ctx.beginPath();ctx.arc(x1,y0-(y0-y1)*config.fn(1),5,0,Math.PI*2);ctx.fill();
}
function redrawGraphs() {
  drawChart('graphMRU',{xLabel:'Tempo (s)',yLabel:'Posição (m)',color:'#2670c5',fn:(t)=>0.12+0.72*t});
  drawChart('graphMRUV',{xLabel:'Tempo (s)',yLabel:'Velocidade (m/s)',color:'#14956c',fn:(t)=>0.12+0.72*t});
}
const drawGraphs = redrawGraphs;

/* Simulações Three.js: veículo em pista retilínea e ponto em trajetória circular */
let rendererCar, sceneCar, cameraCar, carGroup, carRunning=false, carProgress=0, carLast=0;
let rendererCircle, sceneCircle, cameraCircle, circleGroup, circleRunning=true, circleAngle=0, circleLast=0;
const renderers = [];

function makeRenderer(slotId, bg='#09152a') {
  const slot = $(slotId);
  if (!slot) return null;
  slot.innerHTML = '';
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(Math.max(slot.clientWidth,300), Math.max(slot.clientHeight,240));
  renderer.setClearColor(bg,1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  slot.appendChild(renderer.domElement);
  renderers.push({renderer,slot});
  return renderer;
}
function addGround(scene, width=20, depth=8) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshStandardMaterial({color:0x172b45,roughness:0.9}));
  ground.rotation.x=-Math.PI/2; ground.position.y=-0.12; scene.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(width,2.5),new THREE.MeshStandardMaterial({color:0x293b50,roughness:0.95}));
  road.rotation.x=-Math.PI/2;road.position.y=-0.1;scene.add(road);
  for(let x=-9.5;x<10;x+=1.6){
    const mark=new THREE.Mesh(new THREE.BoxGeometry(.75,.018,.06),new THREE.MeshStandardMaterial({color:0xf4d35e}));
    mark.position.set(x,-.075,0);scene.add(mark);
  }
}
function makeCar(scene) {
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.65,.45,.82),new THREE.MeshStandardMaterial({color:0x2d8cff,metalness:.25,roughness:.35}));
  body.position.y=.38;g.add(body);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(.78,.38,.65),new THREE.MeshStandardMaterial({color:0x9ed9ff,metalness:.1,roughness:.25}));
  cabin.position.set(-.08,.78,0);g.add(cabin);
  const wheelMat=new THREE.MeshStandardMaterial({color:0x111827,roughness:.8});
  for(const x of [-.52,.52]) for(const z of [-.43,.43]){
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.12,20),wheelMat);
    wheel.rotation.z=Math.PI/2;wheel.position.set(x,.18,z);g.add(wheel);
  }
  scene.add(g);return g;
}
function initCarScene(){
  const slot=$('sceneSlot1'); if(!slot||rendererCar)return;
  rendererCar=makeRenderer('sceneSlot1');
  if(!rendererCar)return;
  sceneCar=new THREE.Scene();sceneCar.background=new THREE.Color('#09152a');sceneCar.fog=new THREE.Fog('#09152a',18,42);
  cameraCar=new THREE.PerspectiveCamera(43,Math.max(slot.clientWidth,300)/Math.max(slot.clientHeight,240),.1,100);
  cameraCar.position.set(4.2,5.2,9.5);cameraCar.lookAt(0,0,0);
  sceneCar.add(new THREE.HemisphereLight(0xdcecff,0x27364b,2));
  const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(-3,8,4);sceneCar.add(light);
  addGround(sceneCar,24,8);
  // reference markers
  for(let x=-8;x<=8;x+=2){
    const post=new THREE.Mesh(new THREE.BoxGeometry(.04,.55,.04),new THREE.MeshStandardMaterial({color:0x8cb7e8}));
    post.position.set(x,.17,-1.65);sceneCar.add(post);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.08,12,12),new THREE.MeshStandardMaterial({color:0x57d5c6,emissive:0x123b36}));
    cap.position.set(x,.48,-1.65);sceneCar.add(cap);
  }
  carGroup=makeCar(sceneCar);carGroup.position.set(-8,0,0);
  $('status3D').textContent='Laboratório pronto · movimente o veículo';
}
function initCircleScene(){
  const slot=$('circleSlot');if(!slot||rendererCircle)return;
  rendererCircle=makeRenderer('circleSlot');
  if(!rendererCircle)return;
  sceneCircle=new THREE.Scene();sceneCircle.background=new THREE.Color('#09152a');
  cameraCircle=new THREE.PerspectiveCamera(45,Math.max(slot.clientWidth,300)/Math.max(slot.clientHeight,240),.1,100);
  cameraCircle.position.set(0,8,11);cameraCircle.lookAt(0,0,0);
  sceneCircle.add(new THREE.HemisphereLight(0xe5f1ff,0x26384b,2));
  const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(3,8,4);sceneCircle.add(light);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(14,10),new THREE.MeshStandardMaterial({color:0x172b45,roughness:1}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.12;sceneCircle.add(floor);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(3,.045,10,120),new THREE.MeshStandardMaterial({color:0x52b7ff,emissive:0x0c3150}));
  ring.rotation.x=Math.PI/2;ring.position.y=.02;sceneCircle.add(ring);
  circleGroup=new THREE.Group();
  const sphere=new THREE.Mesh(new THREE.SphereGeometry(.28,24,24),new THREE.MeshStandardMaterial({color:0xffc857,emissive:0x5a3505,metalness:.15,roughness:.3}));
  sphere.position.set(3,.35,0);circleGroup.add(sphere);
  const arrowMat=new THREE.MeshStandardMaterial({color:0x48dfbd});
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(3,.35,0),1.3,0x48dfbd,.32,.18);circleGroup.add(arrow);
  const center=new THREE.Mesh(new THREE.SphereGeometry(.18,20,20),new THREE.MeshStandardMaterial({color:0x66a6ff,emissive:0x14396b}));
  center.position.y=.1;sceneCircle.add(center);sceneCircle.add(circleGroup);
}
function resizeScenes(){
  for(const {renderer,slot} of renderers){
    if(!slot.isConnected)continue;
    const w=Math.max(slot.clientWidth,300),h=Math.max(slot.clientHeight,240);
    renderer.setSize(w,h,false);
    const cam=renderer===rendererCar?cameraCar:cameraCircle;
    if(cam){cam.aspect=w/h;cam.updateProjectionMatrix();}
  }
}
function animate(now){
  requestAnimationFrame(animate);
  if(rendererCar&&sceneCar&&cameraCar){
    const dt=carLast?Math.min((now-carLast)/1000,.05):0;carLast=now;
    if(carRunning){carProgress+=dt*.12;if(carProgress>=1)carProgress=0;}
    if(carGroup)carGroup.position.x=-8+16*carProgress;
    rendererCar.render(sceneCar,cameraCar);
  }
  if(rendererCircle&&sceneCircle&&cameraCircle){
    const dt=circleLast?Math.min((now-circleLast)/1000,.05):0;circleLast=now;
    if(circleRunning)circleAngle+=dt*1.15;
    if(circleGroup)circleGroup.rotation.y=circleAngle;
    rendererCircle.render(sceneCircle,cameraCircle);
  }
}
function setupScenes(){
  try {initCarScene();initCircleScene();resizeScenes();requestAnimationFrame(animate);}
  catch(err){console.error(err);$('status3D').textContent='O laboratório 3D não pôde iniciar neste navegador.';}
}
$('runCar').addEventListener('click',()=>{carRunning=true;$('status3D').textContent='Veículo em movimento';});
$('pauseCar').addEventListener('click',()=>{carRunning=false;$('status3D').textContent='Veículo pausado';});
$('resetCar').addEventListener('click',()=>{carRunning=false;carProgress=0;if(carGroup)carGroup.position.x=-8;$('status3D').textContent='Veículo reiniciado';});
$('toggleCircle').addEventListener('click',()=>{circleRunning=!circleRunning;$('toggleCircle').textContent=circleRunning?'Ⅱ Pausar rotação':'▶ Retomar rotação';});
$('resetCircle').addEventListener('click',()=>{circleAngle=0;if(circleGroup)circleGroup.rotation.y=0;circleRunning=true;$('toggleCircle').textContent='Ⅱ Pausar rotação';});
window.addEventListener('resize',()=>{resizeScenes();if(currentSlide===4)drawGraphs();});

/* Calculadoras com feedback imediato */
const mruSpeed=$('mruSpeed'),mruTime=$('mruTime');
function updateMRU(){
  $('mruSpeedValue').textContent=`${mruSpeed.value} m/s`;
  $('mruTimeValue').textContent=`${mruTime.value} s`;
}
mruSpeed.addEventListener('input',updateMRU);mruTime.addEventListener('input',updateMRU);
$('calcMRU').addEventListener('click',()=>{
  const v=Number(mruSpeed.value),t=Number(mruTime.value),s=v*t;
  $('mruResult').textContent=`Considerando s₀ = 0 m: s = 0 + ${v} × ${t} = ${s} m.`;
});
$('resetMRU').addEventListener('click',()=>{mruSpeed.value=10;mruTime.value=5;updateMRU();$('mruResult').textContent='s = 0 m + 10 m/s × 5 s = 50 m.';});
$('checkMRU').addEventListener('click',()=>{
  const ans=document.querySelector('input[name="mruQ"]:checked');
  $('mruQuizFeedback').textContent=!ans?'Selecione uma alternativa.':ans.value==='44'?'Correto! s = 20 + 4 × 6 = 44 m.':'Ainda não. Use s = s₀ + v·t: 20 + 4 × 6 = 44 m.';
  $('mruQuizFeedback').style.color=ans&&ans.value==='44'?'#147544':'#9a3d2e';
});
const accelSlider=$('accelSlider'),accelTime=$('accelTime');
function updateMRUV(){
  $('accelValue').textContent=`${Number(accelSlider.value)} m/s²`;
  $('accelTimeValue').textContent=`${accelTime.value} s`;
}
accelSlider.addEventListener('input',updateMRUV);accelTime.addEventListener('input',updateMRUV);
$('calcMRUV').addEventListener('click',()=>{
  const a=Number(accelSlider.value),t=Number(accelTime.value),v=a*t;
  $('mruvResult').textContent=`Considerando v₀ = 0: v = 0 + (${a}) × ${t} = ${v.toLocaleString('pt-BR')} m/s. O sinal indica o sentido no eixo escolhido.`;
});
$('resetMRUV').addEventListener('click',()=>{accelSlider.value=2;accelTime.value=4;updateMRUV();$('mruvResult').textContent='Com v₀ = 0, v = 0 + 2 × 4 = 8 m/s.';});
const radiusSlider=$('radiusSlider'),periodSlider=$('periodSlider');
function updateCircle(){
  const r=Number(radiusSlider.value),T=Number(periodSlider.value),f=1/T,omega=2*Math.PI/T,v=2*Math.PI*r/T,ac=v*v/r;
  $('radiusValue').textContent=`${r} m`;$('periodValue').textContent=`${T} s`;
  $('circleResult').textContent=`f = ${f.toLocaleString('pt-BR',{maximumFractionDigits:2})} Hz · ω = ${omega.toLocaleString('pt-BR',{maximumFractionDigits:2})} rad/s · v ≈ ${v.toLocaleString('pt-BR',{maximumFractionDigits:2})} m/s · a꜀ ≈ ${ac.toLocaleString('pt-BR',{maximumFractionDigits:2})} m/s².`;
}
radiusSlider.addEventListener('input',updateCircle);periodSlider.addEventListener('input',updateCircle);

/* =========================================================
   QUIZ GAMIFICADO — 5 ALTERNATIVAS (A–E)
   Não revela acertos, erros ou gabarito antes da conclusão.
========================================================= */
const questions=[
 {q:'Um ônibus percorre 150 km em 3 h. Qual é sua velocidade escalar média?',options:['30 km/h','45 km/h','50 km/h','75 km/h','150 km/h'],correct:2,why:'A velocidade média é o deslocamento dividido pelo intervalo de tempo: 150 km ÷ 3 h = 50 km/h.'},
 {q:'Um móvel está na posição 20 m e se desloca em MRU com velocidade constante de 4 m/s. Onde estará após 6 s?',options:['24 m','40 m','44 m','48 m','60 m'],correct:2,why:'No MRU, s = s₀ + vt. Assim, s = 20 + 4 × 6 = 44 m.'},
 {q:'Um veículo parte do repouso e mantém aceleração constante de 2 m/s² durante 5 s. Qual é sua velocidade final?',options:['2 m/s','5 m/s','7 m/s','10 m/s','12 m/s'],correct:3,why:'Usando v = v₀ + at, temos v = 0 + 2 × 5 = 10 m/s.'},
 {q:'No modelo ideal de queda livre, desprezando a resistência do ar, qual é a aceleração de um corpo próximo à superfície da Terra?',options:['Zero em todos os instantes','Igual à velocidade do corpo','Horizontal e constante','Dirigida para cima','A aceleração da gravidade, dirigida para baixo'],correct:4,why:'Na queda livre ideal, a aceleração é a gravidade, aproximadamente 9,8 m/s² (ou 10 m/s² em muitos exercícios), dirigida para baixo.'},
 {q:'Um ponto de uma roda completa uma volta a cada 4 s. Qual é a frequência desse movimento?',options:['4 Hz','2 Hz','1 Hz','0,5 Hz','0,25 Hz'],correct:4,why:'A frequência é o inverso do período: f = 1/T = 1/4 = 0,25 Hz.'}
];
let quizIndex=0;
const quizAnswers=Array(questions.length).fill(null);
const quizLocked=Array(questions.length).fill(false);
const XP_PER_QUESTION=10;
function renderQuestion(){
  const q=questions[quizIndex],container=$('quizContainer');
  const locked=quizLocked[quizIndex];
  $('quizProgressText').textContent=`Missão ${quizIndex+1} de ${questions.length}`;
  $('quizProgressBar').style.width=`${(quizLocked.filter(Boolean).length/questions.length)*100}%`;
  $('quizXp').textContent=`${quizLocked.filter(Boolean).length*XP_PER_QUESTION} XP`;
  $('quizBadge').textContent=quizLocked.every(Boolean)?'DESAFIO COMPLETO':'MISSÃO EM ANDAMENTO';
  container.innerHTML=`<div class="quiz-question-top"><span class="quiz-level">MISSÃO ${String(quizIndex+1).padStart(2,'0')}</span><span class="quiz-points">+${XP_PER_QUESTION} XP por resposta registrada</span></div><h3>${q.q}</h3><div class="quiz-options">${q.options.map((op,i)=>`<label class="quiz-option ${quizAnswers[quizIndex]===i?'selected':''} ${locked?'locked':''}"><input type="radio" name="finalAnswer" value="${i}" ${quizAnswers[quizIndex]===i?'checked':''} ${locked?'disabled':''}><span class="option-letter">${String.fromCharCode(65+i)}</span><span class="option-text">${op}</span></label>`).join('')}</div><p id="answerFeedback" class="control-feedback" aria-live="polite">${locked?'Resposta registrada. O resultado e as justificativas serão revelados somente ao concluir o desafio.':'Escolha uma alternativa. Suas respostas serão corrigidas somente ao final do quiz.'}</p>`;
  container.querySelectorAll('input[name="finalAnswer"]').forEach(inp=>inp.addEventListener('change',()=>{
    if(quizLocked[quizIndex])return;
    quizAnswers[quizIndex]=Number(inp.value);
    container.querySelectorAll('.quiz-option').forEach((el,i)=>el.classList.toggle('selected',i===quizAnswers[quizIndex]));
    $('answerFeedback').textContent='Alternativa selecionada. Confirme para registrar sua missão; o gabarito ficará oculto até o final.';
    $('quizNext').disabled=false;
    $('quizNext').textContent=quizIndex===questions.length-1?'Registrar e finalizar ✓':'Registrar missão →';
  }));
  $('quizBack').disabled=quizIndex===0;
  $('quizNext').disabled=!locked&&quizAnswers[quizIndex]===null;
  $('quizNext').textContent=locked?(quizIndex===questions.length-1?'Finalizar desafio ✓':'Próxima missão →'):(quizIndex===questions.length-1?'Registrar e finalizar ✓':'Registrar missão →');
}
function showQuizResult(){
  if(!quizLocked.every(Boolean)){
    $('answerFeedback').textContent='Registre uma alternativa em cada missão antes de finalizar.';
    return;
  }
  const score=quizAnswers.reduce((sum,a,i)=>sum+(a===questions[i].correct?1:0),0);
  const percent=Math.round(score/questions.length*100);
  const rank=percent>=90?'Mestre da Cinemática':percent>=70?'Explorador da Física':percent>=50?'Aprendiz Investigador':'Recruta Científico';
  const reviews=questions.map((q,i)=>{
    const ok=quizAnswers[i]===q.correct;
    return `<article class="quiz-review-item ${ok?'is-correct':'is-incorrect'}"><div class="quiz-review-head"><span>MISSÃO ${String(i+1).padStart(2,'0')}</span><strong>${ok?'✓ Acerto':'↻ Revisar'}</strong></div><h4>${q.q}</h4><p><strong>Sua escolha:</strong> ${String.fromCharCode(65+quizAnswers[i])}. ${q.options[quizAnswers[i]]}</p><p><strong>Resposta correta:</strong> ${String.fromCharCode(65+q.correct)}. ${q.options[q.correct]}</p><p class="quiz-review-explanation"><strong>Explicação:</strong> ${q.why}</p></article>`;
  }).join('');
  $('quizProgressText').textContent=`Desafio concluído · ${questions.length}/${questions.length} missões`;
  $('quizProgressBar').style.width='100%';
  $('quizXp').textContent=`${questions.length*XP_PER_QUESTION} XP`;
  $('quizBadge').textContent=rank.toUpperCase();
  $('quizResult').hidden=false;
  $('quizResult').innerHTML=`<div class="quiz-result-hero"><span class="quiz-trophy">🏆</span><div><span class="quiz-level">RELATÓRIO DA MISSÃO</span><h3>${rank}</h3><p>Você concluiu o desafio de Cinemática!</p></div></div><div class="quiz-result-stats"><div><strong>${score}/${questions.length}</strong><span>acertos</span></div><div><strong>${percent}%</strong><span>aproveitamento</span></div><div><strong>${questions.length*XP_PER_QUESTION}</strong><span>XP conquistados</span></div></div><p class="quiz-result-message">${score===questions.length?'Excelente! Você demonstrou domínio dos conceitos avaliados.':score>=4?'Bom trabalho! Leia as justificativas abaixo e fortaleça os pontos que precisam de revisão.':'Sua jornada continua. Revise os encontros 1 e 2 e use as explicações abaixo para aprender com cada questão.'}</p><div class="quiz-review"><h3>Correção comentada</h3>${reviews}</div><button class="secondary-button" id="retryQuiz">↻ Jogar novamente</button>`;
  $('quizNext').disabled=true;$('quizBack').disabled=true;
  $('quizResult').scrollIntoView({behavior:'smooth',block:'start'});
  $('retryQuiz').addEventListener('click',()=>{quizAnswers.fill(null);quizLocked.fill(false);quizIndex=0;$('quizResult').hidden=true;renderQuestion();});
}
$('quizBack').addEventListener('click',()=>{if(quizIndex>0){quizIndex--;renderQuestion();}});
$('quizNext').addEventListener('click',()=>{
  if(!quizLocked[quizIndex]){
    if(quizAnswers[quizIndex]===null){
      const feedback=$('answerFeedback');
      if(feedback) feedback.textContent='Selecione uma alternativa A–E antes de registrar esta missão.';
      return;
    }
    quizLocked[quizIndex]=true;
    $('quizProgressText').textContent=`Missão ${quizLocked.filter(Boolean).length} de ${questions.length} registrada`;
    $('quizProgressBar').style.width=`${quizLocked.filter(Boolean).length/questions.length*100}%`;
    $('quizXp').textContent=`${quizLocked.filter(Boolean).length*XP_PER_QUESTION} XP`;
    if(quizIndex<questions.length-1){quizIndex++;renderQuestion();}
    else showQuizResult();
    return;
  }
  if(quizIndex<questions.length-1){quizIndex++;renderQuestion();}
  else showQuizResult();
});
renderQuestion();
setupScenes();
updateMRU();updateMRUV();updateCircle();
