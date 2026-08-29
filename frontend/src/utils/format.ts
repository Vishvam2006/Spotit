const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatINR(value: number): string {
  return `₹${value.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

export function formatRelativeTime(value?: string | Date | null): string {
  if (!value) return 'Recently';

  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 0) return 'Just now';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) {
    return 'Just now';
  }
  if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return formatDateTime(date.toISOString());
}

export function formatLastUpdated(value?: string | Date | null): string {
  const relative = formatRelativeTime(value);
  if (relative === 'Just now') {
    return 'Last updated: Just now';
  }
  return `Last updated: ${relative}`;
}
