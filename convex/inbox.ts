import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get inbox messages for a client
export const list = query({
  args: { 
    clientId: v.id("clients"),
    status: v.optional(v.union(
      v.literal("unread"), 
      v.literal("read"), 
      v.literal("pending_approval"), 
      v.literal("approved"), 
      v.literal("rejected"), 
      v.literal("archived")
    )),
    type: v.optional(v.union(
      v.literal("incoming"), 
      v.literal("ai_suggested"), 
      v.literal("system"), 
      v.literal("notification")
    )),
    limit: v.optional(v.number())
  },
  returns: v.array(v.object({
    _id: v.id("inboxMessages"),
    _creationTime: v.number(),
    clientId: v.id("clients"),
    type: v.union(v.literal("incoming"), v.literal("ai_suggested"), v.literal("system"), v.literal("notification")),
    status: v.union(
      v.literal("unread"), 
      v.literal("read"), 
      v.literal("pending_approval"), 
      v.literal("approved"), 
      v.literal("rejected"), 
      v.literal("archived")
    ),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent")),
    subject: v.optional(v.string()),
    content: v.string(),
    sender: v.optional(v.string()),
    senderEmail: v.optional(v.string()),
    contactId: v.optional(v.id("contacts")),
    campaignId: v.optional(v.id("campaigns")),
    aiConfidence: v.optional(v.number()),
    suggestedAction: v.optional(v.string()),
    originalMessageId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    readAt: v.optional(v.number()),
    processedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("profiles")),
    rejectedBy: v.optional(v.id("profiles")),
  })),
  handler: async (ctx, args) => {
    let query = ctx.db.query("inboxMessages");
    
    if (args.status) {
      query = query.withIndex("by_client_status", (q) => 
        q.eq("clientId", args.clientId).eq("status", args.status)
      );
    } else if (args.type) {
      query = query.withIndex("by_client_type", (q) => 
        q.eq("clientId", args.clientId).eq("type", args.type)
      );
    } else {
      query = query.withIndex("by_client", (q) => q.eq("clientId", args.clientId));
    }
    
    query = query.order("desc");
    
    const messages = args.limit 
      ? await query.take(args.limit)
      : await query.collect();
    
    return messages;
  },
});

// Get message by ID
export const getById = query({
  args: { id: v.id("inboxMessages") },
  returns: v.union(v.object({
    _id: v.id("inboxMessages"),
    _creationTime: v.number(),
    clientId: v.id("clients"),
    type: v.union(v.literal("incoming"), v.literal("ai_suggested"), v.literal("system"), v.literal("notification")),
    status: v.union(
      v.literal("unread"), 
      v.literal("read"), 
      v.literal("pending_approval"), 
      v.literal("approved"), 
      v.literal("rejected"), 
      v.literal("archived")
    ),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent")),
    subject: v.optional(v.string()),
    content: v.string(),
    sender: v.optional(v.string()),
    senderEmail: v.optional(v.string()),
    contactId: v.optional(v.id("contacts")),
    campaignId: v.optional(v.id("campaigns")),
    aiConfidence: v.optional(v.number()),
    suggestedAction: v.optional(v.string()),
    originalMessageId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    readAt: v.optional(v.number()),
    processedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("profiles")),
    rejectedBy: v.optional(v.id("profiles")),
  }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create new inbox message
export const create = mutation({
  args: {
    clientId: v.id("clients"),
    type: v.union(v.literal("incoming"), v.literal("ai_suggested"), v.literal("system"), v.literal("notification")),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent"))),
    subject: v.optional(v.string()),
    content: v.string(),
    sender: v.optional(v.string()),
    senderEmail: v.optional(v.string()),
    contactId: v.optional(v.id("contacts")),
    campaignId: v.optional(v.id("campaigns")),
    aiConfidence: v.optional(v.number()),
    suggestedAction: v.optional(v.string()),
    originalMessageId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("inboxMessages"),
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("inboxMessages", {
      ...args,
      status: args.type === "ai_suggested" ? "pending_approval" : "unread",
      priority: args.priority || "normal",
    });
    
    return messageId;
  },
});

// Mark message as read
export const markAsRead = mutation({
  args: { messageId: v.id("inboxMessages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "read",
      readAt: Date.now(),
    });
    return null;
  },
});

// Approve AI suggested message
export const approveMessage = mutation({
  args: { 
    messageId: v.id("inboxMessages"),
    approvedBy: v.optional(v.id("profiles"))
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "approved",
      processedAt: Date.now(),
      approvedBy: args.approvedBy,
    });
    
    // TODO: Implement actual message sending logic here
    // This would integrate with email/LinkedIn APIs to send the approved message
    
    return null;
  },
});

