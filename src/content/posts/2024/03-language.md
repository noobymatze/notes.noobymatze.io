---
title: Language
summary: |
    This post explores how to work and interact with the language.
tags: []
date: 2024-01-12
author: Matthias
---

My goal for 2024 is to implement a simple programming language that
compiles to [WebAssembly](https://webassembly.org/) and that I can use
to solve at least one Advent of Code problem. In this post I try to
nail down, how to language should look and how it can be used.

I have to confess something. I am undecided. I have been programming
in many languages and syntactically I still like Clojure (Lisp in
general) and Haskell the most. Here are two very simple examples.

```haskell
-- Haskell
hello name = 
    "Hello " <> name <> "!"
    
hello "Matthias"
```

```clojure
; Clojure (replace (name) with [name])
(defn hello (name)
    (str "Hello " name "!"))
    
(hello "Matthias")
```


#### Which one to build?

So which one should I use to base my language on?

The reason I like Haskell syntactically is, that it reduces most
programming constructs to their bare essence. When everything is
immutable and therefore a value, there is no need for a keyword to
denote that something is immutable[^immutable]. When a "variable
assignment" (`x = 5`) can be viewed as a function, that always returns
the same value (`5` in the example), there is no need to differentiate
between functions and variables. When every programming construct
returns a single value, there is no need for braces. I could go on,
but trying to reduce things to their essence is inspiring and makes
the language simpler, which is always good.

The reason I like Lisps syntactically is, that besides a few
primitives (numbers, booleans, strings, characters), everything is a
list. That means the language is very consistent. Semantically, the
first element of every list is a function and all other elements are
their arguments. That's all there is to it. That also means to add 3
numbers it's possible to just write `(+ 3 5 6)` instead of `3 + 5 +
6`. The latter may feel more familiar, but because we and a compiler
have to keep track of precedence rules, it is more complex (`*` should
be called before `+`).


#### Conclusion

I should have written much more about data types, expression based
languages and much more. Unfortunately, I don't have much time this
week, so this post is going to be a bit short.

To decide which syntax to use, there is one argument that trumps all
others for me at the moment. Since I am a beginner in implementing
compiler like programs, parsing a Haskell-like syntax is more involved
than parsing a Lisp. In a Lisp, there is no need to think about
indentation levels and operator precedence.

That's why I will be going with a Lisp like syntax.



[^immutable]: See `val` in Kotlin, `const` in JavaScript, `final` in
    Java, `let` in Rust. Of course for the first three languages, it
    depends on the type of variable, if they are actually
    immutable. For example `const person = {name: 'Foo'}` in
    JavaScript still allows to change the name in the next line.
