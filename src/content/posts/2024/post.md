---
title: "Notes"
summary: "Just some notes"
date: 2024-09-02
author: Matthias Metzger
draft: true
tags: []
---


# Reducing abstractions

I find it quite interesting, and I think we are at a point in the industry,
where several movements over the past 10 to 15 years are shifting back. 

I have seen people in the past on HN and lobste.rs taking about how there is
nothing new under the sun and most of what we have today has been there 70
years ago, just in different clothing. I don't fully agree with that, but it
feels like, we as an industry are starting to shift back again to less
abstractions.

The reason I think that, is because in contrast to 



# You should use a Result type

In 2016 I wrote one of my first blog posts about using a `Result<E, T>` for
error handling, instead of exceptions in Java. At that time, I believe it was a
much less mainstream view, than it is now in 2024, even though several
languages started to incorporate it into their 

While some languages like Elm and Haskell
had used this approach already, I believe it still was like washing your hands 

approach At the
time I believe this this view was like <insert analogous joke here>. However in
the past years, quite a few mainstream languages have started to adapt and
support some form of sum types and Result (think of enums, that might contain
associated data per instance).

have been writing about alternative error handling in Java with a Result type.
Interestingly, it was a pretty sidelined view back then, but I think today,
there have been more and 



# How do you write a delightful app?


# Functions is all you need

Templating languages are everywhere. From JSP, via Jinja, Handlebars, Velocity,
Freemarker, Askama, the built-in language in Go, they are everywhere. I assume
every mainstream programming language has at least one templating language.

However, for the longest time, something has been irking me about all of them,
especially since learning about JSX back when it was the new shiny thing. But
until I saw templ a templating language in Go, I could never point my finger to
why that is.

The reason is, that functions, expressions and a few built-in 
Many templating engines support several constructs to compose things in them.
Take Jinja for example. There are blocks, template inheritance, extensions and
so on. 









# Interface description languages

There is a curious number of small interface description languages cropping up.
Smithy is an example, protobuf another and typespec is a third. I don't know,
whether one would count OpenAPI into that category, but it is describing an interface.










# From Typescript to Haskell

If all you have been programming is 
So, you want to learn Haskell. 

Haskell is semantically and syntactically somewhat difficult to learn for
people. This is not a monad tutorial, but rather an experiment in education. 

When I was learning Haskell, I always tried to translate and relate syntax to a
language I know. Many people know Typescript or 

## Package Manager

## Variables

```typescript
const x = 5;
```

```haskell
x = 5
```

In reality though, it is more like the following:

```typescript
const x = () => 5;
```

```haskell
x = 5
```



## Functions

In Typescript you 

```typescript
const double = (x: number) => x * x;
```

```haskell
double x = x * x
```


## Types

In Typescript you 

```typescript
type Greet = { name: string }
```

```haskell
data Greet = Greet { name :: String }
```
