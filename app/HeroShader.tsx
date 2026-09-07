'use client';

import { useEffect, useRef } from 'react';

/**
 * Lightweight WebGL fragment-shader background: a slow, domain-warped flowing
 * gradient in navy / emerald / gold. Falls back silently to the CSS gradient
 * underneath if WebGL is unavailable or the user prefers reduced motion.
 */
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  f=f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.02; a*=0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv; p.x *= u_res.x/u_res.y;
  float t = u_time*0.025;
  vec2 q = vec2(fbm(p*1.6 + t), fbm(p*1.6 + vec2(5.2,1.3) - t));
  float n = fbm(p*1.8 + q*1.6 + t*0.5);
  vec3 navy   = vec3(0.031,0.078,0.137);
  vec3 emerald= vec3(0.086,0.44,0.37);
  vec3 gold   = vec3(0.72,0.55,0.18);
  vec3 col = mix(navy, emerald, smoothstep(0.32,0.72,n));
  col = mix(col, gold, smoothstep(0.62,0.98,n)*0.55);
  // vignette + keep it dark so foreground text stays readable
  float vig = smoothstep(1.25,0.25,length(uv-0.5));
  col = mix(navy, col, 0.9*vig);
  gl_FragColor = vec4(col,1.0);
}`;

const VERT = `attribute vec2 a; void main(){ gl_Position=vec4(a,0.0,1.0); }`;

export function HeroShader() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    } catch { gl = null; }
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src); gl!.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl!.viewport(0, 0, canvas.width, canvas.height);
      gl!.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0, start = performance.now(), running = true;
    const io = new IntersectionObserver((e) => { running = e[0].isIntersecting; if (running) loop(); });
    io.observe(canvas);
    const loop = () => {
      if (!running) return;
      resize();
      gl!.uniform1f(uTime, (performance.now() - start) / 1000);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); io.disconnect(); };
  }, []);

  return <canvas ref={ref} className="land__shader" aria-hidden="true" />;
}
