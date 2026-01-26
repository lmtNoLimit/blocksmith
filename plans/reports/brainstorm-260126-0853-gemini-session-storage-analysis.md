# Brainstorm Report: Gemini Session/Message Storage Analysis

**Date:** 2026-01-26
**Topic:** Should Blocksmith use Google Cloud session/message handlers instead of MongoDB?
**Decision:** Stay with MongoDB (current approach)

---

## Problem Statement

Evaluate whether to migrate chat/message storage from MongoDB to Google Cloud's session management options (Context Caching, Live API Sessions, Agent Engine Sessions, Memory Bank).

## Requirements

- AI context for Gemini conversations
- User-visible chat history UI
- Billing/analytics tracking (GenerationLog, tokenCount, wasCharged)
- Multi-tenant shop isolation
- Cost efficiency for pre-launch startup

---

## Options Evaluated

### 1. Context Caching
- **Purpose**: Reduce input token costs by caching repeated prompts
- **Storage**: Temporary (max 24hr for implicit caching)
- **Cost**: $0.03/1M tokens + $1.00/1M tokens/hour storage
- **Verdict**: ❌ Not for message persistence, cost optimization only

### 2. Live API Sessions
- **Purpose**: Real-time streaming conversations
- **Storage**: ~10 minutes resumption window
- **Verdict**: ❌ Ephemeral, not for persistent history

### 3. Vertex AI Memory Bank
- **Purpose**: Extract and store "memories" (facts/preferences) from conversations
- **Storage**: Permanent, $0.25/1K memories/month
- **Verdict**: ❌ Stores semantic facts, NOT raw message history

### 4. Agent Engine Sessions ✓
- **Purpose**: Managed session/event storage for agents
- **Storage**: Permanent, stores full message events
- **Cost**: $0.25/1K events (FREE until Jan 28, 2026)
- **API**: Create, list, get, delete sessions; append/list events
- **Verdict**: ⚠️ Valid option but doesn't fit requirements

---

## Cost Comparison (1,000 users × 100 messages/month)

| Factor | MongoDB Atlas Free | Agent Engine Sessions |
|--------|-------------------|----------------------|
| Storage | $0 | $25/month (after Jan 2026) |
| Runtime | N/A | $5-20/month |
| Custom billing fields | ✅ Included | ❌ Needs separate DB |
| **Total** | **$0** | **$25-45/month** |

---

## Decision Rationale

**Selected: Stay with MongoDB**

### Why MongoDB Wins

1. **Zero cost** - 512MB free tier indefinitely
2. **Full data ownership** - Query any field, any way
3. **Custom billing tracking** - GenerationLog already integrated
4. **Already implemented** - No migration effort
5. **No vendor lock-in** - Portable data model
6. **Unlimited custom fields** - codeSnapshot, tokenCount, wasCharged, etc.

### Why Agent Engine Sessions Doesn't Fit

1. **Still need MongoDB** - Billing/analytics requires custom fields AE doesn't support
2. **Added complexity** - Two data stores for related data
3. **Future costs** - $0.25/1K events adds up after Jan 2026
4. **Migration effort** - Would need to rewrite ChatService
5. **Fixed schema** - Can't add custom fields like `codeSnapshot`, `billingCycle`

---

## Future Considerations

### When to Reconsider Agent Engine Sessions

- Building a new Vertex AI agent from scratch
- Don't need custom billing/analytics tracking
- Google announces deeper Gemini integration benefits
- Need Google-managed infrastructure at scale

### Potential Optimization

**Add Context Caching** to reduce Gemini input costs by 90%:
- Keep MongoDB for persistence
- Use explicit caching for system prompt + recent context
- Benefit: $0.03/1M vs $0.30/1M for cached tokens

---

## References

- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Context Caching Docs](https://ai.google.dev/gemini-api/docs/caching)
- [Agent Engine Sessions Overview](https://docs.google.com/agent-builder/agent-engine/sessions/overview)
- [Manage Sessions API](https://docs.google.com/agent-builder/agent-engine/sessions/manage-sessions-api)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)
- [Memory Bank Preview](https://cloud.google.com/blog/products/ai-machine-learning/vertex-ai-memory-bank-in-public-preview)

---

## Next Actions

- `/plan` - Create implementation plan (if considering context caching optimization)
- `/cook` - Start implementation immediately
- No action needed - Current approach is optimal
