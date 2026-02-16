import MoreVertIcon from '@mui/icons-material/MoreVert';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import BoltIcon from '@mui/icons-material/Bolt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HistoryIcon from '@mui/icons-material/History';
import { Button, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { StatusChip } from '@/components/common/StatusChip';
import { Task } from '@/types/domain';

interface TasksTableProps {
  rows: Task[];
  showCreatedBy?: boolean;
  readOnly?: boolean;
  previousRunsByTask: Record<number, string | undefined>;
  nextRunsByTask: Record<number, string | undefined>;
  onView: (task: Task) => void;
  onViewHistory: (task: Task) => void;
  onRun: (task: Task) => void;
  onTogglePause: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const renderDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : 'N/A');

export const TasksTable = ({
  rows,
  showCreatedBy,
  readOnly,
  previousRunsByTask,
  nextRunsByTask,
  onView,
  onViewHistory,
  onRun,
  onTogglePause,
  onDelete,
}: TasksTableProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const columns = [
    {
      id: 'name',
      label: 'Task',
      render: (task: Task) => (
        <Typography variant="body2" fontWeight={600}>
          {task.name}
        </Typography>
      ),
    },
    {
      id: 'type',
      label: 'Type',
      render: (task: Task) => task.type,
    },
    ...(showCreatedBy
      ? [
          {
            id: 'createdBy',
            label: 'Created By',
            render: (task: Task) => task.createdBy,
          },
        ]
      : []),
    {
      id: 'status',
      label: 'Status',
      render: (task: Task) => <StatusChip status={task.status} />,
    },
    {
      id: 'previousRun',
      label: 'Previous Run',
      render: (task: Task) => renderDateTime(previousRunsByTask[task.id]),
    },
    {
      id: 'nextRun',
      label: 'Next Run',
      render: (task: Task) => renderDateTime(nextRunsByTask[task.id]),
    },
    {
      id: 'createdAt',
      label: 'Created At',
      render: (task: Task) => new Date(task.createdAt).toLocaleString(),
    },
    {
      id: 'run',
      label: 'Run',
      render: (task: Task) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<BoltIcon fontSize="small" />}
          disabled={readOnly}
          onClick={(event) => {
            event.stopPropagation();
            onRun(task);
          }}
        >
          Run Now
        </Button>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (task: Task) => (
        <IconButton
          onClick={(event) => {
            event.stopPropagation();
            setSelectedTask(task);
            setAnchorEl(event.currentTarget);
          }}
        >
          <MoreVertIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <DataTable columns={columns} rows={rows} rowKey={(task) => task.id} onRowClick={onView} />
      <Menu open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}>
        <MenuItem
          onClick={() => {
            if (selectedTask) {
              onView(selectedTask);
            }
            setAnchorEl(null);
          }}
        >
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedTask) {
              onViewHistory(selectedTask);
            }
            setAnchorEl(null);
          }}
        >
          <HistoryIcon fontSize="small" sx={{ mr: 1 }} /> View History
        </MenuItem>
        <MenuItem
          disabled={readOnly}
          onClick={() => {
            if (selectedTask) {
              onRun(selectedTask);
            }
            setAnchorEl(null);
          }}
        >
          <BoltIcon fontSize="small" sx={{ mr: 1 }} /> Run Now
        </MenuItem>
        <MenuItem
          disabled={readOnly}
          onClick={() => {
            if (selectedTask) {
              onTogglePause(selectedTask);
            }
            setAnchorEl(null);
          }}
        >
          {selectedTask?.status === 'NOT_SCHEDULED' ? (
            <PlayCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
          ) : (
            <PauseCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
          )}
          {selectedTask?.status === 'NOT_SCHEDULED' ? 'Activate Task' : 'Set Not Scheduled'}
        </MenuItem>
        <MenuItem
          disabled={readOnly}
          onClick={() => {
            if (selectedTask) {
              onDelete(selectedTask);
            }
            setAnchorEl(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} /> Delete Task
        </MenuItem>
      </Menu>
    </>
  );
};
