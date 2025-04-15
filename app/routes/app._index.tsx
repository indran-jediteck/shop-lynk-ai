import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Card, Layout, Page, Text, BlockStack, Button, Box, InlineStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { ChatWidget } from "../components/ChatWidget";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const meta: MetaFunction = () => {
  return [
    { title: "Shop Lynk AI" },
    { name: "description", content: "AI-powered customer service for your Shopify store" },
  ];
};

export default function Index() {
  return (
    <Page title="Overview" secondaryActions={[
      { content: "0 unread messages", icon: "💬" }
    ]}>
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Online Store Chat Card */}
            <Card padding="400">
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <BlockStack gap="200">
                    <InlineStack gap="300" align="start">
                      <Text as="h2" variant="headingMd">Online store chat</Text>
                      <Text as="span" tone="subdued">Off</Text>
                    </InlineStack>
                  </BlockStack>
                  <Button url="/app/script-tag">Turn on chat</Button>
                </InlineStack>
                <Text as="p" tone="subdued">
                  Turn on store chat to answer customer questions
                </Text>
              </BlockStack>
            </Card>

            {/* Get More Out of Inbox Card */}
            <Card padding="400">
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Get more out of Inbox</Text>
                <Text as="p" tone="subdued">
                  Help customers faster and give them better chat experience.
                </Text>

                {/* Magic Feature Card */}
                <Card background="bg-surface-secondary" padding="400">
                  <InlineStack gap="600" align="start">
                    {/* Left side - Chat illustration */}
                    <div style={{
                      width: "40%",
                      minWidth: "200px",
                      background: "var(--p-color-bg-surface-secondary)",
                      borderRadius: "var(--p-border-radius-200)",
                      padding: "var(--p-space-400)"
                    }}>
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px"
                      }}>
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            style={{
                              background: "white",
                              padding: "16px",
                              borderRadius: "10px",
                              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px"
                            }}
                          >
                            <span style={{ color: "var(--p-color-text-secondary)" }}>✨</span>
                            <div style={{
                              flex: 1,
                              height: "8px",
                              background: "var(--p-color-bg-surface-secondary)",
                              borderRadius: "4px"
                            }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right side - Content */}
                    <BlockStack gap="400">
                      <Text as="h3" variant="headingMd">
                        Give better customer service with Shopify Magic
                      </Text>
                      <Text as="p">
                        Use Shopify Magic to identify common customer questions and generate instant answers tailored to your store.
                      </Text>
                      <InlineStack gap="300">
                        <Button>Manage instant answers</Button>
                        <Button variant="plain">Learn more</Button>
                      </InlineStack>
                    </BlockStack>
                  </InlineStack>
                </Card>
              </BlockStack>
            </Card>

            {/* Learn More Link */}
            <Box padding="400">
              <Text as="p" alignment="center">
                Learn more about{" "}
                <Button variant="plain" url="https://shopify.com/inbox">
                  Shopify Inbox
                </Button>
              </Text>
            </Box>
          </BlockStack>
        </Layout.Section>
      </Layout>
      <ChatWidget />
    </Page>
  );
}
