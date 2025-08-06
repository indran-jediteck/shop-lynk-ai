import { authenticate } from "../shopify.server";
import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from "@remix-run/node";
import { create_agent, delete_agent } from "../utils/assistant.server";

// Add a loader function to handle GET requests
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Redirect GET requests to the main app page
  return redirect("/app");
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
