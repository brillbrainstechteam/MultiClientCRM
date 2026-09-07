import type { ReactNode } from 'react';
import { Checkbox } from './Checkbox';

export interface Column<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  width?: string;
  align?: 'left' | 'right' | 'center';
}

export interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Enables the selection checkbox column and bulk toolbar behaviour. */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
  onRowClick?: (row: Row) => void;
  emptyState?: ReactNode;
  caption: string;
}

/**
 * The one table system for the app. Header text is navy on the table-header
 * band; rows use hairline dividers. Selection and empty state are built in so
 * modules don't re-implement them.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  selectable = false,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onRowClick,
  emptyState,
  caption,
}: DataTableProps<Row>) {
  const selectedCount = selectedIds?.size ?? 0;
  const allSelected = rows.length > 0 && selectedCount >= rows.length;
  const someSelected = selectedCount > 0 && !allSelected;

  if (rows.length === 0 && emptyState) {
    return (
      <div className="crm-table__empty-wrap">
        <TableHead
          columns={columns}
          selectable={selectable}
          allSelected={false}
          someSelected={false}
          onToggleAll={onToggleAll}
          asStandalone
        />
        {emptyState}
      </div>
    );
  }

  return (
    <div className="crm-table__scroll">
      <table className="crm-table">
        <caption className="crm-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {selectable ? (
              <th className="crm-table__cell crm-table__cell--check" scope="col">
                <Checkbox
                  label="Select all rows"
                  hideLabel
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={() => onToggleAll?.()}
                />
              </th>
            ) : null}
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`crm-table__cell crm-table__header-cell crm-table__cell--${column.align ?? 'left'}`}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = rowKey(row);
            const selected = selectedIds?.has(id) ?? false;
            return (
              <tr
                key={id}
                className={`crm-table__row${onRowClick ? ' crm-table__row--clickable' : ''}${selected ? ' crm-table__row--selected' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {selectable ? (
                  <td
                    className="crm-table__cell crm-table__cell--check"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Checkbox
                      label={`Select row ${id}`}
                      hideLabel
                      checked={selected}
                      onChange={() => onToggleRow?.(id)}
                    />
                  </td>
                ) : null}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`crm-table__cell crm-table__cell--${column.align ?? 'left'}`}
                    onClick={
                      onRowClick
                        ? (event) => {
                            // A cell can render interactive controls (buttons/links/inputs) alongside
                            // row-click navigation — without this, clicking those controls also fires
                            // onRowClick and navigates away instead of performing the control's own action.
                            if ((event.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"]')) {
                              event.stopPropagation();
                            }
                          }
                        : undefined
                    }
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Header-only render used when the body is an empty state. */
function TableHead<Row>({
  columns,
  selectable,
  allSelected,
  someSelected,
  onToggleAll,
  asStandalone,
}: {
  columns: Column<Row>[];
  selectable: boolean;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll?: () => void;
  asStandalone?: boolean;
}) {
  return (
    <table className={`crm-table${asStandalone ? ' crm-table--head-only' : ''}`}>
      <thead>
        <tr>
          {selectable ? (
            <th className="crm-table__cell crm-table__cell--check" scope="col">
              <Checkbox
                label="Select all rows"
                hideLabel
                checked={allSelected}
                indeterminate={someSelected}
                onChange={() => onToggleAll?.()}
              />
            </th>
          ) : null}
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={`crm-table__cell crm-table__header-cell crm-table__cell--${column.align ?? 'left'}`}
              style={column.width ? { width: column.width } : undefined}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
    </table>
  );
}
