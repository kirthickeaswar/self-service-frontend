import DownloadIcon from '@mui/icons-material/Download';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Alert, Button, Card, CardContent, Chip, Divider, Stack, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useMemo, useState } from 'react';
import { useSnackbar } from '@/app/SnackbarContext';
import { PageHeader } from '@/components/common/PageHeader';
import { exportImportApi } from '@/features/exportImport/api/exportImportApi';

const toPrettyJson = (value: unknown) => {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(href);
};

export const AdminExportImportPage = () => {
  const { showToast } = useSnackbar();
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [fetchingExport, setFetchingExport] = useState(false);
  const [downloadingExport, setDownloadingExport] = useState(false);
  const [importingJson, setImportingJson] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportSize = useMemo(() => {
    if (!exportText) return 0;
    return new Blob([exportText]).size;
  }, [exportText]);

  const fetchExport = async () => {
    setError(null);
    setFetchingExport(true);
    try {
      const payload = await exportImportApi.exportJson();
      setExportText(toPrettyJson(payload));
      setLastFetchedAt(new Date().toISOString());
      showToast('Export generated successfully.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to export snapshot';
      setError(message);
      showToast(message, 'error');
    } finally {
      setFetchingExport(false);
    }
  };

  const copyExport = async () => {
    if (!exportText.trim()) {
      showToast('Generate export first.', 'info');
      return;
    }
    try {
      await navigator.clipboard.writeText(exportText);
      showToast('Export JSON copied.', 'success');
    } catch {
      showToast('Copy failed. Please copy manually from the text area.', 'error');
    }
  };

  const downloadExport = async () => {
    setError(null);
    setDownloadingExport(true);
    try {
      const { blob, fileName } = await exportImportApi.downloadExport();
      downloadBlob(blob, fileName);
      showToast('Export downloaded.', 'success');
    } catch (err) {
      if (exportText.trim()) {
        downloadBlob(new Blob([exportText], { type: 'application/json' }), 'autotasker-export.json');
        showToast('Server download unavailable. Downloaded local export instead.', 'warning');
      } else {
        const message = err instanceof Error ? err.message : 'Unable to download export';
        setError(message);
        showToast(message, 'error');
      }
    } finally {
      setDownloadingExport(false);
    }
  };

  const submitJsonImport = async () => {
    setError(null);
    if (!importText.trim()) {
      showToast('Paste JSON content before import.', 'info');
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch {
      showToast('Invalid JSON format.', 'error');
      return;
    }

    setImportingJson(true);
    try {
      await exportImportApi.importJson(parsed);
      showToast('JSON import submitted successfully.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to import JSON';
      setError(message);
      showToast(message, 'error');
    } finally {
      setImportingJson(false);
    }
  };

  const submitFileImport = async () => {
    setError(null);
    if (!selectedFile) {
      showToast('Choose a JSON file to import.', 'info');
      return;
    }

    setUploadingFile(true);
    try {
      await exportImportApi.importFile(selectedFile);
      setSelectedFile(null);
      showToast('File uploaded and import started.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to upload import file';
      setError(message);
      showToast(message, 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Export / Import"
        subtitle="Move task configuration snapshots across environments using JSON."
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2} alignItems="stretch">
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Export</Typography>
                  <Chip size="small" color={exportText ? 'success' : 'default'} label={exportText ? 'Ready' : 'Not fetched'} />
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  Generate a full JSON snapshot of tasks, then copy or download it.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button variant="contained" startIcon={<FileUploadIcon />} onClick={() => void fetchExport()} disabled={fetchingExport}>
                    {fetchingExport ? 'Fetching...' : 'Generate Export'}
                  </Button>
                  <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => void copyExport()} disabled={!exportText.trim()}>
                    Copy JSON
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => void downloadExport()}
                    disabled={downloadingExport}
                  >
                    {downloadingExport ? 'Downloading...' : 'Download JSON'}
                  </Button>
                </Stack>

                <TextField
                  fullWidth
                  multiline
                  minRows={14}
                  value={exportText}
                  InputProps={{ readOnly: true }}
                  placeholder="Export JSON will appear here after clicking Generate Export."
                />

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {lastFetchedAt ? (
                    <Typography variant="caption" color="text.secondary">
                      Last generated: {new Date(lastFetchedAt).toLocaleString()}
                    </Typography>
                  ) : null}
                  {exportText ? (
                    <Typography variant="caption" color="text.secondary">
                      Size: {exportSize.toLocaleString()} bytes
                    </Typography>
                  ) : null}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Import</Typography>
                  <Chip size="small" color="warning" label="Admin only" />
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  Import a snapshot using either raw JSON text or a JSON file upload.
                </Typography>

                <Typography variant="subtitle2">Import from JSON text</Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={8}
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  placeholder="Paste exported JSON here."
                />
                <Button
                  variant="contained"
                  startIcon={<UploadFileIcon />}
                  onClick={() => void submitJsonImport()}
                  disabled={importingJson || uploadingFile}
                >
                  {importingJson ? 'Importing...' : 'Submit JSON Import'}
                </Button>

                <Divider />

                <Typography variant="subtitle2">Import from file</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <Button variant="outlined" component="label">
                    Choose JSON File
                    <input
                      hidden
                      type="file"
                      accept=".json,application/json"
                      onChange={(event) => {
                        setSelectedFile(event.target.files?.[0] ?? null);
                      }}
                    />
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {selectedFile ? selectedFile.name : 'No file selected'}
                  </Typography>
                </Stack>
                <Button
                  variant="contained"
                  startIcon={<UploadFileIcon />}
                  onClick={() => void submitFileImport()}
                  disabled={!selectedFile || uploadingFile || importingJson}
                >
                  {uploadingFile ? 'Uploading...' : 'Upload and Import'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};
