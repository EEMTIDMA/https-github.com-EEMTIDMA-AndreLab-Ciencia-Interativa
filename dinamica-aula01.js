"use strict";

const $ = (id) => document.getElementById(id);
const TOTAL_SLIDES = 6;
const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const ui = {
  status: $("status3D"), steps: [...document.querySelectorAll(".step-link")], dots: [...document.querySelectorAll(".slide-dot")],
  prev: $("prevSlide"), next: $("nextSlide"),
  deformSlider: $("deformSlider"), deformValue: $("deformValue"), deformFeedback: $("deformFeedback"),
  forceSlider: $("forceSlider"), forceValue: $("forceValue"), run: $("runExperiment"), reset: $("resetExperiment"), experimentFeedback: $("experimentFeedback"), hypothesisFeedback: $("hypothesisFeedback")
};
let currentSlide = 1, THREE, OrbitControls, scene, camera, renderer, controls, animationFrame;
let resizeObserver, lastTime = 0, elapsed = 0, motionPaused = reducedMotion;
let world = {}, experimentRunning = false, experimentTime = 0, cartPosition = -2.7, cartVelocity = 0;
let deformAmount = 0.4, appliedForce = 5, interactionMode = "contact", quizIndex = 0, quizAnswers = Array(5).fill(null), quizSubmitted = false;
const quiz = [
 {q:"Qual foi uma contribuição importante de Galileu para o estudo do movimento?",a:["Defendeu que todo movimento exige uma força contínua.","Utilizou observações e experiências para investigar o movimento dos corpos.","Formulou sozinho as três leis de Newton.","Concluiu que a massa não interfere no movimento."],correct:1,why:"Galileu valorizou a investigação experimental e ajudou a desenvolver a compreensão da inércia e da queda dos corpos."},
 {q:"Uma bola em movimento diminui a velocidade ao rolar pelo chão. Qual interação contribui diretamente para essa redução?",a:["A força de atrito entre a bola e a superfície.","A força magnética da Terra sobre a bola.","A ausência total de forças sobre a bola.","A força resultante necessariamente nula."],correct:0,why:"O atrito se opõe ao deslizamento ou rolamento relativo entre as superfícies e pode reduzir a velocidade da bola."},
 {q:"Qual situação representa uma deformação provocada por uma força?",a:["Uma lâmpada acende ao ser ligada.","Uma bola de borracha é comprimida e muda de forma.","Um livro permanece sobre a mesa sem mudança perceptível de forma.","Uma sombra muda de posição quando a luz se move."],correct:1,why:"A compressão da bola altera sua forma. Se ela recuperar a forma original após retirar a força, a deformação foi elástica."},
 {q:"Qual exemplo representa uma interação à distância?",a:["Uma mão empurra uma porta.","Uma mesa sustenta um livro.","O atrito atua entre um pneu e o asfalto.","A Terra atrai gravitacionalmente uma pedra em queda."],correct:3,why:"A interação gravitacional ocorre entre massas mesmo sem contato direto."},
 {q:"Por que identificamos a força resultante sobre um corpo?",a:["Porque toda força sempre aumenta a rapidez.","Porque a força resultante é sempre nula.","Porque ela permite avaliar se o movimento pode sofrer aceleração.","Porque ela indica somente a forma e a cor do corpo."],correct:2,why:"A força resultante é a soma vetorial das forças. Se for diferente de zero, pode provocar aceleração, isto é, mudança na velocidade."}
];
function setStatus(text){ if(ui.status) ui.status.textContent = text; }
function showSlide(number){
 currentSlide = Math.max(1, Math.min(TOTAL_SLIDES, Number(number)||1));
 document.querySelectorAll(".slide").forEach((el)=>{const active=Number(el.id.replace("screen",""))===currentSlide;el.hidden=!active;el.classList.toggle("active",active);});
 ui.steps.forEach((el)=>{const active=Number(el.dataset.goto)===currentSlide;el.classList.toggle("active",active);if(active)el.setAttribute("aria-current","step");else el.removeAttribute("aria-current");});
 ui.dots.forEach((el)=>el.classList.toggle("active",Number(el.dataset.goto)===currentSlide));
 ui.prev.disabled=currentSlide===1;ui.next.textContent=currentSlide===TOTAL_SLIDES?"Voltar ao início ↺":"Próxima etapa →";
 moveSceneToSlide(currentSlide); resizeRenderer();
 if(currentSlide===6) renderQuiz();
 window.scrollTo({top:0,behavior:reducedMotion?"auto":"smooth"});
}
ui.steps.forEach((b)=>b.addEventListener("click",()=>showSlide(b.dataset.goto)));
ui.dots.forEach((b)=>b.addEventListener("click",()=>showSlide(b.dataset.goto)));
ui.prev.addEventListener("click",()=>showSlide(currentSlide-1));
ui.next.addEventListener("click",()=>showSlide(currentSlide===TOTAL_SLIDES?1:currentSlide+1));

