import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  Badge,
  TextField,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { connectToMongo } from "../mongo.server";
import { Form } from "@remix-run/react";
import { storeShopDetails } from "../utils/store.server";

//function to connect to mongo and store the shop details
// const storeShopDetails = async (shop: any, accessToken: string) => {
//   const db = await connectToMongo();
//   const storesCollection = db.collection('ShopifyStore');
//   //console.log('i am storing shop details',shop)
//   try {
//     const existingStore = await storesCollection.findOne(
//       { shopify_domain: shop.myshopifyDomain },
//       { projection: { _id: 1 } }
//     );

//     if (!existingStore) {
//       console.log(`✨ New installation for ${shop.myshopifyDomain}. Running one-time setup...`);
      
//       await storesCollection.updateOne(
//         { shopify_domain: shop.myshopifyDomain },
//         {
//           $set: {
//             store_id: shop.myshopifyDomain.replace('.myshopify.com', ''),
//             store_name: shop.name,
//             shopify_domain: shop.myshopifyDomain,
//             email: shop.email,
//             phone: shop.phone,
//             country: shop.country,
//             province: shop.province,
//             city: shop.city,
//             zip: shop.zip,
//             address1: shop.address1,
//             address2: shop.address2,
//             currency: shop.currencyCode,
//             timezone: shop.ianaTimezone,
//             storefront_url: `https://www.${shop.myshopifyDomain.replace('.myshopify.com', '')}.com`,
//             access_token: accessToken,
//             sync_config: { enabled: true, last_sync: new Date(), sync_frequency: 'daily' },
//             ai_config: { enabled: false, model: 'default', features: [] },
//             branding: {
//               logo_url: "https://cdn.jcsfashions.com/logo.png",
//               primary_color: "#B71C1C",
//               support_email: shop.email,
//               timezone: shop.ianaTimezone,
//             },
//             payment_config: {
//               currency: shop.currencyCode,
//               checkout_type: "Shopify",
//               price_includes_tax: shop.taxesIncluded,
//             },
//             compliance: {
//               gdpr: true,
//               data_retention_days: 90,
//             },
//             status: 'active',
//             created_at: new Date(shop.createdAt),
//             updated_at: new Date()
//           }
//         },
//         { upsert: true }
//       );
      
