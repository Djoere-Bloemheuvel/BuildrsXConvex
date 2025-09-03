# 🚀 Instantly API Integration Guide

## 📋 Overview

The campaign status toggle feature now includes production-ready integration with the Instantly API. This ensures that when users activate or pause campaigns in the UI, the corresponding Instantly campaigns are automatically synchronized.

## 🔧 Setup Requirements

### 1. Environment Variables

The integration requires the `INSTANTLY_API_KEY` environment variable to be set in Convex:

```bash
# Set the Instantly API key in Convex environment
npx convex env set INSTANTLY_API_KEY "your_real_instantly_api_key_here"

# Verify it's set correctly
npx convex env list
```

### 2. Campaign Configuration

For campaigns to be synchronized with Instantly, they must have an `external_id` field set to the Instantly campaign ID:

```typescript
// When creating or updating a campaign
await ctx.runMutation("campaigns:updateEmailContent", {
  id: campaignId,
  external_id: "your_instantly_campaign_id", // This links to Instantly
});
```

## 🔄 How It Works

### Atomic Operation Flow

The `toggleCampaignStatus` mutation follows this atomic operation pattern:

1. **Get Campaign**: Retrieve campaign details from database
2. **Determine New Status**: Calculate whether to activate or pause
3. **Call Instantly API First**: Make the API call to Instantly (if `external_id` exists)
4. **Update Local Status**: Only update local database if API call succeeded

### API Endpoints Used (Instantly API v2)

- **Activate Campaign**: `POST https://api.instantly.ai/api/v2/campaigns/{external_id}/activate` ✅ **ACTIVE**
- **Pause Campaign**: ~~`POST https://api.instantly.ai/api/v2/campaigns/{external_id}/pause`~~ ⏸️ **LOCAL-ONLY**

> **Note**: Currently only campaign **activation** is synced with Instantly. **Pausing** only happens locally in the UI/UX while keeping the Instantly campaign active. This allows for UI control without disrupting active Instantly campaigns.

### Authentication Structure

```typescript
// Bearer token authentication in headers (v2)
headers: {
  'Authorization': `Bearer ${instantlyApiKey}`,
  'Content-Type': 'application/json'
}

// Empty JSON body required by Instantly API v2
body: JSON.stringify({})
```

## 🛡️ Security & Error Handling

### Security Features

1. **Environment Variable Protection**: API key stored securely in Convex environment
2. **Transparent UI**: No "Instantly" mentions in user-facing error messages
3. **Same API Key**: Uses single API key for all clients (as requested)

### Error Handling

The integration includes comprehensive error handling for Instantly API v2:

```typescript
// User-friendly error messages (no external service mentions)
- "External service configuration missing. Contact administrator." // Missing API key
- "External service authentication failed. Please contact administrator." // 401 Unauthorized  
- "Campaign not found in external service. Please verify the campaign exists." // 404 Not Found
- "External service rate limit exceeded. Please try again in a few minutes." // 429 Rate Limit
- "External service request failed (STATUS). Please try again or contact support." // Other errors
- "Unable to connect to external service. Check your internet connection and try again." // Network errors
```

### Atomic Operation Guarantee

- **If Instantly API fails**: Local database status is NOT updated
- **If Instantly API succeeds**: Local database status is updated
- **If no external_id**: Only local database is updated (normal operation)

## 🧪 Testing

### Test Functions Available

1. **Basic Integration Test**:
   ```bash
   npx convex run testInstantlyIntegration:testToggleCampaignStatus \
     --arg clientId="your_client_id" \
     --arg testWithRealApi=false
   ```

2. **Error Handling Test**:
   ```bash
   npx convex run testInstantlyIntegration:testInstantlyApiErrorHandling \
     --arg clientId="your_client_id"
   ```

### Manual Testing Steps

1. **Create Test Campaign**:
   - Create a campaign in the UI
   - Set its `external_id` to a valid Instantly campaign ID
   
2. **Test Toggle Functionality**:
   - Use the switch in the EmailCampaignsTable
   - Watch console logs for API calls
   - Verify status changes in both systems

3. **Test Error Scenarios**:
   - Set invalid `external_id`
   - Temporarily disable internet
   - Verify error messages are user-friendly

## 🔧 UI Integration

### EmailCampaignsTable Component

The toggle switch now includes:

