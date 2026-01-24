---
title: "DSLs und LLMs"
summary: "DSLs und LLMs"
date: 2026-01-03
author: Matthias Metzger
draft: true
tags: []
---

Ich habe gerade eine neue Bibliothek für eine [DSL][dsl] für CAD 3D
Modellierung in Swift gesehen.

Das hat eine kleine Kettenreaktion in meinem Kopf verursacht, die in
der These mündete: Wir werden in der Zukunft viel mehr solcher DSLs
haben und potenziell auch für jegliche (interaktive) Software
brauchen.

Als ich 2023 das erste Mal LLama 2 ausprobiert habe, habe ich einen
minimalen Prototypen für eine Anwendung geschrieben, in der ein
Benutzer sich perp Prompt ein Formular generieren lassen kann. Dieses
Formular kann danach noch angepasst werden. Die Idee war auch damals
schon, den Prompt des Benutzers so anzureichern, dass das LLM eine
JSON-Repräsentation des ASTs für das Formular zurückliefert. Die
wiederum kann dann auf verschiedenste weisen interpretiert werden.

Aside, wenn ich so darüber nachdenke, erinnert mich das doch ein wenig
an freie Monaden. Aber wie auch immer, hier ist das Beispiel des ASTs,
den ich meine:

```typescript
type Widget 
    = { type: 'Paragraph', content: string }
    | { type: 'Row', children: Widget[] }
    | { type: 'Input', name: string }

```

und ein "interpreter" dafür wäre:

```typescript
function render(widget: Widget): JSX.Element {
    switch (widget.type) {
    case 'Paragraph': return <p>{widget.content}</p>
    case 'Row': return <div style="display: flex">{widget.children.map(render)}</div>
    case 'Input': return <input type="text" name={widget.name} />
    }
}

```

Das hat damals schon ganz gut funktioniert, tut es aber heute
bedeutend besser. 

Als ich dann vor ein paar Monaten damit herumgespielt habe, einen
eigenen Agenten zu bauen, kam mir auch wieder die Idee, dass es für
Agenten total sinnvoll sein könnte, einen kleinen Interpreter zu
beherbergen, der jetzt konstant durch Bash-Skripte ersetzt wird. Und
die Aufgabe des LLMs ist dann nicht "Beantworte diese Frage oder
implementiere das", sondern "Hier ist eine mini programmiersprache,
deine Aufgabe ist es, ein Programm zu schreiben, was das hier
gestellte Problem löst."

Und dann liefert das LLM im Prinzip einen AST zurück und der Agent ist
der interpreter. 


I just saw a post about a [DSL][dsl] for parametric 3D modeling in
Swift. 

Interestingly it got me thinking again about the future of computation
and digital work. There was another post recently about drawing the
somewhat famous pelican on a bicycle, where someone realized, that
letting an LLM draw a pelican on a bicycle might be harder, than
letting the LLM write code for an API designed for drawing to draw a
pelican. Well, the old wisdom of "every problem in computer science
can be solved with an indirection" hits again.

But there is something here, that I seem to have tried and probably
everybody else too and I had forgotten it again. When llama 2 was
released I played around with giving it some form of DSL in a prompt
for creating interactive UIs. Imagine something like this:


Now I would prompt the LLM "make a form for personal data for a user"
and I would get something back like:

```json
[
 { "type": "Paragraph", "content": "Please insert your personal information" },
 { "type": "Row", "children": [
   { type: "Input", "name": "First name", "placeholder": "First name" },
   { type: "Input", "name": "Surname", "placeholder": "Surname" }
  ]
 }
]

```

If we get that back, we only need an interpreter to actually render this.

There was another time I was thinking about 
Now for various reasons the goal was to write an "interpreter" that
could render this abstract representation in browsers or render it to
some other format.

That worked as well as it could with a local LLM at that time, but it
has gotten much better now.

The same thing 



[dsl]: https://github.com/tomasf/Cadova
[pelican]: https://simonwillison.net/2024/Oct/25/pelicans-on-a-bicycle/
