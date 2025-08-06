import { connectToMongo } from "../mongo.server";

export const storeShopDetails = async (shop: any, accessToken: string) => {
  const db = await connectToMongo();
  const storesCollection = db.collection('ShopifyStore');

  try {
    const existingStore = await storesCollection.findOne(
      { shopify_domain: shop.myshopifyDomain },
      { projection: { _id: 1 } }
    );

    if (!existingStore) {
      console.log(`✨ New installation for ${shop.myshopifyDomain}. Running one-time setup...`);

      await storesCollection.updateOne(
        { shopify_domain: shop.myshopifyDomain },
        {
          $set: {
            store_id: shop.myshopifyDomain.replace('.myshopify.com', ''),
            store_name: shop.name,
            shopify_domain: shop.myshopifyDomain,
            email: shop.email,
            phone: shop.phone,
            country: shop.country,
            province: shop.province,
            city: shop.city,
            zip: shop.zip,
            address1: shop.address1,
            address2: shop.address2,
            currency: shop.currencyCode,
            timezone: shop.ianaTimezone,
            storefront_url: `https://www.${shop.myshopifyDomain.replace('.myshopify.com', '')}.com`,
            access_token: accessToken,
            sync_config: { enabled: true, last_sync: new Date(), sync_frequency: 'daily' },
            ai_config: { enabled: false, model: 'default', features: [] },
            branding: {
              logo_url: "https://cdn.jcsfashions.com/logo.png",
              primary_color: "#B71C1C",
              support_email: shop.email,
              timezone: shop.ianaTimezone,
            },
            payment_config: {
              currency: shop.currencyCode,
              checkout_type: "Shopify",
              price_includes_tax: shop.taxesIncluded,
            },
            compliance: {
              gdpr: true,
              data_retention_days: 90,
            },
            status: 'active',
            created_at: new Date(shop.createdAt),
            updated_at: new Date()
          }
        },
        { upsert: true }
      );

      console.log(`✅ One-time setup complete for ${shop.myshopifyDomain}.`);
    } else {
      console.log(`✅ App loaded for existing store ${shop.myshopifyDomain}. Refreshing details...`);
      await storesCollection.updateOne(
        { shopify_domain: shop.myshopifyDomain },
        {
          $set: {
            access_token: accessToken,
            status: 'active',
            updated_at: new Date(),
            store_name: shop.name,
            'branding.support_email': shop.email,
            'branding.timezone': shop.ianaTimezone,
            'payment_config.currency': shop.currencyCode,
            'payment_config.price_includes_tax': shop.taxesIncluded,
          }
        }
      );
    }
  } catch (error) {
    console.error('❌ Error storing shop details:', error);
    throw error;
  }
};
