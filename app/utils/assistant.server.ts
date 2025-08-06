import OpenAI from 'openai';
import axios from 'axios';
import { connectToMongo } from "../mongo.server";
import { Pinecone } from '@pinecone-database/pinecone';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.Index(process.env.PINECONE_INDEX!);

export const create_agent = async (session: any, name: string) => {
  const shopData = await fetchShopMetadata(session);
  const collections_products = await fetchCollectionsOnly(session);
  const flattenedCollections = flattenShopifyCollections(collections_products);
  console.log('🔍 Create Agent Shop Data:', shopData);
  const policies = await fetchShopPolicies(session);
  console.log('🔍 Create Agent Policies:', policies);
  const product_data = await fetchAllProducts(session);
  console.log('🔍 Create Agent Product Data:');
  await embedStoreContextToPinecone({ shop: session.shop, shopData, policies, collections: flattenedCollections, products: product_data });
  console.log('🔍 Embedded Store Context to Pinecone');

  const assistant_id = await createAssistantForStore(shopData );
  console.log('🔍 Created Assistant:', assistant_id);
  // update mongo with assistant id
  const db = await connectToMongo();
  const assistantsCollection = db.collection('ShopifyStore');
  await assistantsCollection.updateOne(
    { shopify_domain: session.shop }, 
    { 
      $set: { 
        openai_assistant_id: assistant_id,
        agents_enabled: true,
        deleted: false,
        last_agent_activity: new Date()
      },
      $push: {
        agents: { 
          openai_assistant_id: assistant_id, 
          status: "active", 
          created_at: new Date() 
        }
      } as any
    }
  );
  console.log('🔍 Updated Mongo with Assistant ID');
  return null;
};

export async function createAssistantForStore(shopData: any): Promise<string> {
    const vectorSearchTool = {
      type: "function" as const,
      function: {
        name: "vectorSearch",
        description: "Searches store data using semantic vector similarity.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "User's search query, like 'What is the return policy?' or 'Do you sell red sarees?'"
            }
          },
          required: ["query"]
        }
      }
    };
  
    const assistant = await openai.beta.assistants.create({
      name: `Sales Assistant - ${shopData.name}`,
      instructions: `You are a helpful sales and support assistant for the Shopify store "${shopData.name}". Use the vectorSearch tool when a customer asks about store policies, products, or anything specific.`,
      model: "gpt-4o-mini",
      tools: [vectorSearchTool]
    });
  
    return assistant.id;
  }


export async function embedStoreContextToPinecone({
    shop,
    shopData,
    policies,
    collections,
    products
  }: {
    shop: string,
    shopData: any,
    policies: any[],
    collections: any[],
    products: any[]
  }) {
    console.log('🔍 start embedding');
  
    const combinedText = `
  Shop Name: ${shopData.name}
  Plan: ${shopData.plan_display_name || ""}
  Currency: ${shopData.currency || ""}
  Timezone: ${shopData.ianaTimezone || ""}
  
  Policies:
  ${policies.map(p => `${p.title}:
  ${stripHtml(p.body)}`).join("\n\n")}
  
  Collections:
  ${collections.map(c => c.title).join(", ")}
  
  Top Products:
  ${products.map(p => (
      `Title: ${p.title}\nDescription: ${stripHtml(p.bodyHtml)}\nTags: ${(p.tags || []).join(', ')}`
  )).join("\n\n")}
  `;
    console.log('🔍 before chunking');
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 100
    });
  
    const chunks = await splitter.createDocuments([combinedText]);
  
    console.log(`🔍 Chunked into ${chunks.length} segments`);
  
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].pageContent;
  
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk
      });
  
      const vector = embeddingResponse.data[0].embedding;
      console.log('🔍 vector:', vector);
      await index.upsert([{
        id: `store_context_${shop}_chunk_${i}`,
        values: vector, 
        metadata: {
          type: "store_context",
          store_id: shop,
          chunk_index: i,
          shop_name: shopData.name
        }
      }]);
    }
  
    console.log(`✅ Embedded ${chunks.length} store context chunks for ${shop} to Pinecone.`);
  }
  


