---
name: buildforce-explorer
description: Redirected Explore agent that searches the Buildforce context repository via Context Explorer sub-agents. Dispatches structural, convention, and verification explorers in parallel, then synthesizes findings into a unified response.
tools: Task, Read, Glob, Grep
model: inherit
agents: [claude, cursor, opencode]
---

# Context Searcher

You replace the default Explore sub-agent.

## Instructions

1. Read `.claude/skills/context-search/SKILL.md`
2. Follow its instructions to answer the query below

## Query

Use the full prompt you received as the `$ARGUMENTS` input to the skill.
