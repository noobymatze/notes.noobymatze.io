---
date: 2016-10-08T19:17:27+02:00
title: Exploring alternative error handling in Java
tags: []
author: Matthias
summary: |
    Using checked exceptions in Java has always been a pain, 
    especially since the release of Java 8. However, there 
    are other ways of handling errors.
---

Regardless of programming language, error handling is a fascinating
and necessary topic for all of them. As with any problem though, there
are very different ways of dealing with it. Some languages go with
language primitives like `try` and `catch`, others use error codes as
return values for handling erroneous conditions. Functional or
functionally inspired languages like [Elm][1], [Haskell][2]
or [Rust][3] tend to do the latter, but with data types instead of
codes. This enables the implementation of error handling as libraries,
which can evolve with usage patterns and requirements, without
changing the core language.

One of my all time favorite talks surrounding this topic
titled [Growing a language][4] by Guy Steele, one of the designers of
the Scheme programming language, as well as team member for the Java
programming language, goes into more detail. If you haven't seen it
yet, do yourself a favor and take a look. It's phenomenal.


### Exception handling in Java

Java obviously implements `try` and `catch` for handling
exceptions. Exceptions themselves even blend in nicely with the rest
of the language, since all of them are defined as classes.

Especially with the introduction of lambdas in Java 8 though, there
are some annoying dark corners. A simple example might be trying to
count the number of lines of all files in a given directory.

```java
Path directory = Paths.get("tardis");
Files.list(directory).mapToLong(p -> {
  try {
    return Files.lines(p).count();
  }
  catch (IOException ex) {
    return 0L; // Ugh...
  }
}).sum();
```

Since `long` types have a neutral element, this approach would
generally work fine. Imagine deserializing an arbitrary object
though. Is an exception during one of the files
an [error of the programmer][5]?  Should a `RuntimeException` be
thrown so no other file might be processed?

What if we wanted to know the exact path of every file, we weren't
able to process? The only way, we would be able to handle such cases
currently, would be to drop down to good old `for(..)`.

But that's boring and tedious, so let's look for an alternative.


### Error handling with Pair

Whether the next file should be processed after an error in the
previous one or not, depends on the business use case of course. But let's
pretend we would like to know, which path didn't quite work out and
still use the nice Stream API.

Well, what might happen in the above case? Either we get an
`IOException` or we get a `long`. Naively, we could model this as a
`Pair` or a `Tuple`, maybe even throwing in an `enum` to define which
state we are in. I called `FileCountResult` in this case.

```java
class FileCountResult {
  final Long value;
  final Optional<Path> errorPath;
  
  // OR
  enum ResultType { ERROR, LINES }
  final ResultType type;
  final Long value;
  final Path errorPath;
}
```

This approach comes with some caveats however. For one, we might be
able to initialize this result with a `long` *and* a `Path` which is
rubbish, since we want *either* one *or* the other. Especially with
the enum, there have to be methods to ensure consistency, which have
to be tested... which is more code... which has to be
maintained.... which... you get the point. Also, the compiler can be
quite helpful in checking these invariants for us, if we nudge it a
little.

In Haskell or Elm, we would be able to describe the `FileCountResult` in the
following way.

```haskell
data FileCountResult 
  = Lines Integer 
  | PathError Path
```

Basically, it means: There is a data type called `FileCountResult`. This
type will either be the number of lines as an `Integer` *or* the
erroneous `Path`. Thus the error is just a data type.

It's possible to model this in Java as well, but a tad more
verbosely.

```java
public abstract class FileCountResult {
  private FileCountResult() {}

  public abstract <T> T match(
    Function<Long, T> handleLines,
    Function<Path, T> handlePathError
  );
  
  public static final class Lines extends FileCountResult {
    private final Long value;
    // implement match
  }

  public static final class PathError extends FileCountResult {
    private final Path errorPath;
    // implement match
  }
}

```

So, what do we have here? We declare an `abstract class
FileCountResult`, with an abstract method `match` to be implemented by
all subclasses. For every branch in Haskell (the `|` symbol), there is
a corresponding subclass in Java. Thus, in this case we have one for
the number of lines and one for the error. Both subclasses implement
the `match` method, using the corresponding function. This basically
implements pattern matching for this class and can be viewed as an
implementation of the visitor pattern in Java land.

