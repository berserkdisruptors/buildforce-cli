---
name: context-search
description: >-
  Search the Buildforce context repository for curated codebase knowledge — architecture
  decisions, conventions, verification standards, and design rationale. Use this skill
  whenever the conversation requires existing knowledge or context about this specific
  codebase that cannot be easily derived from reading source files. This enriches agentic
  search with structured understanding of WHY the code was built a certain way, what
  patterns to follow, and what pitfalls to avoid.
agents: [claude, cursor, opencode]
---

User input:

$ARGUMENTS

**Context**: The user (or agent) is invoking `/context-search` to query the Buildforce context repository for curated codebase knowledge. This skill uses Context Explorer sub-agents to search structured context and synthesize findings.

---

## Prerequisites Check

Read `.buildforce/context/_index.yaml` - if it does NOT exist, inform user: "No context repository found. Run `/buildforce.extract` first to build your context." Otherwise, proceed.

---

## CRITICAL: Why This Skill Exists

**The purpose of `/context-search` is to enrich agentic search with curated context that source files lack.**

By default, the agent does not tap into the project's context repository. This skill exists to fix that gap. The Context Explorers query structured context that was carefully extracted about this specific codebase — architectural decisions, conventions, verification standards, design rationale — information that cannot be derived from reading source files alone.

Source files tell you WHAT the code does. The context repository tells you WHY it was built that way, what patterns to follow, what pitfalls to avoid, and how components relate. Both are valuable, but curated context comes first.

### The Correct Order: Context First, Then Source

**You MUST consult the context repository before reading source files directly.** The workflow is:

1. **Dispatch Context Explorers** to gather curated context about the topic
2. **Synthesize findings** with the structured knowledge from the repository
3. **Then, if needed**, use your default agentic search (Glob, Grep, Read) to:
   - Confirm specific implementation details
   - Find information not covered in the context repository
   - Dive deeper into areas the user wants to explore

**Do NOT skip step 1.** Specifically, do not:
- Jump straight to reading source files (Glob, Grep, Read) to answer the question
- Skip explorers because you think you could answer "faster" without them
- Bypass the workflow because the user's request seems detailed or actionable

The context repository exists precisely because raw source files lack the curated understanding that makes responses valuable.

### The Only Exception

Skip dispatching explorers ONLY when the user's query has nothing to do with this codebase:
- Asking about third-party services or libraries to evaluate for integration
- General programming questions unrelated to the project
- External concepts the context repository cannot possibly contain

In these cases, respond directly without explorers — dispatching them would return nothing useful.

**When in doubt, dispatch the explorers.** An empty result is informative; skipping them is not.

---

## Step 1: Analyze Intent

Parse the user's prompt ($ARGUMENTS):

### 1.1 Topic Detection

Identify subjects mentioned:
- Explicit topics: "auth", "billing", "API", module names
- Implicit topics from context: "the refactor", "that service", "our tests"
- No topic (open exploration): empty prompt or general greeting

### 1.2 Intent Classification

Classify the user's intent:

| Intent Type | Signal Words | Action |
|-------------|--------------|--------|
| **New Topic** | "what about", "let's discuss", "how does", "tell me about" | Fresh exploration |
| **Question** | "why is", "should we", "what if", "could we" | Answer with context |
| **Open** | No specific direction, general prompt | Broad exploration |

### 1.3 Context Needs Assessment

Determine which context domains are relevant:

| Query Type | Structural Explorer | Convention Explorer | Verification Explorer |
|------------|---------------------|---------------------|----------------------|
| Architecture discussion | Primary | Secondary | If relevant |
| Code patterns/style | Secondary | Primary | If relevant |
| Testing/quality | Secondary | If relevant | Primary |
| General/open | Broad | Broad | Broad |

**Not all explorers need to be dispatched every time.** Be selective based on intent.

---

## Step 2: Dispatch Explorers

Based on intent analysis, dispatch relevant Context Explorer sub-agents using the Task tool.

### 2.1 Formulate Queries

Transform user intent into explorer queries:

```
Query for Structural Explorer: {topic} architecture, structure, dependencies, design decisions
Query for Convention Explorer: {topic} patterns, conventions, coding standards, best practices
Query for Verification Explorer: {topic} testing, quality gates, CI requirements, coverage
```

### 2.2 Parallel Dispatch

Use the Task tool to spawn explorers **in parallel** for speed:

**IMPORTANT**: Dispatch relevant explorers in a single message with parallel Task tool calls.

For each relevant explorer:
```
Task tool parameters:
- subagent_type: "buildforce-structural-explorer" | "buildforce-convention-explorer" | "buildforce-verification-explorer"
- prompt: Include query, scope (broad|focused|deep), and any relevant context
- model: haiku
```

