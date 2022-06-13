import { env } from "process";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

export const envConfig = {
  databaseUrl: getRequired("DATABASE_URL"),
  godwokenJsonRpc: getRequired("GODWOKEN_JSON_RPC"),
  newRelicLicenseKey: getOptional("NEW_RELIC_LICENSE_KEY"),
  clusterCount: getOptional("CLUSTER_COUNT"),
  redisUrl: getOptional("REDIS_URL"),
  pgPoolMax: getOptional("PG_POOL_MAX"),
  gasPriceCacheSeconds: getOptional("GAS_PRICE_CACHE_SECONDS"),
  extraEstimateGas: getOptional("EXTRA_ESTIMATE_GAS"),
  sentryDns: getOptional("SENTRY_DNS"),
  sentryEnvironment: getOptional("SENTRY_ENVIRONMENT"),
  godwokenReadonlyJsonRpc: getOptional("GODWOKEN_READONLY_JSON_RPC"),
  enableCacheEthCall: getOptional("ENABLE_CACHE_ETH_CALL"),
  logLevel: getOptional("LOG_LEVEL"),
  logFormat: getOptional("LOG_FORMAT"),
  logRequestBody: getOptional("WEB3_LOG_REQUEST_BODY"),
  port: getOptional("PORT"),
  minGasPrice: getOptional("MIN_GAS_PRICE"),
};

function getRequired(name: string): string {
  const value = env[name];
  if (value == null) {
    throw new Error(`no env ${name} provided`);
  }

  return value;
}

function getOptional(name: string): string | undefined {
  return env[name];
}
