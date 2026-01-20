/**
 * Line-by-line diff engine using Longest Common Subsequence (LCS) approach
 * Groups changes into hunks with configurable context lines
 */

import type { DiffResult, DiffLine, DiffHunk } from './diff-types';

// Maximum lines to prevent O(n×m) memory explosion
const MAX_DIFF_LINES = 1000;

/**
 * Calculate diff between old and new code
 * Uses LCS algorithm for accurate change detection
 * Note: Falls back to simple comparison if files exceed MAX_DIFF_LINES
 */
export function calculateDiff(oldCode: string, newCode: string): DiffResult {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');

  // Quick check for identical content
  if (oldCode === newCode) {
    return {
      hunks: [],
      stats: { additions: 0, deletions: 0, unchanged: oldLines.length },
      hasDiff: false,
    };
  }

  // Guard against large files to prevent browser freeze
  if (oldLines.length > MAX_DIFF_LINES || newLines.length > MAX_DIFF_LINES) {
    return createSimpleDiff(oldLines, newLines);
  }

  // Build LCS table
  const lcs = buildLCSTable(oldLines, newLines);

  // Backtrack to find diff
  const diff = backtrackDiff(oldLines, newLines, lcs);

  // Group into hunks with context
  const hunks = groupIntoHunks(diff, 3);

  const stats = {
    additions: diff.filter((l) => l.type === 'add').length,
    deletions: diff.filter((l) => l.type === 'remove').length,
    unchanged: diff.filter((l) => l.type === 'unchanged').length,
  };

  return {
    hunks,
    stats,
    hasDiff: stats.additions > 0 || stats.deletions > 0,
  };
}

/**
 * Build LCS table using dynamic programming
 */
function buildLCSTable(oldLines: string[], newLines: string[]): number[][] {
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Backtrack through LCS table to build diff lines
 */
function backtrackDiff(
  oldLines: string[],
  newLines: string[],
  lcs: number[][]
): DiffLine[] {
  const diff: DiffLine[] = [];
  let i = oldLines.length;
  let j = newLines.length;

  // Build diff in reverse, then reverse at end
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      // Lines match
      diff.push({
        type: 'unchanged',
        content: oldLines[i - 1],
        oldLineNumber: i,
        newLineNumber: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      // Addition in new code
      diff.push({
        type: 'add',
        content: newLines[j - 1],
        newLineNumber: j,
      });
      j--;
    } else if (i > 0) {
      // Deletion from old code
      diff.push({
        type: 'remove',
        content: oldLines[i - 1],
        oldLineNumber: i,
      });
      i--;
    }
  }

  return diff.reverse();
}

/**
 * Group diff lines into hunks with context lines
 */
function groupIntoHunks(lines: DiffLine[], contextLines: number): DiffHunk[] {
  if (lines.length === 0) return [];

  const hunks: DiffHunk[] = [];

  // Find indices of changed lines
  const changeIndices: number[] = [];
  lines.forEach((line, index) => {
    if (line.type !== 'unchanged') {
      changeIndices.push(index);
    }
  });

  if (changeIndices.length === 0) return [];

  // Group changes that are close together
  let hunkStart = Math.max(0, changeIndices[0] - contextLines);
  let hunkEnd = Math.min(lines.length - 1, changeIndices[0] + contextLines);

  for (let i = 1; i < changeIndices.length; i++) {
    const gapSize = changeIndices[i] - changeIndices[i - 1];

    if (gapSize <= contextLines * 2 + 1) {
      // Changes are close, extend current hunk
      hunkEnd = Math.min(lines.length - 1, changeIndices[i] + contextLines);
    } else {
      // Gap is large, finalize current hunk and start new one
      hunks.push(createHunk(lines.slice(hunkStart, hunkEnd + 1), hunkStart));
      hunkStart = Math.max(0, changeIndices[i] - contextLines);
      hunkEnd = Math.min(lines.length - 1, changeIndices[i] + contextLines);
    }
  }

  // Push final hunk
  hunks.push(createHunk(lines.slice(hunkStart, hunkEnd + 1), hunkStart));

  return hunks;
}

/**
 * Create a DiffHunk from lines slice
 */
function createHunk(lines: DiffLine[], _startOffset: number): DiffHunk {
  let oldCount = 0;
  let newCount = 0;
  let firstOldLineNum: number | undefined;
  let firstNewLineNum: number | undefined;

  // Single pass to count and find first line numbers
  for (const line of lines) {
    if (line.type !== 'add') {
      oldCount++;
      if (firstOldLineNum === undefined && line.oldLineNumber !== undefined) {
        firstOldLineNum = line.oldLineNumber;
      }
    }
    if (line.type !== 'remove') {
      newCount++;
      if (firstNewLineNum === undefined && line.newLineNumber !== undefined) {
        firstNewLineNum = line.newLineNumber;
      }
    }
  }

  return {
    oldStart: firstOldLineNum || 1,
    oldCount,
    newStart: firstNewLineNum || 1,
    newCount,
    lines,
  };
}

/**
 * Simple fallback diff for large files (>MAX_DIFF_LINES)
 * Just marks all old as removed and all new as added
 */
function createSimpleDiff(oldLines: string[], newLines: string[]): DiffResult {
  const diff: DiffLine[] = [];

  // Mark all old lines as removed
  oldLines.forEach((content, i) => {
    diff.push({ type: 'remove', content, oldLineNumber: i + 1 });
  });

  // Mark all new lines as added
  newLines.forEach((content, i) => {
    diff.push({ type: 'add', content, newLineNumber: i + 1 });
  });

  return {
    hunks: [createHunk(diff, 0)],
    stats: {
      additions: newLines.length,
      deletions: oldLines.length,
      unchanged: 0,
    },
    hasDiff: true,
  };
}
