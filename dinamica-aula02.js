import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js';
'use strict';
const $=id=>document.getElementById(id);let currentSlide=1,renderer,scene,camera,controls,raf=0,last=0,elapsed=0,resizeObserver;let world={};let force=10,mass=5,experimentRunning=false,cartX=-2.5,cartV=0,quizIndex=0,answers=[null,null,null,null,null],submitted=false;
const quiz=[
{q:'Um livro permanece parado sobre uma mesa. Qual afirmação está correta?',a:['Não existe nenhuma força atuando no livro.','A força peso e a força normal se equilibram, e a resultante é nula.','A força peso é maior que a força normal.','A inércia é uma força que mantém o livro parado.'],correct:1,why:'Correto: o peso atua para baixo e a força normal da mesa atua para cima. Nesse caso, elas se equilibram e a força resultante é nula.'},
{q:'Uma força resultante de 15 N atua sobre um corpo de massa 3 kg. Qual é a aceleração?',a:['5 m/s²','12 m/s²','45 m/s²','0,2 m/s²'],correct:0,why:'Pela Segunda Lei, a = Fᵣ/m = 15/3 = 5 m/s².'},
{q:'Mantendo a força resultante constante, se a massa de um objeto dobra, sua aceleração:',a:['Dobra.','Permanece igual.','Fica pela metade.','Torna-se necessariamente zero.'],correct:2,why:'Como a = Fᵣ/m, dobrar a massa mantendo a força fixa reduz a aceleração à metade.'},
{q:'Um corpo de massa 4 kg está próximo à superfície terrestre. Usando g ≈ 10 m/s², seu peso é aproximadamente:',a:['4 N','0,4 N','40 kg','40 N'],correct:3,why:'O peso é P = m·g = 4 kg × 10 m/s² = 40 N. Massa é medida em kg; peso, em N.'},
{q:'Ao empurrar uma parede, ela exerce uma força sobre você. Pela Terceira Lei, essas forças:',a:['Atuam no mesmo corpo e se anulam.','Têm mesma intensidade e sentidos opostos, mas atuam em corpos diferentes.','Só existem se a parede se mover.','Têm sempre intensidades diferentes.'],correct:1,why:'As forças de ação e reação têm mesma intensidade e direção, sentidos opostos e atuam em corpos diferentes.'}
];
function material(color,metalness=.2,roughness=.5,extra={}){return new THREE.MeshStandardMaterial({color,metalness,roughness,...extra});}
function addMesh(geometry,mat,x,y,z){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
function arrow(from,to,color){const d=new THREE.Vector3().subVectors(to,from);const a=new THREE.ArrowHelper(d.clone().normalize(),from,d.length(),color,.28,.17);scene.add(a);return a;}
function clearWorld(){for(const o of [...scene.children]){if(o!==scene.children.find(x=>x.isLight)){} if(o!==world.ambient&&o!==world.keyLight&&o!==world.fillLight){scene.remove(o);if(o.geometry)o.geometry.dispose();}}world={};}
function addTextLabel(text,x,y,z,color='#14233b'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,512,128);ctx.fillStyle='rgba(255,255,255,.94)';ctx.strokeStyle='rgba(27,48,76,.22)';ctx.lineWidth=4;
  const r=18;ctx.beginPath();ctx.roundRect(8,8,496,112,r);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.font='700 38px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,65);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));sprite.position.set(x,y,z);sprite.scale.set(2.1,.53,1);sprite.renderOrder=10;scene.add(sprite);return sprite;
}
function makeCart(x=0, massColor='#dce5ee'){
  // Mantido como modelo auxiliar para a cena de experimento; formato de carrinho didático.
  const cart=new THREE.Group();
  const frame=new THREE.Mesh(new THREE.BoxGeometry(1.45,.14,.82),material('#35485e',.78,.3));frame.position.y=.43;frame.castShadow=true;cart.add(frame);
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.25,.42,.72),material(massColor,.42,.32,{metalness:.25}));body.position.y=.68;body.castShadow=true;body.receiveShadow=true;cart.add(body);
  for(const wx of [-.49,.49])for(const wz of [-.39,.39]){const tire=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.14,32),material('#202833',.12,.72));tire.rotation.z=Math.PI/2;tire.position.set(wx,.24,wz);tire.castShadow=true;cart.add(tire);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.15,24),material('#9aa9b9',.82,.22));hub.rotation.z=Math.PI/2;hub.position.set(wx,.24,wz);cart.add(hub);}
  cart.position.x=x;scene.add(cart);return cart;
}
function makeVehicle(type='car',x=0,color='#1686d9'){
  const v=new THREE.Group();
  const isBus=type==='bus', isVan=type==='van';
  const length=isBus?2.75:(isVan?2.15:1.85), bodyH=isBus?.72:(isVan?.65:.48), baseY=.42;
  const body= new THREE.Mesh(new THREE.BoxGeometry(length,bodyH,.92),material(color,.22,.34));body.position.set(0,baseY+bodyH/2,0);body.castShadow=true;body.receiveShadow=true;v.add(body);
  // Capô e cabine com para-brisa inclinado, para dar silhueta de veículo cotidiano.
  if(!isBus){const hood=new THREE.Mesh(new THREE.BoxGeometry(length*.28,.20,.88),material(color,.2,.34));hood.position.set(length*.34,baseY+bodyH*.55,0);hood.castShadow=true;v.add(hood);}
  const cabX=isBus?-length*.05:length*.04;
  const cabinY=baseY+bodyH+(isBus?.2:.14);
  if(isBus){
    // Ônibus em corte didático: teto, pilares e janelas, sem uma caixa fechada
    // que esconda o passageiro. A lateral próxima fica aberta para enxergar o interior.
    const roof=new THREE.Mesh(new THREE.BoxGeometry(length*.82,.09,.88),material('#0876b9',.28,.32));
    roof.position.set(cabX,cabinY+.255,0);roof.castShadow=true;v.add(roof);
    const pillarMat=material('#eaf4fa',.2,.3);
    for(const px of [-length*.40,-length*.20,0,length*.20,length*.40]){
      const pillar=new THREE.Mesh(new THREE.BoxGeometry(.045,.43,.055),pillarMat);
      pillar.position.set(cabX+px,cabinY+.025,.405);v.add(pillar);
    }
    // Lateral oposta e para-brisa discretos dão profundidade sem fechar a visão.
    const farSide= new THREE.Mesh(new THREE.BoxGeometry(length*.8,.32,.018),material('#78c9e9',.25,.18,{transparent:true,opacity:.22,depthWrite:false}));
    farSide.position.set(cabX,cabinY,-.405);v.add(farSide);
    const frontGlass=new THREE.Mesh(new THREE.BoxGeometry(.025,.34,.68),material('#78c9e9',.2,.18,{transparent:true,opacity:.22,depthWrite:false}));
    frontGlass.position.set(length*.365,cabinY,0);v.add(frontGlass);
  }else{
    const cabinMat=material('#e8f1f8',.18,.28,{metalness:.12});
    const cabin=new THREE.Mesh(new THREE.BoxGeometry(length*.48,.48,.82),cabinMat);cabin.position.set(cabX,cabinY,0);cabin.castShadow=true;v.add(cabin);
  }
  const windowMat=material('#78c9e9',.25,.18,{metalness:.15,transparent:true,opacity:isBus?.26:.88,depthWrite:false});
  const windowCount=isBus?5:(isVan?3:2);
  for(let i=0;i<windowCount;i++){
    const wx=isBus?(cabX-length*.34+i*(length*.68/(windowCount-1))):(length*.04+(i-(windowCount-1)/2)*.34);
    const win=new THREE.Mesh(new THREE.BoxGeometry(isBus?.34:.28,.28,.018),windowMat);win.position.set(wx,cabinY,.416);win.castShadow=false;v.add(win);
  }
  // Para-choques, faróis e lanternas
  const bumper=new THREE.Mesh(new THREE.BoxGeometry(.12,.13,.98),material('#c8d1da',.65,.28));bumper.position.set(length/2+.035,.39,0);v.add(bumper);
  v.userData.tailLights=[];for(const z of [-.29,.29]){const head=new THREE.Mesh(new THREE.BoxGeometry(.045,.13,.16),material('#fff1ad',.15,.22,{emissive:'#ffdc62',emissiveIntensity:.22}));head.position.set(length/2+.01,.53,z);v.add(head);const tail=new THREE.Mesh(new THREE.BoxGeometry(.045,.14,.15),material('#e43e4b',.1,.3,{emissive:'#a20c19',emissiveIntensity:.15}));tail.position.set(-length/2-.01,.52,z);v.add(tail);v.userData.tailLights.push(tail);}
  const wheelXs=isBus?[-.86,.86]:[-.58,.58];
  for(const wx of wheelXs)for(const wz of [-.47,.47]){const tire=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.13,32),material('#20252b',.08,.82));tire.rotation.x=Math.PI/2;tire.position.set(wx,.27,wz);tire.castShadow=true;v.add(tire);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.14,24),material('#d5dde5',.72,.24));hub.rotation.x=Math.PI/2;hub.position.set(wx,.27,wz);v.add(hub);const center=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.145,16),material('#66788b',.7,.3));center.rotation.x=Math.PI/2;center.position.set(wx,.27,wz);v.add(center);}
  // Faixa lateral e espelhos dão detalhes sem poluir a leitura da simulação.
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(length*.72,.055,.935),material(isBus?'#f8cf43':'#ffffff',.1,.45));stripe.position.set(-.02,baseY+bodyH*.3,0);v.add(stripe);
  if(!isBus){for(const z of [-.5,.5]){const mirror=new THREE.Mesh(new THREE.BoxGeometry(.12,.07,.12),material('#263746',.2,.3));mirror.position.set(length*.13,baseY+bodyH+.17,z);v.add(mirror);}}
  v.position.set(x,0,0);scene.add(v);return v;
}
function addRoad(length=10){
  addMesh(new THREE.BoxGeometry(length,.12,2.7),material('#424b55',.02,.94),0,.02,0);
  addMesh(new THREE.BoxGeometry(length,.018,.07),material('#f4f0d7',.02,.7),0,.09,0);
  for(let x=-length/2+.5;x<length/2;x+=1.15)addMesh(new THREE.BoxGeometry(.55,.022,.075),material('#f7f4e8',.02,.72),x,.095,0);
  for(const z of [-1.38,1.38])addMesh(new THREE.BoxGeometry(length,.05,.07),material('#e9edf1',.02,.7),0,.06,z);
}
function baseScene(target=new THREE.Vector3(0,.6,0)){
  scene=new THREE.Scene();scene.background=new THREE.Color('#eaf0f6');scene.fog=new THREE.Fog('#eaf0f6',18,36);
  camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(0,3.5,8.8);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;renderer.domElement.setAttribute('aria-label','Modelo tridimensional interativo');
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.copy(target);controls.minDistance=4;controls.maxDistance=14;
  scene.add(new THREE.HemisphereLight(0xffffff,0x9caec1,2.25));const key=new THREE.DirectionalLight(0xffffff,3.3);key.position.set(-4,9,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);const fill=new THREE.DirectionalLight(0xb7d7ff,1.4);fill.position.set(5,4,-4);scene.add(fill);
  const floor=addMesh(new THREE.PlaneGeometry(30,30),material('#d7e0e9',.08,.88),0,-.025,0);floor.rotation.x=-Math.PI/2;
  const grid=new THREE.GridHelper(24,24,0x9aafc3,0xc4d0dc);grid.position.y=.006;grid.material.transparent=true;grid.material.opacity=.38;scene.add(grid);
}
function buildScene(n){
 const slot=$('sceneSlot'+n);if(!slot)return;
 if(resizeObserver)resizeObserver.disconnect();
 if(controls){controls.dispose();controls=null;}
 if(renderer){renderer.dispose();renderer.domElement.remove();renderer=null;}
 scene=null;camera=null;world={};
 // As etapas 1 e 2 incorporam os simuladores originais do Physics at School.
 // Não criar canvas Three.js sobre os iframes externos.
 if(n===1||n===2){
  $('status3D').textContent=n===1?'Simulador original · Primeira Lei de Newton':'Simulador original · Segunda Lei de Newton';
  return;
 }
 slot.querySelectorAll('.scene-replay-button,.bus-interior-hint').forEach(b=>b.remove());baseScene();
 if(n===1){
  camera.position.set(-.35,2.75,6.35);controls.target.set(-.25,1.05,0);controls.minDistance=3.2;controls.maxDistance=12;addRoad(9.5);
  // Situação cotidiana: ônibus segue em velocidade constante e realiza uma frenagem.
  const bus=makeVehicle('bus',-2.65,'#1687cf');world.inertiaVehicle=bus;world.vehicleType='bus';
  // Semáforo tridimensional: verde durante o movimento e vermelho na frenagem.
  addMesh(new THREE.CylinderGeometry(.055,.075,2.15,20),material('#3b4655',.35,.55),2.55,1.08,-.48);
  addMesh(new THREE.BoxGeometry(.46,.94,.25),material('#202833',.48,.38),2.55,2.0,-.48);
  const signalRed=addMesh(new THREE.SphereGeometry(.125,24,18),material('#6d1820',.2,.3,{emissive:'#ff1f38',emissiveIntensity:.12}),2.55,2.28,-.33);
  addMesh(new THREE.SphereGeometry(.125,24,18),material('#6b5420',.2,.3,{emissive:'#ffc13d',emissiveIntensity:.08}),2.55,2.0,-.33);
  const signalGreen=addMesh(new THREE.SphereGeometry(.125,24,18),material('#1c633f',.2,.3,{emissive:'#21ff89',emissiveIntensity:.9}),2.55,1.72,-.33);
  world.signalRed=signalRed;world.signalGreen=signalGreen;
  // Passageiro esquemático visível pela lateral: inclina-se para a frente durante a frenagem.
  const passenger=new THREE.Group();passenger.position.set(.18,.79,.12);bus.add(passenger);
  // Banco e apoio dos pés ajudam a identificar a posição do passageiro dentro do ônibus.
  const seat=new THREE.Mesh(new THREE.BoxGeometry(.32,.08,.28),material('#344e6c',.12,.65));seat.position.set(.18,.86,-.02);bus.add(seat);
  const seatBack=new THREE.Mesh(new THREE.BoxGeometry(.09,.32,.28),material('#344e6c',.12,.65));seatBack.position.set(.02,1.02,-.02);bus.add(seatBack);
  const interiorHint=document.createElement('div');interiorHint.className='bus-interior-hint';interiorHint.textContent='VISÃO INTERNA · passageiro e banco';slot.appendChild(interiorHint);world.busInteriorHint=interiorHint;
  const torso=new THREE.Mesh(new THREE.BoxGeometry(.19,.30,.13),material('#f2b544',.08,.72));torso.position.set(0,.27,0);passenger.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.105,20,16),material('#b9784d',.05,.78));head.position.set(.015,.49,0);passenger.add(head);
  const legs=new THREE.Mesh(new THREE.BoxGeometry(.27,.10,.15),material('#263b58',.05,.78));legs.position.set(.04,.095,0);passenger.add(legs);
  const belt=new THREE.Mesh(new THREE.BoxGeometry(.055,.34,.035),material('#27364a',.2,.5));belt.position.set(.055,.27,.085);belt.rotation.z=-.48;passenger.add(belt);
  world.passenger=passenger;world.busStartX=-2.65;world.busTime=0;world.busSimulationRunning=true;world.busBrakeDone=false;
  world.busVelocityArrow=arrow(new THREE.Vector3(-2.3,1.85,.15),new THREE.Vector3(-1.55,1.85,.15),0x0878d1);
  addTextLabel('1ª LEI · INÉRCIA',0,2.65,0,'#17324f');addTextLabel('O ÔNIBUS FREIA',0,2.1,0,'#a52b28');
  // Botão permite repetir a demonstração sem recarregar a aula.
  const replay=document.createElement('button');replay.className='scene-replay-button';replay.type='button';replay.textContent='↻ Repetir frenagem';replay.setAttribute('aria-label','Repetir simulação de frenagem do ônibus');
  replay.addEventListener('click',()=>{world.busTime=0;world.busSimulationRunning=true;world.busBrakeDone=false;bus.position.x=world.busStartX;passenger.rotation.z=0;for(const light of bus.userData.tailLights)light.material.emissiveIntensity=.15;if(world.signalRed)world.signalRed.material.emissiveIntensity=.12;if(world.signalGreen)world.signalGreen.material.emissiveIntensity=.9;replay.textContent='Frenagem em andamento…';});
  slot.appendChild(replay);world.busReplayButton=replay;
 }
 if(n===2||n===5){
  camera.position.set(0,3.2,8.4);controls.target.set(0,.65,0);addRoad(9.5);
  const car=makeVehicle('car',n===5?cartX:-1.8,n===5?'#f0b429':'#e34b45');world.cart=car;world.track=true;world.vehicleType='car';
  world.forceArrow=arrow(new THREE.Vector3(car.position.x+.25,1.5,.12),new THREE.Vector3(car.position.x+1.25,1.5,.12),0xd94841);world.forceArrow.visible=n===5?force>0:true;
  world.massBadge=addMesh(new THREE.BoxGeometry(.42,.25,.48),material('#f2b544',.28,.32),car.position.x,1.3,.08);world.massBadge.castShadow=true;
  addTextLabel(n===5?'TESTE: FORÇA E MASSA':'2ª LEI · F = m × a',0,2.35,0,'#17324f');
 }
 if(n===3){
  scene.background=new THREE.Color('#101c32');scene.fog=new THREE.Fog('#101c32',15,32);camera.position.set(4,3.6,7);controls.target.set(0,.8,0);
  const earth=addMesh(new THREE.SphereGeometry(1.45,64,48),material('#176eb0',.25,.62),-1.2,1.2,0);const ball=addMesh(new THREE.SphereGeometry(.38,40,32),material('#f2b544',.28,.28,{metalness:.18}),1.5,3.3,0);world.ball=ball;world.earth=earth;world.weightArrow=arrow(new THREE.Vector3(1.5,2.9,0),new THREE.Vector3(1.5,1.8,0),0xff4d65);addTextLabel('FORÇA PESO',2.65,2.5,0,'#a01834');
  for(let i=0;i<5;i++){const orbit=addMesh(new THREE.TorusGeometry(1.8+i*.22,.009,6,100),material('#64d7ff',.25,.45,{emissive:'#005b88',emissiveIntensity:.28}),-1.2,1.2,0);orbit.rotation.x=Math.PI/2+(i%3)*.18;orbit.rotation.y=i*.38;}
 }
 if(n===4){
  camera.position.set(0,3.2,8.5);controls.target.set(0,.75,0);addRoad(10.5);
  const a=makeVehicle('car',-2.8,'#1687cf'),b=makeVehicle('car',2.8,'#f0b429');b.rotation.y=Math.PI;world.a=a;world.b=b;
  // Colisão frontal simplificada: aproximação, contato breve e afastamento.
  // Vetores de força: visíveis apenas durante o contato e sempre com módulos iguais.
  world.arrowA=arrow(new THREE.Vector3(-.2,1.55,.2),new THREE.Vector3(-1.02,1.55,.2),0xd94841);
  world.arrowB=arrow(new THREE.Vector3(.2,1.55,.2),new THREE.Vector3(1.02,1.55,.2),0x0878d1);
  world.arrowA.visible=false;world.arrowB.visible=false;
  // Vetores de velocidade: aparecem depois do impacto e acompanham o sentido e a rapidez de cada carro.
  world.velocityA=arrow(new THREE.Vector3(-1.8,1.28,.22),new THREE.Vector3(-2.3,1.28,.22),0xd94841);
  world.velocityB=arrow(new THREE.Vector3(1.8,1.28,.22),new THREE.Vector3(2.3,1.28,.22),0x0878d1);
  world.velocityA.visible=false;world.velocityB.visible=false;
  // Vetor de separação: seu comprimento cresce conforme aumenta a distância entre os carros.
  world.separationArrow=arrow(new THREE.Vector3(-.8,2.02,.22),new THREE.Vector3(.8,2.02,.22),0x6b7280);
  world.separationArrow.visible=false;
  world.separationLabel=addTextLabel('DISTÂNCIA ENTRE OS CARROS',0,2.58,.1,'#334155');
  world.separationLabel.visible=false;
  world.impactFlash=addMesh(new THREE.SphereGeometry(.17,24,18),material('#ffcf45',.1,.22,{emissive:'#ff7a00',emissiveIntensity:1.3,transparent:true,opacity:.9}),0,1.12,.28);world.impactFlash.visible=false;
  world.collision={phase:'approach',time:0,xA:-2.8,xB:2.8,vA:1.05,vB:-1.05,mA:1200,mB:1600,restitution:.25};
  addTextLabel('FORÇA B → A',-1.8,2.45,0,'#a52b28');addTextLabel('FORÇA A → B',1.8,2.45,0,'#075a9e');
 }
 if(n===6){camera.position.set(0,3.7,8.5);controls.target.set(0,.7,0);addRoad(9.5);const bus=makeVehicle('van',-2.1,'#198754'),car=makeVehicle('car',0,'#1687cf'),car2=makeVehicle('car',2.05,'#e34b45');world.summary=[bus,car,car2];addTextLabel('INÉRCIA · FORÇA · INTERAÇÃO',0,2.55,0,'#17324f');}

 controls.update();slot.querySelector('.scene-loading')?.remove();slot.appendChild(renderer.domElement);resizeObserver?.disconnect();resizeObserver=new ResizeObserver(()=>resizeRenderer());resizeObserver.observe(slot);resizeRenderer();$('status3D').textContent='Laboratório 3D pronto · arraste para explorar';
}
function resizeRenderer(){if(!renderer||!camera)return;const slot=$('sceneSlot'+currentSlide);if(!slot)return;const r=slot.getBoundingClientRect();if(r.width<2||r.height<2)return;renderer.setSize(Math.floor(r.width),Math.floor(r.height),false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
function showSlide(n){n=Math.max(1,Math.min(6,n));currentSlide=n;document.querySelectorAll('.slide').forEach((s,i)=>{s.hidden=i!==n-1;s.classList.toggle('active',i===n-1)});document.querySelectorAll('.step-link').forEach(b=>b.classList.toggle('active',Number(b.dataset.goto)===n));document.querySelectorAll('.slide-dot').forEach(b=>b.classList.toggle('active',Number(b.dataset.dot)===n));$('prevSlide').disabled=n===1;$('nextSlide').textContent=n===6?'Voltar ao início ↺':'Próxima etapa →';try{buildScene(n);}catch(error){console.error('Falha ao iniciar a cena 3D:',error);$('status3D').textContent='Não foi possível iniciar o 3D neste navegador';const slot=$('sceneSlot'+n);if(slot){slot.innerHTML='<div class="scene-error">A simulação 3D não pôde ser iniciada. Verifique a conexão e abra a aula por um servidor local (Live Server), não diretamente por arquivo.</div>';}}}
$('resetCollision')?.addEventListener('click',()=>{if(currentSlide!==4)showSlide(4);else buildScene(4);});
document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>showSlide(Number(b.dataset.goto))));document.querySelectorAll('[data-dot]').forEach(b=>b.addEventListener('click',()=>showSlide(Number(b.dataset.dot))));$('prevSlide').addEventListener('click',()=>showSlide(currentSlide-1));$('nextSlide').addEventListener('click',()=>showSlide(currentSlide===6?1:currentSlide+1));
function updateCalculation(){const a=force/mass;$('forceValue').textContent=`${force} N`;$('massValue').textContent=`${mass} kg`;$('calculationResult').textContent=`a = Fᵣ ÷ m = ${force} N ÷ ${mass} kg = ${a.toLocaleString('pt-BR',{maximumFractionDigits:2})} m/s².`;if(world.forceArrow){world.forceArrow.visible=force>0;world.forceArrow.setLength(Math.max(.08,force/15),.24,.14);}}
$('forceSlider').addEventListener('input',e=>{force=Number(e.target.value);updateCalculation();$('experimentFeedback').textContent='Parâmetros alterados. Execute o experimento para observar o modelo.'});$('massSlider').addEventListener('input',e=>{mass=Number(e.target.value);updateCalculation();$('experimentFeedback').textContent='Parâmetros alterados. Execute o experimento para observar o modelo.'});$('runExperiment').addEventListener('click',()=>{if(currentSlide!==5)showSlide(5);cartX=-2.5;cartV=0;experimentRunning=true;$('experimentFeedback').textContent=`Experimento iniciado: Fᵣ = ${force} N, m = ${mass} kg e a = ${(force/mass).toLocaleString('pt-BR',{maximumFractionDigits:2})} m/s².`});$('resetExperiment').addEventListener('click',()=>{experimentRunning=false;cartX=-2.5;cartV=0;if(world.cart)world.cart.position.x=cartX;$('experimentFeedback').textContent='Modelo reiniciado. Altere os parâmetros e execute novamente.'});
document.querySelectorAll('input[name="hypothesis"]').forEach(r=>r.addEventListener('change',()=>{$('hypothesisFeedback').textContent=r.value==='half'?'Boa previsão! Para força constante, dobrar a massa reduz a aceleração à metade.':'Revise a relação a = Fᵣ/m: a aceleração é inversamente proporcional à massa quando a força é constante.';$('hypothesisFeedback').style.color=r.value==='half'?'var(--green)':'var(--gold)'}));
function renderQuiz(){const q=quiz[quizIndex],container=$('quizContainer');$('quizProgressText').textContent=`Questão ${quizIndex+1} de ${quiz.length}`;$('quizProgressBar').style.width=`${(quizIndex+1)/quiz.length*100}%`;$('quizBack').disabled=quizIndex===0; $('quizNext').disabled=submitted;$('quizNext').textContent=quizIndex===quiz.length-1?'Finalizar avaliação ✓':'Confirmar e avançar →';container.innerHTML=`<div class="quiz-question-count">QUESTÃO ${String(quizIndex+1).padStart(2,'0')}</div><h3>${q.q}</h3><div class="quiz-options">${q.a.map((a,i)=>`<button class="quiz-option ${answers[quizIndex]===i?'selected':''}" data-answer="${i}" ${submitted?'disabled':''}><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${a}</span></button>`).join('')}</div>${submitted?`<div class="quiz-feedback">${q.why}</div>`:''}`;container.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{if(submitted)return;answers[quizIndex]=Number(b.dataset.answer);renderQuiz()}));$('quizResult').hidden=true;}
$('quizBack').addEventListener('click',()=>{if(quizIndex>0){quizIndex--;renderQuiz()}});$('quizNext').addEventListener('click',()=>{if(answers[quizIndex]===null){$('quizContainer').insertAdjacentHTML('beforeend','<p class="quiz-feedback">Selecione uma alternativa antes de continuar.</p>');return}if(quizIndex<quiz.length-1){quizIndex++;renderQuiz();return}submitted=true;renderQuiz();const score=quiz.reduce((sum,q,i)=>sum+(answers[i]===q.correct?1:0),0);$('quizResult').hidden=false;$('quizResult').innerHTML=`<h3>Você acertou ${score} de ${quiz.length} questões.</h3><p>${score>=4?'Excelente! Você compreendeu os princípios centrais das Leis de Newton.':'Revise as explicações e as simulações para consolidar os conceitos. Você pode refazer a avaliação.'}</p><button class="secondary-button" id="retryQuiz" style="margin-top:13px">↺ Refazer avaliação</button>`;document.querySelectorAll('.quiz-option').forEach((b,i)=>{const idx=Number(b.dataset.answer);b.classList.toggle('correct',idx===quiz[quizIndex].correct)});$('retryQuiz').addEventListener('click',()=>{quizIndex=0;answers=[null,null,null,null,null];submitted=false;renderQuiz()})});
function animate(t=0){
 raf=requestAnimationFrame(animate);const dt=last?Math.min((t-last)/1000,.04):0;last=t;elapsed+=dt;if(controls)controls.update();
 // Primeira Lei: movimento uniforme, frenagem progressiva e passageiro que tende a manter o movimento.
 if(currentSlide===1&&world.inertiaVehicle){
  world.busTime+=dt;const cruise=2.5,brakeDuration=1.1,stopTime=cruise+brakeDuration;let x,v,braking=false;
  if(world.busTime<=cruise){x=world.busStartX+.65*world.busTime;v=.65;}
  else if(world.busTime<=cruise+brakeDuration){const tau=world.busTime-cruise;x=world.busStartX+.65*cruise+.65*(tau-tau*tau/(2*brakeDuration));v=.65*(1-tau/brakeDuration);braking=true;}
  else{x=world.busStartX+.65*cruise+.65*brakeDuration/2;v=0;if(!world.busBrakeDone){world.busSimulationRunning=false;world.busBrakeDone=true;if(world.busReplayButton)world.busReplayButton.textContent='↻ Repetir frenagem';}}
  world.inertiaVehicle.position.x=x;
  if(world.passenger){const progress=Math.max(0,Math.min(1,(world.busTime-cruise)/brakeDuration));world.passenger.rotation.z=braking?-.42*progress:(world.busBrakeDone?-.42*Math.exp(-Math.max(0,world.busTime-stopTime)*3):0);}
  for(const light of world.inertiaVehicle.userData.tailLights||[])light.material.emissiveIntensity=braking?1.25:.15;
  if(world.signalRed)world.signalRed.material.emissiveIntensity=(braking||world.busBrakeDone)?1.45:.12;
  if(world.signalGreen)world.signalGreen.material.emissiveIntensity=(braking||world.busBrakeDone)?.08:.9;
  if(world.busVelocityArrow){world.busVelocityArrow.position.set(x+.25,1.85,.16);world.busVelocityArrow.setDirection(new THREE.Vector3(1,0,0));world.busVelocityArrow.setLength(Math.max(.05,v*1.2),.2,.12);world.busVelocityArrow.visible=v>.035;}
 }
 if((currentSlide===2||currentSlide===5)&&world.cart&&experimentRunning){cartV+=(force/mass)*dt*.055;cartX+=cartV*dt;if(cartX>2.65){cartX=2.65;cartV=0;experimentRunning=false;$('experimentFeedback').textContent='O carrinho chegou ao fim do trilho. Reinicie para comparar outros valores.';}world.cart.position.x=cartX;if(world.massBadge)world.massBadge.position.x=cartX;if(world.forceArrow){world.forceArrow.position?.set?.(cartX+.35,1.55,.1);world.forceArrow.setDirection(new THREE.Vector3(1,0,0));}}
 if(currentSlide===3&&world.ball){world.ball.position.y=3.1+Math.sin(elapsed*1.1)*.2;}
 // Terceira Lei: forças de contato iguais e opostas atuam em veículos diferentes.
 if(currentSlide===4&&world.a&&world.b&&world.collision){
  const c=world.collision;c.time+=dt;
  if(c.phase==='approach'){
   c.xA+=c.vA*dt;c.xB+=c.vB*dt;
   if(c.xB-c.xA<=1.88){c.xA=-.94;c.xB=.94;c.phase='impact';c.time=0;world.arrowA.visible=true;world.arrowB.visible=true;world.velocityA.visible=false;world.velocityB.visible=false;world.separationArrow.visible=false;world.separationLabel.visible=false;world.impactFlash.visible=true;}
  }else if(c.phase==='impact'){
   c.xA=-.94;c.xB=.94;
   if(c.time>=.28){const uA=c.vA,uB=c.vB,mA=c.mA,mB=c.mB,e=c.restitution,sum=mA+mB;c.vA=((mA-e*mB)*uA+(1+e)*mB*uB)/sum;c.vB=((mB-e*mA)*uB+(1+e)*mA*uA)/sum;c.phase='rebound';c.time=0;world.arrowA.visible=false;world.arrowB.visible=false;world.velocityA.visible=true;world.velocityB.visible=true;world.separationArrow.visible=true;world.separationLabel.visible=true;world.impactFlash.visible=false;}
  }else if(c.phase==='rebound'){
   c.xA+=c.vA*dt;c.xB+=c.vB*dt;
   if(c.xA< -3.65&&c.xB>3.65){c.xA=-2.8;c.xB=2.8;c.vA=1.05;c.vB=-1.05;c.phase='approach';c.time=0;}
  }
  world.a.position.x=c.xA;world.b.position.x=c.xB;
  if(c.phase==='impact'){
   // Par de forças iguais e opostas: as duas setas têm exatamente o mesmo comprimento.
   const forceLength=.82;
   world.arrowA.position.set(c.xA+.72,1.55,.2);world.arrowA.setDirection(new THREE.Vector3(-1,0,0));world.arrowA.setLength(forceLength,.22,.14);
   world.arrowB.position.set(c.xB-.72,1.55,.2);world.arrowB.setDirection(new THREE.Vector3(1,0,0));world.arrowB.setLength(forceLength,.22,.14);
   const pulse=1+Math.sin(c.time*32)*.16;world.impactFlash.scale.setScalar(pulse);
  }else if(c.phase==='rebound'){
   // O vetor de velocidade acompanha a separação: o comprimento representa o módulo da velocidade.
   const speedA=Math.abs(c.vA),speedB=Math.abs(c.vB);
   const dirA=Math.sign(c.vA||-1),dirB=Math.sign(c.vB||1);
   world.velocityA.position.set(c.xA+dirA*.82,1.27,.2);
   world.velocityA.setDirection(new THREE.Vector3(dirA,0,0));
   world.velocityA.setLength(Math.max(.16,speedA*1.8),.18,.12);
   world.velocityB.position.set(c.xB+dirB*.82,1.27,.2);
   world.velocityB.setDirection(new THREE.Vector3(dirB,0,0));
   world.velocityB.setLength(Math.max(.16,speedB*1.8),.18,.12);
   const gap=Math.max(.12,c.xB-c.xA-1.9);
   world.separationArrow.position.set(c.xA+.95,2.02,.22);
   world.separationArrow.setDirection(new THREE.Vector3(1,0,0));
   world.separationArrow.setLength(gap,.18,.12);
   world.separationLabel.position.set((c.xA+c.xB)/2,2.58,.1);
  }
 }
 if(currentSlide===6&&world.summary)world.summary.forEach((o,i)=>{o.rotation.y+=dt*(.2+i*.08);o.position.y=1+Math.sin(elapsed+i)*.12});if(renderer&&scene&&camera)renderer.render(scene,camera)
}
window.addEventListener('resize',resizeRenderer);updateCalculation();showSlide(1);renderQuiz();animate();
