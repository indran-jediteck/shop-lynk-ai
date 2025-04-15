import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Text,
  Banner,
  Loading,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Get existing script tags
  const response = await admin.graphql(
    `#graphql
      query {
        scriptTags(first: 10) {
          edges {
            node {
              id
              src
              displayScope
            }
          }
        }
      }`
  );

  const data = await response.json();
  return json({ 
    scriptTags: data.data.scriptTags.edges,
    appUrl: process.env.SHOPIFY_APP_URL
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "install") {
    // Create script tag
    const response = await admin.graphql(
      `#graphql
        mutation scriptTagCreate($input: ScriptTagInput!) {
          scriptTagCreate(input: $input) {
            scriptTag {
              id
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          input: {
            src: `${process.env.SHOPIFY_APP_URL}/lynk-ai.js`,
            displayScope: "ALL",
          },
        },
      }
    );

    const data = await response.json();
    
    if (data.data?.scriptTagCreate?.userErrors?.length > 0) {
      return json({ 
        status: "error",
        errors: data.data.scriptTagCreate.userErrors 
      }, { status: 400 });
    }

    return json({ 
      status: "success",
      message: "Chat widget installed successfully!" 
    });
  }

  if (action === "uninstall") {
    const scriptTagId = formData.get("scriptTagId");
    // Delete script tag
    const response = await admin.graphql(
      `#graphql
        mutation scriptTagDelete($id: ID!) {
          scriptTagDelete(id: $id) {
            deletedScriptTagId
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          id: scriptTagId,
        },
      }
    );

    const data = await response.json();
    
    if (data.data?.scriptTagDelete?.userErrors?.length > 0) {
      return json({ 
        status: "error",
        errors: data.data.scriptTagDelete.userErrors 
      }, { status: 400 });
    }

    return json({ 
      status: "success",
      message: "Chat widget uninstalled successfully!" 
    });
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function ScriptTagPage() {
  const { scriptTags, appUrl } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  const isInstalled = scriptTags.some(
    ({ node }: any) => node.src.includes("lynk-ai.js")
  );

  const handleInstall = () => {
    submit({ action: "install" }, { method: "POST" });
  };

  const handleUninstall = (scriptTagId: string) => {
    submit(
      { action: "uninstall", scriptTagId },
      { method: "POST" }
    );
  };

  return (
    <Page title="Chat Widget Installation">
      {isLoading && <Loading />}
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Store Chat Widget
                </Text>
                <Text as="p">
                  Install the chat widget on your store to enable customer support features.
                </Text>
                <Banner tone={isInstalled ? "success" : "info"}>
                  <p>
                    {isInstalled
                      ? "Chat widget is installed and active on your store."
                      : "Chat widget is not installed. Click the button below to install it."}
                  </p>
                </Banner>
                {isInstalled ? (
                  <Button
                    variant="primary"
                    tone="critical"
                    onClick={() =>
                      handleUninstall(
                        scriptTags.find(({ node }: any) =>
                          node.src.includes("lynk-ai.js")
                        ).node.id
                      )
                    }
                    loading={isLoading}
                  >
                    Uninstall Widget
                  </Button>
                ) : (
                  <Button 
                    variant="primary" 
                    onClick={handleInstall}
                    loading={isLoading}
                  >
                    Install Widget
                  </Button>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Script Details
                </Text>
                <Text as="p">
                  The chat widget script will be loaded from:
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {appUrl}/lynk-ai.js
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
