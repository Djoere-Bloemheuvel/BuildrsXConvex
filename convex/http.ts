import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Simple test endpoint
http.route({
  path: "/test",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response("Hello World from Convex!", { status: 200 });
  }),
});

// HTTP endpoint for N8N campaign updates
http.route({
  path: "/update-campaigns",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Parse request body
      const body = await request.text();
      const data = JSON.parse(body);
      
      console.log("=� Campaign HTTP Request received:", data);
      
      // Handle both array and single object
      const campaignData = Array.isArray(data) ? data[0] : data;
      
      // Validate required fields
      if (!campaignData.campaign_id) {
        return new Response(
          JSON.stringify({ error: "Campaign ID is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Call the updateEmailContent mutation
      const result = await ctx.runMutation(api.campaigns.updateEmailContent, {
        id: campaignData.campaign_id,
        email_a: campaignData.emailA,
        subject_a: campaignData.subjectA,
        followup_a: campaignData.followupA,
        email_b: campaignData.emailB,
        subject_b: campaignData.subjectB,
        followup_b: campaignData.followupB,
        companySummary: campaignData.companySummary,
        shortCompanySummary: campaignData.shortCompanySummary,
        external_id: campaignData.external_id || campaignData.company_id || campaignData.instantly_id
      });
      
      return new Response(
        JSON.stringify({ success: true, result }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
      
    } catch (error) {
      console.error("=� Campaign HTTP Error:", error);
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : "Internal error" 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;