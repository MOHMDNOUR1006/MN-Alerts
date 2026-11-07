import { useEffect, useRef } from 'react';
import { Mesh, Program, Renderer, Triangle } from 'ogl';
import './GhostFibers.css';

const hexToRgb = hex => {
  const v = hex.trim().replace(/^#/, '');
  const n = v.length === 3 ? v.replace(/./g, c => c + c) : v;
  const m = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(n);
  if (!m) return [1, 1, 1];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
};
const setColor = (uniform, hex) => {
  const c = hexToRgb(hex);
  uniform.value[0] = c[0]; uniform.value[1] = c[1]; uniform.value[2] = c[2];
};

const vertex = `#version 300 es\nin vec2 position;\nvoid main() { gl_Position = vec4(position, 0.0, 1.0); }`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 uResolution; uniform float uTime,uSpeed,uScale,uRotation,uLayers;
uniform float uWaveAmplitude,uWaveFrequency,uWaveSpeed,uLayerSpeed;
uniform float uTwist,uTwistFrequency,uTwistSpeed;
uniform float uLineFrequency,uLineSpacing,uLineSharpness;
uniform float uGlowFalloff,uGlowIntensity,uBrightness,uBlueBoost;
uniform float uVignette,uGrain,uRotationSpeed,uLightMode;
uniform vec3 uLineColor,uGlowColor;
out vec4 fragColor;
#define MAX_LAYERS 10
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float gh(vec2 p){p=floor(p);return fract(52.9829189*fract(dot(p,vec2(.065,.005))));}
float lg(vec2 fp){
  vec2 p=mod(fp+vec2(uTime*30.,-uTime*21.),1024.);
  vec2 r=mat2(.8,-.5,.5,.8)*p;
  return .4*gh(r)+.25*gh(r*2.+17.)+.2*gh(r*4.+47.)+.1*gh(r*8.+113.)+.05*gh(r*16.+191.);
}
void main(){
  vec2 res=max(uResolution,vec2(1.));
  vec2 uv=(2.*gl_FragCoord.xy-res)/res.y;
  float t=uTime*uSpeed;
  vec3 bd=mix(vec3(.071,.059,.090),vec3(1.),step(.5,uLightMode));
  vec3 ct=max(uLineColor*.856-uGlowColor*.062,vec3(0.));
  vec3 cl=uLineColor*.196+uGlowColor*.227;
  vec2 p=rot(radians(uRotation)+t*uRotationSpeed)*(uv/max(uScale,.05));
  vec3 col=vec3(0.); float ff=0.;
  for(int i=0;i<MAX_LAYERS;i++){
    float fi=float(i)+1.; if(fi>uLayers)break;
    p+=uWaveAmplitude*sin(p.yx*fi*uWaveFrequency+t*(uWaveSpeed+fi*uLayerSpeed));
    float r=length(p),a=atan(p.y,p.x);
    a+=sin(r*uTwistFrequency-t*uTwistSpeed+fi)*uTwist;
    p=vec2(cos(a),sin(a))*r;
    float ln=pow(max(0.,1.-abs(sin(p.x*(uLineFrequency+fi*uLineSpacing)+sin(p.y*3.+t)))),uLineSharpness);
    ff+=ln/fi; col+=uLineColor*ln/fi;
    col+=uGlowColor*exp(-uGlowFalloff*abs(sin(p.x*3.+t+fi)))*uGlowIntensity/(fi*2.);
  }
  float ctr=exp(-2.2*dot(uv,uv));
  col+=ct*ctr;
  float cld=exp(-1.5*length(uv+vec2(sin(t*.3)*.25,cos(t*.25)*.18)));
  col+=cl*cld;
  float vig=1.-smoothstep(.35,1.45,length(uv));
  col*=mix(1.-uVignette,1.,vig);
  col=1.-exp(-col*uBrightness); col.b*=uBlueBoost;
  vec3 o;
  if(uLightMode>.5){
    float ef=mix(1.-uVignette,1.,vig);
    float fb=pow(smoothstep(.12,1.05,ff)*ef,1.5);
    float at=(ctr*.025+cld*.015)*ef;
    o=mix(bd,mix(bd,uGlowColor,.16),at);
    o=mix(o,mix(bd,uLineColor,.52),fb*.3);
  }else{o=bd+col;}
  o=clamp(o+(lg(gl_FragCoord.xy)-.5)*uGrain,0.,1.);
  fragColor=vec4(o,1.);
}`;

const contexts = new WeakMap();

const GhostFibers = ({
  lineColor='#140E35',glowColor='#3437A0',speed=0.2,scale=2,rotation=0,rotationSpeed=0.25,
  layers=4,waveAmplitude=0.015,waveFrequency=3,waveSpeed=0.15,layerSpeed=0.08,
  twist=0.1,twistFrequency=5,twistSpeed=1.2,lineFrequency=5,lineSpacing=2,lineSharpness=16,
  glowFalloff=10,glowIntensity=1.6,brightness=2,blueBoost=1.25,vignette=0.8,grain=0.05,
  lightMode=false,dpr=1,fps=60,paused=false,className=''
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const renderer = new Renderer({webgl:2,alpha:false,antialias:false,dpr:Math.min(Math.max(dpr,.5),2)});
    const gl = renderer.gl;
    const canvas = gl.canvas;
    canvas.style.cssText='width:100%;height:100%;display:block;';
    canvas.setAttribute('aria-hidden','true');
    container.appendChild(canvas);
    const geo = new Triangle(gl);
    const prog = new Program(gl, { vertex, fragment, uniforms:{
      uResolution:{value:new Float32Array([1,1])},uTime:{value:0},uSpeed:{value:.2},
      uScale:{value:2},uRotation:{value:0},uRotationSpeed:{value:.25},uLayers:{value:4},
      uWaveAmplitude:{value:.015},uWaveFrequency:{value:3},uWaveSpeed:{value:.15},
      uLayerSpeed:{value:.08},uTwist:{value:.1},uTwistFrequency:{value:5},uTwistSpeed:{value:1.2},
      uLineFrequency:{value:5},uLineSpacing:{value:2},uLineSharpness:{value:16},
      uGlowFalloff:{value:10},uGlowIntensity:{value:1.6},uBrightness:{value:2},
      uBlueBoost:{value:1.25},uVignette:{value:.8},uGrain:{value:.05},uLightMode:{value:0},
      uLineColor:{value:new Float32Array(hexToRgb('#140E35'))},
      uGlowColor:{value:new Float32Array(hexToRgb('#3437A0'))},
    }});
    const mesh = new Mesh(gl,{geometry:geo,program:prog});
    let fId=0,elapsed=0,prev=performance.now(),lastR=0,fr=60,ip=false,iv=true,ipv=!document.hidden;
    const rm=window.matchMedia('(prefers-reduced-motion:reduce)');
    const render=()=>renderer.render({scene:mesh});
    const stop=()=>{if(fId)cancelAnimationFrame(fId);fId=0;};
    const can=()=>iv&&ipv&&!ip&&!rm.matches;
    const loop=now=>{fId=0;if(!can())return;const dt=Math.min((now-prev)/1000,.1);prev=now;elapsed+=dt;
      if(now-lastR>=1000/fr-.5){prog.uniforms.uTime.value=elapsed;render();lastR=now;}
      fId=requestAnimationFrame(loop);};
    const start=()=>{if(!can()||fId)return;prev=performance.now();fId=requestAnimationFrame(loop);};
    const setSize=()=>{const rect=container.getBoundingClientRect();
      renderer.setSize(Math.max(1,Math.floor(rect.width)),Math.max(1,Math.floor(rect.height)));
      prog.uniforms.uResolution.value[0]=gl.drawingBufferWidth;
      prog.uniforms.uResolution.value[1]=gl.drawingBufferHeight;render();};
    const hV=()=>{ipv=!document.hidden;can()?start():stop();};
    const hRM=()=>{can()?start():(stop(),render());};
    const ro=new ResizeObserver(setSize);ro.observe(container);
    const io=new IntersectionObserver(([e])=>{iv=e.isIntersecting;can()?start():stop();},{threshold:0});
    io.observe(container);
    document.addEventListener('visibilitychange',hV);rm.addEventListener('change',hRM);
    contexts.set(container,{renderer,program:prog,mesh,render,
      setPaused(v){ip=v;can()?start():(stop(),render());},
      setFps(v){fr=Math.min(Math.max(v,1),120);}});
    setSize();start();
    return ()=>{stop();ro.disconnect();io.disconnect();
      document.removeEventListener('visibilitychange',hV);rm.removeEventListener('change',hRM);
      contexts.delete(container);
      if(canvas.parentNode===container)container.removeChild(canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();};
  },[dpr]);

  useEffect(()=>{
    const container=containerRef.current;if(!container)return;
    const c=contexts.get(container);if(!c)return;
    const u=c.program.uniforms;
    setColor(u.uLineColor,lineColor);setColor(u.uGlowColor,glowColor);
    u.uSpeed.value=speed;u.uScale.value=scale;u.uRotation.value=rotation;
    u.uRotationSpeed.value=rotationSpeed;u.uLayers.value=Math.min(Math.max(Math.round(layers),1),10);
    u.uWaveAmplitude.value=waveAmplitude;u.uWaveFrequency.value=waveFrequency;
    u.uWaveSpeed.value=waveSpeed;u.uLayerSpeed.value=layerSpeed;u.uTwist.value=twist;
    u.uTwistFrequency.value=twistFrequency;u.uTwistSpeed.value=twistSpeed;
    u.uLineFrequency.value=lineFrequency;u.uLineSpacing.value=lineSpacing;
    u.uLineSharpness.value=lineSharpness;u.uGlowFalloff.value=glowFalloff;
    u.uGlowIntensity.value=glowIntensity;u.uBrightness.value=brightness;
    u.uBlueBoost.value=blueBoost;u.uVignette.value=vignette;u.uGrain.value=grain;
    u.uLightMode.value=lightMode?1:0;c.setFps(fps);c.setPaused(paused);c.render();
  },[lineColor,glowColor,speed,scale,rotation,rotationSpeed,layers,waveAmplitude,waveFrequency,waveSpeed,layerSpeed,twist,twistFrequency,twistSpeed,lineFrequency,lineSpacing,lineSharpness,glowFalloff,glowIntensity,brightness,blueBoost,vignette,grain,lightMode,fps,paused,dpr]);

  return <div ref={containerRef} className={`ghost-fibers-container ${className}`.trim()} />;
};
export default GhostFibers;
