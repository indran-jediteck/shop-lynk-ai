import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  type ShopifyApp,
} from "@shopify/shopify-app-remix/server";

import { MongoDBSessionStorage } from "@shopify/shopify-app-session-storage-mongodb";

// ✅ Use the legacy constructor — pass a URL and a DB name
const mongoUrl = new URL("mongodb+srv://lynk:TJCM2BNAA60RZTEU@jediteck.mrfeliz.mongodb.net/lynk_db?retryWrites=true&w=majority");

const sessionStorage = new MongoDBSessionStorage(
  mongoUrl,
  "lynk_db"
);

export function getShopifyApp() {
  const app = shopifyApp({
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    apiVersion: ApiVersion.January25,
    scopes: process.env.SCOPES?.split(","),
    appUrl: process.env.SHOPIFY_APP_URL!,
    authPathPrefix: "/auth",
    distribution: AppDistribution.AppStore,
    sessionStorage,
    future: {
      unstable_newEmbeddedAuthStrategy: true,
      removeRest: true,
    },
    ...(process.env.SHOP_CUSTOM_DOMAIN
      ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
      : {}),
  });

  return app;
}

export const { authenticate } = getShopifyApp();
