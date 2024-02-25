---
title: What I have learned in 12 years of software development
summary: |
    Just some things, I have learned in the past 12 years of software development.
tags: []
date: 2024-02-11
author: Matthias
---

Since I was short on time again, this is another short post with a
list of things I have learned in the past 12 years of software
development. 

For context, I have mostly worked in startups with less than 15
people. However, as part of that employment, there were some
consulting gigs in bigger companies. In general read everything on
here with a grain of salt, especially when you are just starting out.


## Non-Technical

- If something failed, *never* and I mean **never** blame
  someone. That does not help anybody and the person responsible will
  probably feel shitty anyways. Instead help them the best you can to
  fix the problem and then figure out how to not make the same mistake
  a second time, collectively.
- Deadlines are mostly arbitrary.
- Deadlines will rarely be met with the full scope of initial feature
  requests, which is rarely the fault of engineers and developers, but
  rather the surrounding processes, business and to an understated
  degree, the customers themselves.
- Not meeting deadlines doesn't have as much an impact as people
  sometimes want to make you believe.
- That does not mean you should slack off, but it also doesn't mean
  you should crunch mindlessly. The next deadline will come surely and
  it'll all start again.
- There are some rare occasions, where it is absolutely crucial to
  meet a deadline and it is important for *all* involved in the
  project to be aware of that. In that case, communicate very clearly
  what is and is not possible. Try to reduce the scope to a manageable
  degree and don't accept "we need everything" for an answer. Chances
  are, they don't need everything. Communicate very clearly what is
  and is not possible in such situations. Same goes for not meeting a
  not so crucial deadline.
- Customers often don't know what they want, much less what they
  need. That is, because some have difficulty imagining a better way
  and some don't know what's technically possible and easy to
  implement. You are there to bridge that gap.
- Let engineers/developers talk directly to users, if you don't have a
  product, that is used by millions and therefore needs a
  representative (Project/Product Managers). They are generally smart,
  they will figure it out and if not, be there to have their back. Or
  accept a huge time sink in the resulting back an forth.
- Don't tell customers implicitly or explicitly they are dumb for
  doing something a particular way. Accept, that not all people are as
  technically savvy as you and they might not want to be. And that
  doesn't mean, they are dumb.
- Never force a solution on the spot. Brainstorming is good to get
  something going, but there will always be arguments and trade offs,
  which need a little more pondering and the good ideas mostly come
  afterwards or before, when everyone had enough time thinking about
  the problem. Of course, everybody might be on board with a given
  solution, then everything is fine.
- There need to be some seriously good reasons to rewrite a big
  monolith and do a big bang deploy.
- If an engineer really needs a better tool, just get it for them.
- The most important one: Never lose your child like sense of *wonder*
  and *fun*, when programming. You are in a unique position of
  creating value for someone and being able to help them with
  literally nothing but a blank text editor in front of you. Enjoy the
  process and where it actually ends up. When it helps people, don't
  dwell on where you thought it should have ended up.
  

## Technical

- Software is used to solve problems of people. Everything else is
  secondary. Remember that, when you waste hours debating over code
  organization.
- Deleting code is much more satisfying than writing it.
- Reduce library dependencies. Maybe just copy the function you need
  instead of including huge libraries. But think about what you are
  doing, when you start copying whole libraries.
- Divide big problems. Divide even small problems into smaller
  problems.
- Constant iteration is the key to get anything done. Get something
  working, show it to the customer and iterate on that.
- Spring is exceptionally annoying. Some aspects (pun intended) are
  okay, but it's almost like a dynamically typed programming language
  for writing web servers. Which means, when something doesn't work,
  good luck figuring out why. Also, why on earth would you build a
  framework, where *just including* (not working with it, just
  including) a dependency might alter the behavior of you application?
  In the words of Rich Hickey: That's just craaaazy. Additionally,
  most of the skills you learn as part of Spring are not transferable
  to other languages and environments. Instead, you will start to try
  to apply the patterns from Spring in other languages and it will
  make your life just severely more complicated than it needs to be.
- ORMs will hurt you. It is not a question of if, it's rather when. It
  will not be easy to switch databases by just setting some
  configuration values. Chances are, it won't happen anyways. Try to
  find something like JOOQ in your language and write the damn 5
  queries you need by hand. You are not gonna die if you write the
  thousandth insert statement. It's much more explicit and
  understandable in the long term.
- Don't mindlessly slap an interface around everything. Just stop with
  this insanity. Especially in Java and Kotlin, there are a myriad of
  ways to refactor code and most interfaces I have seen in the wild
  have just one implementation anyways. That won't change for the next
  5 years. If it changes at that point, chances are, you will have to
  refactor anyways.
- Separate data access from its usage. Don't write queries in the
  business logic, as that complicates testing and keeping an invariant
  in check.
- Stop using Mocking Frameworks. Use property based testing or build
  something to create random instances of your entities.
- Just use a damn database in a docker container to test data access
  logic.
- Testing only makes you faster, when you know exactly what's
  required. Otherwise explore the problem space with your customer and
  then write tests after the implementation. Yes, I promise nobody
  will go to hell for that.
- If you have a dedicated QA team and engineers are writing tests
  for/with them, you are doing something wrong.
- Stop arguing about the minutiae of formatting and code
  organization. Humans adapt pretty quickly. Keep an open mind and try
  to understand the logic instead of avoiding it by arguing about
  layout. That doesn't mean, you should write code with as few
  newlines, tabs and spaces as possible and stuff everything on one
  line.
- Functions are simpler than objects.
- Monads are conceptually much simpler than objects. At least for
  Monads, we actually know, what we are taking about.
- Object oriented programming is severely overrated.
- Use inheritance hierarchies *very* sparingly. Using them to
  represent algebraic data types is a good use. If you have an animal
  or vehicle hierarchy, think about what you are doing. Chances are,
  representing them with composition is better. 
- Don't join views in views in postgres. Might destroy your
  performance.
- Check that your database uses the correct encoding, collation and
  and correct time zone.
- You don't have a backup until you have tested a backup.
- Resist the urge to rewrite everything. Try to figure out a way to do
  it piece by piece. Start with the part of the code, that blocks
  upgrading everything else and slowly work from there.
- If you enjoy it, take a problem you have solved and try to work
  through it without the time pressure of work and express it with
  newer language features or try to solve it with another language
  entirely. That will teach you a lot about everything involved.
- If you are switching jobs every year, you won't have the ability to
  actually learn how your decisions affect the development of a
  product in the long term.
- Learn Haskell and Lisp (Clojure or Racket). Not because you will use
  them, but because learning their language features will allow you to
  learn and understand most programming languages much faster.
  Especially newer ones, as they have started to incorporate many
  features of Haskell and Lisps. Might be good to throw in a low level
  language like C or Rust as well.
- It's fine to host your software on your own servers and not use
  cloud providers. They are pretty expensive. But there is a time for
  that as well.
- Be really, really sure, that you need Oracle as a database. It'll
  just cost you a fortune, not just for licensing but also for the DBA
  and their knowledge and it will be exceptionally hard to move away
  from it. Just start with Postgres.
- In general, at least think about, how you could move away from a
  library or piece of technology. Often enough it'll come around to
  bite you some day.
- Try to simplify where you can. Look at Go for a good example of a
  language that drastically simplifies. I don't like working with Go,
  but I cannot deny, that due to the lack of abstractions and options,
  you just get stuff done.
