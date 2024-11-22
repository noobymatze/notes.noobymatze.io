---
title: "How I design programs"
summary: "Just some thoughts, about what I think about when designing programs."
date: 2024-10-14
author: Matthias Metzger
draft: true
tags: []
---

This post is borderline philosophical and I am not arguing to do, what I am
describing here. What I am arguing for, is to take apart your code organization
and try to understand the logical dependencies you have in your code between
things and to see, why this makes testing or evolving the code sometimes
difficult.

Consider the following example: 

```swift
class Model {
    private let service: IService
    @Published var scene: Scene

    init(...)

    func update(msg: Msg) {
        switch msg {
            case .GetData:
                scene = .progress
                Task {
                    await service.getData()
                }
        }
    }
}
```

We have a Model, that get's some abstract service, which provides some methods
for working APIs. But, how do you test this? How do you test, that the state
transitions do, what they are supposed to do?

Also, this conflates several things. It conflates a view state and the direct 



```swift
enum Msg {
    case GetData
    case SetData(data: Result<MyData, ApiError>)
}

enum Cmd {
    case None
    case GetDataFromAPI
    case Batch(commands: [Cmd])
}

class Model {

    func update(msg: Msg, scene: Scene) -> (Scene, Cmd) {
        switch msg {
            case .GetData:
                (.progress, .GetDataFromAPI)
            case .SetData(let result):
                switch result {
                    case .success(let value):
                        (.showData(value), .None)
                    case .failure(let error):
                        (.showError(error), .None)
                }
        }
    }

}
```

The interesting thing about this pattern (anyone want some TEA?), is that it
makes the actual state transitions trivially testable. In fact, you might
argue, that it makes it so simple, that you might not even need tests, because
it is just completely obvious what it does. It focuses on one thing and one
thing only, updating the state of the app and then telling us what to show and
maybe what side-effects to run.

It is also completely separated from how the commands are actually run and how
the view is rendered. So, let's see how to wire this up.

```swift
func run(cmd: Cmd, dispatch: (Msg) -> Void)) async {
    switch cmd {
        case .None:
            break
        case .GetDataFromAPI:
            do {
                // do Request
                // dispatch(.SetData(data: .failure(..)))
            } catch {
                // dispatch(.SetData(data: .failure(..)))
            }
        case .Batch(let commands):
            for cmd in commands {
                await run(cmd, dispatch)
            }
    }
}
```

We could even start these things in parallel if we wanted to.


```swift
struct UiView: View {

    private let model: Model

    @State private var scene: Scene

    func dispatch(msg: Msg) {
        let (newScene, cmd) = model.update(msg, scene)
        scene = newScene
        Task {
            await run(cmd) { nextMsg in 
                let (newScene, nextCmd) = model.update(msg, scene)
            }
        }
    }

    var body: some View {
        switch scene {
            case .progress:
                Text("I am loading...")
            case .showData:
                Text("I am showing some stuff...")
            case .showError:
                Text("I am showing an error...")
        }
    }

}
```
