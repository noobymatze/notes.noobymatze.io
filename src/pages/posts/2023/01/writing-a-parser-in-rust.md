---
layout: ../../../../layouts/Note.astro
title: Writing a Parser in Rust
---

# Writing a Parser in Rust

I am currently working on a small interface description language (IDL)
called wRPC. Its goal is to make describing RPC-like APIs a delight.

As part of that journey, I have been building a recursive descent
parser from scratch in Rust. Most of its design is inspired by the
brilliant book ["Crafting
Interpreters"][crafting-interpreters]. However, there is one part I am
still struggling with: *good error reporting*. In general, there seems
to be a lack of material on how to implement good error messages in a
compiler. Most articles or books omit the topic, because it is
"tedious and trivial string mangling".

While it might be tedious, it is certainly not trivial for me. So I
decided to clarify my thoughts on it, by writing about it.
 

## What do we want to parse?

Before we start to implement the parser, let's take a look at the
first simple language construct, we are trying to parse.


```rust
data Person {
    name: String,
}
```

This is a data declaration in wRPC. It is akin to `data class` in
Kotlin, `record` in Java, `interface` in TypeScript, `struct` in Rust,
`data` in Haskell and so on. You get the idea. This declaration is
contained inside a module. wRPC actually has two other kinds of
declarations, but their error handling would not be different.

An AST representation in JSON might look something like this:

```json
{
    filename: null,
    declarations: [{
        "type": "Data",
        "name": "Person",
        "properties": [{
            "name": "name",
            "type": "String",
        }]
    }]
}
```


## Lexing

```rust
struct Lexer<T = Iterator<Item = char>> {
    input: T,
    pos: u32,
    line: Line,
    col: Col,
}
```



[crafting-interpreters]: https://craftinginterpreters.com/
[grpc]: https://grpc.io/
