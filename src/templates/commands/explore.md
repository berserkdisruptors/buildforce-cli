---
version: "0.0.42"
description: Session-aware brainstorming with dynamic context provisioning using Context Explorer sub-agents.
agents: [claude]
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/buildforce.explore` to have a natural conversation about their codebase with automatic context retrieval. This command uses Explorer sub-agents to search the context repository and synthesize findings conversationally.

**Key Principle**: This is a conversation, not a research report. Respond as a knowledgeable colleague who deeply understands the codebase.

---

## Prerequisites Check

1. Read `.buildforce/context/_index.yaml` FROM CURRENT WORKING DIRECTORY
   - If NOT exists → Inform user: "No context repository found. Run `/buildforce.extract` first to build your context."
   - If exists but empty/minimal → Warn: "Context repository exists but has limited content. Responses may be sparse."

2. Check for existing research cache:
   - Read `.buildforce/.temp/research-cache.yaml` if it exists
   - Use prior findings to inform this conversation (session continuity)

---

## Step 1: Analyze Intent

Parse the user's prompt ($ARGUMENTS) and any session history:

### 1.1 Topic Detection

Identify subjects mentioned:
- Explicit topics: "auth", "billing", "API", module names
- Implicit topics from context: "the refactor", "that service", "our tests"
- No topic (open exploration): empty prompt or general greeting

### 1.2 Intent Classification

Classify the user's intent:

| Intent Type | Signal Words | Action |
|-------------|--------------|--------|
| **Continuation** | "continue", "back to", "more about", "as we discussed" | Build on prior context |
| **New Topic** | "what about", "let's discuss", "how does", "tell me about" | Fresh exploration |
| **Question** | "why is", "should we", "what if", "could we" | Answer with context |
| **Open** | No specific direction, general prompt | Broad exploration |

### 1.3 Context Needs Assessment

Determine which context domains are relevant:

| Query Type | CE-1 (Structural) | CE-2 (Convention) | CE-3 (Verification) |
|------------|-------------------|-------------------|---------------------|
| Architecture discussion | Primary | Secondary | If relevant |
| Code patterns/style | Secondary | Primary | If relevant |
| Testing/quality | Secondary | If relevant | Primary |
| General/open | Broad | Broad | Broad |
| Continuation | Based on prior topic mix | | |

**Not all explorers need to be dispatched every turn.** Be selective based on intent.

---

## Step 2: Dispatch Explorers

Based on intent analysis, dispatch relevant Context Explorer sub-agents using the Task tool.

### 2.1 Formulate Queries

Transform user intent into explorer queries:

```
Query for CE-1 (Structural): {topic} architecture, structure, dependencies, design decisions
Query for CE-2 (Convention): {topic} patterns, conventions, coding standards, best practices
Query for CE-3 (Verification): {topic} testing, quality gates, CI requirements, coverage
```

### 2.2 Parallel Dispatch

Use the Task tool to spawn explorers **in parallel** for speed:

**IMPORTANT**: Dispatch relevant explorers in a single message with parallel Task tool calls.

For each relevant explorer:
```
Task tool parameters:
- subagent_type: "ce-1-structural-explorer" | "ce-2-convention-explorer" | "ce-3-verification-explorer"
- prompt: Include query, scope (broad|focused|deep), and session context
- model: haiku (explorers should be fast and efficient)
```

**Scope guidance:**
- **Broad**: Open exploration, general questions
- **Focused**: Specific topic mentioned
- **Deep**: "Tell me more", "dig deeper", explicit depth request

### 2.3 Selective Dispatch Examples

**User: "let's discuss the auth system"**
- Dispatch: CE-1 (Primary), CE-2 (Secondary)
- Skip: CE-3 (unless testing mentioned)

**User: "how should we test the payment flow?"**
- Dispatch: CE-3 (Primary), CE-1 (for architecture context)
- Skip: CE-2 (conventions less relevant)

**User: "tell me about the codebase"**
- Dispatch: All three (broad exploration)

---

## Step 3: Receive and Process Findings

Explorers return structured YAML findings with:
- `query_understood`: Their interpretation
- `findings[]`: Relevant excerpts with source, relevance, why_relevant
- `connections[]`: Related topics discovered
- `gaps[]`: Expected info not found
- `suggested_deeper[]`: Follow-up queries

### 3.1 Aggregate Findings

Combine findings from all dispatched explorers:
- Prioritize high-relevance findings
- Note cross-domain connections
- Track gaps across domains

### 3.2 Check for Sufficient Context

If all explorers return empty or low-relevance findings:
- Acknowledge the gap honestly
- Suggest running `/buildforce.extract` to build context
- Offer to reason from first principles without documented context

---

## Step 4: Synthesize Response

**This is the critical step.** Transform findings into natural conversation.

### Synthesis Guidelines

1. **Lead with understanding, not sourcing**
   - **Don't**: "According to architecture/auth-service.yaml, the auth service..."
   - **Do**: "The auth service uses JWT with 15-minute expiration..."

2. **Integrate, don't enumerate**
   - **Don't**: "Finding 1: X. Finding 2: Y. Finding 3: Z."
   - **Do**: "Given X and considering Y, it makes sense that Z..."

3. **Surface connections naturally**
   - **Don't**: "Related topic: billing has auth dependencies"
   - **Do**: "This also affects billing since auth tokens carry subscription tier claims..."

4. **Acknowledge gaps honestly**
   - **Don't**: Pretend to know what isn't documented
   - **Do**: "The rotation strategy isn't fully documented yet - want to explore that?"

5. **Invite continuation**
   - **Don't**: End abruptly and wait
   - **Do**: Offer threads to pull, questions to explore, connections to follow

### Response Structure

```
[Natural response addressing user's intent]

[Integrated context that informs the response - woven in naturally]

[Connections to related topics if relevant - mentioned casually]

[Open threads: gaps, questions, suggested directions - as conversation invites]
```

### Example Good Response

**User**: "let's discuss the auth system"

**Response**:
"The auth system is built around JWT tokens with a 15-minute expiration - that was a deliberate choice for horizontal scaling since it avoids session state in the services. Refresh tokens live in Redis with a 7-day TTL.

What's interesting is how this connects to billing - the JWT carries subscription tier claims, so the billing service doesn't need a separate auth call. The API gateway validates signatures at the edge with no introspection, which keeps latency low.

There's a gap in the documented context around token rotation - the strategy for rotating signing keys isn't captured yet. Also, the refresh token revocation flow is mentioned but not detailed.

What aspect would you like to dig into - the refresh flow, how it connects to billing, or something else?"

---

## Step 5: Update Session State (In-Memory)

Track for subsequent turns:

```yaml
session_state:
  turn: {N}
  topics_discussed:
    {topic}: {depth: deep | shallow | mentioned}
  context_surfaced:
    - {file}: {sections surfaced}
  open_questions:
    - {question raised but not answered}
  unexplored_connections:
    - from: {topic}
      to: {related topic}
      nature: {relationship}
```

This state informs:
- When to re-dispatch explorers (topic shift)
- When to use existing context (continuation)
- What gaps remain to address

---

## Step 6: Async Session Persistence (Infrequent)

**Only dispatch the Session Persister when significant new findings have accumulated.**

### When to Persist

- After 3+ turns with substantive findings
- When major new topic has been explored
- Before ending a long session
- When user indicates they're wrapping up

### When NOT to Persist

- Every single turn (too frequent)
- For clarification questions
- When no new context was surfaced
- For meta-discussion about the conversation

### Dispatch Session Persister

When persistence is warranted, dispatch the Session Persister in the background:

```
Task tool parameters:
- subagent_type: "buildforce-session-persister"
- prompt: Include session state, key findings, topics explored
- run_in_background: true  # Non-blocking
- model: haiku  # Fast and efficient for simple write
```

The persister will write to `.buildforce/.temp/research-cache.yaml` without blocking the conversation.

**User should never wait for saves** - persistence is invisible to them.

---

## Step 7: Continue Conversation

On each subsequent user message:

1. **Read session state** (in-memory from prior turn)
2. **Parse new intent** in context of session history
3. **Decide: re-dispatch or respond?**
   - Topic shift → dispatch relevant explorers
   - Same topic, need depth → dispatch with "deep" scope
   - Same topic, sufficient context → respond from existing understanding
   - Clarification → respond without dispatch
4. **Synthesize** with accumulated understanding
5. **Update session state**

---

## Error Handling

### No Context Found

> "I don't have documented context about {topic} yet. We could explore what we think it should be based on general patterns, or you could run `/buildforce.extract` to build context from the codebase first. What would you prefer?"

### Partial Context

> "I have some context about {topic} but it's fairly shallow - just the basic structure, not the deeper rationale. [Use what exists.] Want me to dig into the codebase directly, or work with what we have?"

### Explorer Timeout

If explorers take too long (> 5 seconds):
> "Taking longer than expected to gather context. Let me respond with what I know directly and we can fetch more detail if needed."

### Conflicting Information

If findings from different domains conflict:
> "Interesting - there's a tension here. The architecture docs say X, but the convention guide suggests Y. This might be an inconsistency worth addressing. Which direction aligns with where the project is heading?"

---

## Design Principles Reminder

- **Invisible retrieval**: Users shouldn't feel like they're waiting for a search
- **Conversational, not report-like**: Lead with understanding, not sourcing
- **Targeted, not exhaustive**: Fetch only what's needed for the current exchange
- **Session continuity**: Build understanding over multiple turns
- **Honest about gaps**: Acknowledge when context doesn't exist, don't fabricate

---

## Quick Reference: Dispatch Decision

```
User prompt → Analyze intent → Select explorers → Dispatch in parallel
                    ↓
         [continuation?] → Check session state → Use existing context OR re-dispatch
                    ↓
         [new topic?] → Dispatch relevant explorers
                    ↓
         [question?] → Dispatch based on question domain
                    ↓
         [open?] → Dispatch all three (broad)
```

Context: {$ARGUMENTS}
