import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
  Chip,
  Box,
  Collapse,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { Fragment, useMemo, useState } from 'react';
import { LogEntry } from '@/types/domain';

interface LogsTableProps {
  logs: LogEntry[];
  userNameById: Record<number, string>;
  taskNameById: Record<number, string>;
  taskTypeByTaskId: Record<number, string>;
}

export const LogsTable = ({ logs, userNameById, taskNameById, taskTypeByTaskId }: LogsTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const pagedLogs = useMemo(() => {
    const start = page * rowsPerPage;
    return logs.slice(start, start + rowsPerPage);
  }, [logs, page, rowsPerPage]);

  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 48 }} />
              <TableCell>Timestamp</TableCell>
              <TableCell>User Name</TableCell>
              <TableCell>Task</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedLogs.map((log) => (
              <Fragment key={log.id}>
                <TableRow
                  hover
                  onClick={() => setExpandedId((current) => (current === log.id ? null : log.id))}
                  sx={{
                    cursor: 'pointer',
                    '& .MuiTableCell-root': {
                      py: 0.3,
                      px: 1,
                    },
                  }}
                >
                  <TableCell>
                    <IconButton size="small">
                      {expandedId === log.id ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                    </IconButton>
                  </TableCell>
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{(log.userId && userNameById[log.userId]) || `User #${log.userId ?? '-'}`}</TableCell>
                  <TableCell>{taskNameById[log.taskId] ?? `Task #${log.taskId}`}</TableCell>
                  <TableCell>{taskTypeByTaskId[log.taskId] ?? 'N/A'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={log.action ?? '-'} variant="outlined" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 0, px: 0, borderBottom: expandedId === log.id ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Collapse in={expandedId === log.id} timeout="auto" unmountOnExit>
                      <Box sx={{ px: 2, py: 1.2, backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Details
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {log.body ?? log.details ?? '-'}
                        </Typography>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[20, 50, 100]}
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
