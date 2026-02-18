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
  const [addingType, setAddingType] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [deletingType, setDeletingType] = useState(false);
  const [checkingTypeName, setCheckingTypeName] = useState<string | null>(null);

  const addType = async () => {
    const type = newType.trim();
    const batchFilePath = newBatchFilePath.trim();
    if (!type || !batchFilePath || addingType || savingType || deletingType || checkingTypeName !== null) return;
    setAddingType(true);
    try {
      await tasksApi.addTaskType({ name: type, batchFilePath });
      setNewType('');
      setNewBatchFilePath('');
      await reloadTaskTypes();
      showToast('Task type added', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to add task type', 'error');
    } finally {
      setAddingType(false);
    }
  };

  const openEdit = async (type: TaskTypeDefinition) => {
    if (addingType || savingType || deletingType || checkingTypeName !== null) return;
    setEditingTypeName(type.name);
    setEditTypeName(type.name);
    setEditBatchFilePath(type.batchFilePath);
    setEditNameLocked(false);
    setCheckingTypeName(type.name);
    try {
      const tasksUsingType = await tasksApi.list({ type: type.name });
      setEditNameLocked(tasksUsingType.length > 0);
    } catch {
      setEditNameLocked(false);
    } finally {
      setCheckingTypeName(null);
    }
  };

  const closeEdit = () => {
    setEditingTypeName(null);
    setEditTypeName('');
    setEditBatchFilePath('');
    setEditNameLocked(false);
  };

  const saveEdit = async () => {
    if (!editingTypeName || savingType || addingType || deletingType || checkingTypeName !== null) return;
    const name = editTypeName.trim();
    const batchFilePath = editBatchFilePath.trim();
    if (!name || !batchFilePath) return;
    setSavingType(true);
    try {
      await tasksApi.updateTaskType(editingTypeName, { name, batchFilePath });
      await reloadTaskTypes();
      closeEdit();
      showToast('Task type updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update task type', 'error');
    } finally {
      setSavingType(false);
    }
  };

  const deleteType = async () => {
    if (!typeToDelete || deletingType || addingType || savingType || checkingTypeName !== null) return;
    setDeletingType(true);
    try {
      await tasksApi.deleteTaskType(typeToDelete);
      setTypeToDelete(null);
      await reloadTaskTypes();
      showToast('Task type removed', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to remove task type', 'error');
    } finally {
      setDeletingType(false);
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
              placeholder="e.g., Report Generation"
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
              disabled={!newType.trim() || !newBatchFilePath.trim() || addingType || savingType || deletingType || checkingTypeName !== null}
              sx={{ minWidth: 140, whiteSpace: 'nowrap' }}
            >
              {addingType ? 'Adding...' : 'Add Type'}
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
                    <IconButton
                      color="primary"
                      onClick={() => void openEdit(type)}
                      disabled={addingType || savingType || deletingType || checkingTypeName !== null}
                    >
                      <EditOutlinedIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => setTypeToDelete(type.name)}
                      disabled={addingType || savingType || deletingType || checkingTypeName !== null}
                    >
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
        confirmDisabled={deletingType}
        confirmLoading={deletingType}
        confirmLoadingText="Deleting..."
        disableClose={deletingType}
        onClose={() => (deletingType ? null : setTypeToDelete(null))}
        onConfirm={() => void deleteType()}
      />

      <Dialog open={Boolean(editingTypeName)} onClose={savingType ? undefined : closeEdit} fullWidth maxWidth="sm">
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
          <Button onClick={closeEdit} disabled={savingType}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void saveEdit()} disabled={savingType}>
            {savingType ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