async function createScene(){
 const slot=$("sceneSlot1");if(!slot){setStatus("Área 3D não encontrada.");return;}
 try{
  setStatus("Carregando laboratório 3D...");
  const threeModule=await import("https://esm.sh/three@0.180.0");
  const controlsModule=await import("https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js");
  THREE=threeModule;OrbitControls=controlsModule.OrbitControls;
  scene=new THREE.Scene();scene.background=new THREE.Color("#030713");scene.fog=new THREE.FogExp2("#030713",.027);
  camera=new THREE.PerspectiveCamera(42,1,.1,100);camera.position.set(0,3.3,8.6);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.domElement.setAttribute("aria-label","Simulação tridimensional interativa de forças e movimento");renderer.domElement.setAttribute("role","img");renderer.domElement.tabIndex=0;slot.replaceChildren(renderer.domElement);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.06;controls.minDistance=4;controls.maxDistance=15;controls.maxPolarAngle=Math.PI*.49;controls.target.set(0,.7,0);controls.update();
  scene.add(new THREE.HemisphereLight(0xbddcff,0x182038,2.1));const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(-4,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);const rim=new THREE.PointLight(0x00dfff,28,18);rim.position.set(4,3,-3);scene.add(rim);const pink=new THREE.PointLight(0xff3da6,16,15);pink.position.set(-4,2,-4);scene.add(pink);
  addStarfield();buildScene(1);
  if(typeof ResizeObserver!=="undefined"){resizeObserver=new ResizeObserver(resizeRenderer);resizeObserver.observe(slot);}window.addEventListener("resize",resizeRenderer);
  slot.querySelector(".scene-loading")?.remove();resizeRenderer();setStatus("Laboratório 3D pronto para explorar.");animate(0);
 }catch(err){console.error("[AndreLab] Falha ao iniciar Three.js:",err);setStatus("Não foi possível carregar o 3D. Verifique a conexão e o suporte a WebGL.");document.querySelectorAll(".scene-loading").forEach(el=>el.textContent="Não foi possível iniciar a cena 3D. Verifique a internet e recarregue a página.");}
}
function addStarfield(){const positions=[];for(let i=0;i<650;i++){positions.push((Math.random()-.5)*38,Math.random()*16-3,(Math.random()-.5)*30-8);}const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));const m=new THREE.PointsMaterial({color:0xa9caff,size:.035,transparent:true,opacity:.8});world.stars=new THREE.Points(g,m);scene.add(world.stars);}
function mat(color,roughness=.4,metalness=.1,extra={}){return new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});}
function mesh(geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
function group(){const g=new THREE.Group();scene.add(g);return g;}
function clearWorld(){
 const persistentStars=world.stars;
 for(const object of [...scene.children]){
  if(object===persistentStars || object.isLight) continue;
  scene.remove(object);
  object.traverse?.((child)=>{
   if(child.geometry) child.geometry.dispose();
   if(child.material){if(Array.isArray(child.material))child.material.forEach((material)=>material.dispose());else child.material.dispose();}
  });
 }
 world={stars:persistentStars};
}
function addFloor(){const floor=mesh(new THREE.PlaneGeometry(26,22),mat("#10182a",.78,.25),0,-.04,0);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;const grid=new THREE.GridHelper(24,48,0x16415a,0x1c2a43);grid.position.y=-.025;scene.add(grid);world.floor=floor;world.grid=grid;}
function addArrow(start,end,color=0x00e5ff){const dir=new THREE.Vector3().subVectors(end,start);const arrow=new THREE.ArrowHelper(dir.clone().normalize(),start,dir.length(),color,.24,.13);scene.add(arrow);return arrow;}
function buildScene(slide){if(!THREE||!scene)return;clearWorld();addFloor();world.dynamic=[];world.arrows=[];
 if(slide===1)buildHistoricalScene();else if(slide===2)buildMotionScene();else if(slide===3)buildDeformationScene();else if(slide===4)buildInteractionScene();else if(slide===5)buildExperimentScene();else buildSummaryScene();
}
function buildHistoricalScene(){camera.position.set(0,3.5,9.5);controls.target.set(0,.7,0);const ramp=mesh(new THREE.BoxGeometry(5.5,.22,1.6),mat("#3a526f",.42,.45),0,1.05,0);ramp.rotation.z=-.25;const ball=mesh(new THREE.SphereGeometry(.43,48,32),mat("#d8e6f8",.2,.72,{metalness:.62}),-1.8,1.85,.02);ball.material.color.set("#a8d8ff");world.ball=ball;world.ramp=ramp;const base=mesh(new THREE.BoxGeometry(6,.22,2.1),mat("#1a2943",.32,.45),0,.35,0);const plinth=mesh(new THREE.CylinderGeometry(.6,.7,.28,48),mat("#223651",.3,.65),-2.2,.15,0);world.dynamic.push(ball);world.dynamic.push(ramp);world.base=base;world.plinth=plinth;addArrow(new THREE.Vector3(-2,2.4,.1),new THREE.Vector3(-.8,2.4,.1),0x00e5ff);world.labelGlow=mesh(new THREE.SphereGeometry(.055,16,12),new THREE.MeshBasicMaterial({color:0x00e5ff}),-1.4,2.4,.1);}
function buildMotionScene(){camera.position.set(0,3.1,8.2);controls.target.set(0,.7,0);const base=mesh(new THREE.BoxGeometry(6.6,.25,2.4),mat("#1b2b45",.3,.55),0,.22,0);const cart=group();const body=mesh(new THREE.BoxGeometry(1.4,.48,.9),mat("#1584a9",.25,.65),0,.85,0);cart.add(body);for(const x of [-.45,.45]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.14,32),mat("#10131b",.32,.1));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.53,.48);cart.add(wheel);const wheel2=wheel.clone();wheel2.position.z=-.48;cart.add(wheel2);}cart.position.x=-2;scene.add(cart);world.cart=cart;world.dynamic.push(cart);world.base=base;world.forceArrow=addArrow(new THREE.Vector3(-1.2,1.5,0),new THREE.Vector3(.1,1.5,0),0xff3da6);world.arrows.push(world.forceArrow);const target=mesh(new THREE.BoxGeometry(.12,1.1,1.1),mat("#53627e",.35,.3),2.5,.9,0);world.target=target;}
function buildDeformationScene(){camera.position.set(0,3.2,8);controls.target.set(0,.8,0);mesh(new THREE.BoxGeometry(6.8,.25,2.5),mat("#1b2940",.4,.4),0,.15,0);const left=mesh(new THREE.BoxGeometry(.3,1.8,1.5),mat("#7f96b7",.22,.78),-1.7,1.15,0);const right=mesh(new THREE.BoxGeometry(.3,1.8,1.5),mat("#7f96b7",.22,.78),1.7,1.15,0);const sphere=mesh(new THREE.SphereGeometry(.9,48,32),mat("#ec5e9e",.23,.3,{metalness:.18}),0,1.15,0);world.leftPlate=left;world.rightPlate=right;world.deformSphere=sphere;world.dynamic.push(sphere);world.arrows.push(addArrow(new THREE.Vector3(-2.6,2.3,0),new THREE.Vector3(-1.8,2.3,0),0x00e5ff),addArrow(new THREE.Vector3(2.6,2.3,0),new THREE.Vector3(1.8,2.3,0),0x00e5ff));applyDeformation();}
function buildInteractionScene(){camera.position.set(0,3.1,8.6);controls.target.set(0,.7,0);if(interactionMode==="contact"){mesh(new THREE.BoxGeometry(5.5,.25,2),mat("#1b2b45",.4,.4),0,.15,0);const box=mesh(new THREE.BoxGeometry(1.2,1.1,1.1),mat("#10a5c5",.28,.55),0,.85,0);world.box=box;world.dynamic.push(box);world.arrows.push(addArrow(new THREE.Vector3(-2,1.1,0),new THREE.Vector3(-.7,1.1,0),0xff3da6));const hand=group();const palm=mesh(new THREE.BoxGeometry(.85,.25,.5),mat("#dba17c",.6,.05),-1.95,1.1,0);hand.add(palm);for(let i=0;i<4;i++){const f=mesh(new THREE.CylinderGeometry(.065,.065,.42,16),mat("#dba17c",.6,.05),-1.55,1.05+i*.06,(i-1.5)*.1);f.rotation.z=Math.PI/2;hand.add(f);}world.hand=hand;}else{const leftColor=interactionMode==="magnetic"?"#ff4d69":interactionMode==="electric"?"#ff6a9c":"#287ad9";const rightColor=interactionMode==="magnetic"?"#4d8dff":interactionMode==="electric"?"#57e0ff":"#a2c7ff";const a=mesh(new THREE.SphereGeometry(.62,40,28),mat(leftColor,.25,.5,{emissive:leftColor,emissiveIntensity:.12}),-1.55,1.2,0);const b=mesh(new THREE.SphereGeometry(.62,40,28),mat(rightColor,.25,.5,{emissive:rightColor,emissiveIntensity:.12}),1.55,1.2,0);world.bodyA=a;world.bodyB=b;world.dynamic.push(a,b);if(interactionMode==="magnetic"){const bar1=mesh(new THREE.BoxGeometry(.5,.5,.7),mat("#d9e2f2",.25,.7),-1.55,1.2,0);const bar2=mesh(new THREE.BoxGeometry(.5,.5,.7),mat("#d9e2f2",.25,.7),1.55,1.2,0);bar1.material.color.set("#d74b65");bar2.material.color.set("#477fe0");world.bar1=bar1;world.bar2=bar2;}world.arrows.push(addArrow(new THREE.Vector3(-.95,2.1,0),new THREE.Vector3(-.15,2.1,0),0x00e5ff),addArrow(new THREE.Vector3(.95,2.1,0),new THREE.Vector3(.15,2.1,0),0xff3da6));}}
function buildExperimentScene(){camera.position.set(0,3.1,8);controls.target.set(0,.7,0);const track=mesh(new THREE.BoxGeometry(7.2,.2,1.9),mat("#1c2a42",.32,.5),0,.2,0);world.track=track;const cart=group();const body=new THREE.Mesh(new THREE.BoxGeometry(1.15,.45,.75),mat("#1bb6d1",.22,.6));body.position.y=.68;body.castShadow=true;cart.add(body);for(const x of [-.36,.36])for(const z of [-.35,.35]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.12,24),mat("#0b0e16",.28,.25));w.rotation.z=Math.PI/2;w.position.set(x,.43,z);cart.add(w);}cart.position.x=cartPosition;scene.add(cart);world.experimentCart=cart;world.dynamic.push(cart);world.arrows.push(addArrow(new THREE.Vector3(-2.6,1.45,0),new THREE.Vector3(-1.6,1.45,0),0xff3da6));}
function buildSummaryScene(){camera.position.set(0,3.4,9);controls.target.set(0,.8,0);const pedestal=mesh(new THREE.CylinderGeometry(2.5,2.7,.35,64),mat("#172946",.25,.55),0,.15,0);world.pedestal=pedestal;const sphere=mesh(new THREE.SphereGeometry(.55,40,32),mat("#13bde2",.22,.6,{emissive:"#006c91",emissiveIntensity:.25}),-1.4,1.05,0);const cube=mesh(new THREE.BoxGeometry(1,1,1),mat("#ff4ca8",.28,.4,{emissive:"#601438",emissiveIntensity:.2}),0,1.05,0);const spring=mesh(new THREE.TorusGeometry(.55,.09,12,48),mat("#73ffbd",.22,.8),1.45,1.05,0);spring.rotation.x=Math.PI/2;world.dynamic.push(sphere,cube,spring);world.summaryObjects=[sphere,cube,spring];world.arrows.push(addArrow(new THREE.Vector3(-2,2.2,0),new THREE.Vector3(-.7,2.2,0),0x00e5ff),addArrow(new THREE.Vector3(.7,2.2,0),new THREE.Vector3(2,2.2,0),0xff3da6));}
function moveSceneToSlide(slide){if(!renderer)return;const target=$("sceneSlot"+slide);if(!target)return;target.replaceChildren(renderer.domElement);if(resizeObserver){resizeObserver.disconnect();resizeObserver.observe(target);}buildScene(slide);resizeRenderer();}
function resizeRenderer(){if(!renderer||!camera)return;const slot=$("sceneSlot"+currentSlide);if(!slot)return;const rect=slot.getBoundingClientRect();if(rect.width<2||rect.height<2)return;renderer.setSize(Math.floor(rect.width),Math.floor(rect.height),false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}
function applyDeformation(){if(!world.deformSphere)return;const s=1-deformAmount*.43;world.deformSphere.scale.set(1+deformAmount*.18,s,1+deformAmount*.18);if(world.leftPlate)world.leftPlate.position.x=-1.7+deformAmount*.28;if(world.rightPlate)world.rightPlate.position.x=1.7-deformAmount*.28;}
function applyForceArrow(){if(!world.forceArrow)return;world.forceArrow.visible=true;world.forceArrow.setLength(.45+appliedForce*.15,.24,.13);world.forceArrow.position.x=-1.2;}
function animate(time=0){animationFrame=requestAnimationFrame(animate);const dt=lastTime?Math.min((time-lastTime)/1000,.05):0;lastTime=time;if(!motionPaused&&!reducedMotion)elapsed+=dt;if(controls)controls.update();if(world.stars&&!motionPaused)world.stars.rotation.y+=dt*.002;
 if(currentSlide===1&&world.ball&&!motionPaused){world.ball.position.x=-1.8+Math.sin(elapsed*.7)*.6;world.ball.rotation.z=elapsed*.6;}
 if(currentSlide===2&&world.cart&&!motionPaused){world.cart.position.x=-2+Math.sin(elapsed*.6)*.65;}
 if(currentSlide===3&&world.deformSphere){world.deformSphere.rotation.y+=dt*.22;}
 if(currentSlide===4&&world.bodyA&&world.bodyB&&!motionPaused){const gap=interactionMode==="magnetic"?1.15:interactionMode==="electric"?1.8:1.45;world.bodyA.position.x=-gap+Math.sin(elapsed*.5)*.08;world.bodyB.position.x=gap-Math.sin(elapsed*.5)*.08;}
 if(currentSlide===5&&world.experimentCart){if(experimentRunning&&!motionPaused){experimentTime+=dt;cartVelocity+=appliedForce*.025;cartPosition+=cartVelocity*dt;if(cartPosition>2.8){cartPosition=2.8;cartVelocity=0;experimentRunning=false;ui.experimentFeedback.textContent="O carrinho chegou ao limite do trilho. Reinicie para comparar outro valor de força.";}world.experimentCart.position.x=cartPosition;}else if(!experimentRunning)world.experimentCart.position.x=cartPosition;}
 if(currentSlide===6&&world.summaryObjects&&!motionPaused){world.summaryObjects[0].position.y=1.05+Math.sin(elapsed*1.2)*.12;world.summaryObjects[1].rotation.y+=dt*.35;world.summaryObjects[2].rotation.z+=dt*.3;}
 if(renderer&&scene&&camera)renderer.render(scene,camera);
}

ui.deformSlider.addEventListener("input",()=>{deformAmount=Number(ui.deformSlider.value)/100;ui.deformValue.textContent=`${ui.deformSlider.value}%`;applyDeformation();ui.deformFeedback.textContent=deformAmount<.2?"A deformação é pequena; observe a forma quase esférica.":deformAmount<.65?"A compressão aumenta e a forma se modifica visivelmente.":"A compressão é elevada no modelo. Materiais reais podem ultrapassar seu limite elástico.";});
ui.forceSlider.addEventListener("input",()=>{appliedForce=Number(ui.forceSlider.value);ui.forceValue.textContent=`${appliedForce} N`;applyForceArrow();ui.experimentFeedback.textContent=`Força definida em ${appliedForce} N. Execute o experimento para observar o movimento.`;});
ui.run.addEventListener("click",()=>{if(currentSlide!==5)showSlide(5);experimentRunning=true;experimentTime=0;cartVelocity=0;ui.experimentFeedback.textContent=`Experimento iniciado com força de ${appliedForce} N. Observe o deslocamento do carrinho.`;});
ui.reset.addEventListener("click",()=>{experimentRunning=false;experimentTime=0;cartPosition=-2.7;cartVelocity=0;if(world.experimentCart)world.experimentCart.position.x=cartPosition;ui.experimentFeedback.textContent="Experimento reiniciado. Altere a força e compare os resultados.";});
document.querySelectorAll('input[name="hypothesis"]').forEach(input=>input.addEventListener("change",()=>{const correct=input.value==="more";ui.hypothesisFeedback.textContent=correct?"Boa hipótese! Para a mesma massa, uma força resultante maior produz maior aceleração no modelo.":"Revise sua previsão: para a mesma massa, uma força resultante maior tende a produzir maior aceleração.";ui.hypothesisFeedback.style.color=correct?"var(--green)":"var(--gold)";}));
const interactions={contact:{title:"Interações de contato",text:"Ocorrem quando os corpos se tocam, como a mão empurrando uma caixa, o chão sustentando um livro ou uma superfície exercendo atrito sobre um objeto."},gravity:{title:"Interação gravitacional",text:"Massas atraem-se gravitacionalmente mesmo sem contato. Na superfície da Terra, essa interação contribui para a força peso e para a queda dos corpos."},magnetic:{title:"Interação magnética",text:"Ímãs podem atrair ou repelir outros ímãs e alguns materiais sem contato direto. O resultado depende da orientação dos polos e das propriedades dos materiais."},electric:{title:"Interação elétrica",text:"Corpos eletrizados exercem forças de atração ou repulsão. Cargas de sinais opostos atraem-se; cargas de mesmo sinal repelem-se."}};
document.querySelectorAll("[data-interaction]").forEach(button=>button.addEventListener("click",()=>{interactionMode=button.dataset.interaction;document.querySelectorAll("[data-interaction]").forEach(b=>b.classList.toggle("active",b===button));$("interactionTitle").textContent=interactions[interactionMode].title;$("interactionText").textContent=interactions[interactionMode].text;moveSceneToSlide(4);}));
function renderQuiz(){
 const container=$("quizContainer"),q=quiz[quizIndex];
 if(!container)return;
 $("quizProgressText").textContent=`Questão ${quizIndex+1} de ${quiz.length}`;
 $("quizProgressBar").style.width=`${((quizIndex+1)/quiz.length)*100}%`;
 $("quizBack").disabled=quizIndex===0||quizSubmitted;
 $("quizNext").disabled=quizSubmitted;
 $("quizNext").textContent=quizIndex===quiz.length-1?"Finalizar avaliação ✓":"Confirmar e avançar →";
 container.innerHTML=`<div class="quiz-question-count">QUESTÃO ${String(quizIndex+1).padStart(2,"0")}</div><h3>${q.q}</h3><div class="quiz-options">${q.a.map((answer,i)=>`<button class="quiz-option ${quizAnswers[quizIndex]===i?"selected":""} ${quizSubmitted&&i===q.correct?"correct":""} ${quizSubmitted&&quizAnswers[quizIndex]===i&&i!==q.correct?"incorrect":""}" data-answer="${i}" ${quizSubmitted?"disabled":""}><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${answer}</span></button>`).join("")}</div>${quizSubmitted?`<div class="quiz-feedback">${q.why}</div>`:""}`;
 container.querySelectorAll("[data-answer]").forEach(button=>button.addEventListener("click",()=>{
   if(quizSubmitted)return;
   quizAnswers[quizIndex]=Number(button.dataset.answer);
   renderQuiz();
 }));
 $("quizResult").hidden=true;
}
$("quizBack").addEventListener("click",()=>{if(quizIndex>0&&!quizSubmitted){quizIndex--;renderQuiz();}});
$("quizNext").addEventListener("click",()=>{
 if(quizSubmitted)return;
 if(quizAnswers[quizIndex]===null){$("quizContainer").insertAdjacentHTML("beforeend","<p class='quiz-feedback' role='alert'>Selecione uma alternativa antes de continuar.</p>");return;}
 if(quizIndex<quiz.length-1){quizIndex++;renderQuiz();return;}
 quizSubmitted=true;
 const score=quiz.reduce((sum,item,i)=>sum+(quizAnswers[i]===item.correct?1:0),0);
 renderQuiz();
 const result=$("quizResult");result.hidden=false;
 result.innerHTML=`<h3>Você acertou ${score} de ${quiz.length} questões.</h3><p>${score>=4?"Excelente! Você relacionou corretamente os principais conceitos de forças e movimento.":"Revise as explicações e as simulações para consolidar os conceitos. Confira o feedback de cada questão e tente novamente."}</p><button class="secondary-button" id="retryQuiz" style="margin-top:13px">↺ Refazer avaliação</button>`;
 $("retryQuiz").addEventListener("click",()=>{quizIndex=0;quizAnswers=Array(quiz.length).fill(null);quizSubmitted=false;renderQuiz();});
});

createScene();
