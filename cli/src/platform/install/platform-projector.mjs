import { selectAdapter } from "../adapters/registry.mjs";

export function platformProjector(input) {
  return selectAdapter(input.provider).transform({ input });
}