**Scope guidance:**
- **Broad**: Open exploration, general questions
- **Focused**: Specific topic mentioned
- **Deep**: "Tell me more", "dig deeper", explicit depth request

### 2.3 Selective Dispatch Examples

**User: "let's discuss the auth system"**
- Dispatch: Structural Explorer (Primary), Convention Explorer (Secondary)
- Skip: Verification Explorer (unless testing mentioned)

**User: "how should we test the payment flow?"**
- Dispatch: Verification Explorer (Primary), Structural Explorer (for architecture context)
- Skip: Convention Explorer (conventions less relevant)

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
- Consider whether a reformulated query might surface better results (try once with broader or more specific terms, but do not retry more than once to avoid looping)
- If still empty after a retry, acknowledge the gap honestly and reason from first principles without documented context

### 3.3 CRITICAL: Distinguish "Not Found" from "Tangentially Related"

**This is a common failure mode. Pay close attention.**

When the user asks about X and explorers return findings about Y (something related but not X):

| Situation | Correct Response | WRONG Response |
|-----------|------------------|----------------|
| User asks about "skills system" but codebase has no skills | "The codebase doesn't have a skills system yet." | Finding the closest thing (sub-agents) and talking about that as if it answers the question |
| User asks about "authentication" but no auth exists | "There's no authentication implementation in this codebase." | Discussing the CLI's general architecture because it's tangentially related |
| User asks about feature X that doesn't exist | "Feature X doesn't exist in the current codebase. Would you like to explore how it might be implemented?" | Presenting information about feature Y that shares some keywords |

**The test**: Before synthesizing, ask yourself: "Did I find what the user actually asked about, or did I find something adjacent?" If adjacent, you MUST acknowledge that the actual thing doesn't exist.

**Tangentially related findings are still useful** — but only AFTER you've acknowledged the gap:
> "The codebase doesn't have a skills system. However, it does have a sub-agent architecture that could potentially support skills in the future — want me to explain how that works?"

Never pretend that tangentially related information answers the user's actual question.

---

## Step 4: Synthesize Response

**This is the critical step.** Transform findings into a clear, context-enriching response.

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
   - **Do**: "The rotation strategy isn't fully documented yet — want to explore that?"

5. **Offer follow-up threads**
   - Surface connections, gaps, or deeper areas the user might want to explore next

### Response Structure

```
[Direct response addressing user's intent]

[Integrated context that informs the response — woven in naturally]

[Connections to related topics if relevant — mentioned casually]

[Open threads: gaps, questions, suggested directions]
```

### Example Good Response

**User**: "tell me about the auth system"

**Response**:
"The auth system is built around JWT tokens with a 15-minute expiration — that was a deliberate choice for horizontal scaling since it avoids session state in the services. Refresh tokens live in Redis with a 7-day TTL.

What's interesting is how this connects to billing — the JWT carries subscription tier claims, so the billing service doesn't need a separate auth call. The API gateway validates signatures at the edge with no introspection, which keeps latency low.

There's a gap in the documented context around token rotation — the strategy for rotating signing keys isn't captured yet. Also, the refresh token revocation flow is mentioned but not detailed.

What aspect would you like to dig into — the refresh flow, how it connects to billing, or something else?"

---

## Error Handling

### No Context Found

> "I don't have documented context about {topic} yet. We could explore what we think it should be based on general patterns, or you could run `/buildforce.extract` to build context from the codebase first. What would you prefer?"

### Partial Context

> "I have some context about {topic} but it's fairly shallow — just the basic structure, not the deeper rationale. [Use what exists.] Want me to dig into the codebase directly, or work with what we have?"

### Explorer Timeout

If explorers take too long (> 5 seconds):
> "Taking longer than expected to gather context. Let me respond with what I know directly and we can fetch more detail if needed."

### Conflicting Information

If findings from different domains conflict:
> "Interesting — there's a tension here. The architecture docs say X, but the convention guide suggests Y. This might be an inconsistency worth addressing. Which direction aligns with where the project is heading?"

---

## Design Principles Reminder

- **Invisible retrieval**: Users shouldn't feel like they're waiting for a search
- **Context-enriching, not exhaustive**: Fetch only what's needed to inform the current task
- **Targeted, not exhaustive**: Dispatch only the explorers relevant to the query
- **Honest about gaps**: Acknowledge when context doesn't exist, don't fabricate
- **Token efficient**: Only dispatch explorers when new context is actually needed

---

## Quick Reference: Dispatch Decision

```
User prompt → Analyze intent → Select explorers → Dispatch in parallel
                    ↓
         [new topic?] → Dispatch relevant explorers
                    ↓
         [question?] → Dispatch based on question domain
                    ↓
         [open?] → Dispatch all three (broad)
                    ↓
         Synthesize response → Present response to user
```

Context: {$ARGUMENTS}
