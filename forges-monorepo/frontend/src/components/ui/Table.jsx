import PropTypes from 'prop-types';

export default function Table({
  columns,
  data,
  onRowClick,
  className = '',
  emptyMessage = 'Aucune donnée disponible',
  highlightedId,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-subtext">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-subtext uppercase tracking-wider ${column.headerClassName || ''}`}
              >
                {column.header || column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-border">
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => onRowClick && onRowClick(row)}
              className={`${
                highlightedId && row.id === highlightedId ? 'bg-primary/5' : ''
              } ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={colIndex}
                  className={`px-6 py-4 whitespace-nowrap text-sm ${column.cellClassName || ''}`}
                >
                  {column.render
                    ? column.render(row[column.key], row, rowIndex)
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Table.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      header: PropTypes.string,
      label: PropTypes.string,
      render: PropTypes.func,
      headerClassName: PropTypes.string,
      cellClassName: PropTypes.string,
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  onRowClick: PropTypes.func,
  className: PropTypes.string,
  emptyMessage: PropTypes.string,
  highlightedId: PropTypes.string,
};
