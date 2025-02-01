---
title: "This week I learned 1"
summary: "Reflecting on error handling, nixOS, server admin and Data Oriented Design"
date: 2025-02-01
author: Matthias Metzger
draft: false
tags: []
---

After an ok start last year, my writing fell off... that's an
understatement, I basically didn't write anything during the rest of
the year. This year, I’m going to try something different. I still
haven’t established a writing habit, and I need to cultivate one.

So, let’s see if I can occasionally write about what I learned over
the course of a week.

## Data Oriented Design

I feel like I have been stuck on a plateau in programming for some
time now. The only way forward is to just keep slogging through and
implement more complex stuff and educate myself and think through
things by writing about it, I think.

However I did stumble upon a brilliant talk ["Practical Data Oriented
Design"][kelley] by Andrew Kelley, creator of the [Zig][zig]
programming language, that felt like gaining experience without doing
anything.

I wholly recommend watching this talk. It's definitely one of the best
talks I know. Here are some interesting tidbits:

- It might be faster to re-calculate a computation than to cache its
  result.
- In some programming languages the order of field declarations in
  classes/data types might influence the size of said data structure
  in memory.
- Heap allocation is slow, so if you want fast code, avoid it as much
  as possible.
- Due to cache locality, a struct of arrays might be faster, than an
  array of structs.
  
All of this, of course, depends on how you use your data and what its
access patterns are, which is why it's called data oriented design.
Bet you didn't see that one coming.


## Error handling in SwiftUI

It's always interesting to see different approaches to error handling
in applications. The one I came across this week was to define a `View`
that can display an error using parameters, and then rely on some sort
of navigator containing various error configurations:

```swift
struct ErrorView {

    struct Params {
        let title: String
        let message: String
    }

    let params: Params

    var body: some View {
        // ...
    }

}

struct Navigator {

    let state: State

    func networkError() {
        let params = Params(title: "Foo", message: "Bad stuff") 
        state.navigateToError(params)
    }
    // Other methods
    
}
```

It was a bit more involved, but I've left out the rest for
brevity. While this approach can work in simple cases, I see a few
issues with it:

1. It only works under the assumption that all errors share exactly
   the same properties. If you introduce just one error, that deviates
   from this norm, this pattern breaks down, and you'll start adding
   workarounds. Either by adding nullable properties on `Params`, a
   special view for the outlier error, or - worse - by using
   inheritance and performing instance checks.
2. You tie the rendering of the error to its definition. This is
   subtle, but imagine having two technically different errors that
   looked the same to the end user. How would you differentiate them
   if you only have `Params`?
3. Putting all errors in the `Navigator` is a convention, that must be
   enforced during code reviews. Because of problem #1, you might end
   up deviating from this convention and scattering error definitions
   throughout the system.

Ever since I learned Haskell in 2015, I've typically followed a
slightly different approach (there we have a tangible reason to learn
Haskell, even if you don't use it).

1. Define a sum type (an `enum` in Swift and Rust, a `sealed class` in
   Kotlin and Java or a tagged union in other languages) that declares
   all known errors.
2. (Optional): Subdivide known errors based on logical parts of the
   system. For example, if you have an `OrderService` that defines its
   own error type, add a case for it in the global error type
   (e.g. `case order(problem: OrderService.Problem)`).
3. Create a single view that just switches over all errors and renders
   them appropriately.

```swift
struct ErrorView {

    enum Problem {
        case networkError
        // more errors
    }
    
    let problem: Problem

    var body: some View {
        switch problem {
        case .networkError:
            Text("Bad stuff")
        }
    }
}
```

The advantages of this approach are:

1. You have full freedom over which error needs which properties.
2. There is a single place to define all errors, and you will be
   screamed at by the compiler if you need to adjust the code anywhere
   else.
3. There is no need at all for a specialized `Navigator`. If you do
   need one, a single simple function will usually suffice, reducing
   cognitive load and accidental complexity.
4. Since the errors are defined declaratively, their interpretation
   (log to file, send to server, show to user, blow up) can be decided
   at the call site. This principle is powerful and ties back to
   [value][value] of using descriptive data structures, instead of
   immediately executing what you want to do. But beware, you can also
   overdo it.
   
Aside: I am very excited for the [Roc][roc] programming language because I
think its error handling will be even better than this, as you won't
have to declare all errors upfront.


## Server administration

I was researching how to setup servers without manually doing all the
steps and was also wondering, whether I could use something like
[nixOS][nix] or nix shell for that.

Kubernetes is not an option, that's just too much for the need to
manage a number of VPS servers with NGINX/Caddy, letsencrypt, JVM and
a postgres database, plus a little bit of SSH hardening.

I think [ansible][ansible] might be the way to go here, but nix at
least seems very interesting to build artifacts and do it
consistently. So, maybe Gitlab runner and nix could make a nice pair
for easy to setup and reproducible builds.

I don't know yet, I think I understand nix in principle and it feels
like it could be a game changer for server administration, but I am
not sure yet, whether I fully trust it or if something frequently
breaks.

Interestingly, it shares the same principle as the error handling
example from before, as I just need to declaratively describe the
state a system should be in and the rest will be done for me. However,
I don't know whether that works in practice and how stable it
is. Maybe I'll try it out on one of my servers.



[nix]: https://nixos.org/
[ansible]: https://www.redhat.com/en/ansible-collaborative
[value]: https://www.youtube.com/watch?v=-6BsiVyC1kM
[roc]: https://www.roc-lang.org/
[kelley]: https://www.youtube.com/watch?v=IroPQ150F6c
[zig]: https://ziglang.org/