To really seal the deal, we should make the constructor of both
subclasses `private` and implement two static factory methods.

Now, let's simply implement a convenience method for retrieving the
number of lines as a `FileCountResult`.

```java
public static FileCountResult countingLines(Path p) {
  try {
    return new Lines(Files.lines(p).count());
  } catch (IOException ex) {
    return new PathError(p);
  }
}
```

Here is how the above code might look then.

```java
List<FileCountResult> results = Files.list(directory).
  map(this::countingLines).
  collect(toList());
```

Now retrieving the erroneous paths is just some stream operations away
and is left as an exercise to reader. My solution can be
found [here][7].


### Generalizing our approach

So let's recap for a second here: To implement data types, which
represent just a finite number of distinct forms in Java (also called
*sum types* in Haskell), we can use abstract classes and implement the
visitor pattern. Concretely, we encoded the result of counting the
number of lines in a file as either a resulting `long` or an erroneous
`Path`.

This pattern seems like something we might generalize. Instead of
either having a `long` or a `Path` we could have either any `T` or any
`E`. The `T` in this case stands for the resulting type (so it could
be `long`, `Integer`, we don't really care) and `E` stands for the
error, but it could be any type as well. Consequently, I renamed
`FileCountResult` to `Result<T, E>` in the following class.

```java
public abstract class Result<T, E> {
  private Result() {}
  
  pubilc abstract <R> R match(
    Function<T, R> handleValue,
    Function<E, R> handleError
  );
  
  // imagine static factory methods 
  // Result<T, E> ok(T value) { .. }
  // Result<T, E> err(E error) { ... }
  
  public static final class Ok<T, E> extends Result<T, E> {
    private final T value;
    
    // implement match and private constructor
  }
  
  public static final class Err<T, E> extends Result<T, E> {
    private final E err;
    
    // implement match and private constructor
  }
  
}
```

Now, representing the `FileCountResult` is just a matter of defining
concrete classes for `T` and `E`, respectively: `Result<Long, Path>`.

In Elm, this definition basically looks like [this][8]:

```Elm
type Result value error = Ok value | Err error
```

### map and flatMap

Thinking about `Result<T, E>`, we might notice, it's not that
different from an `Optional<T>`. Basically it's the same, just with
a reason *why* a computation failed, instead of just nothing.

There are two very useful methods implemented by `Optional`, we might
consider in `Result<T, E>` as well: `map` and `flatMap`. To provide
some motivation for the former, let's say we have a pure `Function<T,
R>`, like squaring a number, which we would like to apply to the
result, if it is present. Currently, we would need to match on the
`Result<T, E>` and only apply the function, if we have a value of `T`.

That becomes annoying very quickly, especially in succession. That's
what `map` is for.

```java
public <R> Result<R, E> map(Function<T, R> mapper) {
  return match(
    value -> ok(mapper.apply(value)),
    error -> err(error)
  );
}

// Now we can do:
Result.ok(5).
  map(x -> x * x).
  map(x -> x * 2).
  match(value -> value, err -> 0); // 50
```

Ok, so what about `flatMap`? Consider three functions, all three of
which take some value and return a `Result<T, E>`. How would we go about
composing them?

```java
Result<String, SomeError> readStringFromFile(Path value);
Result<Integer, SomeError> parseInt(String value);
Result<Integer, SomeError> format(Integer value);

// Errr, well:
readStringFromFile("winteriscoming").match(
  value -> parseInt(value).match(
    value2 -> format(value2).match(
      result -> ok(result)
      err -> err(err)
    ),
    err -> err(err)
  ),
  err -> err(err)
);
```

Wow! That was awful. Consider yourself lucky, you didn't have to type
that. Not even sure, that would compile... let's look for an
alternative. What we actually want, is a method, which takes a
`Function<T, Result<R, E>>` and applies that function, only if there
is no error.

```java
public <R> Result<R, E> flatMap(Function<T, Result<R, E>> mapper) {
  return match(
    value -> mapper.apply(value),
    error -> err(error)
  );
}

// Let's try again:
readStringFromFile("hodor").
  flatMap(this::parseInt).
  flatMap(this::format).
  match(result -> result, err -> "Nooooooooooooooooo");
```

Woha, that's much better. There are a number of other methods, that
are quite useful in working with such a type. Take a look at
this [snippet][6], where I went ahead and implemented some of them. We
might even go ahead and try to generalize catching errors and
converting them to results. Although Java's type erasure would make
life harder, than it should be.

### Authenticating a user

As one last example, take a look at authenticating a user with
exceptions vs `Result<T, E>`. Let's assume, there are two things, that
might be wrong. Either the user cannot be found, or the password is
not correct. That sounds a lot like a *sum type* again. I am just
showing pseudo code here again, since otherwise this post might become
even longer.

```java
public class AuthException extends Exception {

  public static final class UnknownUsername extends AuthException {
    private final String username;
  }
  
  public static final class WrongPassword extends AuthException {}
  
}
```

#### Authenticating a user with Exceptions

```java
public Response authenticate(String username, String password) {
  try {
    User user = findByUsername(username);
    user = checkPassword(user, password);
    return Response.ok(user).build();
  }
  catch (AuthException ex) {
    return Response.badRequest(ex.toJson()).build();
  }
}

public User findByUsername(String username) throws AuthException {
  Optional<User> user = // db call and stuff
  return user.orElseThrow(() -> new UnknownUsername(username));
}

public User checkPassword(User user, String loginPassword) throws AuthException {
  return user.getPassword().equals(loginPassword) ?
      user : 
      throw new WrongPassword();
}
```

#### Authenticating a user with `Result<T, AuthException>`

```java
public Response authenticate(String username, String password) {
  return findByUsername(username).
      flatMap(u -> checkPassword(u, password)).
      map(u -> Response.ok(u).build()).
      formatError(e -> Response.badRequest(e.toJson()).build()).
}

public Result<User, AuthException> findByUsername(String username) {
  Optional<User> user = // db call and stuff
  return user.map(Result::ok).
      orElse(Result.err(new UnknownUsername(username)));
}

public Result<User, AuthException> checkPassword(User user, String loginPassword) {
  return user.getPassword().equals(loginPassword)) ?
      ok(user) : 
      err(new WrongPassword());
}
```

#### Comparing both approaches

Syntactically, working with the `Result` is much noisier, than using
the built-in `try` and `catch` mechanisms provided by Java. As evident
in the file example though, it provides some benefits when working
with streams, precisely because it's just implemented like any other
ordinary class.

Even though the bare essence of `Result<T, E>` is a *mere* 50 LOC
without comments (including `match`, `map`, `flatMap`), it's very
flexible, extensible (as shown by the number of additional methods I
implemented) and models most of checked exceptions without any
language primitives. Even multiple exceptions can be implemented by
using the same trick with abstract classes we used for the `Result`
itself, as seen with the `AuthException`.

Additionally, for me personally, it somewhat forces me to think more
fine-grained about what might actually happen in my code and tearing
these concerns apart, because in the end, it's just simple composition
with `map` and `flatMap`, to bring them all together again.


### Conclusion

So, should we start using only `Result<T, E>` from now on? Of course
not, but the approach to modeling it and more generally sum types in
Java, is quite a handy trick to have in your toolbox. 

It lends itself quite well to modeling state machines among other
things, because it enables the compiler to check some constraints for
us, instead of using tests to fixate them. Adding an additional state
with more and different data requires just adding another class.

Besides, [Elm][9] and partly [Rust][10] actually really do handle
errors this way.

Thanks for reading, that's it for now. Have a nice day!


[1]: http://elm-lang.org/
[2]: https://www.haskell.org/
[3]: https://www.rust-lang.org/en-US/
[4]: https://www.youtube.com/watch?v=_ahvzDzKdB0
[5]: https://docs.oracle.com/javase/tutorial/essential/exceptions/runtime.html
[6]: https://gitlab.com/snippets/28007
[7]: https://gitlab.com/snippets/28237
[8]: http://package.elm-lang.org/packages/elm-lang/core/latest/Result
[9]: https://guide.elm-lang.org/error_handling/result.html
[10]: https://doc.rust-lang.org/book/error-handling.html
