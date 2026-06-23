import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadPlugins } from "./contracts.mjs";
import { PlatformError } from "./errors.mjs";

// Minimal JSON Schema validator covering the constructs used by plugin output
// schemas: object/array/string types, required, properties, additionalProperties,
// items, enum, minItems, and minLength. It is intentionally dependency-free and
// scoped to those keywords rather than the full JSON Schema specification.
export function validateAgainstSchema(schema, value, pointer = "") {
  const errors = [];
  const at = pointer || "(root)";

  if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      errors.push(`${at}: expected object`);
      return errors;
    }
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) {
        errors.push(`${at}: missing required property "${key}"`);
      }
    }
    const properties = schema.properties ?? {};
    for (const [key, entry] of Object.entries(value)) {
      const childPointer = pointer ? `${pointer}.${key}` : key;
      if (properties[key]) {
        errors.push(...validateAgainstSchema(properties[key], entry, childPointer));
      } else if (schema.additionalProperties === false) {
        errors.push(`${at}: unexpected property "${key}"`);
      }
    }
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${at}: expected array`);
      return errors;
    }
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      errors.push(`${at}: expected at least ${schema.minItems} item(s)`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateAgainstSchema(schema.items, item, `${at}[${index}]`));
      });
    }
  } else if (schema.type === "string") {
    if (typeof value !== "string") {
      errors.push(`${at}: expected string`);
      return errors;
    }
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      errors.push(`${at}: expected at least ${schema.minLength} character(s)`);
    }
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(`${at}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`);
  }

  return errors;
}

// Validate a JSON document against a plugin's declared output schema. With no
// explicit schemaPath, the plugin's first declared assets.schemas entry is used.
export async function checkCommandOutput({ root, pluginId, file, schemaPath }) {
  const plugins = await loadPlugins(root);
  const plugin = plugins.get(pluginId);
  if (!plugin) {
    throw new PlatformError(`unknown plugin ${pluginId}`, {
      code: "AI_ENGINEERING_INCOMPATIBLE",
    });
  }
  const declared = plugin.assets?.schemas ?? [];
  const relative = schemaPath ?? declared[0];
  if (!relative) {
    throw new PlatformError(`plugin ${pluginId} declares no schema`, {
      code: "AI_ENGINEERING_INVALID_CONTRACT",
    });
  }
  if (schemaPath && !declared.includes(schemaPath)) {
    throw new PlatformError(
      `plugin ${pluginId} does not declare schema ${schemaPath}`,
      { code: "AI_ENGINEERING_INVALID_CONTRACT" },
    );
  }
  const schema = JSON.parse(
    await readFile(path.join(root, "plugins", pluginId, relative), "utf8"),
  );
  const value = JSON.parse(await readFile(path.resolve(file), "utf8"));
  const errors = validateAgainstSchema(schema, value);
  return { ok: errors.length === 0, plugin: pluginId, schema: relative, errors };
}
