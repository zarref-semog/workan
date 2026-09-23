export function DataTable({
  columns,
  rows,
  getRowKey = (row) => row.id ?? row._id,
  emptyMessage = 'Nenhum registro encontrado.',
  minWidth,
  className = '',
  onRowClick,
}) {
  return (
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
          {rows.map((row, rowIndex) => (
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
          ))}
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
  );
}
