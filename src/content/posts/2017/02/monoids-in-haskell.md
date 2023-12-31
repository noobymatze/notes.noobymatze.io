---
date: 2017-02-05T17:42:19+01:00
title: "Monoids in Haskell"
draft: false
tags: []
author: Matthias
summary: |
  Based on the previous post about monoids, this post explores the
  same things in Haskell.
---

In my [previous post][1], I tried to show, that semigroups and monoids
are not just an ivory tower concept, but can actually be used in Java
to structure and reason about code. Going further, even groups and
abelian groups are an important concept in distributed systems
(i.e. CRDTs).

In this post though, I would like to take a look at how to use monoids
in Haskell. This is due to the fact, that we can say a type *is* a
monoid, while in Java the same is not possible for objects, due to
constraints of interfaces, as discussed in the previous post.

Everybody has only so much time, so if you take only one thing from
this post, take a look at the simple implementation of [word count][2]
down at the bottom.


## Small beginnings

Except for the fact, that I have yet to figure out how to evaluate
markdown as literate Haskell, this post is a literate Haskell source,
thus lending itself to being executed. Thus, we will start with
imports.

```haskell
{-# LANGUAGE OverloadedStrings #-}

import           Data.Foldable (fold, foldMap)
import           Data.Monoid
import qualified Data.Text     as T
import qualified Data.Text.IO  as T
```

## School classes

To start off, we will take a look at defining school statistics, as we
did in the previous post. Firstly, let us build up our data structures.

```haskell
data Pupil = Pupil T.Text

data SchoolClass = SchoolClass
  { name   :: T.Text
  , pupils :: [Pupil]
  }

data SchoolClassStats = SchoolClassStats
  { names          :: T.Text
  , numberOfPupils :: Int
  }
```

You can think of `Text` as the equivalent of `String` in Java.

As discussed in the previous post, `SchoolClassStats` is a monoid. To
declare this in Haskell, we can provide an instance of a typeclass
aptly called `Monoid`. For the moment you can think of typeclasses as
Java interfaces, with the ability to declare static methods as part of
the contract for that interface.[^oh-my-god]

Haskell defines a `Monoid` as:

```haskell
class Monoid a where
  mempty :: a
  mappend :: a -> a -> a
```

This just says, any type `a` is a `Monoid`, if an identity element (oddly
called `mempty`) and a binary operation (`mappend`) can be
provided. Of course, `mappend` has to be associative, but this cannot
be enforced, just as it could not in Java. 

So let us implement an instance for `SchoolClassStats`.
  
```haskell
instance Monoid SchoolClassStats where
  mempty = SchoolClassStats "" 0
  mappend a b = 
    let
      combinedNames = 
        case ( names a, names b ) of
          ( "", namesOfB ) -> 
            namesOfB

          ( namesOfA, "" ) -> 
            namesOfA

          ( namesOfA, namesOfB ) -> 
            namesOfA <> ", " <> namesOfB

      combinedNrOfPupils =
        (numberOfPupils a) + (numberOfPupils b)
    in
      SchoolClassStats combinedNames combinedNrOfPupils
```
  
Just as in Java, combining both values becomes a bit cumbersome, but
can be solved with pattern matching.

One interesting bit is the `<>` operator in `namesOfA <> ", "`. This
one is actually `mappend` in disguise and is used to concatenate two
instances of a monoid. Since `Text` is a monoid as well (which means,
there exists an instance for Text, just like ours for
`SchoolClassStats`), we can just use it here.

We could of course also write: `mappend namesOfA (mappend ", "
namesOfB)`. But I think you can see, why using `<>` is much shorter
and simpler. Reads just like concatenating strings in Elixir.

How do we convert a SchoolClass into statistics?
  
```haskell
classStats :: SchoolClass -> SchoolClassStats
classStats schoolClass =
  SchoolClassStats 
    { name = name schoolClass
    , numberOfPupils = length (pupils schoolClass)
    }
```

Now comes the time to concatenate stats of school classes.

```haskell
schoolClasses :: [SchoolClass]
schoolClasses = 
  [ SchoolClass [] "10"
  , SchoolClass [] "11" 
  ]

-- For comparison, the reduction in Java:
-- SchoolClassStats stats = schoolClasses.
--   map(c -> c.stats()).
--   reduce(SchoolClassStats.identity(), SchoolClassStats::combine)

-- Directly translating into Haskell ("foldr == reduce"):
statsTooMuchTyping = foldr mappend mempty (map classStats schoolClasses)

-- fold = foldr mappend mempty, so
statsLessTyping = fold (map classStats schoolClasses)

-- foldMap f = foldr (mappend . f) mempty, so
resultingClassStats = foldMap classStats schoolClasses
-- -> SchoolClassStats 0 "10, 11"

-- Using Javaslang:
-- schoolClasses.foldMap(SchoolClassStats.MONOID, SchoolClass::stats);
```

