import type { Locator } from "@playwright/test";

/** Form interaction helpers for Formik/MUI fields, which validate on blur. */

/** Type a value, clear it and leave the field: triggers "required" validation. */
export const typeThenClear = async (input: Locator, value: string) => {
  await input.fill(value);
  await input.fill("");
  await input.blur();
};

/** Replace the field's value and leave it: triggers format validation. */
export const fillAndBlur = async (input: Locator, value: string) => {
  await input.fill(value);
  await input.blur();
};

/** Focus and leave an untouched field. */
export const touch = async (input: Locator) => {
  await input.focus();
  await input.blur();
};
