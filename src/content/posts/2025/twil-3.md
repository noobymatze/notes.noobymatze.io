---
title: "This week I learned 3"
summary: "Addiction, using LLMs to migrate old codebases and locales"
date: 2025-02-14
author: Matthias Metzger
draft: false
tags: []
---

## Addiction

Addiction? Yeah, I know - not what you'd expect on a technical blog.
Though, anecdotally, if you look around, there are some high caliber
programmers who struggled with addiction at one point or another - so
there is some connection (grasping at straws here). Also, there is a
lesson on the meta level.

A friend suggested I watch a [TED talk][hari] from Johann Hari about
addiction (sincere thanks and all credit to Nat!). To get the gist,
you only need the first five minutes - go on! That's more important,
than the ramblings of some random internet dude. If you haven't given
addiction much thought, this talk will change the way you think about
it. Pinky promise.

For the people who don't have time (why are you still reading?),
here's my one-sentence summary: While genetics and familial
predispositions play a role, a severe contributing factor to addiction
is a (perceived) lack of (social/worldly) connection.

I haven't researched deeply - just a quick glance - and while there
seems to be some criticsm of Johann Hari's methods (especially of his
later books), there does not seem to be a
[disagreement][hari-criticsm] that a lack of connection does have an
effect. Most critics seem to debate, how strong that effect is and
caution against dismissing genetic and familial factors, but the point
still stands.

For me, the idea that loneliness/a social disconnect might be a
contributing factor wasn't even on my radar before. That changed my
perspective tremendously and allows me to consider whether an addicted
person feels lonely, which deepens my empathy - that is seldomly bad.

Now, on the meta level: My favorite pieces of knowledge are those,
where you only need to remember a few basic facts and can derive the
rest logically on the spot. To me, this is a good example. Remembering
the summary from above, I can derive, that building or strengthening a
community is probably a good idea. I might also derive, that a
contributing factor on why AA works, might be building a
community. Additionally, I might derive, that legalizing all drugs
without reinvesting the resulting financial gains into community
building or supporting addicts is probably a bad idea. 

What are those facts for you?

## Roc goes Zig

The Roc language will switch from Rust to Zig as its [implementation
language][roc-to-zig]. There was also a [Zig Showtime][showtime] about
this with Richard Feldman.

For me, the most interesting three observations about this are:

1. Richard hoped, that LLMs could prove quite useful in rewriting from
   one language to another, because they are inherently very good at
   it.
2. A reminder about how a quick feedback loop is invaluable and a 300k
   LOC codebase is comparatively slow to compile with Rust.
3. In the past, I said, that you should have really good reasons, to
   rewrite an entire project from scratch. However, in the Zig
   Showtime episode, Richard rightly pointed out, that compilers
   almost always get rewritten from scratch at least once.

I found the first point to be particularly enlightning, because maybe
LLMs could be helpful in migrating old codebases, that only work on
that one laptop in the office. Of course you need to review and do
prompt engineering and all the other shenaningans, however, if that
works in at least 80% of the cases, it could be quite powerful.


## Locale issues

I have been using `sed` in a script for some time now to auto generate
branch names, based on issue titles. However a co-worker mentioned,
that my script struggled with German umlauts. He then found out, that
you need to set `LC_ALL=C sed -r 'do stuff'` for `[^a-zA-Z0-9]` to
work correctly.

So now this works (thanks Max!):

```sh
$ echo "fäeoö" | LC_ALL=C sed -r 's/[^a-zA-Z0-9]+/ /g'

```



[roc-to-zig]: https://gist.github.com/rtfeldman/77fb430ee57b42f5f2ca973a3992532f
[showtime]: https://www.youtube.com/watch?v=WU45hNi_s7Y
[hari]: https://www.youtube.com/watch?v=PY9DcIMGxMs
[hari-criticsm]: https://www.lcap.co.uk/articles/is-everything-you-know-about-addiction-really-wrong
