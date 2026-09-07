
export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}

/** Underline tab bar. Active tab uses the green product accent. */
export function Tabs({ tabs, activeId, onChange, ariaLabel }: TabsProps) {
  return (
    <div className="crm-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            className={active ? 'crm-tabs__tab crm-tabs__tab--active' : 'crm-tabs__tab'}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined ? <span className="crm-tabs__count">{tab.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
