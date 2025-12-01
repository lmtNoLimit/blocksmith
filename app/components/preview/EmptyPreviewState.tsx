export interface EmptyPreviewStateProps {
  message?: string;
}

/**
 * Empty state shown when no code is available to preview
 */
export function EmptyPreviewState({
  message = 'Generate a section to see the preview'
}: EmptyPreviewStateProps) {
  return (
    <div style={{
      padding: '32px',
      backgroundColor: '#f6f6f7',
      borderRadius: '8px',
      minHeight: '300px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '48px', opacity: 0.5 }}>👁️</span>
        <p style={{ color: '#6d7175', margin: 0, textAlign: 'center' }}>
          {message}
        </p>
      </div>
    </div>
  );
}
