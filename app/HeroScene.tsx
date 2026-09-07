'use client';

import { useEffect, useRef } from 'react';

/**
 * Animated, looping hero visual — glossy 3D symbols relevant to the product:
 * chat bubbles (typing dots + double-tick), a ₹ coin and a price tag, floating
 * on a dark panel. Abstract & generic on purpose (no WhatsApp mark). Canvas 2D;
 * honours prefers-reduced-motion by drawing a single static frame.
 */
type Kind = 'emerald' | 'gold';
type P = { x: number; y: number };

function grad(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, kind: Kind) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  if (kind === 'emerald') { g.addColorStop(0, '#39c0a6'); g.addColorStop(0.55, '#1c8a76'); g.addColorStop(1, '#0f5f52'); }
  else { g.addColorStop(0, '#f6dc86'); g.addColorStop(0.55, '#dbb141'); g.addColorStop(1, '#b3891f'); }
  return g;
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function shadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.filter = 'blur(12px)';
  ctx.beginPath(); ctx.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function sheen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.save(); roundRect(ctx, x + w * 0.08, y + h * 0.08, w * 0.84, h * 0.34, r * 0.7); ctx.clip();
  const g = ctx.createLinearGradient(x, y, x, y + h * 0.5);
  g.addColorStop(0, 'rgba(255,255,255,0.42)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
}

/** Chat bubble with a tail, filled with `glyph`: 'dots' or 'ticks'. */
function bubble(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, kind: Kind, glyph: 'dots' | 'ticks') {
  const h = w * 0.74, x = cx - w / 2, y = cy - h / 2, r = h * 0.36;
  shadow(ctx, cx, cy + h * 0.42, w * 0.5, h * 0.16);
  // body + tail
  ctx.fillStyle = grad(ctx, x, y, w, h, kind);
  roundRect(ctx, x, y, w, h, r); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w * 0.24, y + h - 2);
  ctx.lineTo(x + w * 0.10, y + h + h * 0.26);
  ctx.lineTo(x + w * 0.40, y + h - 2);
  ctx.closePath(); ctx.fill();
  sheen(ctx, x, y, w, h, r);
  // glyph
  const gy = cy + h * 0.02;
  if (glyph === 'dots') {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(cx + i * w * 0.17, gy, w * 0.045, 0, Math.PI * 2); ctx.fill(); }
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.96)';
    ctx.lineWidth = Math.max(2, w * 0.05); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const tick = (ox: number) => { ctx.beginPath(); ctx.moveTo(cx + ox - w * 0.12, gy); ctx.lineTo(cx + ox - w * 0.04, gy + w * 0.09); ctx.lineTo(cx + ox + w * 0.12, gy - w * 0.11); ctx.stroke(); };
    tick(-w * 0.06); tick(w * 0.06);
  }
}