// Reject AI suggested message
export const rejectMessage = mutation({
  args: { 
    messageId: v.id("inboxMessages"),
    rejectedBy: v.optional(v.id("profiles"))
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "rejected",
      processedAt: Date.now(),
      rejectedBy: args.rejectedBy,
    });
    return null;
  },
});

// Archive message
export const archiveMessage = mutation({
  args: { messageId: v.id("inboxMessages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "archived",
    });
    return null;
  },
});

// Get inbox statistics
export const getStats = query({
  args: { clientId: v.id("clients") },
  returns: v.object({
    total: v.number(),
    unread: v.number(),
    pending_approval: v.number(),
    ai_suggested: v.number(),
    high_priority: v.number(),
    urgent: v.number(),
  }),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("inboxMessages")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();
    
    const stats = {
      total: messages.length,
      unread: messages.filter(m => m.status === "unread").length,
      pending_approval: messages.filter(m => m.status === "pending_approval").length,
      ai_suggested: messages.filter(m => m.type === "ai_suggested").length,
      high_priority: messages.filter(m => m.priority === "high").length,
      urgent: messages.filter(m => m.priority === "urgent").length,
    };
    
    return stats;
  },
});

// Bulk actions
export const bulkMarkAsRead = mutation({
  args: { 
    clientId: v.id("clients"),
    messageIds: v.array(v.id("inboxMessages"))
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify all messages belong to the client for security
    for (const messageId of args.messageIds) {
      const message = await ctx.db.get(messageId);
      if (!message || message.clientId !== args.clientId) {
        throw new Error("Unauthorized access to message");
      }
      
      await ctx.db.patch(messageId, {
        status: "read",
        readAt: Date.now(),
      });
    }
    
    return null;
  },
});

export const bulkArchive = mutation({
  args: { 
    clientId: v.id("clients"),
    messageIds: v.array(v.id("inboxMessages"))
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify all messages belong to the client for security
    for (const messageId of args.messageIds) {
      const message = await ctx.db.get(messageId);
      if (!message || message.clientId !== args.clientId) {
        throw new Error("Unauthorized access to message");
      }
      
      await ctx.db.patch(messageId, {
        status: "archived",
      });
    }
    
    return null;
  },
});

// Helper function to create system notifications
export const createSystemNotification = mutation({
  args: {
    clientId: v.id("clients"),
    subject: v.string(),
    content: v.string(),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent"))),
    metadata: v.optional(v.any()),
  },
  returns: v.id("inboxMessages"),
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("inboxMessages", {
      clientId: args.clientId,
      type: "system",
      status: "unread",
      priority: args.priority || "normal",
      subject: args.subject,
      content: args.content,
      sender: "Buildrs Systeem",
      metadata: args.metadata,
    });
    
    return messageId;
  },
});

// Helper function to create AI suggested messages
export const createAISuggestion = mutation({
  args: {
    clientId: v.id("clients"),
    subject: v.string(),
    content: v.string(),
    suggestedAction: v.string(),
    aiConfidence: v.number(),
    contactId: v.optional(v.id("contacts")),
    campaignId: v.optional(v.id("campaigns")),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent"))),
    metadata: v.optional(v.any()),
  },
  returns: v.id("inboxMessages"),
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("inboxMessages", {
      clientId: args.clientId,
      type: "ai_suggested",
      status: "pending_approval",
      priority: args.priority || "normal",
      subject: args.subject,
      content: args.content,
      suggestedAction: args.suggestedAction,
      aiConfidence: args.aiConfidence,
      contactId: args.contactId,
      campaignId: args.campaignId,
      sender: "Buildrs AI Assistant",
      metadata: args.metadata,
    });
    
    return messageId;
  },
});