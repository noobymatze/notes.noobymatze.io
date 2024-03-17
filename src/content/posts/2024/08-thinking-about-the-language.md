---
title: Compiling expressions
summary: |
    Playing around with compiling expressions to WASM.
tags: []
date: 2024-03-17
author: Matthias
---

Alright, so two weeks have passed, since I have written anything on here. Time
to get going again.

My goal for 2024 is to implement a simple programming language that
compiles to [WebAssembly](https://webassembly.org/) and that I can use
to solve at least one Advent of Code problem. 

This post is just a small note on where I am. More detailed posts on the lexer
and parser will be coming in the next few weeks. Currently I am making baby
steps in compiling an AST to WebAssembly instructions using the library
`wasm_encoder` in Rust. More on that in the next few weeks as well.

But I am unsure of an elegant way to compile an expression like `(+ 3 5)` to
WebAssembly.


## Compiling

For now, let's assume the abstract syntax tree is defined like this:

```rust
enum Expr {
    Number(f64),
    Symbol(String),
    List(Vec<Expr>)
}
```

That would mean the following piece of code

```clojure
(/ (* 7 5) 2)
```

would be parsed into the following concrete syntax tree


```rust
Expr::List(vec![
  Expr::Symbol("/"),
  Expr::List(vec![
    Expr::Symbol("*"),
    Expr::Number(7.0),
    Expr::Number(5.0),
  ])
  Expr::Number(2.0),
])
```

Compiling it to WebAssembly should yield the following instructions.

```sh
f64.const 7
f64.const 5
f64.mul
f64.const 2
f64.div
```

If you are confused about these instructions, do not worry. They become more
understandable, when we go on a brief tangent about a cool concept called stack
machines.


## Stack machines

As far as I understand, stack machines are machines, where temporary values
live on a stack instead of in registers. Consider the compiled program from
before, this time annotated with the values on the stack during execution.

```sh
            # []
f64.const 7 # [7]
f64.const 5 # [5, 7]
f64.mul     # [35] (7 * 5)
f64.const 2 # [2, 35]
f64.div     # [17.5]
```

As you can see, we start with an empty stack. `const` pushes a literal value on
the stack (there are also variants for integers). `mul` pops the first two
values from the stack, multiplies them and pushes the result back onto the
stack. `div` does the same with division.

What confused me, was the order of arguments from the stack that `div` used. I
was expecting, that the operands would be "filled in" from left to right and
not from right to left. So, that

```sh
const a
const b 
div
```

would result in `b / a` and not in `a / b`. That would result in the following
program, which I compiled the expressions to at first.

```sh
f64.const 2
f64.const 5
f64.const 7
f64.mul
f64.div
```

Additionally I thought this was reverse polish notation, but while researching
for this post, I realized, that the actual compiled program was in reverse
polish notation.


## Back to compiling

So now, it seems to compile an expression like `(+ 3 5)` I essentially need to
flip around the operator/function `(3 5 +)` and then just emit the
corresponding instructions. I am just not yet sure, whether that is how it's
done and whether I should do this in a pass before emitting instructions or
while emitting instructions.

Well, we'll see.
