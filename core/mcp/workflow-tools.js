export function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

export function optionalStringArray(value, field) {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    throw new Error(`${field} must be an array of non-empty strings`);
  }
  return value.map((item) => item.trim());
}

export function createWorkflowHandler({
  required = [],
  optionalArrays = [],
  build,
}) {
  return async (input = {}) => {
    const normalized = { ...input };
    for (const field of required) {
      normalized[field] = requiredString(input[field], field);
    }
    for (const field of optionalArrays) {
      normalized[field] = optionalStringArray(input[field], field);
    }
    return build(normalized);
  };
}

function workflowList(toolName, field, focus, subject) {
  return [
    `${field}: assess ${focus} for ${subject}.`,
    `${field}: document assumptions, risks, and ownership for ${subject}.`,
    `${field}: define rollback or containment triggers before execution.`,
    `${field}: verify the proposed action with measurable evidence.`,
  ];
}

export function createCapabilityHandlers(definitions) {
  return Object.fromEntries(
    Object.entries(definitions).map(([toolName, definition]) => [
      toolName,
      createWorkflowHandler({
        required: definition.required,
        optionalArrays: ["constraints"],
        build: (input) => {
          const subject = definition.required
            .map((field) => input[field])
            .join(" | ");
          const result = Object.fromEntries(
            definition.required.map((field) => [field, input[field]]),
          );
          for (const field of definition.listOutputs ?? []) {
            result[field] = workflowList(
              toolName,
              field,
              definition.focus,
              subject,
            );
          }
          for (const field of definition.textOutputs ?? []) {
            result[field] =
              `${field}: ${definition.focus} for ${subject}; ` +
              "record the decision, owner, trigger, and verification evidence.";
          }
          if (input.constraints.length > 0) {
            result.constraints = input.constraints;
          }
          return result;
        },
      }),
    ]),
  );
}
