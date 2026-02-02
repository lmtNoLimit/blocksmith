# SSE Streaming Architecture Research

**Date:** 2026-02-01
**Status:** Complete
**Scope:** Raw output streaming patterns, system prompt design for direct content delivery

---

## Key Findings

### 1. Raw Streaming Without Extraction

**Pattern:** Direct event-stream delivery eliminates redundant parsing
- Server streams raw content via `text/event-stream` MIME type
- Client accumulates chunks directly into output buffer (no parsing mid-stream)
- Each chunk is a complete line with terminating newlines
- This prevents 2-10x parsing overhead from re-parsing entire document on each chunk

**Implementation:** Each SSE event contains one complete "unit" of content (line of code, paragraph, etc.)

### 2. System Prompt Design for Raw Output

**Critical optimization:** Structure prompts to ensure AI produces raw, fence-free output

**Best practices:**
- Explicitly instruct: "Output raw Liquid code without markdown fences, comment blocks, or explanatory text"
- Define exact format: "Stream one complete line per chunk to simplify accumulation"
- Disable auto-wrapping: Prevent model from adding markdown formatting
- Use structured output when possible (for JSON/code generation)

**Benefit:** Removes need for client-side code extraction entirely

### 3. Accumulation Pattern

**Simplification approach:**
```
Server → chunks → Client buffer → accumulate → store as-is
         (no parsing)
```

Instead of:
```
Server → chunks → Client parsing → extraction → cleaning → storage
```

**Method:**
- Use standard EventSource API with string concatenation
- Accumulate chunks in string variable
- On stream completion, persist accumulated content directly
- No intermediate extraction layer needed

### 4. Dual Extraction Elimination

**Current pain:** Code extraction happens on both server (code-extractor.ts) and client (code-extraction.client.ts)

**Solution:** Single point of responsibility
- Server: Orchestrate prompt to produce raw output
- Client: Simple accumulation without processing
- Storage: Direct persistence of accumulated raw content
- No intermediate transformation layers

**Validation:** Add checksum/verification post-storage if needed, not mid-stream

### 5. HTTP/2 Considerations

- SSE works over standard HTTP, simplified vs WebSockets
- HTTP/2 supports 100+ simultaneous streams by default
- No connection limit issues for typical single-stream per user scenarios
- Automatic reconnection with EventSource API built-in

---

## Implementation Architecture

### Backend Changes
1. Update system prompt to output raw Liquid without formatting
2. Stream via text/event-stream endpoint (no pre-processing)
3. Each event contains raw content ready for storage
4. Remove code-extractor.ts pipeline

### Client Changes
1. Use standard EventSource API
2. Accumulate chunks in string variable
3. Handle stream completion → persist directly
4. Remove code-extraction.client.ts
5. No intermediate parsing needed

### Storage
1. Store accumulated raw string directly
2. Optional: Post-storage validation if needed
3. No extraction/transformation before persistence

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| AI adds formatting despite prompt | Test with multiple model versions; add fallback strip-markdown for safety |
| Chunk boundaries mid-word | Design prompt for line-based output; validate chunk completeness |
| Stream interruption | Implement timeout + retry; use event stream auto-reconnect |

---

## Unresolved Questions

1. Should we validate Liquid syntax post-accumulation before storage, or trust the system prompt?
2. Does the current Shopify LLM API support line-based streaming semantics?
3. What's the expected average stream chunk size (bytes/lines)?
