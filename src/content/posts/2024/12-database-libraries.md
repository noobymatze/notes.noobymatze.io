---
title: "The pinnacle of database access libraries"
summary: "Trying to make a case for JOOQ being the best database access library out there."
date: 2024-12-01
author: Matthias Metzger
draft: true
tags: []
---

I think [JOOQ][jooq] is the pinnacle of database access libraries for
relational databases. I also think, that every programming language in
existence should have a library like [JOOQ][jooq]. Unfortunately, as
far as I am aware, the only one that might be on the trajectory of
coming close at some point is [jet][jet] in Go.

So I'd like to spread the word and make an argument for why it is just
so good and maybe inspire other people to build it for their language
or at least think about accessing databases.

### Approaches

There are many approaches to accessing a database and working with
SQL. Here are the ones I have come across so far.

1. *String literal*: Write your SQL query into string literals by
   hand. If you are lucky, your language of choice supports checking
   the syntax of your query at compile time.
2. *ORM*: Use an Object Relational Mapper to help you in building
   queries. Typically you add some meta information to classes and let
   the ORM take care of the rest.
3. *Query builder*: Use a query builder, that tries to help build
   valid SQL. Many of them allow you to use strings for parts, they
   have not implemented yet.
4. *Compiled queries*: Write SQL-Queries in a separate file with some
   kind of simple parameter binding syntax, sometimes via comments and
   then generate functions for your programming language.
5. *Separate DSL*: Use an independent DSL to describe the schema and
   generate entities and sometimes even migrations to make building
   SQL convenient and type-safe.
   
### Trade-offs

Generally, all approaches have their trade-offs. Here are the ones,
that I can think of.

**String literals**:

- Are hard to read and format. 
- They are finicky when it comes to building dynamic where conditions,
  especially with prepared statements.
- On that note the likelihood of an SQL injection, due to not using
  prepared statements is definitely higher.
- They are only checked at runtime. 
- Also, I feel most developers (generalizing here) gravitate to build
  some sort of query builder at some point, when they start out with
  using string literals.
- On the plus side, after some time, they are quite simple and pretty
  universal across languages.
- You will build SQL skills.

**ORMs**

- Always use a meta language on top of SQL. 
- Knowledge of one ORM is only partially transferable on another ORM.
- Depending on the ORM, dropping down to raw SQL might be more tedious
  than you think. The reason is, that some ORMs cache entities and raw
  SQL circumvents that.
- There will almost always be a point, at which you *will have to*
  write raw SQL.
- Switching databases might not be as straightforward as ORMs
  suggest. The reason is, that since you will have dropped down to SQL
  eventually, you might accidentally use a specific feature of your
  database, that is not supported in other databases. In that case,
  you will have to hunt down the raw SQL queries in your codebase.
- N+1 selects are a common mistake.
- Transaction handling might be governed by implicit rules, depending
  on the ORM.
- Structuring code might be simpler.

**Query Builders**

- 

**Compiled queries**

**Separate DSL**



Of those 5 I think, that string literals are one of the worst ways of
building SQL queries, especially when it comes to building dynamic
where conditions and

### JOOQ

JOOQ is the 6th alternative and it kind of uses a combination of all
other variants. The first one is 


[jet]: https://github.com/go-jet/jet
[jooq]: https://www.jooq.org/
