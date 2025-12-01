/**
 * Loading skeleton for preview component
 */
export function PreviewSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Toolbar skeleton */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: '60px',
                height: '28px',
                backgroundColor: '#e1e3e5',
                borderRadius: '4px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}
            />
          ))}
        </div>
        <div style={{
          width: '80px',
          height: '28px',
          backgroundColor: '#e1e3e5',
          borderRadius: '4px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </div>

      {/* Preview frame skeleton */}
      <div style={{
        backgroundColor: '#f6f6f7',
        borderRadius: '8px',
        padding: '16px',
        minHeight: '400px',
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
          <s-spinner size="large" />
          <p style={{ color: '#6d7175', margin: 0, fontSize: '14px' }}>
            Rendering preview...
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