To further explain a little: The last example works, due to the fact,
that `SchoolClassStats` is a monoid. To get a list of stats of our
list of `SchoolClass` we map over the list first, as we would in Java
and extract the stats (that is the mapping part). Since the resulting
list is a list of monoids, we can just reduce them, even if the list
is empty using `foldr mappend mempty == fold`. Contrary to Java, there
is no need to explicitly mention the methods for identity and
combination again, since that is encoded in the `Monoid` instance we
declared earlier.

So, while refactoring, in Haskell we do not need to touch all that
code at all, while changing an internal representation or even its
name, as long as it keeps being a monoid.


## School

"What about schools?" I hear you say. Well...

```haskell
data Teacher = Teacher T.Text

data School = School
  { classes  :: [SchoolClass]
  , teachers :: [Teacher]
  }
```

There are two ways to implement statistics for schools. One is the
same approach as we did above with `SchoolClass` (add another
statstics data structure), but to show off the recursive awesomeness
of monoids, I will be a little lazier[^pun-intended].

So in this case, we will just use a triple for our stats. Of course in
actual code, you probably should provide some names for the things you
want to track.

```haskell
schoolStats :: School -> (Sum Int, SchoolStats, Sum Int)
schoolStats (School classes teachers) =
  ( Sum (length classes)
  , foldMap classStats classes
  , Sum (length teachers)
  )
  
schools :: [School]
schools = 
  [ School schoolClasses []
  , School [] [ Teacher "Matthias" ] 
  ]
  
schoolStatsWithTriples = foldMap schoolStats schools
-- -> (Sum 2, (SchoolClassStats 0 "10, 11"), Sum 1)
```

Wait, why the hell does that work? That's because `Sum` is a monoid
 and any triple is a monoid, as long as every part of that triple is a
 monoid as well. The `Monoid` instance for a triple has been kindly
 provided by the authors of the `Data.Monoid` module. So in this case,
 we can just use it and do not have to implement anything for
 ourselves.


## Word count

If nothing of the previous sections blew your mind, take a look at the
following. You know the little command line tool called `wc`? Take a
look at the following implementation. This still baffles me after one
and a half years of learning it.

```haskell
type LineStats = 
  ( Sum Int -- line count
  , Sum Int -- word count
  , Sum Int -- char count
  , Max Int -- longest line
  )

lineStats :: T.Text -> LineStats
lineStats line =
  ( Sum 1
  , Sum (T.length (words line))
  , Sum (T.length line)
  , Max (T.length line)
  ]

wc :: T.Text -> LineStats
wc = 
  foldMap lineStats . T.lines

printStats :: LineStats -> IO ()
printStats (lc, wc, cc, ml) =
  putStrLn $ unlines $
  [ "Statistics for monoids-in-haskell.md"
  , "lines:   " ++ show lc
  , "words:   " ++ show wc
  , "chars:   " ++ show cc
  , "longest: " ++ show ml
  ]

main :: IO ()
main = do
  blogPost <- T.readFile "monoids-in-haskell.md" 
  printStats (wc blogPost)
```

Do not worry about the IO stuff, that is just a little boilerplate, so
we can actually read a file. But the rest is all it takes here.

It would easily be possible to extend this with a frequency count for
words. That's because `Map`s are monoids as well, so take a
look [here][3] for an idea, of how that might be implemented. 


## Conclusion

Watch out for monoids and start using them! They are awesome and with
proper support, like in Scala or Haskell, they can simplify a lot of
code.

If you want to read more stuff about them, I can really
recommend [this][4] post and just using them in real code. As soon as
it clicks for you, it will feel as though you have been blind before,
I promise.

Cheers!


[^pun-intended]: Pun intended ;-)
[^oh-my-god]: Sorry to fellow Haskell programmers...

[1]: /posts/2017/02/monoids-and-semigroups-in-the-real-world/
[2]: #word-count
[3]: https://github.com/noobymatze/haskell-exercises/blob/master/WordCount.hs#L59-L93
[4]: http://typelevel.org/blog/2013/10/13/towards-scalaz-1.html
