import React, { useState, useRef, useCallback } from 'react';
import styles from './FileUpload.module.css';
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Loader, Table, ChevronDown, ChevronUp } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const ACCEPTED_EXTS = ['xlsx', 'xls', 'csv'];
const MAX_FILE_SIZE_MB = 10;

// ── Sheet detail toggle ───────────────────────────────────────────────────────
function SheetDetail({ sheet }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        style={{
          background: 'none', border: 'none', padding: '4px 0',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          color: 'var(--text-secondary, #6b7280)', fontSize: 12,
        }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        <Table size={12} />
        <strong>{sheet.sheet_name}</strong>
        &nbsp;—&nbsp;{sheet.row_count.toLocaleString()} rows · {sheet.col_count} cols
      </button>
      {open && (
        <div style={{ paddingLeft: 16, marginTop: 4 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {sheet.columns.map((col, i) => (
              <span
                key={i}
                style={{
                  background: 'var(--bg-tertiary, #f3f4f6)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {col.name}
                <span style={{ color: 'var(--text-secondary, #9ca3af)', fontStyle: 'italic' }}>
                  {col.inferred_dtype || col.raw_dtype}
                </span>
                {col.null_pct > 0 && (
                  <span style={{ color: '#f59e0b', fontSize: 10 }}>
                    {col.null_pct.toFixed(0)}% null
                  </span>
                )}
              </span>
            ))}
          </div>
          {sheet.columns.some((c) => c.sample_values?.length > 0) && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary, #6b7280)' }}>
              Sample values:{' '}
              {sheet.columns
                .filter((c) => c.sample_values?.length > 0)
                .slice(0, 3)
                .map((c) => `${c.name}: [${c.sample_values.slice(0, 2).join(', ')}]`)
                .join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const FileUpload = ({ onClose }) => {
  const { handleIngest } = useChat();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [schemaMap, setSchemaMap] = useState(null); // SchemaMap from ingest
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const processFiles = useCallback(async (files) => {
    setError(null);

    const validFiles = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_EXTS.includes(ext)) {
        setError(`Unsupported file type for ${file.name}. Please upload .xlsx, .xls, or .csv`);
        return;
      }
      if (ext !== 'csv' && file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`File ${file.name} is too large (max ${MAX_FILE_SIZE_MB}MB)`);
        return;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const result = await handleIngest(validFiles);
      setSchemaMap(result);
    } catch (err) {
      setError(err.message || 'Ingest failed');
    } finally {
      setUploading(false);
    }
  }, [handleIngest]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length > 0) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileSelect = useCallback((e) => {
    if (e.target.files?.length > 0) processFiles(e.target.files);
  }, [processFiles]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Upload Data Source</h3>
          <button className={styles.closeButton} onClick={onClose}><X size={18} /></button>
        </div>

        {!schemaMap ? (
          <>
            <div
              className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''} ${uploading ? styles.dropzoneUploading : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className={styles.fileInput}
              />

              {uploading ? (
                <div className={styles.uploadingState}>
                  <Loader size={32} className={styles.spinner} />
                  <p className={styles.dropText}>Profiling and indexing data…</p>
                </div>
              ) : (
                <>
                  <div className={styles.uploadIcon}><Upload size={28} /></div>
                  <p className={styles.dropText}>
                    Drag & drop your files here, or <span className={styles.browse}>browse</span>
                  </p>
                  <div className={styles.badges}>
                    <span className={styles.badge}>.xlsx</span>
                    <span className={styles.badge}>.xls</span>
                    <span className={styles.badge}>.csv</span>
                  </div>
                  <p className={styles.limit}>Max 10MB per file · 100K rows · multiple files supported</p>
                </>
              )}
            </div>

            {error && (
              <div className={styles.errorBanner}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </>
        ) : (
          <div>
            {/* Summary banner */}
            <div className={styles.successState}>
              <div className={styles.successHeader}>
                <div className={styles.successIcon}><Check size={20} /></div>
                <div>
                  <div className={styles.successTitle}>
                    {schemaMap.total_files} file{schemaMap.total_files !== 1 ? 's' : ''} ingested successfully
                  </div>
                  <div className={styles.successSubtitle}>
                    {schemaMap.total_sheets} sheet{schemaMap.total_sheets !== 1 ? 's' : ''} · {schemaMap.total_rows.toLocaleString()} total rows
                  </div>
                </div>
              </div>

              {/* Per-file details */}
              {schemaMap.files.map((fileMeta, fi) => (
                <div key={fi} style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <FileSpreadsheet size={14} style={{ color: 'var(--text-secondary, #6b7280)' }} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{fileMeta.filename}</span>
                  </div>
                  {fileMeta.sheets.map((sheet, si) => (
                    <SheetDetail key={si} sheet={sheet} />
                  ))}
                </div>
              ))}

              {/* Warnings */}
              {schemaMap.cross_file_duplicates?.length > 0 && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef3c7', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
                  ⚠ {schemaMap.cross_file_duplicates.length} cross-file duplicate group(s) detected
                </div>
              )}
              {schemaMap.synonym_groups?.length > 0 && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#eff6ff', borderRadius: 6, fontSize: 12, color: '#1e40af' }}>
                  ℹ {schemaMap.synonym_groups.length} synonym column group(s) found across files
                </div>
              )}
            </div>

            <div style={{ padding: '0 24px 24px' }}>
              <button className={styles.doneButton} onClick={onClose}>
                Done — Ready to Analyze
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
