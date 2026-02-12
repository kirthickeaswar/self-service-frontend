import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Button,
  Card,
  CardContent,
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

export const AdminTaskTypesPage = () => {
  const { showToast } = useSnackbar();
  const { taskTypes, taskTypesError, reloadTaskTypes } = useTaskTypes();
  const [newType, setNewType] = useState('');
  const [typeToDelete, setTypeToDelete] = useState<string | null>(null);

  const addType = async () => {
    const type = newType.trim().toUpperCase();
    if (!type) return;
    try {
      await tasksApi.addTaskType(type);
      setNewType('');
      await reloadTaskTypes();
      showToast('Task type added', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to add task type', 'error');
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="New Task Type"
              value={newType}
              onChange={(event) => setNewType(event.target.value.toUpperCase())}
              placeholder="e.g., T5"
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => void addType()}>
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
            {taskTypes.map((type) => (
              <ListItem
                key={type}
                divider
                secondaryAction={
                  <IconButton color="error" onClick={() => setTypeToDelete(type)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                }
              >
                <ListItemText primary={type} />
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
    </Stack>
  );
};
