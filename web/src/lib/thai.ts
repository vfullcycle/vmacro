const THAI_CHAR_RANGE = /[฀-๿]/;

export function containsThai(text: string): boolean {
  return THAI_CHAR_RANGE.test(text);
}