export async function fetchShopPolicies(session: { shop: string; accessToken: string }) {
    try {
      const response = await axios.get(
        `https://${session.shop}/admin/api/2023-10/policies.json`,
        {
          headers: {
            'X-Shopify-Access-Token': session.accessToken,
            'Content-Type': 'application/json',
          }
        }
      );
  
      return response.data.policies; // array of policies
    } catch (error: any) {
      console.error("❌ Failed to fetch policies:", error.response?.data || error.message);
      throw error;
    }
  }

async function create_assistant(data: any, session: any, shopData: any, flattenedCollections: any) {
  const assistant = await openai.beta.assistants.create({
    name: data.shop_name,
    instructions: data.description,
    model: "gpt-4o-mini",
    tools: [{ type: "file_search" }],
    tool_resources: {
      file_search: {
        vector_store_ids: [process.env.VECTOR_STORE_ID!]
      }
    }
  });

  return assistant.id;
}

export async function fetchShopMetadata(session: any) {
  const res = await axios.get(
    `https://${session.shop}/admin/api/2023-10/shop.json`,
    {
      headers: {
        'X-Shopify-Access-Token': session.accessToken,
        'Content-Type': 'application/json'
      }
    }
  );

  return res.data.shop;
}

export async function fetchCollectionsOnly(session: any) {
  const query = `
    {
      collections(first: 150) {
        edges {
          node {
            id
            title
            handle
            updatedAt
          }
        }
      }
    }
  `;

  const response = await axios.post(
    `https://${session.shop}/admin/api/2023-10/graphql.json`,
    { query },
    {
      headers: {
        'X-Shopify-Access-Token': session.accessToken,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.data.collections.edges;
}

function flattenShopifyCollections(graphqlResponse: any) {
  return graphqlResponse.map((collectionEdge: any) => {
    const collection = collectionEdge.node;
    return {
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
      updatedAt: collection.updatedAt,
    };
  });
}

export async function fetchAllProducts(session: { shop: string; accessToken: string }) {
  const SHOP = session.shop;
  const ACCESS_TOKEN = session.accessToken;

  const allProducts: any[] = [];
  let hasNextPage = true;
  let endCursor: string | null = null;

  while (hasNextPage) {
    const query: string = `
      {
        products(first: 100${endCursor ? `, after: "${endCursor}"` : ''}) {
          pageInfo {
            hasNextPage
          }
          edges {
            cursor
            node {
              id
              title
              bodyHtml
              handle
              vendor
              productType
              createdAt
              updatedAt
              publishedAt
              templateSuffix
              status
              tags
              images(first: 10) {
                edges {
                  node {
                    id
                    altText
                    src
                  }
                }
              }
              options {
                id
                name
                values
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    inventoryQuantity
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await axios.post(
        `https://${SHOP}/admin/api/2023-10/graphql.json`,
        { query },
        {
          headers: {
            'X-Shopify-Access-Token': ACCESS_TOKEN,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data || !response.data.data || !response.data.data.products) {
        console.error('❌ Unexpected response structure:', response.data);
        throw new Error('Invalid response structure from Shopify API');
      }

      const data = response.data.data.products;
      const edges = data.edges;

      for (const edge of edges) {
        allProducts.push(edge.node);
      }

      hasNextPage = data.pageInfo.hasNextPage;
      endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
    } catch (error: any) {
      console.error('❌ Error fetching products:', error.response?.data || error.message);
      throw error;
    }
  }

  return allProducts;
}

export async function delete_agent(session: { shop: string; accessToken: string }) {
  console.log('🗑️ Deleting Agent Data for:', session.shop);

  //fetch assistant id from mongo
  const db = await connectToMongo();
  const assistantsCollection = db.collection('ShopifyStore');
  const assistant = await assistantsCollection.findOne({ shopify_domain: session.shop });
  if (!assistant || !Array.isArray(assistant.agents)) {
    console.error('❌ No agents found for store:', session.shop);
    return null;
  }
  
  // Find latest active agent
  const latestActiveAgent = assistant.agents
    .filter(agent => agent.status === "active")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  
  if (!latestActiveAgent) {
    console.error('❌ No active assistant found for store:', session.shop);
    return null;
  }
  
  const assistantId = latestActiveAgent.openai_assistant_id;
  console.log(`🧠 Latest active assistant ID: ${assistantId}`);
  

  try {
    const indexes = await pinecone.listIndexes();
    console.log("📦 Pinecone Indexes:", indexes);
  } catch (error) {
    console.error("❌ Failed to list Pinecone indexes:", error);
    throw error;
  }
  const response = await index.query({
    topK: 1,
    vector: new Array(1536).fill(0), // dummy zero vector (match score is irrelevant here)
    filter: {
      type: "store_context",
      store_id: session.shop
    },
    includeMetadata: false
  });
  
  const exists = response.matches && response.matches.length > 0;
  
  if (exists) {
    console.log(`✅ Vectors found for store_id: ${session.shop}`);
  } else {
    console.log(`⚠️ No vectors found for store_id: ${session.shop}`);
  }
  

  // 🧹 Delete vectors from Pinecone
  try {
    // Query to get vector IDs
    const queryResponse = await index.query({
      topK: 1000,
      vector: new Array(1536).fill(0),
      filter: {
        type: "store_context",
        store_id: session.shop
      },
      includeMetadata: false
    });

    if (queryResponse.matches && queryResponse.matches.length > 0) {
      const vectorIds = queryResponse.matches.map(match => match.id);
      console.log(`🔍 Deleting ${vectorIds.length} vectors for store: ${session.shop}`);
      
      // Delete by IDs (most reliable method)
      await index.deleteMany(vectorIds);
      console.log(`✅ Successfully deleted ${vectorIds.length} vectors`);
    } else {
      console.log(`ℹ️ No vectors found for store: ${session.shop}`);
    }
  } catch (error) {
    console.error(`❌ Pinecone deletion failed:`, error);
    console.log(`⚠️ Manual cleanup required in Pinecone console`);
  }


  // 🗑️ Hard delete products from Mongo
  try {
    const db = await connectToMongo();
    const productsCollection = db.collection('Shopify_Products');
    await productsCollection.deleteMany({ store_id: session.shop });
    console.log('🗑️ Deleted Products from Mongo for:', session.shop);
  } catch (error) {
    console.error('❌ Failed to delete products from Mongo:', error);
  }

  // 📝 Update agent status to deleted and disable agents
  try {
    const db = await connectToMongo();
    const storesCollection = db.collection('ShopifyStore');
    
    // Update the latest active agent to deleted status
    await storesCollection.updateOne(
      { 
        shopify_domain: session.shop,
        "agents.openai_assistant_id": assistantId
      },
      { 
        $set: { 
          agents_enabled: false,
          deleted: true,
          deletedAt: new Date(),
          last_agent_activity: new Date(),
          "agents.$.status": "deleted",
          "agents.$.deleted_at": new Date()
        }
      }
    );
    console.log('📝 Updated agent status to deleted and disabled agents');
  } catch (error) {
    console.error('❌ Failed to update agent status:', error);
  }

  // 🧹 Delete Assistant in OpenAI
  try {
    await openai.beta.assistants.del(assistantId);
    console.log(`🧹 Deleted OpenAI Assistant with ID: ${assistantId}`);
  } catch (error) {
    console.error('❌ Failed to delete assistant in OpenAI:', error);
  }

  return null;
}

export async function pause_agent(session: { shop: string; accessToken: string }) {
  console.log('⏸️ Pausing Agent for:', session.shop);

  try {
    const db = await connectToMongo();
    const storesCollection = db.collection('ShopifyStore');
    
    // Find the latest active agent and update its status
    const storeData = await storesCollection.findOne({ shopify_domain: session.shop });
    if (storeData && storeData.agents && Array.isArray(storeData.agents)) {
      const latestActiveAgent = storeData.agents
        .filter(agent => agent.status === "active")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      if (latestActiveAgent) {
        await storesCollection.updateOne(
          { 
            shopify_domain: session.shop,
            "agents.openai_assistant_id": latestActiveAgent.openai_assistant_id
          },
          { 
            $set: { 
              agents_enabled: false,
              last_agent_activity: new Date(),
              "agents.$.status": "paused",
              "agents.$.paused_at": new Date()
            }
          }
        );
        console.log('⏸️ Agent paused successfully');
      }
    }
  } catch (error) {
    console.error('❌ Failed to pause agent:', error);
    throw error;
  }

  return null;
}
