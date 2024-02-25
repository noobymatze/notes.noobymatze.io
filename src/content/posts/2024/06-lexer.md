---
title: Building a Lexer - Part I
summary: |
    Starting to build a lexer for my language.
tags: []
date: 2024-02-18
author: Matthias
---

My goal for 2024 is to implement a simple programming language that
compiles to [WebAssembly](https://webassembly.org/) and that I can use
to solve at least one Advent of Code problem. In this post we will 
be implementing a simple lexer for the [language](/posts/2024/03-language).

A lexer is a program, that collects sequences of meaningful characters
into chunks. These chunks are called tokens, which are annotated with
a type and later used as input for a parser. For example `3` would be
a token, which represents a number. Characters, that don't matter for
the language can be ignored (e.g. `' ', '\t', '\n'`). Characters that
are unexpected are reported as errors.

Take a look at the following program, which should print `Hello World!`.

```clojure
(println "Hello World!")
```

The left parenthesis `(` denotes the beginning of an expression in
Lisp. That means it is a meaningful character and at the same time the
first token. The second token `println` is a meaningful sequence of
characters, which references a function. Such references are called
symbols. The space between `println` and `"` is just ignored and not a
token, as it does not matter for the execution of our program. `"Hello
World!"` is a string token and the third token. The right parenthesis
`)` is the fourth and last token and denotes the end of an expression.


## A note on existing libraries

There are countless tools and libraries to implement lexers. IntelliJ
uses [JFlex][jflex] for custom languages, in Rust there is
[logos][logos], which focuses on speed and ergonomics (and seems to
nail it).

I like implementing things from scratch to know how they work. That's
not possible in all cases and circumstances, but in this case it is
and that's why I am trying not to use any library, that might make my
life easier. At least on the first pass.

With a Lisp, it would probably be possible and rather simple to skip
lexing completely and just implement a [pest][pest] grammar or use a
parser combinator library like [nom][nom] or [combine][combine] or
[chumsky][chomsky]. I think I might revisit logos and pest in a later
post and see how much simpler they make my life.

From a usage perspective, I still feel like pest is one of the most
elegant ways to implement a parser.


## Implementing a lexer

This section is divided into three parts. First a `Span` is introduced
to store the position of `Token`s. Then a `Token` is introduced to
represent the various tokens in this language and finally a `Lexer`
with the two primitive operations `advance` and `peek` is introduced.

Tracking the position of tokens is important for displaying good error
messages. Most compilers I have seen in the wild use a type called
`Span`, that stores the start and ending positions of tokens.

```rust
#[derive(Debug, Eq, PartialEq, Ord)
struct Span {
    start: u32,
    end: u32,
}
```

There are others ways to represent this information. For example the
Elm compiler uses a [`Region`][region] type, which instead stores line
and column information for the starting and ending positions of a
token. I have used this type in my previous attempts and it works
well, but I don't know enough about compiler development to see the
trade-offs between `Span`s and `Region`s, which is why this time, I
will just be trying out `Span`s. 

Ok, now let's declare a `Token` type.


```rust
#[derive(Debug)
enum Token {
    LParen(Span),
    RParen(Span),
    Symbol(Span, String),
    Number(Span, f64),
}
```

Simple, there are four kinds of tokens: `(`, `)`, symbols and
numbers. I have deliberately left out strings, because these four
tokens should suffice to get a simple calculator like language to
compile to WASM. Since WASM does not support strings natively adding
strings is more complicated than working with numbers. Since I don't
have much experience, my goal is to get the whole pipeline to work and
then move on to more complicated matters.

Now let's move on to modeling a lexer. A lexer needs to be able to
consume characters, track position information and report errors. In
Kotlin I would just define a `data class Lexer` and store the input as
String. In Rust however returning a character at a position from a
`String` or `&str` is pretty finicky and I have yet to fully
understand these types. So I have essentially stolen the design from
the [gleam][gleam] compiler. [Gleam][gleam-lang] is a functional
language, that compiles to WebAssembly and to BEAM.

They define a lexer as an `Iterator` that produces items of
`LexResult` and takes an `Iterator` of chars as input.

```rust
#[derive(Debug)
enum Error {
    BadChar(u32, char),
}

type LexResult = Result<(Span, Token), Error>

#[derive(Debug)
struct Lexer<T: Iterator<Item = char>> {
    input: T,
    pos: u32,
    pos_start: u32,
    char0: Option<char>,
}
```

`char0` is used to allow peeking at the next `char` in the input
without "moving the iterator forward". Imagine you are at the end of
reading a number digit by digit.

```text
3.14ab
   ^
```

If there was no way to peek at the next character, we would need to
advance the `Iterator` by one character, determine, that `a` is not a
digit and lose `a` in the process, because we cannot backtrack and
there is no way to store `a`.

With `char0` though, we can implement a `peek` operation, that asks
the input for the next character and stores it. 

```rust
impl <T: Iterator<Item = char>> Lexer<T> {

    fn peek(&mut self) -> Option<char> {
        if self.char0.is_none() {
            self.char0 = self.input.next();
        }
        
        self.char0
    }

```

Now, when we actually want to advance and take the next character from
the input, we first try to take the value from `char0` and if it does
not exist, we get the next value from our input.

```rust

    fn advance(&mut self) -> Option<char> {
        self.pos += 1;
        self.char0.take().or_else(|| self.input.next())
    }

}
```

## Conclusion

That concludes the first part of implementing a lexer. This article
laid the groundwork structuring the basic parts like errors, position
information and tokens. The next part will focus on using `advance`
and `peek` to implement lexing the tokens we defined in this post
(strings, numbers, `(` and `)`). Additionally, it will also tackle the
implementation of `Iterator<Item = LexResult>` for the `Lexer` to
allow using it later in the parsing phase. It will also contain some
tests to make sure the lexer works as intended.

Stay tuned, cheers.


[gleam]: https://github.com/gleam-lang/gleam/blob/main/compiler-core/src/parse/lexer.rs
[region]: https://github.com/elm/compiler/blob/master/compiler/src/Reporting/Annotation.hs#L72
[gleam-lang]: https://gleam.run/
[logos]: https://github.com/maciejhirsz/logos
[jflex]: https://www.jflex.de/
[pest]: https://pest.rs/
[nom]: https://github.com/rust-bakery/nom
[combine]: https://github.com/Marwes/combine
[chomsky]: https://github.com/zesterer/chumsky
