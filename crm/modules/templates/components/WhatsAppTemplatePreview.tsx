import { FileText, Image as ImageIcon, Video } from 'lucide-react';
import type { TemplateButton, TemplateComponents, TemplateFormat, TemplateVariable } from '../domain/types';

export function substituteVariables(text: string, variables: TemplateVariable[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (match, index) => {
    const variable = variables.find((v) => v.index === Number(index));
    return variable?.sampleValue ? variable.sampleValue : match;
  });
}

function ButtonRow({ buttons }: { buttons: TemplateButton[] }) {
  if (buttons.length === 0) return null;
  return (
    <div className="crm-wa-preview__buttons">
      {buttons.map((button) => (
        <div key={button.id} className="crm-wa-preview__button">
          {button.label || 'Button'}
        </div>
      ))}
    </div>
  );
}

function HeaderBlock({ components }: { components: TemplateComponents }) {
  if (components.headerFormat === 'none') return null;
  if (components.headerFormat === 'text') {
    return <p className="crm-wa-preview__header-text">{components.headerText || 'Header text'}</p>;
  }
  const icon =
    components.headerFormat === 'image' ? <ImageIcon aria-hidden="true" /> : components.headerFormat === 'video' ? <Video aria-hidden="true" /> : <FileText aria-hidden="true" />;
  return (
    <div className="crm-wa-preview__media">
      {icon}
      <span>{components.headerMediaLabel || `${components.headerFormat} attachment`}</span>
    </div>
  );
}

/**
 * WhatsApp-style bubble preview — the composer's visual centrepiece
 * (SKILL.md "Template Composer is the visual centrepiece"). Reused by the
 * composer, Template Detail and the Library preview drawer.
 */
export function WhatsAppTemplatePreview({
  components,
  format,
}: {
  components: TemplateComponents;
  format: TemplateFormat;
}) {
  const body = substituteVariables(components.body, components.variables);

  return (
    <div className="crm-wa-preview">
      <div className="crm-wa-preview__phone">
        <div className="crm-wa-preview__bubble">
          <HeaderBlock components={components} />
          <p className="crm-wa-preview__body">{body || 'Your message body will appear here.'}</p>
          {components.footer ? <p className="crm-wa-preview__footer">{components.footer}</p> : null}
          {format !== 'carousel' ? <ButtonRow buttons={components.buttons} /> : null}
        </div>

        {format === 'carousel' && components.carouselCards?.length ? (
          <div className="crm-wa-preview__carousel">
            {[...components.carouselCards]
              .sort((a, b) => a.order - b.order)
              .map((card) => (
                <div key={card.id} className="crm-wa-preview__card">
                  <div className="crm-wa-preview__media crm-wa-preview__media--card">
                    <ImageIcon aria-hidden="true" />
                    <span>{card.mediaLabel || 'Card media'}</span>
                  </div>
                  <p className="crm-wa-preview__body crm-wa-preview__body--card">{card.body || 'Card text'}</p>
                  <ButtonRow buttons={card.buttons} />
                </div>
              ))}
          </div>
        ) : null}

        {format === 'catalogue' ? (
          <div className="crm-wa-preview__catalogue">
            {components.catalogue?.connected ? (
              <span>{components.catalogue.productIds.length} product(s) attached</span>
            ) : (
              <span className="crm-wa-preview__catalogue--warn">Catalogue not connected</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
