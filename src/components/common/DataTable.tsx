import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  id: string;
  label: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
}

export const DataTable = <T,>({ columns, rows, rowKey, onRowClick }: DataTableProps<T>) => {
  return (
    <TableContainer component={Paper} sx={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.id}>{column.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={rowKey(row)}
              hover
              sx={onRowClick ? { cursor: 'pointer' } : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <TableCell key={column.id}>{column.render(row)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
