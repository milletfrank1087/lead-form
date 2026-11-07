/**
 * Formats up to 10 digits as the user types: "5550001234" -> "(555) 000-1234".
 *
 * Autofill and paste often include the country code ("+1 555 000 1234"). Once there are more than ten
 * digits and the first is a 1, that leading 1 is the country code and is dropped, so the number is not
 * cut off at the wrong end.
 */
export const formatUsPhone = (value: string): string => {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};