```typescript
// Enhanced success message
toast({ 
  title: `Campagne ${result.newStatus === 'active' ? 'geactiveerd' : 'gepauzeerd'}! ✅`,
  description: `${result.campaignName} is nu ${result.newStatus === 'active' ? 'actief' : 'gepauzeerd'} en gesynchroniseerd met externe systemen.`
})

// User-friendly error handling
if (err.message.includes('External service')) {
  errorMessage = err.message
} else if (err.message.includes('Campaign not found')) {
  errorMessage = 'Campagne niet gevonden. Ververs de pagina en probeer opnieuw.'
} else if (err.message.includes('internet connection')) {
  errorMessage = 'Controleer je internetverbinding en probeer opnieuw.'
} else {
  errorMessage = 'Status wijziging mislukt. Probeer het opnieuw of neem contact op met support.'
}
```

## 📊 Monitoring & Logging

### Console Logs

The integration includes detailed logging for debugging:

```
🔄 Toggling campaign "Campaign Name" from "draft" to "active"
📡 Calling external API for campaign instantly_campaign_123...
📡 Sending resume request to external service...
✅ External API success: {"status":"success"}
✅ Campaign "Campaign Name" status updated to "active"
```

### Error Logs

```
❌ External API error: 404 Campaign not found
❌ External service integration failed: Error message
```

## 🚀 Production Deployment

### Steps for Production

1. **Get Instantly API v2 Key**:
   - Generate a new API v2 key from Instantly dashboard
   - API v2 uses Bearer token authentication (different from v1)
   - Set the key in Convex environment:
   ```bash
   npx convex env set INSTANTLY_API_KEY "your_instantly_api_v2_bearer_token"
   ```

2. **Update Campaign External IDs**:
   - Ensure all campaigns have valid `external_id` values matching Instantly campaign IDs
   - Link existing campaigns to their Instantly counterparts
   - Verify campaign IDs exist in Instantly dashboard

3. **Deploy to Production**:
   ```bash
   npx convex deploy --prod
   ```

4. **Test Production Environment**:
   - Test campaign activation/pause with real Instantly campaigns
   - Verify status changes appear in Instantly dashboard
   - Monitor logs for any integration issues
   - Test error scenarios (invalid campaign ID, etc.)

### Rollback Plan

If issues occur in production:

1. **Temporary Disable**: Remove `external_id` from campaigns to disable API calls
2. **Rollback Code**: Deploy previous version without Instantly integration
3. **Fix & Redeploy**: Address issues and redeploy fixed version

## 📞 Support & Troubleshooting

### Common Issues

1. **"External service configuration missing"**:
   - Check if `INSTANTLY_API_KEY` is set in Convex environment
   - Verify API key format and validity

2. **"External service request failed"**:
   - Check if Instantly API is accessible
   - Verify `external_id` exists in Instantly
   - Check API key permissions

3. **Campaign toggles but no Instantly sync**:
   - Check if campaign has `external_id` set
   - Campaign without `external_id` will only update locally

### Debug Steps

1. **Check Environment**:
   ```bash
   npx convex env list | grep INSTANTLY
   ```

2. **Check Logs**:
   ```bash
   npx convex logs --history 50
   ```

3. **Test API Key**:
   ```bash
   curl -X POST https://api.instantly.ai/api/v1/campaign/list \
     -H "Content-Type: application/json" \
     -d '{"api_key": "your_api_key"}'
   ```

## 🎯 Next Steps

### Future Enhancements

1. **Full Pause Sync**: Enable Instantly API pause calls by changing condition to `newStatus === "paused"` in code
2. **Bulk Operations**: Support for bulk campaign activation/pause
3. **Sync Verification**: Periodic sync checks between local and Instantly
4. **Webhook Integration**: Real-time sync using Instantly webhooks
5. **Analytics Integration**: Track API call success rates and performance

### Enabling Full Instantly Sync (Future)

To enable full sync including pause operations, change line 834 in `campaigns.ts`:

```typescript
// Current (activation only):
if (campaign.external_id && newStatus === "active") {

// Future (full sync):
if (campaign.external_id) {
  const instantlyAction = newStatus === "active" ? "activate" : "pause";
```

### Maintenance

1. **Monitor API Usage**: Track Instantly API rate limits and usage
2. **Update Error Handling**: Refine error messages based on user feedback
3. **Performance Optimization**: Cache API responses where appropriate

---

*Last updated: 2025-08-18 | Production-ready Instantly API integration*