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
