import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const migrateCampaignColumns = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all campaigns with industryLabel
    const campaigns = await ctx.db
      .query("campaigns")
      .collect();
    
    let migratedCount = 0;
    
    for (const campaign of campaigns) {
      const doc: any = campaign;
      
      // Check if campaign has industryLabel and needs migration
      if (doc.industryLabel !== undefined) {
        // Update the campaign: move industryLabel to instantlyCampaignId and remove industryLabel
        const updateData: any = {
          instantlyCampaignId: doc.industryLabel,
        };
        
        // Remove the old field by not including it
        await ctx.db.replace(campaign._id, {
          ...campaign,
          instantlyCampaignId: doc.industryLabel,
          industryLabel: undefined, // This will remove the field
        });
        
        migratedCount++;
      }
    }
    
    return { migratedCount };
  },
});