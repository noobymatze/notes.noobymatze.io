---
title: Writing a simple LISP interpreter
summary: Trying a small post
tags: []
date: 2023-03-24
author: Matthias
draft: true
---

## Introduction

I have been fascinated by programming languages since my first
programming course in university. Unfortunately, even 13 years later,
I don't know much about implementing programming languages, but I do
want to change that.

The simplest way to learn about something is to just make stuff and
try to teach or write about it. So without further ado, let's get the
first 10000 dumb programming languages out of the way... just kidding.

In this article, we are going to implement a very simple lisp
interpreter without many abilities. I might extend it in some future
articles. If you want to read a good article about this, by an actual
expert and not some random guy from the internet, I absolutely
recommend this article by Peter Norvig: https://norvig.com/lispy.html



## Approaches

There are many different approaches to implementing programming
languages and their different phases, from tree walking interpreters,
to VMs to compiling them to other languages.

In this case, we are just going to implement a simple tree walking
interpreter in Typescript with a separate lexing step. The approach to
lexing and parsing uses a variant from [Crafting
Interpreters](https://craftinginterpreters.com/), but adapted to
Typescript, while trying to keep it as simple as possible.

The whole implementation can be found
[here](https://gist.github.com/noobymatze/62805a751c91999e02f2976639608c0c).


### Lexing/Tokenization

Lexing can be one of the first steps in any interpreter or compiler
pipeline. It means breaking up the input/source code into known groups
of characters called *tokens*.

As far as I know, this step is not always necessary and moreover, in
more complex languages, it cannot always be cleanly separated from the
actual parsing step. However, it does make parsing a bit simpler, as
we don't have to deal with whitespace or characters, we don't care
about.

Most of this is going to be more clear, when seeing an example. Let's
take a look.

```clojure
(def name "World")
(println (str "Hello, " name "!"))
```

After tokenizing the input, we might get the following list of
simplified tokens.

```typescript
['(', 'def', 'name', '"World"', ')',
 '(', 'println', '(', 'str', '"Hello, "', 'name', '!', ')', ')']
```

In our case a Token looks a little more complicated, but just because
we want a simpler way to distinguish between strings and symbols.


```typescript
type Token
    = { type: '(' }
    | { type: ')' }
    | { type: 'number', value: number }
    | { type: 'string', value: string }
    | { type: 'symbol', value: string }
```

With the types out of the way, let's get to 

So, let's start small with the signature and a 

```typescript
function lex(input: string): Token[] {
    // STATE
    let pos = 0;
    let startPos = 0;
    const tokens: Token[] = [];
```

```typescript
    // BASICS
    const isAtEnd (): boolean => pos >= input.length;
    const peek = (): string => input[pos];
    const advance = (): string => input[pos++];
```

Then we need a few helpers to categorize characters.

```typescript
    const isDigit = (c: string): boolean =>
        '0' <= c && c <= '9'

    const isAlpha = (c: string): boolean =>
        ('A' <= c && c <= 'Z')
          || ('a' <= c && c <= 'z')
```

```typescript
    while (!isAtEnd()) {
        const c = advance();
        switch (c) {
        case ' ':
        case '\n':
        case '\t':
        case '\r':
            break;
        case '(': 
            tokens.push({type: '('});
            break;
        case ')': 
            tokens.push({type: '('});
            break;
        case '"': 
            string();
            break;
        default: 
            if (isDigit(c))
                number();
            else if (isSymbolInitialChar(c))
                symbol();
            else
                console.log(`Unknown character at ${pos}: `, c);
        }
    }
}
```

Okay, so let's just try this out:

```typescript
const args = Deno.args
console.log(lex(args[0]));
```

and run with deno

```bash
$ deno run main.ts '(+ 5 6)'
[
  { type: "(" },
  { type: "symbol", name: "+" },
  { type: "number", value: 5 },
  { type: "number", value: 6 },
  { type: ")" }
]
```

### Parsing

```typescript
type Expr
    = { type: 'number', value: number }
    | { type: 'string', value: string }
    | { type: 'symbol', value: string }
    | { type: 'list', value: Expr[] };

function parse(tokens: Token[]): Expr[] {
    let pos = 0;
    
    const isAtEnd = () => pos >= tokens.length;
    const peek = () => tokens[pos];
    const advance = () => tokens[pos++];
    
    const expr = (): Expr => {
        const token = advance();
        switch (token.type) {
        case 'number': return token;
        case 'string': return token;
        case 'symbol': return token;
        case ')': 
            throw 'Ups, found unbalanced paranthesis.'
        case '(':
            let expressions: Expr[] = [];
            while (!isAtEnd() && peek().type != ')') {
                expressions.push(expr());
            }
            advance(); // Consume ')'
            return { type: 'list', expressions };
        }
    };
    
    const expressions: Expr[] = [];
    while (!isAtEnd()) {
        expressions.push(expr());
    }
    
    return expressions;
}
```


### Evaluate

```typescript
type Env = {
    bindings: { [sym: string]: any },
}

const defaultEnv = {
    bindings: {
        '+': (values: any[]) => 
            values.reduce((a, b) => a + b, 0),
        '-': (values: any[]) => 
            values.reduce((a, b) => a - b),
        '*': (values: any[]) => 
            values.reduce((a, b) => a * b, 1),
        '/': (values: any[]) => 
            values.reduce((a, b) => a / b),
        'str': (values: any[]) => values.join(''),
    }
};


function evaluate(env: Env, expr: Expr): any {
    const evalList = (expressions: Expr[]): any => {
        if (expressions.length === 0) return [];
        const [proc, ...rest] = expressions;
        const fn = evalHelp(proc);
        const args = rest.map(evalHelp);
        return fn(args);
    };

    const evalHelp = (e: Expr): any => {
        switch (e.type) {
        case 'number': return e.value
        case 'string': return e.value
        case 'symbol': return env.bindings[e.value];
        case 'list': return evalList(e.expressions)
        }
    };
    
    return evalHelp(expr);
}
```

