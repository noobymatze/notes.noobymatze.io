---
date: 2017-02-03T23:40:42+01:00
title: Monoids and Semigroups in the Real World
tags: []
author: Matthias
summary: |
  This post goes on a journey to try to motivate using semigroups
  and monoids in the real world.
---


"I do not need math and theory to build a CRUD app", "Why would anyone
ever proof a piece of code?", "Why do I need semigroups and
monoids?". These are some of the phrases, I have heard on a number
of occasions.[^thats-a-lie] During my first semesters at university, I
remember questioning the use of math in day to day programming myself. 

Indeed, for combining different sets of libraries, mathematical
structures might not seem to be that useful.[^thats-another-lie] While
implementing business logic though, realizing that a piece of data
resembles a mathematical object, potentially enables the use of a
number of proven operations for said piece of data, thus even serving
as documentation of sorts.

*Semigroups* and *monoids* are such objects. In essence, they allow
for combining instances of a data structure and enable
parallelization, due to the nature of their laws.

In this post, we will shortly recap their definitions, evaluate
different instances of monoids in Java and try to give a practical
example of their use.


## Semigroups

Let `$S$` be any set. Let `$f$` be a binary operation `$f: S~x~S
\rightarrow S$`, such that `$f$` is associative:
`$$f(f(a,~b),~c)~=~f(a,~f(b,~c))$$` Then the tuple `$(S,~f)$` is called a
semigroup.

A typical mathematical example of a semigroup is `$(\mathbb{N},
+)$`. It is the set of natural numbers with addition as binary
operation. Another frequent one is `$(\mathbb{Z}, \cdot)$`. By
contrast `$(\mathbb{Z}, -)$` is not a semigroup, since subtraction is
not associative.[^sorry-mathematicians]

These structures form semigroups in the realm of mathematics,
though. To make matters practical, there are a number of data
structures in day to day programming, which form semigroups as
well. For Java specifically:

- `List<T>` with concatenation forms a semigroup. 
- `String` with concatenation formsis a semigroup.
- `Function<T, T>` with composition formsis a semigroup.
- `Optional<T>` forms a semigroup, provided `T` forms one.

At first glance `Optional<T>` does not seem like a semigroup and it is
not, except when the contained type `T` is a semigroup. This shows a
useful property of semigroups and consequently, monoids: They can be
built up recursively.


## Monoids

*Monoids* are just a simple 'extension' of semigroups. Besides requiring
a binary, associative operation, monoids require an identity
element (`$e\in S$`), such that:

1. `$f(a, e) == a$`
2. `$f(e, a) == a$`

It does not matter how `$e$` and `$a$` will be combined, the result
will always be `$a$`.

To see how this is useful consider a `List<T>` where `T` forms a
semigroup with some binary operation and you would like to reduce all
of them to a single value of type `T`. How would you handle an empty
list?

What if `T` was a monoid?

`List<T>`, `String`, `Function<T, T>`, `Optional<T>` all form monoids
with the mentioned operations.


## Code

To bring this rather abstract notion into practice, we will take a
look at an example from the real world and try to generalize from
that.


### Lies, damned lies and school statistics

Imagine modeling schools and their classes. For our purposes, classes
will suffice at the moment. One representation might look like this:

```java
class SchoolClass {
  final List<Pupil> pupils;
  final String name;
}
```

With this in mind, how would you go about counting the number of
pupils in a list of classes?

```java
public int sumPupils(List<SchoolClass> classes) {
  return classes.stream().mapToInt(c -> c.pupils.size()).sum();
}
```

What about joining their names?

```java
public String sumNames(List<SchoolClass> classes) {
  return classes.stream().map(c -> c.name).collect(joining(","));
}
```

What about cumulative age of all pupils? Or their average age?
Creating a method for each of those questions is a perfectly valid
approach, but there are a number of problems with it as well.

It encourages utility methods in an ad-hoc fashion. In turn, this may
lead to duplicate logic in the long run. Consider the following: How
would you add another name after calling `sumNames`? To be able to do
that, you would need to know *how* the names have been joined.

