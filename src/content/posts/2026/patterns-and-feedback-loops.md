---
title: "Patterns and Feedback Loops"
summary: "Essentials of programming with coding agents."
date: 2026-02-06
author: Matthias Metzger
draft: false
tags: []
---

Times are changing. I have barely written a line of code by hand throughout
January. Most of my time was spent telling Claude and Codex what to do, plan
out what to do or have them fix their own mess and writing rules about that.

Here are the three things, that half the internet talks about, but I think are
conceptually relevant to make AI programming go brrr regardless of the LLM
provider you use (OpenCode, Claude Code, Codex, what have you).


## Plan mode

The first and least important is to use plan mode. It's what we have done since
the dawn of LLMs. It also burns a few tokens most of the time, but since there
typically is a written document by the end of it, compaction and context
management is not that important anymore.


## Patterns

Patterns are like really, really important. If you want an LLM (especially
Claude) to be maximally efficient in implementing something, reference a
similar implementation in the codebase and the agent will fly.

I had that in the back of my mind all the time, but I just recently really got
it, when I want Claude to migrate some code from an old library and its usages
to a new version. The first time I tried to just let it rip. That didn't really
work. But then I converted one of the 96 files by hand and told it to reference
that manually converted file and it one shotted the rest.

So write down your patterns, reference them across the codebase and what the
agent produces will probably be much better, then when you let it run free.


## Feedback loops

The most important part is (automated) feedback loops. I think the internet has
largely covered it, but I cannot overstate how important that is. Find a way
for your coding agent to check its own work. Of course that's not possible in
all cases, but where it is, it's wild.

Here are some ideas:

- https://ampcode.com/notes/feedback-loopable
- https://x.com/i/status/2010719790659408260
- Write your own script, that can debug what you want, then let your agent use
  it.
- Write an agent who's sole purpose is to play devils advocate and check
  against a list of patterns, you tell it to.

What a time to be alive.

