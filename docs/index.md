---
layout: home

hero:
  name: Agent Egress Lab
  text: Default-deny by construction
  tagline: Reproduce allowlisted agent egress and an offline Playwright boundary with Docker.
  image:
    src: /icon.svg
    alt: Agent Egress Lab shield
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Security model
      link: /guide/security-model
    - theme: alt
      text: GitHub
      link: https://github.com/Sunwood-ai-labs/agent-egress-lab

features:
  - title: Default-deny agent network
    details: Remove the direct internet route and expose only one policy-controlled CONNECT-proxy path.
  - title: Offline browser runner
    details: Let Playwright reach the internal test app while public navigation fails with real browser evidence.
  - title: Honest residual risk
    details: Document what network allowlisting cannot stop, including exfiltration through an allowed destination.
---

## What this lab proves

Agent Egress Lab turns a security assumption into repeatable checks. The agent verification covers direct outbound traffic, an allowed proxy target, and a denied proxy target. The browser verification separately proves that an internal page loads while a public page does not.

This is an educational fixture, not a production security boundary. Start with the [getting-started guide](/guide/getting-started), then read the [security model](/guide/security-model) before adapting the topology.
