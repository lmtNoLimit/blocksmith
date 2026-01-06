/**
 * Visual progress indicator for quota usage
 * Shows percentage with dynamic tone (critical/warning/highlight)
 * Optional threshold markers at 50%, 75%, 90%
 */

interface QuotaProgressBarProps {
  used: number;
  included: number;
  tone?: "critical" | "warning" | "highlight" | "primary" | "success";
  showThresholds?: boolean;
}

const THRESHOLD_MARKERS = [
  { percent: 50, label: "50%" },
  { percent: 75, label: "75%" },
  { percent: 90, label: "90%" },
];

export function QuotaProgressBar({
  used,
  included,
  tone = "highlight",
  showThresholds = false,
}: QuotaProgressBarProps) {
  const percentage = Math.min(100, Math.round((used / included) * 100));

  const getBarColor = () => {
    if (tone === "critical") return "#d72c0d";
    if (tone === "warning") return "#f49342";
    return "#008060";
  };

  return (
    <s-grid gap="small-100">
      {/* Progress bar container */}
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${percentage}% of quota used`}
        style={{
          position: "relative",
          width: "100%",
          height: showThresholds ? "12px" : "8px",
          backgroundColor: "#e1e3e5",
          borderRadius: "4px",
          overflow: "visible",
        }}
      >
        {/* Filled progress */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${percentage}%`,
            height: "100%",
            backgroundColor: getBarColor(),
            borderRadius: "4px",
            transition: "width 0.3s ease",
          }}
        />

        {/* Threshold markers */}
        {showThresholds && THRESHOLD_MARKERS.map((marker) => (
          <div
            key={marker.percent}
            style={{
              position: "absolute",
              left: `${marker.percent}%`,
              top: 0,
              bottom: 0,
              width: "2px",
              backgroundColor: percentage >= marker.percent ? "rgba(255,255,255,0.6)" : "#b5b5b5",
              transform: "translateX(-1px)",
            }}
            title={`${marker.label} threshold`}
          />
        ))}
      </div>

      {/* Labels row */}
      <s-grid gridTemplateColumns="1fr auto" alignItems="center">
        <s-paragraph color="subdued">
          {used} of {included} sections used
        </s-paragraph>
        <s-text color="subdued" fontVariantNumeric="tabular-nums">
          {percentage}%
        </s-text>
      </s-grid>

      {/* Threshold legend (only when showing thresholds and near limits) */}
      {showThresholds && percentage >= 50 && (
        <s-grid gridTemplateColumns="repeat(3, auto)" gap="base" justifyContent="start">
          {THRESHOLD_MARKERS.map((marker) => (
            <s-text
              key={marker.percent}
              color={percentage >= marker.percent ? "base" : "subdued"}
            >
              {marker.label}
              {percentage >= marker.percent && marker.percent === 90 && " (!)"}
            </s-text>
          ))}
        </s-grid>
      )}
    </s-grid>
  );
}
