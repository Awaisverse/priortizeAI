# /add-ae — Add a New Account Executive

Guide for onboarding a new AE to the daily brief system.

## What You Need

- AE's HubSpot Owner ID (from HubSpot → Users & Teams)
- AE's Google Calendar ID (usually their work email)
- AE's Slack User ID (from Slack → Profile → Copy member ID)
- AE's preferred brief delivery time (e.g., "07:30")
- AE's timezone (e.g., "America/Chicago")

## AEUser Object to Create

Add to your AE registry (wherever you store the user list passed to `OrchestratorService.runForAllAEs()`):

```typescript
const newAE: AEUser = {
  aeId: '<unique-id>',           // e.g. 'ae-003'
  name: 'Full Name',
  email: 'ae@company.com',
  slackUserId: 'UXXXXXXXXXX',   // from Slack profile
  timezone: 'America/Chicago',
  scheduleTime: '07:30',
  hubspotOwnerId: '12345678',   // HubSpot numeric owner ID
  googleCalendarId: 'ae@company.com',
  isActive: true,
  preferences: {
    includeP3: false,
    includeP4: false,
    maxReportLength: 4000,
    enableAI: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

## Validation Checklist

- [ ] HubSpot Owner ID returns deals when filtered via `/crm/v3/objects/deals/search`
- [ ] Google Calendar ID is accessible with the configured OAuth2 credentials
- [ ] Slack User ID can receive DMs from the bot token
- [ ] `isActive: true` so `runForAllAEs()` picks them up

## Test the New AE

```typescript
const ctx = await orchestrator.runForAE(newAE.aeId, 'manual');
console.log(ctx.status); // should be 'success' or 'partial'
```
