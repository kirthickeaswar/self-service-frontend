const splitEmails = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

export const parseAccessEmails = (value: string) => [...new Set(splitEmails(value))];

export const stringifyAccessEmails = (emails: string[]) => emails.join(', ');
