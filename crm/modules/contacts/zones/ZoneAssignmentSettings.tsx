/**
 * Zone & Assignment settings — the shared configuration surface (§6).
 *
 * Mounted in two places that read/write the same live store:
 *   • Contacts → Zone & Assignment Settings  (/contacts/zones)
 *   • Settings → Team & Access → Zone Assignment (/settings/team/zones)
 * A change made in one appears immediately in the other.
 */

import { useMemo } from 'react';
import { Info, MapPin, Plus, Trash2, X } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Badge, Button, Input, Select, Toggle } from '@crm/design-system';
import { users, findUser } from '@crm/mock-data';
import type { Zone } from '@crm/mock-data';
import { useZones, updateZone, addZone } from './zone-store';

function csvToList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ZoneAssignmentSettings({ context }: { context: 'contacts' | 'team' }) {
  const zones = useZones();

  const userOptions = useMemo(
    () => users.map((u) => ({ value: u.id, label: u.name })),
    [],
  );

  function handleAddZone() {
    const id = `zone_${Date.now()}`;
    addZone({ id, name: 'New zone', active: true, states: [], cities: [], memberUserIds: [], primaryOwnerId: null });
  }

  function removeMember(zone: Zone, userId: string) {
    const memberUserIds = zone.memberUserIds.filter((m) => m !== userId);
    const primaryOwnerId = zone.primaryOwnerId === userId ? (memberUserIds[0] ?? null) : zone.primaryOwnerId;
    updateZone(zone.id, { memberUserIds, primaryOwnerId });
  }

  function addMember(zone: Zone, userId: string) {
    if (!userId || zone.memberUserIds.includes(userId)) return;
    const memberUserIds = [...zone.memberUserIds, userId];
    updateZone(zone.id, { memberUserIds, primaryOwnerId: zone.primaryOwnerId ?? userId });
  }

  return (
    <div className="crm-zones">
      <PageHeader
        title="Zone & Assignment"
        description="Route imported and new contacts to the right team member by geography. City rules take priority over state rules."
        actions={
          <Button variant="primary" iconLeft={<Plus />} onClick={handleAddZone}>
            Add zone
          </Button>
        }
      />

      <div className="crm-zones__shared">
        <Info aria-hidden="true" />
        <span>
          This is the same configuration shown in{' '}
          <strong>{context === 'contacts' ? 'Settings → Team & Access → Zone Assignment' : 'Contacts → Zone & Assignment Settings'}</strong>. Changes here apply everywhere, including import routing. Only authorised roles can edit zones.
        </span>
      </div>

      <div className="crm-zones__list">
        {zones.map((zone) => {
          const nonMembers = userOptions.filter((o) => !zone.memberUserIds.includes(o.value));
          return (
            <section key={zone.id} className={`crm-zone-card${zone.active ? '' : ' crm-zone-card--inactive'}`}>
              <header className="crm-zone-card__head">
                <MapPin aria-hidden="true" className="crm-zone-card__icon" />
                <Input
                  label="Zone name"
                  hideLabel
                  value={zone.name}
                  onChange={(e) => updateZone(zone.id, { name: e.target.value })}
                />
                <Toggle
                  label={zone.active ? 'Active' : 'Inactive'}
                  checked={zone.active}
                  onChange={(checked) => updateZone(zone.id, { active: checked })}
                />
              </header>

              <div className="crm-zone-card__grid">
                <label className="crm-zone-field">
                  <span className="crm-zone-field__label">States</span>
                  <Input
                    label="States"
                    hideLabel
                    defaultValue={zone.states.join(', ')}
                    placeholder="e.g. Punjab, Haryana"
                    onBlur={(e) => updateZone(zone.id, { states: csvToList(e.target.value) })}
                  />
                </label>
                <label className="crm-zone-field">
                  <span className="crm-zone-field__label">
                    Cities <span className="crm-zone-field__hint">(win over states)</span>
                  </span>
                  <Input
                    label="Cities"
                    hideLabel
                    defaultValue={zone.cities.join(', ')}
                    placeholder="e.g. Gurugram, Noida"
                    onBlur={(e) => updateZone(zone.id, { cities: csvToList(e.target.value) })}
                  />
                </label>
              </div>

              <div className="crm-zone-card__members">
                <span className="crm-zone-field__label">Team members</span>
                <div className="crm-zone-members">
                  {zone.memberUserIds.length === 0 && (
                    <span className="crm-zone-members__empty">No members — contacts here will need an owner.</span>
                  )}
                  {zone.memberUserIds.map((uid) => (
                    <span key={uid} className={`crm-zone-chip${zone.primaryOwnerId === uid ? ' crm-zone-chip--primary' : ''}`}>
                      {findUser(uid)?.name ?? uid}
                      {zone.primaryOwnerId === uid && <Badge tone="success">Primary</Badge>}
                      <button aria-label={`Remove ${findUser(uid)?.name ?? uid}`} onClick={() => removeMember(zone, uid)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="crm-zone-card__member-actions">
                  {nonMembers.length > 0 && (
                    <Select
                      label="Add member"
                      value=""
                      options={[{ value: '', label: '+ Add member' }, ...nonMembers]}
                      onChange={(e) => addMember(zone, e.target.value)}
                      size="sm"
                    />
                  )}
                  {zone.memberUserIds.length > 1 && (
                    <Select
                      label="Primary owner"
                      value={zone.primaryOwnerId ?? ''}
                      options={zone.memberUserIds.map((uid) => ({ value: uid, label: `Primary: ${findUser(uid)?.name ?? uid}` }))}
                      onChange={(e) => updateZone(zone.id, { primaryOwnerId: e.target.value })}
                      size="sm"
                    />
                  )}
                  <Button variant="ghost" size="sm" iconLeft={<Trash2 />} onClick={() => updateZone(zone.id, { active: false })}>
                    Deactivate
                  </Button>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="crm-zones__fallback">
        <h3 className="crm-zones__fallback-title">Fallback rules</h3>
        <p className="crm-zones__fallback-text">
          Contacts that can’t be mapped are <strong>never</strong> silently assigned to an arbitrary team member. Instead they are surfaced as exceptions for review:
        </p>
        <ul className="crm-zones__fallback-list">
          <li><Badge tone="warning">Location required</Badge> city and state are both missing</li>
          <li><Badge tone="warning">Unmapped zone</Badge> no zone matches the location</li>
          <li><Badge tone="danger">Owner not assigned</Badge> the matched zone has no team member</li>
        </ul>
      </section>
    </div>
  );
}
