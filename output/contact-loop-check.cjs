const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const events = {}, videoEvents = {}, queue = [];
let top = 0;
let pressed = false;
let preferenceChanged, toggleClicked;
const source = {src: '', dataset: {src: 'sky.mp4'}};
const video = {paused:true, seeking:false, readyState:4, duration:5.166667, currentTime:2,
 querySelector:()=>source, load(){}, pause(){this.paused=true}, play(){this.paused=false; return Promise.resolve()},
 addEventListener:(name,fn)=>videoEvents[name]=fn};
const contact = {querySelector:()=>video, classList:{toggle(){},remove(){}}, getBoundingClientRect:()=>({top,height:1200})};
const toggle = {getAttribute:()=> String(pressed),addEventListener:(name,fn)=>toggleClicked=fn};
let observer;
const context = {document:{hidden:false,documentElement:{scrollHeight:5000},querySelector:s=>s==='#contact'?contact:toggle,addEventListener:(name,fn)=>events[name]=fn},
 matchMedia:()=>({matches:false,addEventListener:(name,fn)=>preferenceChanged=fn}), innerHeight:1200,scrollY:3800,
 IntersectionObserver:class {constructor(fn){observer=fn}observe(){}},
 requestAnimationFrame:fn=>{queue.push(fn);return 1},addEventListener:(name,fn)=>events[name]=fn};
vm.runInNewContext(fs.readFileSync('assets/motion/contact.js','utf8'),context);
const flush=()=>{while(queue.length)queue.shift()()};
(async()=>{
 observer([{isIntersecting:true}]);flush();await Promise.resolve();
 assert.equal(video.loop,true);assert.equal(video.paused,false,'must play without further scroll at page end');
 const loopTime=video.currentTime;
 context.scrollY=3500;events.scroll();flush();assert.equal(video.paused,false,'must keep looping above page end');
 assert.equal(video.currentTime,loopTime,'reverse scroll must not seek the Contact loop');
 context.scrollY=3800;events.scroll();flush();await Promise.resolve();assert.equal(video.paused,false,'must resume loop on return');
 context.document.hidden=true;events.visibilitychange();flush();assert.equal(video.paused,true,'must pause in hidden tab');
 context.document.hidden=false;events.visibilitychange();flush();await Promise.resolve();assert.equal(video.paused,false,'must resume in visible tab');
 pressed=true;toggleClicked();flush();assert.equal(video.paused,true,'must honor manual reduced motion');
 pressed=false;toggleClicked();flush();await Promise.resolve();assert.equal(video.paused,false,'must resume when motion is enabled');
 top=1300;context.scrollY=2500;events.scroll();flush();assert.equal(video.paused,true,'must pause behind transition');
 observer([{isIntersecting:false}]);flush();assert.equal(video.paused,true,'must pause offscreen');
 console.log('PASS: continuous loop, no reverse-scroll seek, re-entry, hidden tab, reduced motion, transition, offscreen pause');
})();
