import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function DataTable({
  columns,
  rows,
  getRowKey = (row) => row.id ?? row._id,
  emptyMessage = 'Nenhum registro encontrado.',
  minWidth,
  className = '',
  onRowClick,
  pageSize = 10,
}) {
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  // Compare row identities instead of array references: parent renders must not
  // reset the page, while filtering and sorting should return to the first page.
  const rowSignature = JSON.stringify([size, rows.map((row, index) => getRowKey(row, index))]);
  const [pagination, setPagination] = useState({ signature: rowSignature, page: 1 });
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const page = pagination.signature === rowSignature ? Math.min(pagination.page, pageCount) : 1;
  if (pagination.signature !== rowSignature) setPagination({ signature: rowSignature, page: 1 });
  const start = (page - 1) * size;
  const visibleRows = rows.slice(start, start + size);
  const goTo = (next) => setPagination({ signature: rowSignature, page: Math.max(1, Math.min(next, pageCount)) });
  return (
    <>
    <div className="table-scroll">
      <table
        className={`data-table ${className}`}
        style={minWidth ? { minWidth } : undefined}
      >
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.headerClassName}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, index) => {
            const rowIndex = start + index;
            return (
            <tr
              key={getRowKey(row, rowIndex)}
              className={onRowClick ? 'clickable-row' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className={column.className}>
                  {column.render ? column.render(row, rowIndex) : row[column.key]}
                </td>
              ))}
            </tr>
            );
          })}
          {!rows.length && (
            <tr className="empty-table-row">
              <td colSpan={columns.length}>
                <div className="empty">{emptyMessage}</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    <nav className="table-pagination" aria-label="Paginação da tabela">
      <span role="status" aria-live="polite">{rows.length ? `${start + 1}–${Math.min(start + size, rows.length)} de ${rows.length} itens` : '0 itens'}</span>
      <div className="table-pagination-controls">
        <Button variant="secondary" disabled={page === 1} onClick={() => goTo(page - 1)} aria-label="Página anterior"><ChevronLeft size={16} /> Anterior</Button>
        <span>Página {page} de {pageCount}</span>
        <Button variant="secondary" disabled={page === pageCount} onClick={() => goTo(page + 1)} aria-label="Próxima página">Próxima <ChevronRight size={16} /></Button>
      </div>
    </nav>
    </>
  );
}