Following this line of thought, both of these methods actually do
*two* things. Firstly, they extract data and secondly, they combine
said data. This distinction might seem pedantic, but it is at the core
of why monoids can solve this elegantly.

Generally, whenever you find yourself writing methods like the above,
take a step back and ask yourself, whether there is a better way.
Most of the time, operating on a single element of the list will
provide much greater flexibility and extensibility. This is because
the resulting function can be used in different contexts, namely in
every generic data structure implementing `.map` (i.e. `Stream`,
`Optional`).

In case of the school classes, instead of transforming the whole list,
let us take a look at just one `SchoolClass`. There seems to be a need
for statistics on a per class basis. Nothing simpler than that!


```java
final class SchoolClassStats {
  final long value;
  final String names;
  
  SchoolClassStats combine(final SchoolClassStats stats) {
    String names = "";
    if (!this.names.isEmpty() && !stats.names.isEmpty()) {
      names = names + ", " + stats.names;
    }
    else if (!this.stats.names.isEmpty()) {
      names = stats.names;
    }
    else if (!this.names.isEmpty()) {
      names = this.names;
    }
    
    return new SchoolClassStats(
      value + stats.value,
      names
    );
  }
  
  static SchoolClassStats identity() {
    return new SchoolClassStats(0L, "");
  }

}
```

`SchoolClassStats` now solely handles combining different elements and
also: it is a monoid, so we can check its properties with [quickcheck][1]
(hoorraaaay!).

```java
// identity element
identity().combine(a).equals(a)
a.combine(identity()).equals(a)

// associativity
a.combine(b).combine(c).equals(a.combine(b.combine(c)))
```

There are several benefits to this:

- There are laws for working with `SchoolClassStats`.
- Nothing about `SchoolClassStats` except for the name is specific to
  `SchoolClass`. They are completely decoupled. If it weren't for
  joining the names, this could be an ordinary tuple.
- Tracking an additional metric is as simple as adding another
  property.
- A value of `SchoolClassStats` can easily be cached or "updated" in a
  streaming fashion.
- `SchoolClassStats` is immutable and thus thread-safe. That means it
  is easy to split up a large aggregation.

Of course, there are some drawbacks as well:

- There is a much higher number of objects being created and destroyed
  very quickly.
- There is no indication, except for comments, that this class
  fullfilles the monoid laws.

Knowing how to combine stats is just one part of the equation,
though. The other is extracting them. This can be done in
`SchoolClass` itself.

```java
class SchoolClass {
  SchoolClassStats stats() {
    return new SchoolClassStats(
      this.pupils.size(),
      this.name
    );
  }
}
```

Building up stats over a number of classes becomes very simple this
way.

```java
classes.stream().
  map(SchoolClassStats::stats).
  reduce(identity(), SchoolClassStats::combine);
```

In the beginning I talked about `Schools`, so let's take a look at a
simplified version of schools.

```java
class School {
  final List<SchoolClass> classes;
  final List<Teacher> teachers;
}
```

As it stands in this example, the school itself is a monoid as well.
Additionally, we can build up stats, just like with classes.

```java
class SchoolStats {
  final int classes;
  final SchoolClassStats classStats;
  final int teachers;
  
  SchoolStats combine(SchoolStats stats) {
    return new SchoolStats(
      classes + stats.classes,
      classStats.combine(stats.classStats),
      teachers + stats.teachers
    );
  }
  
  static SchoolStats identity() {
    return new SchoolStats(
      0, SchoolClassStats.identity(), 0
    );
  }
}

// and then:
SchoolStats s = schools.stream().
  map(School::stats).
  reduce(identity(), SchoolStats::combine);
```

See how we used our own monoid `SchoolClassStats` this time, to build
up an even bigger monoid, which allows us to gain insight about a
number of schools?

This shows, how monoids allow for composition and to build up the
solution recursively.


