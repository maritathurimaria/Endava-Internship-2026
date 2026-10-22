import "dotenv/config";

const toNumber = (value: string | undefined, fallback: number): number =>
  value !== undefined && value !== "" && !Number.isNaN(Number(value)) ? Number(value) : fallback;

/** Read-only runtime configuration. Override any value through environment variables or `.env`. */
export const env = Object.freeze({
  baseURL: process.env.BASE_URL ?? "http://localhost:3000",
  apiURL: process.env.API_URL ?? "http://localhost:3001",
  defaultPassword: process.env.SEED_DEFAULT_USER_PASSWORD ?? "s3cret",
  paginationPageSize: toNumber(process.env.PAGINATION_PAGE_SIZE, 10),
  /** Viewports narrower than this render the mobile layout (same breakpoint as the Cypress suite). */
  mobileViewportWidthBreakpoint: 414,
});
