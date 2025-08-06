import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { connectToMongo } from "../mongo.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.error("🚨 AUTH ROUTE FILE LOADED - THIS SHOULD BE VISIBLE");
  console.error("🚨 Request URL:", request.url);
  console.error("🚨 Request method:", request.method);
  
  console.error("🚨 About to call authenticate.admin.again..");
  
  const result = await authenticate.admin(request);
  console.log('auth is done here',result)

  // console.error("🚨 authenticate.admin result type:", typeof result);
  // console.error("🚨 authenticate.admin result:", result);
  
  // console.error("🚨 before checking if result is a Response:", result);
  // // Check if result is a Response (redirect/error) or {admin, session}
  // if (result instanceof Response) {
  //   console.error("🚨 authenticate.admin returned a Response, not {admin, session}");
  //   return result; // Return the response (redirect, etc.)
  // }
  
  // const { admin, session } = result;
  // console.error("🚨 authenticate.admin completed successfully");

  // console.error("🚨 === AUTH ROUTE TRIGGERED ===");
  // console.error("🚨 Request URL:", request.url);
  // console.error("🚨 Session exists:", !!session);
  // console.error("🚨 Shop:", session?.shop);

  // // Save store data to MongoDB when app is installed (only on callback)
  // if (session && session.shop && request.url.includes('/auth/callback')) {
  //   try {
  //     console.log("=== APP INSTALLED - SAVING TO MONGODB ===");
  //     console.log(`Shop: ${session.shop}`);
      
  //     // Fetch shop details
  //     const response = await admin.graphql(
  //       `#graphql
  //         query {
  //           shop {
  //             name
  //             email
  //             myshopifyDomain
  //             plan {
  //               displayName
  //             }
  //             currencyCode
  //             ianaTimezone
  //             createdAt
  //           }
  //         }`,
  //     );

  //     const responseJson = await response.json();
  //     const shop = responseJson.data.shop;

  //     // Connect to MongoDB and save store data
  //     const db = await connectToMongo();
  //     const storesCollection = db.collection('stores');
      
  //     await storesCollection.updateOne(
  //       { shopify_domain: session.shop },
  //       {
  //         $set: {
  //           store_id: session.shop.replace('.myshopify.com', ''),
  //           store_name: shop.name,
  //           shopify_domain: session.shop,
  //           storefront_url: `https://www.${session.shop.replace('.myshopify.com', '')}.com`,
  //           access_token: session.accessToken,
  //           sync_config: {
  //             enabled: true,
  //             last_sync: new Date(),
  //             sync_frequency: 'daily'
  //           },
  //           ai_config: {
  //             enabled: false,
  //             model: 'default',
  //             features: []
  //           },
  //           branding: {
  //             logo_url: null,
  //             primary_color: '#000000',
  //             secondary_color: '#ffffff'
  //           },
  //           payment_config: {
  //             enabled: false,
  //             provider: null,
  //             settings: {}
  //           },
  //           compliance: {
  //             gdpr_compliant: false,
  //             data_retention_days: 30,
  //             privacy_policy_url: null
  //           },
  //           status: 'active',
  //           created_at: new Date(),
  //           updated_at: new Date()
  //         }
  //       },
  //       { upsert: true }
  //     );
      
  // //     console.log(`✅ Store data saved to MongoDB for ${session.shop}`);
  //   } catch (error) {
  //     console.error("❌ Failed to save store data to MongoDB:", error);
  //     console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
  //   }
  // } 

  return null;
}; 