---
title: "This week I learned 2"
summary: "Typst, atomic design, wireguard and server migration"
date: 2025-02-08
author: Matthias Metzger
draft: false
tags: []
---


## Typst

Do you remember [LaTeX][latex]? Yeah, me neither. Just a joke. Of
course I remember all the time spent setting up formatting, working
through macros, and sometimes being puzzled by its arcane
syntax. However, once everything was set up, you could just focus on
writing. No twiddling at the end of your paper. If your writing was
done, so was your paper. That was good. However, it seems, that LaTeX
finally has a real contender.

[Typst][typst] promises to be a modern replacement for LaTeX,
featuring a composable language, clear error messages, speedy compile
times and feedback, and an online collaborative editor. I have been
playing around with it and used [this template][brief] to create
DIN-conforming letters (DIN is the German Institute for
Standardization). I would wholeheartedly recommend it.

You can install it locally and use Visual Studio Code with the Typst
plugin to get syntax highlighting and render your document as you
type.

I really like Typst, and for (automated) document generation, it's
just wicked fast.


## Atomic Design

This is the second time in the past year that [atomic design][atomic]
has come up at work. This is particularly interesting to me because I
was using it when the original blog post was published. I'm not saying
that to brag, but I had long forgotten about it, assuming it had faded
away as an idea. Seeing it resurface 12 years later just goes to show
that I have been living in a bubble and that sometimes ideas take a
really long time to gain broader traction.

That said, from a practitioner/programmer's perspective—using atomic
design to guide the organization of components — I am not a fan. Here
are my reasons:

- **Education**: Everyone on a project using atomic design must learn
  an additional concept. They might even have to re-contextualize
  their knowledge of chemistry. This may seem easy, but since quarks,
  atoms, molecules, organisms, templates, and pages all have somewhat
  flexible boundaries, the chemistry analogy doesn't really hold. Even
  worse, you open yourself up to team-dependent bike-shedding
  discussions that add no value to solving the actual problem
  (designing a button). The implicit understanding among the initial
  contributors then has to be communicated to new hires. Compare that
  to having self-explanatory components and pages, where the
  dependencies between components don’t really matter.
- **Maintenance**: Imagine you built a simple button with some text —
  clearly an atom. Later, you need to add an icon to the button. An
  icon might already be an atom as well. This means you would need to
  promote the button to a molecule, which requires needlessly moving
  files around in the folder tree and communicating these changes to
  team members. Additionally, in one team a button with an icon might
  still be considered an atom, while in another it would be a
  molecule. I know this example is contrived, but the point still
  stands.
- **Review**: Because the boundaries of these concepts are somewhat
  flexible, you must enforce them. This adds extra work to every code
  review and may spark additional bike-shedding discussions about
  where something should be placed.
- **Finding Stuff**: In the best case, I can simply do a symbol search
  for "button" in my editor and find it immediately. In that case, I
  really don’t care which directory a component is in, nor do I think
  about the neat organization. I just want to work with a button. If I
  can’t do that, I have to think about where a component might be,
  based on its appearance. Identifying a button is straightforward,
  but inferring whether something is a molecule or an organism is much
  harder — especially if you've been away from the project for a
  while. This kind of search has a Sherlock-esque vibe, which is fun
  at first, but eventually becomes really annoying.

So, personally as a developer, I don't see any benefits that outweigh
the increased costs in education, communication, and maintenance
compared to simply categorizing things into components and pages.

It might be that atomic design is actually about communication. The
original blog post mentions that "clients and team members are able to
better appreciate the concept of design systems." So if you have
clients who can actually provide feedback on abstract concepts and
components, and if atomic design helps you give them some kind of
guideline on how the project is going to go, then go for it. I would
wager, though, that you could very well achieve that without atomic
design.

Additionally, I have yet to meet a client who actually cares about the
internal process of how a button appears on screen. Most of them just
want a button. And I, as the developer, just want to build the button
without having to follow a decision tree on where to place it.


## Server migration

Migrating Linux servers to other servers is actually pretty
simple. Copy relevant stuff from `/etc` (maybe even copy the whole
folder), for example

- `/etc/nginx`
- `/etc/systemd/system/*`
- `/etc/letsencrypt/`
- `/etc/ssl/`
- `/etc/sudoers`

then tar whatever files you need and where every your applications
are.

```sh
tar --exclude='<pattern>' -zcvf home.tar.gz .

```

Make a full backup from your databases of choice, then just copy
everything over and move files into the right places. Maybe you can
even stream the database over (haven't tried that yet):
https://stackoverflow.com/questions/1237725/copying-postgresql-database-to-another-server

Start all the services again and be done. Also don't forget cronjobs.

Aside: I just learned, that I can use my local docker container to
synchronize a remote db with my local postgres running in a docker
container.

```sh
docker compose exec -T db bash -c "dropdb --host localhost --username my-user db"
docker compose exec -T db bash -c "createdb --host localhost --username my-user db"
docker compose exec -T db bash -c "\
    PGPASSWORD='<remote-password>' pg_dump -C -h host.docker.internal -p 5433 -U my-remote-user db | \
    PGPASSWORD='sql' psql -U my-user -d db"

```


## Wireguard

I have heard really good stuff about [wireguard][wireguard] as a VPN
server and client and from a client perspective, it is super simple, I
like it.

Haven't set up a server with it yet, but if its as simple as setting
up the client, it's probably awesome. Cool stuff.


[typst]: https://typst.app/
[latex]: https://www.latex-project.org/
[atomic]: https://bradfrost.com/blog/post/atomic-web-design/
[brief]: https://github.com/Sematre/typst-letter-pro
[wireguard]: https://www.wireguard.com/
