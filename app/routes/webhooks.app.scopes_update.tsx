import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { initMongo } from "../db/mongo";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const current = payload.current as string[];

  if (session) {
    const db = await initMongo();
    await db.collection("shopify_sessions").updateOne(
      { id: session.id },
      { $set: { scope: current.toString() } }
    );
  }

  return new Response();
};
