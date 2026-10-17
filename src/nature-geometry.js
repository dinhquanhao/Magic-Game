import * as THREE from 'three';

export const NATURE_VARIANTS=['tall','bent','bramble','vine','ancient','sapling'];
const templates=new Map();
const fract=x=>x-Math.floor(x);
export const natureHash=x=>fract(Math.sin(x*127.1+311.7)*43758.5453);

// CPU templates persist between casts; every GPU BufferGeometry belongs to its
// cast and is disposed by the existing scene-tree disposer.
export function natureTemplate(variant,quality='High'){
 const detail=quality==='Low'?0:quality==='Medium'?1:2,key=variant+':'+detail;
 if(templates.has(key))return templates.get(key);
 const positions=[],normals=[],uvs=[],parts=[],indices=[];
 const V=(p,n,u,v,part)=>{positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);uvs.push(u,v);parts.push(part);return parts.length-1;};
 function tube(points,radius,part=0){
  const sides=detail===0?5:detail===1?6:8,base=parts.length;
  for(let j=0;j<points.length;j++){
   const t=j/(points.length-1),d=points[Math.min(j+1,points.length-1)].clone().sub(points[Math.max(0,j-1)]).normalize();
   const side=new THREE.Vector3().crossVectors(d,Math.abs(d.y)>.95?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(side,d).normalize();
   for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2,n=side.clone().multiplyScalar(Math.cos(a)).addScaledVector(up,Math.sin(a));
    const r=radius*Math.max(.03,1-t*.97)*(1+.14*Math.sin(a*3+t*8));V(points[j].clone().addScaledVector(n,r),n,i/sides,t,part);}
  }
  for(let j=0;j<points.length-1;j++)for(let i=0;i<sides;i++){const a=base+j*(sides+1)+i,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}
 }
 function leaf(center,size,angle,part=1){
  const forward=new THREE.Vector3(Math.cos(angle),.2,Math.sin(angle)),side=new THREE.Vector3(-Math.sin(angle),.3,Math.cos(angle)),normal=new THREE.Vector3().crossVectors(side,forward).normalize();
  const base=parts.length,contour=[[0,0],[.26,-.32],[.65,-.35],[1,0],[.65,.35],[.26,.32]];
  V(center.clone().addScaledVector(forward,size*.48).addScaledVector(normal,size*.09),normal,.48,.5,part);
  contour.forEach(([x,y])=>V(center.clone().addScaledVector(forward,size*x).addScaledVector(side,size*y),normal,x,y+.5,part));
  for(let i=0;i<6;i++)indices.push(base,base+1+i,base+1+(i+1)%6);
 }
 function branch(start,direction,length,radius,depth,seed){
  const points=[],steps=detail===0?4:7;
  for(let i=0;i<=steps;i++){const t=i/steps,p=start.clone().addScaledVector(direction,length*t);p.x+=Math.sin(t*2.4+seed)*length*.11*t;p.z+=Math.sin(t*3.1+seed*.7)*length*.13*t;p.y+=length*.18*t*t;points.push(p);}
  tube(points,radius);
  const end=points.at(-1);
  if(depth>0){const branches=variant===2?3:2;for(let i=0;i<branches;i++){const a=seed+i*2.39996,dir=new THREE.Vector3(Math.cos(a)*.74,.38+natureHash(seed+i)*.4,Math.sin(a)*.74).normalize();branch(points[Math.floor(steps*(.65+i*.1))],dir,length*(.45+natureHash(seed+7+i)*.18),radius*.45,depth-1,seed+3.1+i);}}
  else{const count=detail===0?4:detail===1?7:11;for(let i=0;i<count;i++){const a=seed+i*2.39996,c=end.clone().add(new THREE.Vector3(Math.cos(a)*.09,Math.sin(i*3.7)*.06,Math.sin(a)*.09));leaf(c,.12+natureHash(seed+i)*.11,a,variant===5&&i%4===0?2:1);}}
 }
 if(variant==='root'){
  const points=Array.from({length:25},(_,i)=>new THREE.Vector3(i/24,0,0));tube(points,.065); // vertex shader traces and coils this tube
 }else if(variant==='spike'){
  tube(Array.from({length:8},(_,i)=>new THREE.Vector3(Math.sin(i*.6)*.04,i/7,Math.sin(i*.9)*.035)),.15);
 }else if(variant==='leaf'){
  leaf(new THREE.Vector3(),1,0);
 }else if(variant==='fruit'){
  const rows=9,sides=10;
  for(let j=0;j<=rows;j++)for(let i=0;i<=sides;i++){const u=i/sides*Math.PI*2,v=j/rows*Math.PI,r=Math.sin(v)*(.18+.035*Math.cos(u*5));const p=new THREE.Vector3(Math.cos(u)*r,Math.cos(v)*.22,Math.sin(u)*r);V(p,p.clone().normalize(),i/sides,j/rows,3);}
  for(let j=0;j<rows;j++)for(let i=0;i<sides;i++){const a=j*(sides+1)+i,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}
 }else{
  const bend=variant===1?.3:variant===3?.65:0,dir=new THREE.Vector3(bend,variant===3?.36:1,variant===1?.13:0).normalize();
  branch(new THREE.Vector3(),dir,variant===2?.55:1,variant===4?.105:variant===2?.06:.055,detail===0?1:2,31+variant*17);
  if(variant===2)for(let i=0;i<4;i++)branch(new THREE.Vector3(),new THREE.Vector3(Math.cos(i*2.4)*.6,.7,Math.sin(i*2.4)*.6).normalize(),.5,.04,1,9+i*3);
  if(variant===4)for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const points=[new THREE.Vector3(),new THREE.Vector3(Math.cos(a)*.14,.05,Math.sin(a)*.14),new THREE.Vector3(Math.cos(a)*.37,-.01,Math.sin(a)*.37)];tube(points,.07);}
 }
 const result={position:new Float32Array(positions),normal:new Float32Array(normals),uv:new Float32Array(uvs),aPart:new Float32Array(parts),index:new Uint32Array(indices)};templates.set(key,result);return result;
}

export function natureGeometry(variant,quality){const data=natureTemplate(variant,quality),g=new THREE.BufferGeometry();for(const [key,size]of [['position',3],['normal',3],['uv',2],['aPart',1]])g.setAttribute(key,new THREE.BufferAttribute(data[key],size));g.setIndex(new THREE.BufferAttribute(data.index,1));return g;}

export function natureDisc(segments=96,rings=18){const g=new THREE.BufferGeometry(),p=[],uv=[],ix=[];for(let y=0;y<=rings;y++)for(let x=0;x<=segments;x++){const r=y/rings,a=x/segments*Math.PI*2;p.push(Math.cos(a)*r,0,Math.sin(a)*r);uv.push(Math.cos(a)*r,Math.sin(a)*r);}for(let y=0;y<rings;y++)for(let x=0;x<segments;x++){const a=y*(segments+1)+x,b=a+segments+1;ix.push(a,b,a+1,a+1,b,b+1);}g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;}

export function warmNatureTemplates(){let i=0;const next=()=>{natureTemplate(i%6,i<6?'Low':'High');if(++i<12)(globalThis.requestIdleCallback||((fn)=>setTimeout(fn,0)))(next);};(globalThis.requestIdleCallback||((fn)=>setTimeout(fn,0)))(next);}
