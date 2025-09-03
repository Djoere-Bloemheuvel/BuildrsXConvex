import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Create test messages for inbox development
export const createTestMessages = mutation({
  args: { clientId: v.id("clients") },
  returns: v.array(v.id("inboxMessages")),
  handler: async (ctx, args) => {
    const testMessages = [
      // Incoming message
      {
        clientId: args.clientId,
        type: "incoming" as const,
        status: "unread" as const,
        priority: "high" as const,
        subject: "Interesse in jullie dienstverlening",
        content: "Hallo,\n\nIk heb jullie website bekeken en ben geïnteresseerd in jullie LinkedIn marketing diensten. Kunnen we een afspraak inplannen om dit verder te bespreken?\n\nMet vriendelijke groet,\nPiet Janssen\nMarketing Manager bij TechCorp",
        sender: "Piet Janssen",
        senderEmail: "p.janssen@techcorp.nl",
        metadata: {
          source: "contact_form",
          utm_source: "google",
          utm_campaign: "linkedin_marketing"
        }
      },
      // AI suggested response
      {
        clientId: args.clientId,
        type: "ai_suggested" as const,
        status: "pending_approval" as const,
        priority: "normal" as const,
        subject: "Re: Interesse in jullie dienstverlening",
        content: "Beste Piet,\n\nHartelijk dank voor je interesse in onze LinkedIn marketing diensten! Ik zou graag met je in gesprek gaan om te kijken hoe wij TechCorp kunnen helpen met jullie LinkedIn strategie.\n\nIk heb komende week nog ruimte op dinsdag 14:00 of vrijdag 10:00. Welk moment past jou het beste?\n\nMet vriendelijke groet,\nBuildrs Team",
        suggestedAction: "Verstuur dit antwoord naar Piet Janssen om een afspraak in te plannen",
        aiConfidence: 0.92,
        originalMessageId: "msg_001",
        metadata: {
          template_used: "response_inquiry",
          generated_at: Date.now()
        }
      },
      // System notification
      {
        clientId: args.clientId,
        type: "system" as const,
        status: "unread" as const,
        priority: "normal" as const,
        subject: "LinkedIn campagne gestart",
        content: "Je LinkedIn campagne 'Q1 Tech Leads' is succesvol gestart.\n\n✅ 50 connectieverzoeken gepland\n✅ 150 contacts toegevoegd aan targeting\n✅ Dagelijkse limiet: 10 connectieverzoeken\n\nDe campagne draait automatisch en je ontvangt dagelijks updates over de voortgang.",
        sender: "Buildrs Systeem",
        metadata: {
          campaign_id: "camp_123",
          auto_generated: true
        }
      },
      // AI suggestion for follow-up
      {
        clientId: args.clientId,
        type: "ai_suggested" as const,
        status: "pending_approval" as const,
        priority: "urgent" as const,
        subject: "Follow-up voorstel voor Sarah de Vries",
        content: "Sarah de Vries van InnovateCorp heeft 3 weken geleden interesse getoond maar nog niet gereageerd op je laatste bericht.\n\nVoorgesteld follow-up bericht:\n\n\"Hoi Sarah,\n\nIk wilde nog even checken of je nog interesse hebt in onze LinkedIn marketing aanpak. Ik zag dat InnovateCorp recent is gegroeid naar 50+ medewerkers - perfect timing voor professionele LinkedIn strategie!\n\nZullen we kort bellen deze week?\n\nGroet,\n[Jouw naam]\"",
        suggestedAction: "Verstuur follow-up bericht naar Sarah de Vries",
        aiConfidence: 0.85,
        metadata: {
          contact_id: "contact_456",
          last_interaction: Date.now() - (21 * 24 * 60 * 60 * 1000), // 21 days ago
          follow_up_type: "cold_outreach"
        }
      },
      // Notification about credits
      {
        clientId: args.clientId,
        type: "notification" as const,
        status: "unread" as const,
        priority: "high" as const,
        subject: "Credits bijna op - LinkedIn campagnes",
        content: "Je LinkedIn credits zijn bijna op!\n\n🔥 Huidige status:\n• 12 LinkedIn credits over\n• Geschat 3 dagen gebruik\n• 2 actieve campagnes draaien\n\n💡 Tip: Vul je credits aan om je campagnes soepel te laten doorlopen.",
        sender: "Buildrs Billing",
        metadata: {
          credits_remaining: 12,
          estimated_days: 3,
          alert_type: "low_credits"
        }
      },
      // AI content suggestion
      {
        clientId: args.clientId,
        type: "ai_suggested" as const,
        status: "pending_approval" as const,
        priority: "low" as const,
        subject: "Content idee: LinkedIn post over automation trends",
        content: "Ik heb een trending topic gespot die perfect past bij je doelgroep:\n\n📈 'Marketing Automation in 2024'\n\nVoorgestelde LinkedIn post:\n\n\"🚀 Marketing automation is niet meer wegdenken uit 2024!\n\nDe beste tools die ik dit jaar ben tegengekomen:\n→ LinkedIn automation voor lead gen\n→ Email sequencing voor nurturing  \n→ CRM integraties voor sales teams\n\nWat is jouw favoriete automation tool? 👇\n\n#MarketingAutomation #LinkedIn #B2B\"",
        suggestedAction: "Deel deze LinkedIn post om engagement te verhogen",
        aiConfidence: 0.78,
        metadata: {
          content_type: "linkedin_post",
          trending_score: 8.5,
          engagement_prediction: "high"
        }
      }
    ];

    const messageIds = [];
    for (const message of testMessages) {
      const id = await ctx.db.insert("inboxMessages", message);
      messageIds.push(id);
    }

    return messageIds;
  },
});

// Clear all test messages (for development)
export const clearTestMessages = mutation({
  args: { clientId: v.id("clients") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("inboxMessages")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    return messages.length;
  },
});