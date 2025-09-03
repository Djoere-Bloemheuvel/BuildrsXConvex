import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const linkAutomationToTemplate = mutation({
  args: {
    automationId: v.string(),
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the automation
    const automation = await ctx.db.get(args.automationId as any);
    if (!automation) {
      throw new Error("Automation not found");
    }

    // Get the template to validate it exists
    const template = await ctx.db.get(args.templateId as any);
    if (!template) {
      throw new Error("Template not found");
    }

    // Update the automation with template link
    await ctx.db.patch(args.automationId as any, {
      templateId: args.templateId,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      automation: {
        ...automation,
        templateId: args.templateId,
      },
      template: template,
    };
  },
});