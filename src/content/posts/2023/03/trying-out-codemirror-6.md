---
title: Trying out Codemirror 6
summary: This post just contains some setup code for Codemirror 6.
tags: []
date: 2023-03-01
author: Matthias
---

I have been using Codemirror 6 multiple times and I always forget the
basic setup and have to look it up somewhere, so here is something to
jog my memory. Btw, I love it!

Also the vim mode from replit is amazing!


### Setup

```sh
$ npm create vite@latest my-project
$ npm install --save codemirror \
                     @codemirror/view \
                     @codemirror/commands \
                     # Change for your language
                     @codemirror/lang-markdown \
                     @codemirror/state \
                     @codemirror/language \
                     @replit/codemirror-vim
```

```typescript
import {EditorView} from "@codemirror/view";
import {basicSetup} from "codemirror";
import {markdown} from "@codemirror/lang-markdown";
import {Vim, vim} from "@replit/codemirror-vim";
import {marked} from "marked";

new EditorView({
    doc: '# Hello World!',
    parent: document.getElementById('app')!!,
    extensions: [
        basicSetup,
        markdown(),
        vim(),
        EditorView.updateListener.of(update => {
            document.getElementById('rendered')!!
                .innerHTML = marked.parse(update.state.doc.toString())
        })
    ]
});

Vim.map('jj', '<Esc>', 'insert');```
```
