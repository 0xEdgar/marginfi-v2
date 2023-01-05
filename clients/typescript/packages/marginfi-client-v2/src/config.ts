import { PublicKey } from "@solana/web3.js";
import { BankConfig, Environment, MarginfiConfig } from "./types";
import { array, assert, Infer, literal, object, string } from "superstruct";
import configs from "./configs.json";

const BankConfigRaw = object({
  label: string(),
  mint: string(),
  oracle: string(),
  address: string(),
});
const MarginfiConfigRaw = object({
  label: literal("devnet1"),
  cluster: string(),
  program: string(),
  group: string(),
  banks: array(BankConfigRaw),
});
const ConfigRaw = array(MarginfiConfigRaw);

export type BankConfigRaw = Infer<typeof BankConfigRaw>;
export type MarginfiConfigRaw = Infer<typeof MarginfiConfigRaw>;
export type ConfigRaw = Infer<typeof ConfigRaw>;

function parseBankConfig(bankConfigRaw: BankConfigRaw): BankConfig {
  return {
    label: bankConfigRaw.label,
    mint: new PublicKey(bankConfigRaw.mint),
    oracle: new PublicKey(bankConfigRaw.oracle),
    address: new PublicKey(bankConfigRaw.address),
  };
}

function parseConfig(configRaw: MarginfiConfigRaw): MarginfiConfig {
  return {
    environment: configRaw.label,
    cluster: configRaw.cluster,
    program: new PublicKey(configRaw.program),
    group: new PublicKey(configRaw.group),
    banks: configRaw.banks.map((raw) => parseBankConfig(raw)),
  };
}

function parseConfigs(configRaw: ConfigRaw): {
  [label: string]: MarginfiConfig;
} {
  return configRaw.reduce(
    (config, current, _) => ({
      [current.label]: parseConfig(current),
      ...config,
    }),
    {} as {
      [label: string]: MarginfiConfig;
    }
  );
}

function loadDefaultConfig(): {
  [label: string]: MarginfiConfig;
} {
  assert(configs, ConfigRaw);
  return parseConfigs(configs);
}

/**
 * Define marginfi-specific config per profile
 *
 * @internal
 */
function getMarginfiConfig(
  environment: Environment,
  overrides?: Partial<Omit<MarginfiConfig, "environment">>
): MarginfiConfig {
  const defaultConfigs = loadDefaultConfig();

  switch (environment) {
    case "devnet1":
      const defaultConfig = defaultConfigs[environment];
      return {
        environment,
        program: overrides?.program || defaultConfig.program,
        group: overrides?.group || defaultConfig.group,
        cluster: overrides?.cluster || defaultConfig.cluster,
        banks: overrides?.banks || defaultConfig.banks,
      };
    default:
      throw Error(`Unknown environment ${environment}`);
  }
}

/**
 * Retrieve config per environment
 */
export async function getConfig(
  environment: Environment,
  overrides?: Partial<Omit<MarginfiConfig, "environment">>
): Promise<MarginfiConfig> {
  return {
    ...getMarginfiConfig(environment, overrides),
  };
}