//       console.log(`✅ One-time setup complete for ${shop.myshopifyDomain}.`);
//     } else {
//       console.log(`✅ App loaded for existing store ${shop.myshopifyDomain}. Refreshing details...`);
//       await storesCollection.updateOne(
//         { shopify_domain: shop.myshopifyDomain },
//         {
//           $set: {
//             access_token: accessToken,
//             status: 'active',
//             updated_at: new Date(),
//             store_name: shop.name,
//             'branding.support_email': shop.email,
//             'branding.timezone': shop.ianaTimezone,
//             'payment_config.currency': shop.currencyCode,
//             'payment_config.price_includes_tax': shop.taxesIncluded,
//           }
//         }
//       );
//     }
//   } catch (error) {
//     console.error('Error storing shop details',error)
//   }
// }

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      query {
        shop {
          name
          email
          myshopifyDomain
          plan {
            displayName
          }
          currencyCode
          ianaTimezone
          createdAt
          taxesIncluded
        }
        products(first: 250) {
          pageInfo {
            hasNextPage
          }
          nodes {
            id
          }
        }
      }`,
  );

  const responseJson = await response.json();
  const shop = responseJson.data.shop;
  const products = responseJson.data.products;
  
  // Count products by counting the nodes
  const productCount = products.nodes.length;
  
  // If there are more products, we'll need to make additional requests
  // For now, we'll show the count of products we can see (up to 250)
  const hasMoreProducts = products.pageInfo.hasNextPage;

  if (session.accessToken) {
    await storeShopDetails(shop, session.accessToken);
  }

  // Fetch agent data from MongoDB
  let agentData = null;
  try {
    const db = await connectToMongo();
    const storesCollection = db.collection('ShopifyStore');
    const storeData = await storesCollection.findOne({ shopify_domain: session.shop });
    
    if (storeData && storeData.agents && Array.isArray(storeData.agents)) {
      // Get the latest agent
      const latestAgent = storeData.agents
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      agentData = {
        lastAgentCreated: latestAgent?.created_at,
        lastAgentStatus: latestAgent?.status,
        agentsEnabled: storeData.agents_enabled,
        totalAgents: storeData.agents?.length || 0
      };
    }
  } catch (error) {
    console.error('Error fetching agent data:', error);
  }

  return { 
    shop, 
    productCount, 
    hasMoreProducts, 
    agentData 
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("_intent");

  if (intent === "create_agent") {
    await create_agent(session, "Product Training Agent");
  } else if (intent === "delete_agent") {
    console.log("delete_agent");
    if (session.accessToken) {
      const agentName = form.get("name");
      if (agentName && typeof agentName === "string") {
        await delete_agent({ shop: session.shop, accessToken: session.accessToken });
      }
    }
  } else if (intent === "pause_agent") {
    console.log("pause_agent");
    if (session.accessToken) {
      await pause_agent({ shop: session.shop, accessToken: session.accessToken });
    }
  } else if (intent === "update_shop_name") {
    console.log("update_shop_name");
    //await updateShopName(session.shop, form.get("shop_name"));
  }

  return redirect("/app");
};

export default function Index() {
  const fetcher = useFetcher<typeof action>();
  const { shop, productCount, hasMoreProducts, agentData } = useLoaderData<typeof loader>();
  const [shopName, setShopName] = useState(shop.name);
  const [agentColor, setAgentColor] = useState("#000000");
  const shopify = useAppBridge();
  
  // Simple loading state - disable all buttons when any form is submitting
  const isLoading = fetcher.state === "submitting";
  
  const productId = fetcher.data?.product?.id.replace("gid://shopify/Product/", "");

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId, shopify]);
  const generateProduct = () => fetcher.submit({}, { method: "POST" });

  return (
    <Page fullWidth>
      <TitleBar title="Shop Lynk AI" />
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1 }}>
                <BlockStack gap="500">
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Congrats on Installing LynkAI your AI Sales and Support Agent for your Store 🎉
                    </Text>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Total Products in Store
                      </Text>
                      <Badge tone="success">{productCount}</Badge>
                    </InlineStack>
                  </BlockStack>
                  
                  {/* Simple Loading Message */}
                  {isLoading && (
                    <Box padding="400">
                      <Text variant="bodyMd" fontWeight="bold">
                        🔄 Processing... Please wait
                      </Text>
                    </Box>
                  )}
                  
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">
                      Get started with products Training
                    </Text>
                    <BlockStack gap="200">
                      <fetcher.Form method="post" action="/agents">
                        <input type="hidden" name="_intent" value="create_agent" />
                        <input type="hidden" name="name" value="Product Training Agent" />
                        <Button 
                          loading={isLoading} 
                          disabled={isLoading}
                          submit
                        >
                          Create / Refresh Agent
                        </Button>
                      </fetcher.Form>
                      <fetcher.Form method="post" action="/agents">
                        <input type="hidden" name="_intent" value="pause_agent" />
                        <input type="hidden" name="name" value="Pause Current Agent" />
                        <Button 
                          loading={isLoading}
                          disabled={isLoading}
                          submit
                        >
                          Pause Agent, this will take a while to complete.
                        </Button>
                      </fetcher.Form>
                      <fetcher.Form method="post" action="/agents">
                        <input type="hidden" name="_intent" value="delete_agent" />
                        <input type="hidden" name="name" value="Product Deleting Agent" />
                        <Button 
                          loading={isLoading}
                          disabled={isLoading}
                          submit
                        >
                          Delete Agent, this will take a while to complete.
                        </Button>
                      </fetcher.Form>
                      {fetcher.data?.product && (
                        <Button
                          url={`shopify:admin/products/${productId}`}
                          target="_blank"
                          variant="plain"
                        >
                          View product
                        </Button>
                      )}
                    </BlockStack>
                  </BlockStack>
                  
                  {fetcher.data?.product && (
                    <>
                      <Text as="h3" variant="headingMd">
                        {" "}
                        productCreate mutation
                      </Text>
                      <Box
                        padding="400"
                        background="bg-surface-active"
                        borderWidth="025"
                        borderRadius="200"
                        borderColor="border"
                        overflowX="scroll"
                      >
                        <pre style={{ margin: 0 }}>
                          <code>
                            {JSON.stringify(fetcher.data.product, null, 2)}
                          </code>
                        </pre>
                      </Box>
                      <Text as="h3" variant="headingMd">
                        {" "}
                        productVariantsBulkUpdate mutation
                      </Text>
                      <Box
                        padding="400"
                        background="bg-surface-active"
                        borderWidth="025"
                        borderRadius="200"
                        borderColor="border"
                        overflowX="scroll"
                      >
                        <pre style={{ margin: 0 }}>
                          <code>
                            {JSON.stringify(fetcher.data.variant, null, 2)}
                          </code>
                        </pre>
                      </Box>
                    </>
                  )}
                </BlockStack>
              </div>
            </div>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <Card>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1 }}>
                <BlockStack gap="500">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">
                      Shop Details
                    </Text>
                    <Box padding="400">
                      <BlockStack gap="300">
                        <InlineStack align="space-between">
                          <Text as="span" variant="bodyMd">
                            Shop Name
                          </Text>
                          <Text as="span" variant="bodyMd" fontWeight="bold">
                            {shop.name}
                          </Text>
                        </InlineStack>
                        <InlineStack align="space-between">
                          <Text as="span" variant="bodyMd">
                            Domain
                          </Text>
                          <Text as="span" variant="bodyMd" fontWeight="bold">
                            {shop.myshopifyDomain}
                          </Text>
                        </InlineStack>
                        <InlineStack align="space-between">
                          <Text as="span" variant="bodyMd">
                            Plan
                          </Text>
                          <Badge>{shop.plan.displayName}</Badge>
                        </InlineStack>
                        <InlineStack align="space-between">
                          <Text as="span" variant="bodyMd">
                            Currency
                          </Text>
                          <Text as="span" variant="bodyMd" fontWeight="bold">
                            {shop.currencyCode}
                          </Text>
                        </InlineStack>
                        <InlineStack align="space-between">
                          <Text as="span" variant="bodyMd">
                            Timezone
                          </Text>
                          <Text as="span" variant="bodyMd" fontWeight="bold">
                            {shop.ianaTimezone}
                          </Text>
                        </InlineStack>
                        <InlineStack align="space-between">
                          <Text as="span" variant="bodyMd">
                            App Installed
                          </Text>
                          <Text as="span" variant="bodyMd" fontWeight="bold">
                            {new Date(shop.createdAt).toLocaleDateString()}
                          </Text>
                        </InlineStack>
                        {agentData && (
                          <>
                            <InlineStack align="space-between">
                              <Text as="span" variant="bodyMd">
                                Agent Status
                              </Text>
                              <Badge tone={agentData.lastAgentStatus === "active" ? "success" : "warning"}>
                                {agentData.lastAgentStatus || "No Agent"}
                              </Badge>
                            </InlineStack>
                            <InlineStack align="space-between">
                              <Text as="span" variant="bodyMd">
                                Agents Enabled
                              </Text>
                              <Badge tone={agentData.agentsEnabled ? "success" : "critical"}>
                                {agentData.agentsEnabled ? "Yes" : "No"}
                              </Badge>
                            </InlineStack>
                            {agentData.lastAgentCreated && (
                              <InlineStack align="space-between">
                                <Text as="span" variant="bodyMd">
                                  Last Agent Created
                                </Text>
                                <Text as="span" variant="bodyMd" fontWeight="bold">
                                  {new Date(agentData.lastAgentCreated).toLocaleDateString()}
                                </Text>
                              </InlineStack>
                            )}
                            <InlineStack align="space-between">
                              <Text as="span" variant="bodyMd">
                                Total Agents Created
                              </Text>
                              <Badge>{agentData.totalAgents}</Badge>
                            </InlineStack>
                          </>
                        )}
                      </BlockStack>
                    </Box>
                  </BlockStack>
                </BlockStack>
              </div>
            </div>
          </Card>
        </Layout.Section>
        {/* <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Agent Details
              </Text>
              <Form method="post">
                <input type="hidden" name="_intent" value="update_shop_name" />
                <TextField
                  label="Shop Name"
                  name="shop_name"
                  value={shopName}
                  onChange={(value) => setShopName(value)}
                  autoComplete="off"
                />
                {/* add text field for choosing fore ground color and background color and text color and bubble color of the agent */}
                {/*<TextField
                  label="Agent Color"
                  name="agent_color"
                  value={agentColor}
                  onChange={(value) => setAgentColor(value)}
                  autoComplete="off"
                />
                <TextField
                  label="Text Color"
                  name="agent_color"
                  value={agentColor}
                  onChange={(value) => setAgentColor(value)}
                  autoComplete="off"
                /> 
                <TextField  
                  label="Bubble Color"  
                  name="background_color"
                  value={agentColor}
                  onChange={(value) => setAgentColor(value)}
                  autoComplete="off"
                />

                <Button submit variant="primary">Save</Button>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>*/}







      </Layout>
      
      {/* Add CSS for progress animation */}
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </Page>
  );
}
