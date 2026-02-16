import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useSnackbar } from '@/app/SnackbarContext';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { useTaskTypes } from '@/features/tasks/hooks/useTaskTypes';
import { TaskTypeDefinition } from '@/types/domain';

export const AdminTaskTypesPage = () => {
  const { showToast } = useSnackbar();
  const { taskTypeDefinitions, taskTypesError, reloadTaskTypes } = useTaskTypes();
  const [newType, setNewType] = useState('');
  const [newBatchFilePath, setNewBatchFilePath] = useState('');
  const [typeToDelete, setTypeToDelete] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState('');
  const [editBatchFilePath, setEditBatchFilePath] = useState('');
  const [editNameLocked, setEditNameLocked] = useState(false);

  const addType = async () => {
    const type = newType.trim();
    const batchFilePath = newBatchFilePath.trim();
    if (!type || !batchFilePath) return;
    try {
      await tasksApi.addTaskType({ name: type, batchFilePath });
      setNewType('');
      setNewBatchFilePath('');
      await reloadTaskTypes();
      showToast('Task type added', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to add task type', 'error');
    }
  };

  const openEdit = async (type: TaskTypeDefinition) => {
    setEditingTypeName(type.name);
    setEditTypeName(type.name);
    setEditBatchFilePath(type.batchFilePath);
    setEditNameLocked(false);
    try {
      const tasksUsingType = await tasksApi.list({ type: type.name });
      setEditNameLocked(tasksUsingType.length > 0);
    } catch {
      setEditNameLocked(false);
    }
  };

  const closeEdit = () => {
    setEditingTypeName(null);
    setEditTypeName('');
    setEditBatchFilePath('');
    setEditNameLocked(false);
  };

  const saveEdit = async () => {
    if (!editingTypeName) return;
    const name = editTypeName.trim();
    const batchFilePath = editBatchFilePath.trim();
    if (!name || !batchFilePath) return;
    try {
      await tasksApi.updateTaskType(editingTypeName, { name, batchFilePath });
      await reloadTaskTypes();
      closeEdit();
      showToast('Task type updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update task type', 'error');
    }
  };

  const deleteType = async () => {
    if (!typeToDelete) return;
    try {
      await tasksApi.deleteTaskType(typeToDelete);
      setTypeToDelete(null);
      await reloadTaskTypes();
      showToast('Task type removed', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to remove task type', 'error');
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader title="Task Types" subtitle="Add or remove task type definitions for all task forms and filters." />
      {taskTypesError ? <Alert severity="error">{taskTypesError}</Alert> : null}

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              fullWidth
              label="New Task Type"
              value={newType}
              onChange={(event) => setNewType(event.target.value)}
              placeholder="e.g., T5"
            />
            <TextField
              fullWidth
              label="Batch File Path"
              value={newBatchFilePath}
              onChange={(event) => setNewBatchFilePath(event.target.value)}
              placeholder="e.g., C:\\batch\\run_t5.bat"
            />
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => void addType()}
              sx={{ minWidth: 140, whiteSpace: 'nowrap' }}
            >
              Add Type
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Existing Types
          </Typography>
          <List disablePadding>
            {taskTypeDefinitions.map((type) => (
              <ListItem
                key={type.name}
                divider
                secondaryAction={
                  <Stack direction="row" spacing={0.5}>
                    <IconButton color="primary" onClick={() => openEdit(type)}>
                      <EditOutlinedIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => setTypeToDelete(type.name)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemText primary={type.name} secondary={`Batch file: ${type.batchFilePath}`} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(typeToDelete)}
        title="Delete Task Type"
        description={`Remove ${typeToDelete ?? ''}? This will fail if any task is currently using it.`}
        confirmText="Delete"
        confirmColor="error"
        onClose={() => setTypeToDelete(null)}
        onConfirm={() => void deleteType()}
      />

      <Dialog open={Boolean(editingTypeName)} onClose={closeEdit} fullWidth maxWidth="sm">
        <DialogTitle>Edit Task Type</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Task Type Name"
              value={editTypeName}
              onChange={(event) => setEditTypeName(event.target.value)}
              disabled={editNameLocked}
              helperText={editNameLocked ? 'This type is already used by tasks. You can only edit batch file path.' : undefined}
              required
            />
            <TextField
              label="Batch File Path"
              value={editBatchFilePath}
              onChange={(event) => setEditBatchFilePath(event.target.value)}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveEdit()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
