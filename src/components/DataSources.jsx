import React from 'react';
import styles from './DataSources.module.css';
import { Database, FileSpreadsheet, Trash2, Table } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const DataSources = () => {
  const { uploadedDatasets, handleDeleteUpload, currentSessionSchema } = useChat();

  const hasIngest = currentSessionSchema?.file_refs?.length > 0;
  const hasUploads = uploadedDatasets?.length > 0;

  if (!hasIngest && !hasUploads) return null;

  return (
    <div className={styles.container}>
      <div className={styles.sectionLabel}>
        <Database size={14} />
        <span>Uploaded Data</span>
      </div>

      <div className={styles.list}>
        {/* Ingest-based sources (from /api/v1/ingest) */}
        {hasIngest && currentSessionSchema.file_refs.map((ref) => (
          <div key={ref.source_name} className={styles.item}>
            <div className={styles.itemIcon}>
              <FileSpreadsheet size={14} />
            </div>
            <div className={styles.itemContent}>
              <div className={styles.itemName} title={`${ref.filename} :: ${ref.sheet_name}`}>
                {ref.filename}
                {currentSessionSchema.total_sheets > 1 && (
                  <span style={{ color: 'var(--text-secondary, #9ca3af)', marginLeft: 4, fontSize: 10 }}>
                    [{ref.sheet_name}]
                  </span>
                )}
              </div>
              <div className={styles.itemMeta}>
                <Table size={10} />
                {ref.row_count.toLocaleString()} rows · {ref.col_count} cols
              </div>
            </div>
          </div>
        ))}

        {/* Legacy SQLite-backed upload sources */}
        {hasUploads && uploadedDatasets.map((ds) => (
          <div key={ds.upload_id} className={styles.item}>
            <div className={styles.itemIcon}>
              <FileSpreadsheet size={14} />
            </div>
            <div className={styles.itemContent}>
              <div className={styles.itemName} title={ds.original_filename}>
                {ds.original_filename}
              </div>
              <div className={styles.itemMeta}>
                <Table size={10} />
                {ds.row_count.toLocaleString()} rows · {ds.column_count} cols
              </div>
            </div>
            <button
              className={styles.deleteButton}
              onClick={() => handleDeleteUpload(ds.upload_id)}
              title="Remove dataset"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataSources;
