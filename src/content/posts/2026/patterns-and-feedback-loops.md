---
title: "Plan Mode, Patterns, Feedback Loops and DSLs"
summary: "Essentials of programming with coding agents."
date: 2026-02-06
author: Matthias Metzger
draft: false
tags: []
---

Times are changing. I have barely written a line of code by hand throughout
January. Most of my time was spent telling Claude and Codex what to do, plan
out what to do or have them fix their own mess and writing rules about that.

Here are some things, that half the internet talks about, but I think are
conceptually relevant to make AI programming go brrr regardless of the LLM
provider you use (OpenCode, Claude Code, Codex, what have you).

Some of this is also relevant outside of programming.


## Plan mode

Plan mode is a mode, where the LLM looks at the existing codebase to find
patterns and then writes a markdown document that you can review. You should
also review it and correct the LLM in what it was planning to do. While this
burns a few tokens, the resulting document will help keep an LLM on track, even
if compaction comes into play.

This is essentially like letting the LLM write it's own prompt, which is a
useful technique in general, e.g. if you wanted to create images.


## Be specific

There is another side to plan mode and prompting in general. Be specific in
what you want. Sometimes the task is too big, so if a one-shot doesn't work,
it's time to roll up your sleeves and deconstruct the solution you want by
yourself and guide the LLM through the steps manually.

I recently migrated some code from one programming language to another. The
application was too big to be one-shotted, so I went ahead and first converted
the database layer, then the business logic and then the UI. And even these
parts are sometimes too big, so deconstruct them further.


## Patterns

Patterns are like really, really important. If you want an LLM to be maximally
efficient in implementing something, reference a similar implementation in the
codebase and the agent will fly.

I had that in the back of my mind all the time, but I just recently really got
it, when I wanted Claude to migrate some code from an old library and its
usages to a new version. The first time I tried to just let it rip. That didn't
really work. But then I converted one of the 96 files by hand and told it to
reference that manually converted file and it one shotted the rest.

So write down your patterns, reference them across the codebase and what the
agent produces will probably be much better, then when you let it run wild.


## Feedback loops

The most important part is (automated) feedback loops. I think the internet has
largely covered it, but I cannot overstate how important that is. Find a way
for your coding agent to verify it's own work. Of course that's not possible in
all cases, but where it is, it's wild.

Here are some ideas:

- https://ampcode.com/notes/feedback-loopable
- https://x.com/i/status/2010719790659408260
- Write your own script, that can debug what you want, then let your agent use
  it.
- Use an agent who's sole purpose is to play devils advocate and check against
  a list of patterns, you tell it to.
- Also if it rewrites the tests, to fit its implementation, just tell it not to
  do that.
- If you are not a programmer 

## DSLs

Sometimes it's also a really good idea to implement a small, composable DSL to
constrain the output of an LLM. For example, if you have a DSL to build user
defined forms, you can tell the LLM that and for example ask it to build a
welcome form and it will do it. Same for drawing stuff for example.

Here is an example creating ad-hoc forms.

```ts
type Widget
  = { type: 'Paragraph', content: Text[] }
  | { type: 'TextInput', name: string, placeholder: string }
  | { type: 'DateInput', name: string, placeholder: string }
  | { type: 'Row', name: string, placeholder: string };

type Text = {
  content: string;
  options: FormattingOptions;
}

```

If I give any LLM this and make a prompt like:

> Take a look at the `Widget` which is a DSL for building forms. Your job is to
> create a welcome form for an employee with name, birtday and notes.

This is what comes back.

```ts
const welcomeForm: Widget[] = [
  {
    type: 'Paragraph',
    content: [
      {
        content: 'Welcome to the company!',
        options: { bold: true }
      },
      {
        content: ' Please fill out the form below so we can get to know you.',
        options: {}
      }
    ]
  },
  {
    type: 'TextInput',
    name: 'name',
    placeholder: 'Enter your full name'
  },
  {
    type: 'DateInput',
    name: 'birthday',
    placeholder: 'Select your birthday'
  },
  {
    type: 'Row',
    name: 'notes',
    placeholder: 'Anything you would like us to know (notes, preferences, etc.)'
  }
];

```

Then we just need a small renderer for this data (which the LLM can write
itself of course) and we have a much lower chance of the LLM hallucinating.
Even if it did, we could implement a small linter for the structure and feed
any errors back into the LLM (and we have an automated feedback loop).

What a time to be alive.

