/* src/components/DataTable.tsx
 * Generic typed table with optional loading/empty states and sticky header.
 * Usage:
 *   const cols: Column<User>[] = [
 *     { key: 'name', header: 'Name', render: r => r.name },
 *     { key: 'role', header: 'Role', width: 120 },
 *   ];
 *   <DataTable rows={users} columns={cols} keyField="id" loading={isFetching} />
 */
import type { ReactNode, CSSProperties } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T extends object> {
  rows: T[];
  columns: Column<T>[];
  keyField: keyof T;
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  style?: CSSProperties;
}

const th: CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--fg-3)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  background: 'var(--surface-0)',
  zIndex: 1,
};

const td: CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--fg-1)',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'middle',
};

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={td}>
          <div style={{
            height: 14,
            borderRadius: 4,
            background: 'var(--border)',
            opacity: 0.6,
            animation: 'pulse 1.4s ease-in-out infinite',
            width: `${40 + (i % 3) * 20}%`,
          }} />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T extends object>({
  rows, columns, keyField, loading, emptyText = 'No data', onRowClick, style,
}: DataTableProps<T>) {
  return (
    <div style={{ overflowX: 'auto', ...style }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                style={{
                  ...th,
                  width: col.width,
                  textAlign: col.align ?? 'left',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            : rows.length === 0
              ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{ ...td, textAlign: 'center', color: 'var(--fg-3)', padding: '32px 12px' }}
                  >
                    {emptyText}
                  </td>
                </tr>
              )
              : rows.map(row => (
                <tr
                  key={String(row[keyField])}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{ cursor: onRowClick ? 'pointer' : undefined }}
                  onMouseEnter={e => {
                    if (onRowClick) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-1)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLTableRowElement).style.background = '';
                  }}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      style={{ ...td, textAlign: col.align ?? 'left' }}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