### Generalizing

The solution implemented in the previous section does not allow for
generic reuse, though. Instead it just provides a small framework to
think about these things. There are several ways to enable some form
of reuse in Java, but none is as powerful, as the solutions in
Haskell, Scala or Rust.

The problem with Java is, that it is not possible for interfaces to
contain static methods, which have to be implement and consequently
for the compiler to figure out which method to call based on the usage,
of the result.

In other words, unlike in Haskell, the following is not possible.

```java
SchoolClassStats s = Monoid.identity();
```

So let us take a look at how we still might try to implement monoids
in Java and how some popular libraries do it.


#### Classes

One way is to build a class with the identity element, where there is
an identity element and some form of combination.

```java
final class Monoid<T> {
  final T identity;
  final BiFunction<T, T, T> combiner;
}
```

This is how monoids have been implemented in [Elm][5].

#### Interfaces

Another one is just to use interfaces and let school stats implement
them.

```java
@FunctionalInterface
interface Semigroup<T> {
  T combine(T a, T b);
}

interface Monoid<T> extends Semigroup<T> {
  T identity();
}
```

Both these solutions entail the drawback though, that our
`SchoolStats` and `SchoolClassStats` cannot just implement these
interfaces directly, but have to provide a static field or method for
retrieving an implementation of these methods.

```java
class SchoolClassStats {
  static final Monoid<SchoolClassStats> MONOID = new Monoid<>() {
    pulbic T identity() {
      return SchoolClassStats.identity();
    }
    
    public T combine(SchoolClassStats a, SchoolClassStats b) {
      return a.combine(b);
    }
  }
}
```

This is how [javaslang][3] and [functional java][4] implement a monoid
and the only sensible way to implement them generically in Java. But
it feels clumsy nonetheless and there is no real gain over our manual
solutions, with simply using `Stream`. This is because the actual
implementation for a concrete class always has to be referenced when
trying to use a generic method (like a fold) anyways. 


#### Interfaces 2

Yet another solution might be to just implement a semigroup interface
for the class itself.

```java
@FunctionInterface
interface Semigroup<T extends Semigroup<T>> {
  T combine(T other);
}
```

This has the drawback though, that it is not possible to build a
monoid interface, since the identity method would have to be a static
method and they cannot be forced to be implemented in Java -
unfortunately.

The advantage though, is a clear indication, that a concrete class is
a Semigroup and consequently, maybe even a monoid.


#### Reducing method

The last case enables us to implement something like the following:

```java
classes.stream().
  map(SchoolClass::stats).
  collect(Monoid.reducing(SchoolClassStats::identity));
```

But this does not seem to be that useful, to be honest. It might be
useful, if it was possible to use something akin to the following:

```java
classes.stream().collect(Monoid.reducing());
```

But I do not know of any way to implement this.


## Conclusion

In this post, we took a look at working with monoids. A monoid is a
tuple of a set and an accompanying binary operation. It has an
identity element. Monoids emerge in a variety of places,
i.e. statistics, shopping carts, geometry and allow for lawful
composition.

In programming, they allow for a clean separation between extracting
and combining data. In your next project, I can just encourage you to
try and find monoids, they have helped me a bunch of times already.

I hope there was something of value for you in this post.


[^thats-a-lie]: Well, I lied to you there. I only need the question
    about semigroups and monoids to plead my case in this post. ;-)
[^thats-another-lie]: Using several approaches from functional
    programming allows for generically combining many libraries.
[^sorry-mathematicians]: I am sorry, my dear mathematicians, for any
    hand waving and false claims made here. You may stop reading now.

[1]: https://github.com/pholser/junit-quickcheck
[2]: https://www.infoq.com/presentations/Simple-Made-Easy
[3]: http://static.javadoc.io/io.javaslang/javaslang-pure/2.0.0/javaslang/algebra/Monoid.html
[4]: http://www.functionaljava.org/
[5]: http://package.elm-lang.org/packages/arowM/elm-monoid/latest

