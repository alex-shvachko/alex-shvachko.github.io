import fs from 'node:fs';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import * as THREE from '../assets/js/vendor/three.module.js';
import { Robot } from '../assets/js/scene/robot.js';
registerHooks({resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return {url:new URL('../assets/js/vendor/three.module.js',import.meta.url).href,shortCircuit:true};
  return nextResolve(specifier,context);
}});
const {GLTFLoader}=await import('../assets/js/vendor/addons/loaders/GLTFLoader.js');
const bytes=fs.readFileSync('E:/ChatGPT/ArtChatGPT_v1/blender/glade-refinement/robot-test.glb');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const robot=new Robot(gltf);
const meshes=[];robot.root.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});
console.log('meshes',meshes.map(m=>[m.name,m.material.name,m.geometry.attributes.position.count]));
const rest=[];
for(const mesh of meshes){
 const p=new THREE.Vector3();
 rest.push(Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>mesh.getVertexPosition(i,p).clone()));
}
const targets=[[-2,2,2],[-2,.8,1],[1,2.8,2],[2,1.4,3],[0,3,0]];
for(const xyz of targets){
 for(let i=0;i<120;i++){robot.idle(i/60);robot.pointAt(new THREE.Vector3(...xyz),1/60,i/60);robot.watch(new THREE.Vector3(...xyz),1/60);robot.root.updateMatrixWorld(true);}
 meshes.forEach(mesh=>mesh.skeleton.update());
 const s=robot.shoulder.getWorldPosition(new THREE.Vector3()),e=robot.elbow.getWorldPosition(new THREE.Vector3()),w=robot.wrist.getWorldPosition(new THREE.Vector3());
 const aim=w.clone().sub(s).normalize(), projected=s.clone().addScaledVector(aim,e.clone().sub(s).dot(aim));
 console.log('target',xyz,'elbow offset',e.clone().sub(projected).toArray(),'angle',robot.elbowAngle());
 assert(e.y<=projected.y+.001,'elbow must bend down');
 for(let mi=0;mi<meshes.length;mi++){
  const mesh=meshes[mi],g=mesh.geometry,pos=g.attributes.position,idx=g.index;
  let maxRatio=0,worst=null;
  const a=new THREE.Vector3(),b=new THREE.Vector3();
  for(let i=0;i<idx.count;i+=3)for(let j=0;j<3;j++){
   const ai=idx.getX(i+j),bi=idx.getX(i+(j+1)%3); const old=rest[mi][ai].distanceTo(rest[mi][bi]);
   if(old<.003)continue;
   mesh.getVertexPosition(ai,a);mesh.getVertexPosition(bi,b);
   const ratio=a.distanceTo(b)/old;
   if(ratio>maxRatio){maxRatio=ratio;worst={ai,bi,old,now:a.distanceTo(b),a:a.toArray(),b:b.toArray()};}
  }
  if(maxRatio>3)console.log('stretch',mesh.material.name,maxRatio,worst);
 }
}
console.log('Elbow motion regression passed');
