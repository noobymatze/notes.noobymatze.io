---
title: "On Variable Declarations"
summary: "A short opinion on where to declare variables."
date: 2024-10-25
author: Matthias Metzger
draft: true
tags: []
---

A programming beginner using Kotlin recently asked me, whether it is better to
declare variables at the beginning of a function or when they are used. 

When I was at Uni, I was taught to declare variables at the beginning of a
function. However, I never heard a reason for this. As far as I researched,
there might be reasons in programming languages like JavaScript to declare
variables at the top of a function, because you can still use these names and
because of scoping issues.

However, in most other programming languages, personally, I would declare
variables when they are used. Here are the reasons for this.

Imagine you had a function that is 100 lines long. Of course some would even
debate having a function that long, but it happens in practice and indulge me
for a second. A variable, that is declared at the beginning of that function
could be used in all 100 lines of it. But maybe, it is only really used in the
last 10 lines. So when there is a bug with a variable. I have to look through
all the 100 lines to see, whether the value is used, whereas when it is only
declared in the last 10 lines, I know a bug with that variable can only be in
the last 10 lines.

It is also easier to copy the code to some place else. However, in modern IDEs,
this is mitigated





