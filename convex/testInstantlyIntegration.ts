// Test script for the Instantly API v2 integration
// Run with: npx convex run testInstantlyIntegration:testToggleCampaignStatus

import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Test function to verify the Instantly API v2 integration works correctly
 * This creates a test campaign and tests the toggle functionality with v2 endpoints
 */
export const testToggleCampaignStatus = action({
  args: {
    clientId: v.id("clients"),
    testWithRealApi: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log('🧪 Starting Instantly API integration test...');
    
    try {
      // Create a test campaign with external_id for API testing
      const testCampaignId = await ctx.runMutation("campaigns:create", {
        name: "Test Campaign - Instantly Integration",
        description: "Test campaign to verify Instantly API integration",
        type: "email",
        status: "draft",
        clientId: args.clientId,
        userId: "test-user",
      });
      
      console.log(`✅ Created test campaign: ${testCampaignId}`);
      
      // Add external_id to simulate Instantly v2 campaign
      const externalId = args.testWithRealApi ? 
        "real_instantly_v2_campaign_id" : // Replace with real Instantly v2 campaign ID for live testing
        "test_campaign_v2_123"; // Mock ID for v2 testing
      
      await ctx.runMutation("campaigns:updateEmailContent", {
        id: testCampaignId,
        external_id: externalId,
      });
      
      console.log(`✅ Added external_id: ${externalId}`);
      
      // Test 1: Activate campaign (draft -> active)
      console.log('🧪 Test 1: Activating campaign...');
      const result1 = await ctx.runMutation("campaigns:toggleCampaignStatus", {
        campaignId: testCampaignId,
      });
      
      console.log(`✅ Test 1 Result:`, result1);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 2: Pause campaign (active -> paused)
      console.log('🧪 Test 2: Pausing campaign...');
      const result2 = await ctx.runMutation("campaigns:toggleCampaignStatus", {
        campaignId: testCampaignId,
      });
      
      console.log(`✅ Test 2 Result:`, result2);
      
      // Test 3: Test with campaign without external_id
      console.log('🧪 Test 3: Testing campaign without external_id...');
      
      const testCampaignId2 = await ctx.runMutation("campaigns:create", {
        name: "Test Campaign - No External ID",
        description: "Test campaign without external_id",
        type: "email",
        status: "draft",
        clientId: args.clientId,
        userId: "test-user",
      });
      
      const result3 = await ctx.runMutation("campaigns:toggleCampaignStatus", {
        campaignId: testCampaignId2,
      });
      
      console.log(`✅ Test 3 Result (no external_id):`, result3);
      
      // Clean up test campaigns
      console.log('🧹 Cleaning up test campaigns...');
      await ctx.runMutation("campaigns:remove", { id: testCampaignId });
      await ctx.runMutation("campaigns:remove", { id: testCampaignId2 });
      
      console.log('✅ Test cleanup complete');
      
      return {
        success: true,
        message: "All Instantly API integration tests passed successfully!",
        results: {
          activateTest: result1,
          pauseTest: result2,
          noExternalIdTest: result3,
        }
      };
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      return {
        success: false,
        error: error.message,
        message: "Instantly API integration test failed",
      };
    }
  },
});

/**
 * Test the error handling when Instantly API is unreachable
 */
export const testInstantlyApiErrorHandling = action({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    console.log('🧪 Testing Instantly API error handling...');
    
    try {
      // Create test campaign with invalid external_id to trigger API error
      const testCampaignId = await ctx.runMutation("campaigns:create", {
        name: "Test Campaign - Error Handling",
        description: "Test campaign for error handling",
        type: "email",
        status: "draft",
        clientId: args.clientId,
        userId: "test-user",
      });
      
      // Add invalid external_id
      await ctx.runMutation("campaigns:updateEmailContent", {
        id: testCampaignId,
        external_id: "invalid_campaign_id_that_should_fail",
      });
      
      console.log('🧪 Attempting to toggle status with invalid external_id...');
      
      try {
        await ctx.runMutation("campaigns:toggleCampaignStatus", {
          campaignId: testCampaignId,
        });
        
        // If we get here, the test failed because it should have thrown an error
        console.log('❌ Expected error but operation succeeded');
        
        // Clean up
        await ctx.runMutation("campaigns:remove", { id: testCampaignId });
        
        return {
          success: false,
          message: "Error handling test failed - expected error but operation succeeded",
        };
        
      } catch (expectedError) {
        console.log('✅ Correctly caught expected error:', expectedError.message);
        
        // Clean up
        await ctx.runMutation("campaigns:remove", { id: testCampaignId });
        
        return {
          success: true,
          message: "Error handling test passed - correctly handled Instantly API failure",
          caughtError: expectedError.message,
        };
      }
      
    } catch (error) {
      console.error('❌ Test setup failed:', error);
      return {
        success: false,
        error: error.message,
        message: "Error handling test setup failed",
      };
    }
  },
});