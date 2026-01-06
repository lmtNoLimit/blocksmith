/**
 * Usage History Component
 * Displays recent section generations with timestamps and overage badges
 */

interface Generation {
  id: string;
  name: string;
  createdAt: Date;
  wasOverage: boolean;
}

interface UsageHistoryProps {
  generations: Generation[];
}

export function UsageHistory({ generations }: UsageHistoryProps) {
  if (generations.length === 0) {
    return (
      <s-section heading="Recent Generations">
        <s-box border="base" borderRadius="base" padding="large-300">
          <s-stack gap="base">
            <s-text color="subdued">No generations yet this cycle</s-text>
            <s-paragraph color="subdued">
              Start generating sections to see your usage history.
            </s-paragraph>
          </s-stack>
        </s-box>
      </s-section>
    );
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <s-section heading="Recent Generations">
      <s-box border="base" borderRadius="base" padding="none" overflow="hidden">
        {generations.slice(0, 10).map((gen) => (
          <s-grid
            key={gen.id}
            gridTemplateColumns="1fr auto auto"
            alignItems="center"
            padding="base"
          >
            <s-text>{gen.name}</s-text>
            <s-text color="subdued">{formatDate(gen.createdAt)}</s-text>
            {gen.wasOverage && <s-badge tone="warning">Overage</s-badge>}
          </s-grid>
        ))}
      </s-box>

      {generations.length > 10 && (
        <s-paragraph color="subdued">
          Showing 10 of {generations.length} generations this cycle.
        </s-paragraph>
      )}
    </s-section>
  );
}
