---
title: "This week I learned 4"
summary: "Analyzing code, beauty and questions"
date: 2025-02-22
author: Matthias Metzger
draft: false
tags: []
---


## "Readable code"

This is a pet peeve of mine by now.

Arguing that one piece of code is more "beautiful", "readable" or
"clean", than another is not an argument. These terms are meaningless
because their meaning varies from person to person, depends on their
experience with different patterns and programming languages, and
because they exist on a spectrum.

At the extremes of this spectrum, we can probably all agree - for
example, a single line containing five nested ternary operators
including some bit shifting is neither "clean" nor
"beautiful". However, as you move toward the middle of the spectrum,
things become progressively muddier.

That's why I would be very happy if we instead focused on identifying
technical advantages or disadvantages with an approach.

- Is it simpler to change in the future?
- Is it more performant?
- Does it use outdated APIs?
- What are contexts/use cases for an API you are designing? Are 80% of
  the usages simple or are you making the callers life difficult?
- Will the caller fall into the [pit of success][success] or shoot
  themselves in the foot? How can you avoid that?


## Code analysis

What are you looking for, when you are tasked with analyzing a
program, you have never seen before?

These are the things, that I can think of.

#### Credentials in code

Credentials should be provided via environment variables, config files
or some database values. If not, these are the problems:

1. You might accidentally share access to your production data.
2. Switching between environments will happen by commenting out
   code. This increases the probability of accidentally committing the
   wrong environment and could mean operating on the wrong data in
   production or on another developers machine.

To load environment variables from a file, there are libraries like
`dotenv` in most programming languages.


#### Memory leaks/unclosed connections

Memory leaks increase memory consumption of a long running service
until they blow up. However, how exactly you can provoke this depends
on the programming language.

```python
def get_data():
    conn = create_db_conn()
    # Do stuff with conn

```

In Java, this kind of code, would cause memory leaks sooner or later,
however in Python it might not.

The reference implementation CPython uses reference counting to
dispose of values, that are no longer referenced from anywhere in the
program. Same goes for Swift and Rust (`Rc<T>` or `Arc<T>`). This
means, when no code references `conn` anymore its `__del__` method
will be called and it will be collected, eventually. Therefore, if
your database library of choice calls `self.close()` in the `__del__`
method, you should not leak connections and memory, eventually.

Eventually is doing a lot of the heavy lifting here, because it is not
deterministic when garbage collection runs. That means, it is always
better to explicitly dispose of connections or closeable things via
`with` if a contextmanager exists or `try/finally`.

```python
def get_data():
    with create_db_conn() as conn:
        # Do stuff with conn

```


#### SQL injections

Well, not much to say here. If you find something like the following
code, you probably have a problem. Use prepared statements - always!

```python
@app.get("/")
def home(id: str):
    query = f"SELECT * FROM person WHERE id = '{id}'" 
    with create_db_conn() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query)

```

#### Concurrency issues

If your language supports coroutines and cooperative scheduling, you
need to make sure, that you are not using some synchronous method
somewhere, that will block your whole event loop or a worker thread.

#### Code issues

This is much more lose, than the other points, but there are two
things, that I find invaluable.

One is to always think about side-effects (any IO, e.g. database,
network or file access). Consider the following function.

```python
def calc_complex_things(conn):
    data = get_data_from_database(conn)
    return data.x * data.y * data.z

```

This ties the actual calculation with how the data is retrieved. What
if we separated out how the data is retrieved?

```python
def calc_complex_things(data):
    return data.x * data.y * data.z

```

Now it is possible to test the actual calculation without any external
setup, which makes testing much faster and also allows us to use
something like `hypothesis` to do property based testing. Also, this
function can be used in a variety of contexts without accidentally
overloading the database, because it was called in a hot loop.

The other thing is something like this:

```python
def foo(x: int):
    if x == 5:
        y = Person(name="Test")
    else:
        print("Wohooo!")
    # 100 lines later, that do not use y
    z = calc_z()
    if z > 0:
        # implicitly means x == 5, therefore this is ok
        print(y.name)

```

This might all work, but it will blow up at some point, because at
that point `z > 0` might not imply `x == 5` anymore. `y` should be
declared closely to where it is used.

Notice, how I didn't call this "not beautiful" or "not clean" but
instead focused on potential downsides.

#### Architecture

I think architecture 


## Question feature requests

When I was younger and tasked with implementing some features, I often
tried to just implement what made sense to me. Over the years, that
approach has changed.

Oftentimes, most feature requests I receive are not sufficiently
defined. Therefore, I almost always need to ask what really needs to
be done or clarify something. The lesson here is, that what makes
sense to me, often does not make sense in a larger context, that I
don't have. So ask questions, even if you think, you know what you
should do.

[success]: https://blog.codinghorror.com/falling-into-the-pit-of-success/
