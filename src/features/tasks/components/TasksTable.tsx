import MoreVertIcon from '@mui/icons-material/MoreVert';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { StatusChip } from '@/components/common/StatusChip';
import { Task } from '@/types/domain';

interface TasksTableProps {
  rows: Task[];
  showOwner?: boolean;
  previousRunsByTask: Record<number, string | undefined>;
  nextRunsByTask: Record<number, string | undefined>;
  onView: (task: Task) => void;
  onTogglePause: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const renderDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : 'N/A');

export const TasksTable = ({
  rows,
  showOwner,
  previousRunsByTask,
  nextRunsByTask,
  onView,
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
    ...(showOwner
      ? [
          {
            id: 'owner',
            label: 'Owner',
            render: (task: Task) => task.owner,
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
          disabled={selectedTask?.status === 'NOT_SCHEDULED'}
          onClick={() => {
            if (selectedTask) {
              onTogglePause(selectedTask);
            }
            setAnchorEl(null);
          }}
        >
          {selectedTask?.status === 'PAUSED' ? (
            <PlayCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
          ) : (
            <PauseCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
          )}
          {selectedTask?.status === 'NOT_SCHEDULED'
            ? 'Task Not Scheduled'
            : `${selectedTask?.status === 'PAUSED' ? 'Resume' : 'Pause'} Task`}
        </MenuItem>
        <MenuItem
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
