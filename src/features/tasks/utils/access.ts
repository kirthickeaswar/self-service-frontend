const splitEmails = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

export const parseAccessEmails = (value: string) => [...new Set(splitEmails(value))];

export const stringifyAccessEmails = (emails: string[]) => emails.join(', ');

export const ensureOwnerInAccess = (owner: string, emails: string[]) => {
  const normalizedOwner = owner.trim().toLowerCase();
  const merged = [...emails.map((email) => email.trim().toLowerCase()).filter(Boolean), normalizedOwner];
  return [...new Set(merged)];
};
