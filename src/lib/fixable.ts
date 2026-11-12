// Shared by server and UI: which problems Undercut can fix by itself (published via the snippet).
export const AUTO_FIX_ISSUES = new Set(['title-missing', 'title-length', 'desc', 'alt', 'canonical', 'schema']);
export const canAutoFix = (issueId?: string) => Boolean(issueId && (AUTO_FIX_ISSUES.has(issueId) || issueId.startsWith('keyword:')));
