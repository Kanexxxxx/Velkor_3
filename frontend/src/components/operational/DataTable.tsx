import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyTitle = 'Nenhum registro',
  emptyDescription = 'Quando houver dados, eles aparecem aqui.',
}: DataTableProps<T>) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="op-table-wrap">
      <table className="op-table">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.key} className={column.align ? `align-${column.align}` : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getRowKey(row, index)}>
              {columns.map(column => (
                <td key={column.key} className={column.align ? `align-${column.align}` : undefined}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