/** ₹ coin. */
function coin(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, spin: number) {
  const w = Math.abs(Math.cos(spin)) * r * 0.75 + r * 0.28;
  shadow(ctx, cx, cy + r * 0.6, w, r * 0.24);
  const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  g.addColorStop(0, '#f7de88'); g.addColorStop(0.5, '#d3a733'); g.addColorStop(1, '#9c7719');
  ctx.beginPath(); ctx.ellipse(cx, cy, w, r, 0, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.strokeStyle = 'rgba(255,240,190,0.6)'; ctx.stroke();
  if (w > r * 0.5) {
    ctx.fillStyle = 'rgba(90,64,12,0.85)';
    ctx.font = `700 ${Math.round(r * 1.15)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('₹', cx, cy + r * 0.04);
  }
}

/** Price tag (rounded, tilted, with a hole). */
function tag(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, kind: Kind, rot: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  shadow(ctx, 0, s * 0.5, s * 0.5, s * 0.16);
  ctx.fillStyle = grad(ctx, -s / 2, -s / 2, s, s, kind);
  roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.22); ctx.fill();
  sheen(ctx, -s / 2, -s / 2, s, s, s * 0.22);
  // hole
  ctx.fillStyle = 'rgba(6,16,28,0.9)';
  ctx.beginPath(); ctx.arc(-s * 0.24, -s * 0.24, s * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function HeroScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const size = () => {
      const r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size(); window.addEventListener('resize', size);

    const glow = (cx: number, cy: number, r: number, col: string) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    };

    /** Quadratic point + a soft trail, used for the message in flight. */
    const qp = (a: P, c: P, b: P, u: number): P => {
      const v = 1 - u;
      return { x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y };
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      const base = Math.min(W, H);

      // Layered ambient light — a third, dimmer pool adds depth behind the props.
      glow(W * (0.34 + Math.sin(t * 0.15) * 0.04), H * 0.4, base * 0.66, 'rgba(27,122,107,0.26)');
      glow(W * (0.72 + Math.cos(t * 0.12) * 0.04), H * 0.28, base * 0.52, 'rgba(201,162,39,0.17)');
      glow(W * (0.5 + Math.sin(t * 0.09 + 1) * 0.06), H * 0.78, base * 0.44, 'rgba(43,165,143,0.10)');

      const fy = (a: number, spd: number, ph: number) => Math.sin(t * spd + ph) * a;

      // Anchor points, recomputed each frame so the flight path tracks the bob.
      const ask: P = { x: W * 0.34, y: H * 0.42 + fy(H * 0.028, 0.7, 0) };
      const reply: P = { x: W * 0.70, y: H * 0.26 + fy(H * 0.035, 0.95, 1.6) };
      const ctrl: P = { x: (ask.x + reply.x) / 2, y: Math.min(ask.y, reply.y) - H * 0.2 };

      // Dotted arc from question to answer — the conversation, made literal.
      ctx.save();
      ctx.setLineDash([2, 9]); ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(190,232,220,0.3)';
      ctx.beginPath(); ctx.moveTo(ask.x, ask.y);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y, reply.x, reply.y); ctx.stroke();
      ctx.restore();

      // Dust motes drifting through the light.
      for (let i = 0; i < 14; i++) {
        const seed = i * 2.399;
        const px = ((Math.sin(seed) * 0.5 + 0.5) * W + t * (8 + (i % 4) * 5)) % W;
        const py = H * (0.12 + ((Math.cos(seed * 1.7) * 0.5 + 0.5) * 0.76)) + fy(H * 0.012, 0.4 + i * 0.05, seed);
        ctx.globalAlpha = 0.14 + 0.16 * (Math.sin(t * 0.8 + seed) * 0.5 + 0.5);
        ctx.fillStyle = i % 3 === 0 ? '#e2c15a' : '#7fd8c4';
        ctx.beginPath(); ctx.arc(px, py, base * 0.0055, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Props — kept in the top / left safe zone (the chat mock overlays bottom-right).
      tag(ctx, W * 0.60, H * 0.15 + fy(H * 0.03, 1.2, 2.0), base * 0.13, 'gold', -0.35 + Math.sin(t * 0.6) * 0.08);
      bubble(ctx, reply.x, reply.y, W * 0.24, 'gold', 'ticks');
      coin(ctx, W * 0.19, H * 0.72 + fy(H * 0.03, 0.85, 0.4), base * 0.075, t * 0.85);
      bubble(ctx, ask.x, ask.y, W * 0.36, 'emerald', 'dots');

      // A message travelling the arc: eases out, pauses, repeats.
      const cycle = 3.6;
      const phase = (t % cycle) / cycle;
      if (phase < 0.72) {
        const u = 1 - Math.pow(1 - phase / 0.72, 2.2);
        const fade = Math.sin(Math.min(1, phase / 0.72) * Math.PI);
        for (let k = 0; k < 5; k++) {
          const pu = Math.max(0, u - k * 0.035);
          const pt = qp(ask, ctrl, reply, pu);
          ctx.globalAlpha = fade * (1 - k / 5) * 0.85;
          ctx.fillStyle = k === 0 ? '#ffffff' : '#8ee8d2';
          ctx.beginPath(); ctx.arc(pt.x, pt.y, base * (0.014 - k * 0.002), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };

    if (reduce) { draw(0.6); window.removeEventListener('resize', size); return; }
    let raf = 0, running = true, start = performance.now();
    const io = new IntersectionObserver((e) => { running = e[0].isIntersecting; if (running) loop(); });
    io.observe(canvas);
    const loop = () => { if (!running) return; draw((performance.now() - start) / 1000); raf = requestAnimationFrame(loop); };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); io.disconnect(); };
  }, []);

  return <canvas ref={ref} className="land__hero-canvas" aria-hidden="true" />;
}
