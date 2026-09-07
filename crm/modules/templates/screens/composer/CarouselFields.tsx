import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Textarea } from '@crm/design-system';
import type { CarouselCard, TemplateComponents } from '../../domain/types';

/** TPL-S05B — Carousel Composer: card manager (add/duplicate/delete/reorder). */
export function CarouselFields({
  components,
  setComponents,
}: {
  components: TemplateComponents;
  setComponents: (updater: (c: TemplateComponents) => TemplateComponents) => void;
}) {
  const cards = components.carouselCards ?? [];

  const setCards = (next: CarouselCard[]) =>
    setComponents((c) => ({ ...c, carouselCards: next.map((card, index) => ({ ...card, order: index + 1 })) }));

  const addCard = () =>
    setCards([...cards, { id: `card_${Date.now()}`, order: cards.length + 1, mediaLabel: '', body: '', buttons: [] }]);

  const duplicateCard = (card: CarouselCard) =>
    setCards([...cards, { ...card, id: `card_${Date.now()}` }]);

  const removeCard = (id: string) => setCards(cards.filter((c) => c.id !== id));

  const move = (index: number, direction: -1 | 1) => {
    const next = [...cards];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCards(next);
  };

  return (
    <div className="crm-composer-fields">
      <section id="composer-section-body" className="crm-composer-fields__section">
        <h3>Intro body</h3>
        <Textarea
          label="Body"
          hideLabel
          rows={3}
          value={components.body}
          onChange={(e) => setComponents((c) => ({ ...c, body: e.target.value }))}
          placeholder="Hi {{1}}, swipe through…"
        />
      </section>

      <section id="composer-section-carousel" className="crm-composer-fields__section">
        <div className="crm-composer-fields__section-head">
          <h3>Cards ({cards.length}/10)</h3>
          <Button variant="ghost" size="sm" iconLeft={<Plus />} onClick={addCard} disabled={cards.length >= 10}>
            Add card
          </Button>
        </div>
        <p className="crm-composer-fields__helper">A carousel needs 2–10 cards.</p>

        {cards.map((card, index) => (
          <div key={card.id} className="crm-composer-fields__card">
            <div className="crm-composer-fields__card-head">
              <strong>Card {index + 1}</strong>
              <div className="crm-composer-fields__row" style={{ gridTemplateColumns: 'repeat(4, auto)' }}>
                <Button variant="ghost" size="sm" iconLeft={<ArrowUp />} onClick={() => move(index, -1)} disabled={index === 0} />
                <Button variant="ghost" size="sm" iconLeft={<ArrowDown />} onClick={() => move(index, 1)} disabled={index === cards.length - 1} />
                <Button variant="ghost" size="sm" iconLeft={<Copy />} onClick={() => duplicateCard(card)} />
                <Button variant="ghost" size="sm" iconLeft={<Trash2 />} onClick={() => removeCard(card.id)} />
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCards(cards.map((c) => (c.id === card.id ? { ...c, mediaLabel: `carousel-card-${index + 1}.jpg` } : c)))}
            >
              {card.mediaLabel ? `Replace media (${card.mediaLabel})` : 'Upload card media'}
            </Button>
            <Textarea
              label={`Card ${index + 1} body`}
              hideLabel
              rows={2}
              value={card.body}
              onChange={(e) => setCards(cards.map((c) => (c.id === card.id ? { ...c, body: e.target.value } : c)))}
              placeholder="Card text"
            />
            <Input
              label={`Card ${index + 1} button label`}
              hideLabel
              placeholder="Button label (e.g. View)"
              value={card.buttons[0]?.label ?? ''}
              onChange={(e) => {
                const label = e.target.value;
                setCards(
                  cards.map((c) =>
                    c.id === card.id
                      ? { ...c, buttons: [{ id: c.buttons[0]?.id ?? `card_btn_${c.id}`, type: 'website', label, value: c.buttons[0]?.value }] }
                      : c,
                  ),
                );
              }}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
