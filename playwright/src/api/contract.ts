import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

/**
 * OpenAPI contract checks: validate real API responses against the response schemas in
 * `tap26/openapi/openapi.json` (generated from openapi.yaml, the source of truth).
 *
 *   const contract = loadContract();
 *   const verdict = validateResponse(contract, "GET", "/users/{userId}", res.status, res.body);
 *   expect(verdict.errors, verdict.summary).toEqual([]);
 *
 * OpenAPI 3.0 specifics handled here:
 *  - `nullable: true` is understood natively by Ajv 8;
 *  - `example`, `discriminator`, `xml`… are ignored (`strict: false`);
 *  - `#/components/...` refs resolve because the whole `components` object is registered as one
 *    schema (`$id: "openapi"`) and every local ref is rewritten to `openapi#/components/...`;
 *  - response refs (`#/components/responses/X`) are followed before compiling.
 */

export const SPEC_PATH = resolve(__dirname, "..", "..", "..", "tap26", "openapi", "openapi.json");
const COMPONENTS_ID = "openapi";

type Json = Record<string, any>;
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Contract {
  readonly spec: Json;
  readonly ajv: Ajv;
  /** Compiled validators, keyed by "METHOD path status"; filled lazily. */
  readonly cache: Map<string, ValidateFunction | null>;
}

export interface Verdict {
  readonly valid: boolean;
  /** Readable one-liners: "/results/0/balance must be integer (got "12") [#/properties/...]" */
  readonly errors: ReadonlyArray<string>;
  /** Multi-line message for `expect(…, summary)`. */
  readonly summary: string;
}

/** Rewrite every local `#/components/...` ref so it resolves against the registered components schema. */
const rewriteRefs = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(rewriteRefs);
  if (!node || typeof node !== "object") return node;
  return Object.fromEntries(
    Object.entries(node as Json).map(([key, value]) =>
      key === "$ref" && typeof value === "string" && value.startsWith("#/")
        ? [key, `${COMPONENTS_ID}${value}`]
        : [key, rewriteRefs(value)],
    ),
  );
};

const pointer = (spec: Json, ref: string): Json =>
  ref
    .replace(/^#\//, "")
    .split("/")
    .reduce((acc: any, key) => acc?.[key.replace(/~1/g, "/").replace(/~0/g, "~")], spec);

const deref = (spec: Json, node: Json | undefined): Json | undefined =>
  node && typeof node.$ref === "string" ? deref(spec, pointer(spec, node.$ref)) : node;

/** Load the spec and prepare an Ajv instance that knows every component schema. */
export const loadContract = (specPath: string = SPEC_PATH): Contract => {
  const spec = JSON.parse(readFileSync(specPath, "utf8")) as Json;
  const ajv = new Ajv({ strict: false, allErrors: true, verbose: true });
  addFormats(ajv);
  ajv.addSchema({ $id: COMPONENTS_ID, components: rewriteRefs(spec.components) } as Json);
  return Object.freeze({ spec, ajv, cache: new Map() });
};

/** The operation object for `METHOD template`, or throws with the known paths. */
export const operationOf = (contract: Contract, method: HttpMethod, template: string): Json => {
  const op = contract.spec.paths?.[template]?.[method.toLowerCase()];
  if (!op) throw new Error(`${method} ${template} is not in the OpenAPI spec (${SPEC_PATH})`);
  return op;
};

/** The JSON schema documented for one response, or undefined when it has no JSON body. */
export const responseSchema = (contract: Contract, method: HttpMethod, template: string, status: number) => {
  const op = operationOf(contract, method, template);
  const response = deref(contract.spec, op.responses?.[String(status)] ?? op.responses?.default);
  return response?.content?.["application/json"]?.schema as Json | undefined;
};

const compiled = (contract: Contract, method: HttpMethod, template: string, status: number) => {
  const key = `${method} ${template} ${status}`;
  if (!contract.cache.has(key)) {
    const schema = responseSchema(contract, method, template, status);
    contract.cache.set(key, schema ? contract.ajv.compile(rewriteRefs(schema) as Json) : null);
  }
  return contract.cache.get(key) ?? null;
};

const describeError = (error: ErrorObject): string => {
  const where = error.instancePath || "(body)";
  const got = error.data === undefined ? "" : ` (got ${JSON.stringify(error.data)?.slice(0, 80)})`;
  const params = error.keyword === "additionalProperties" ? ` '${(error.params as Json).additionalProperty}'` : "";
  return `${where} ${error.message}${params}${got} [${error.schemaPath}]`;
};

/**
 * Validate one response body. A status that the operation does not document is itself a violation.
 * `oneOf` failures repeat per branch, so errors are de-duplicated and capped at 15 lines.
 */
export const validateResponse = (
  contract: Contract,
  method: HttpMethod,
  template: string,
  status: number,
  body: unknown,
): Verdict => {
  const op = operationOf(contract, method, template);
  const documented = Object.keys(op.responses ?? {});
  if (!documented.includes(String(status)) && !documented.includes("default")) {
    const errors = [`status ${status} is not documented (documented: ${documented.join(", ")})`];
    return Object.freeze({ valid: false, errors, summary: `${method} ${template}: ${errors[0]}` });
  }
  const validate = compiled(contract, method, template, status);
  if (!validate || validate(body)) return Object.freeze({ valid: true, errors: [], summary: `${method} ${template} ${status}: valid` });
  const errors = [...new Set((validate.errors ?? []).map(describeError))].slice(0, 15);
  return Object.freeze({
    valid: false,
    errors,
    summary: [`${method} ${template} ${status} violates the OpenAPI schema:`, ...errors.map((e) => `  - ${e}`)].join("\n"),
  });
};
