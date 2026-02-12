import { Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { LogEntry } from '@/types/domain';

const levelColor: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  INFO: 'success',
  WARN: 'warning',
  ERROR: 'error',
};

export const LogsTable = ({ logs }: { logs: LogEntry[] }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  const pagedLogs = useMemo(() => {
    const start = page * rowsPerPage;
    return logs.slice(start, start + rowsPerPage);
  }, [logs, page, rowsPerPage]);

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Task</TableCell>
              <TableCell>Schedule</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Source</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedLogs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip size="small" label={log.level} color={levelColor[log.level] ?? 'default'} />
                </TableCell>
                <TableCell>{log.taskId}</TableCell>
                <TableCell>{log.scheduleId ?? '-'}</TableCell>
                <TableCell>
                  <Typography variant="body2">{log.message}</Typography>
                  {log.details ? (
                    <Typography variant="caption" color="text.secondary">
                      {log.details}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>{log.source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[8, 12, 20]}
        component="div"
        count={logs.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
      />
    </Paper>
  );
};
