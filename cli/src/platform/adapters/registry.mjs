import { createWrapperAdapter } from "./adapter-factory.mjs";
import {
  PlatformContractError,
  PLATFORM_ERROR_CODES,
} from "../errors/platform-error.mjs";
import { SUPPORTED_PROVIDERS } from "../../provider-list.mjs";

const ADAPTER_VERSION = "1.0.0";

const adapterUrl = (provider) =>
  new URL(`../../../../adapters/${provider}/projector.mjs`, import.meta.url).href;

const dynamicImport = new Function("specifier", "return import(specifier)");

const entries = await Promise.all(
  SUPPORTED_PROVIDERS.map(async (provider) => {
    const { project } = await dynamicImport(adapterUrl(provider));
    return [
      provider,
      createWrapperAdapter({ id: provider, version: ADAPTER_VERSION, projector: project }),
    ];
  }),
);

export const ADAPTERS = Object.freeze(Object.fromEntries(entries));

export function selectAdapter(provider) {
  const adapter = ADAPTERS[provider];
  if (!adapter) {
    throw new PlatformContractError(`no adapter registered for provider ${provider}`, {
      code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
    });
  }
  return adapter;
}
