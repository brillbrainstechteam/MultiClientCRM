'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, CheckCheck, Paperclip, ShoppingBag } from 'lucide-react';

/**
 * The hero's centrepiece: a WhatsApp conversation that types itself out on a
 * loop — customer asks, business replies, ticks turn blue, an order lands.
 *
 * This replaces the earlier floating-3D-clipart canvas, which read as generic
 * and synthetic. A live-feeling thread is specific to the product and carries
 * the whole pitch (chat → catalogue → paid order) in one glance. Pure DOM +
 * CSS transitions; honours prefers-reduced-motion by showing the finished
 * thread statically.
 */

type NewItem =
  | { kind: 'in'; text: string }
  | { kind: 'out'; text: string; media?: boolean; read: boolean }
  | { kind: 'order'; label: string; amount: string };

type Item = NewItem & { id: number };

// One scripted cycle. `wait` is the pause (ms) BEFORE the step runs.
type Step =
  | { wait: number; do: 'typing' }
  | { wait: number; do: 'in'; text: string }
  | { wait: number; do: 'out'; text: string; media?: boolean }
  | { wait: number; do: 'read' }
  | { wait: number; do: 'order'; label: string; amount: string };

const SCRIPT: Step[] = [
  { wait: 700, do: 'typing' },
  { wait: 1300, do: 'in', text: 'Do you have the festive cotton sets in bulk?' },
  { wait: 900, do: 'out', text: 'Yes — 200 in stock. Sharing the catalogue now', media: true },
  { wait: 1100, do: 'read' },
  { wait: 700, do: 'typing' },
  { wait: 1400, do: 'in', text: 'Perfect. Book 50 sets for Diwali 🎉' },
  { wait: 900, do: 'out', text: 'Done! Confirming your order' },
  { wait: 900, do: 'read' },
  { wait: 700, do: 'order', label: 'Order confirmed', amount: '₹2,40,000' },
  { wait: 2600, do: 'reset' } as unknown as Step,
];

const FINAL: Item[] = [
  { id: 1, kind: 'in', text: 'Do you have the festive cotton sets in bulk?' },
  { id: 2, kind: 'out', text: 'Yes — 200 in stock. Sharing the catalogue now', media: true, read: true },
  { id: 3, kind: 'in', text: 'Perfect. Book 50 sets for Diwali 🎉' },
  { id: 4, kind: 'out', text: 'Done! Confirming your order', read: true },
  { id: 5, kind: 'order', label: 'Order confirmed', amount: '₹2,40,000' },
];

export function HeroChat() {
  const [items, setItems] = useState<Item[]>([]);
  const [typing, setTyping] = useState(false);
  const [fading, setFading] = useState(false);
  const idRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      idRef.current = FINAL.length;
      setItems(FINAL);
      return;
    }

    const after = (ms: number, fn: () => void) => {
      const t = setTimeout(fn, ms);
      timers.current.push(t);
    };

    const run = () => {
      let clock = 0;
      const push = (it: NewItem) =>
        setItems((prev) => [...prev, { ...it, id: ++idRef.current }]);

      for (const step of SCRIPT) {
        clock += step.wait;
        const d = (step as { do: string }).do;
        if (d === 'reset') {
          after(clock, () => setFading(true));
          after(clock + 450, () => {
            setItems([]);
            setTyping(false);
            setFading(false);
            run();
          });
        } else if (d === 'typing') {
          after(clock, () => setTyping(true));
        } else if (d === 'in') {
          after(clock, () => {
            setTyping(false);
            push({ kind: 'in', text: (step as { text: string }).text });
          });
        } else if (d === 'out') {
          const s = step as { text: string; media?: boolean };
          after(clock, () => push({ kind: 'out', text: s.text, media: s.media, read: false }));
        } else if (d === 'read') {
          after(clock, () =>
            setItems((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i--) {
                const m = next[i];
                if (m.kind === 'out' && !m.read) { next[i] = { ...m, read: true }; break; }
              }
              return next;
            }),
          );
        } else if (d === 'order') {
          const s = step as { label: string; amount: string };
          after(clock, () => push({ kind: 'order', label: s.label, amount: s.amount }));
        }
      }
    };

    const kick = setTimeout(run, 300);
    timers.current.push(kick);
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, []);

  return (
    <div className="hchat" role="img" aria-label="A WhatsApp chat turning into a confirmed order.">
      <div className="hchat__bar">
        <span className="hchat__av">ST</span>
        <div className="hchat__id">
          <strong>Shah Textiles</strong>
          <small>{typing ? 'typing…' : 'online'}</small>
        </div>
        <span className="hchat__wa" aria-hidden="true">
          <span className="hchat__dot" />
        </span>
      </div>

      <div className={`hchat__body${fading ? ' hchat__body--fade' : ''}`}>
        {items.map((it) => {
          if (it.kind === 'order') {
            return (
              <div key={it.id} className="hchat__order hchat__pop">
                <span className="hchat__order-ic"><ShoppingBag size={15} /></span>
                <span className="hchat__order-label">{it.label}</span>
                <span className="hchat__order-amt">{it.amount}</span>
                <CheckCheck size={14} className="hchat__order-tick" />
              </div>
            );
          }
          return (
            <div key={it.id} className={`hchat__msg hchat__msg--${it.kind} hchat__pop`}>
              <span className="hchat__msg-text">{it.text}</span>
              {it.kind === 'out' && (
                <span className="hchat__meta">
                  {it.media && <Paperclip size={12} className="hchat__clip" />}
                  <span className={`hchat__tick${it.read ? ' hchat__tick--read' : ''}`}>
                    {it.read ? <CheckCheck size={14} /> : <Check size={14} />}
                  </span>
                </span>
              )}
            </div>
          );
        })}

        {typing && (
          <div className="hchat__msg hchat__msg--in hchat__typing hchat__pop" aria-hidden="true">
            <i /><i /><i />
          </div>
        )}
      </div>
    </div>
  );
}
