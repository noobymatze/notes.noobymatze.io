---
title: "Ideen für eine Thesis"
summary: "Some ideas for a thesis."
date: 2024-10-08
author: Matthias Metzger
tags: []
---


wRPC ist eine IDL (Interface Description Language) um Schnittstellen und deren
Datentypen zu spezifizieren. Dazu gehören auch Constraints für die Validierung.
Diese Spezifikation wird dann in verschiedene Programmiersprachen kompiliert.

Konzeptionell ist wRPC lose an IDLs wie [protobuf][protobuf]/[gRPC][grpc],
[Smithy][smithy] oder [typespec][typespec] angelehnt. In der Praxis gibt es und
soll es diverse Unterschiede zu diesen Sprachen geben.

Diese Sprache ist ein Forschungsprojekt, bei dem noch vieles offen ist.


## Beispiel

Folgendes Beispiel illustriert die Konzepte dieser Sprache:

```rust
// Specifies an address for a specific country.
data Address {
    street: String,
    #(check (one-of "DE" "CH"))
    country: String,
    #(check (or (and (= .country "DE") (= (len .zipcode) 5)))
                (and (= .country "CH") (= (len .zipcode) 4)))
    zipcode: String,
}
```

Zunächst wird ein Datentyp `Address` deklariert, der die folgenden
Eigenschaften hat:

- `street` vom Typen `String`, ohne Constraints.
- `country` vom Typen `String`, mit Constraints via `#(check)`, konkret sind
  nur die Werte "DE" oder "CH" erlaubt.
- `zipcode` vom Typen `String` mit Constraints via `#(check)`, konkret muss die
  Länge bei `.country == DE` exakt 5 Zeichen sein und bei `.country == CH` 4
  Zeichen.

Die `#(check ..)` Ausdrücke werden Annotationen genannt und sind eine Teilmenge
von [edn][edn]. Sie sind also grundsätzlich (fast) beliebige Lisp-Ausdrücke.

Es wäre auch vorstellbar eine `#(example)` Annotation zu definieren, mittels
derer ein Beispiel für einen Datentypen angegeben werden könnte oder
Annotationen, mittels derer sich automatisiert Services testen ließen.

Neben `data`, das einen Produkt-Typen definiert, gibt es noch `enum` für
Summendatentypen und `service` für die tatsächliche Schnittstelle als mögliche
Deklarationen. 

```rust
// Errors which can happen, while working with addresses.
enum ApiError {
    NotFound,
    AlreadyExists { id: Int64 },
}

service AddressService {

    def get(id: Int32): Result<AddressError, Address>

    def create(address: Address): Result<AddressError, Unit>

}
```


## Typsystem

Ein mögliches Projekt wäre einen (einfachen) Typchecker zu implementieren oder
zu recherchieren, wie er implementiert werden könnte. Das soll deshalb
passieren, damit es nicht möglich ist, eine Schnittstelle zu definieren, bei
der Typen verwendet werden, die gar nicht existieren oder noch nicht definiert
sind.

Das folgende Beispiel illustriert dieses Problem.

```rust
data Person {
    contactInformation: List<ContactInfo>,
}
```

Hier fehlt die Deklaration einer `ContactInfo`. Folglich sollte ein Fehler 
ausgegeben werden wie:

```
-- TYPE ERROR -------------------------------- person.wrpc

Cannot find type `ContactInfo`.

2|     contactInformation: List<ContactInfo>,
                                ^^^^^^^^^^^
Maybe you need to define a `ContactInfo`? To define a type, you 
can either use `data ContactInfo` or `enum ContactInfo`.
```

Dabei gibt es drei Ausbaustufen:

1. Prüfung, ob die entsprechenden Typen existieren und entsprechende Ausgabe
   von Fehlermeldungen wie oben skizziert. Im besten Fall mit
`Levenshtein`-Distanz, um ähnlich Namen zu finden und so bei Typos schon gute
Vorschläge zu machen.
2. Prüfung, ob die entsprechenden Typen mit den definierten Constraints
   zusammenpassen. Die Funktion `(len ...)` ergäbe beispielsweise auf einem
`Int32` keinen Sinn.
3. Überprüfung in der Verwendung von Generics und dass es in
   Schnittstellendefinitionen keine unerfüllten Generics gibt. Es soll also
auch möglich sein ein `data LimitedResult<T>` zu definieren, aber es soll nicht
möglich sein, eine Funktion `def foo(): LimitedResult<T>` zu definieren, es sei
denn es wurde vorher ein `data T` deklariert. Hier muss man die Typvariable `T`
immer konkret definieren.

Allgemein wäre es hier auch gut, herauszuarbeiten, welche Fehler es denn
überhaupt geben könnte und diese dann durch den Typcheck abzuarbeiten.

Es ist hier theoretisch möglich einen AST als JSON auszugeben, der dann mit
einer anderen Programmiersprache gelesen werden kann, als der aktuellen
Implementierungssprache Rust (um die Einarbeitung da gering zu halten).


## Formatter

Nachdem die Programmiersprache `Go` den Weg mit `gofmt` bereitet hat, bringen
die meisten modernen Sprachen auch einen automatischen Formatter für Quellcode
mit. Dieser hat typischerweise keine Konfigurationsmöglichkeiten, um
Diskussionen bzgl. Codestyle innerhalb von Teams vollständig zu vermeiden.

In dieser Arbeit ginge es darum, einen solchen Formatter für wRPC zu
implementieren. Die Implementierungssprache wäre im besten Fall Rust, aber es
wäre ansonsten auch möglich einen eigenen kleinen Parser in einer anderen
Programmiersprache zu schreiben und innerhalb dieser dann einen solchen
Algorithmus zu implementieren.

Auch hier gibt es verschiedene Ausbaustufen:

1. Grundlagen legen und Annotationen weglassen.
2. Annotationen ebenfalls formatieren.

Ein Paper, was dazu häufig zitiert wird, ist https://homepages.inf.ed.ac.uk/wadler/papers/prettier/prettier.pdf

In Rust gibt es schon eine Bibliothek, die sowas ermöglicht und die wird auch
in dem bestehenden Projekt verwendet.


## LSP (Language Server Protocol)

Die meisten Sprachen bringen heutzutage auch einen "Language Server" mit, der
auf dem Language Servier Protocol (ursprünglich von Microsoft eingeführt)
basiert.

Mittels dessen ist es beispielsweise möglich, in den verschiedensten Editoren
Code Actions, wie Autovervollständigungen, Renamings, Go to Definition und
ähnliches anzubieten. Ziel könnte es hier sein, einen solchen Server für wRPC
zu entwerfen/implementieren, der vielleicht im einfachsten Fall "Go to
Definition" unterstützt.

Alternativ wäre es hier auch vorstellbar stattdessen ein IntelliJ Plugin zu
schreiben, das ebenfalls Autovervollständigung unterstützt.


## Auth

Diese Idee ist eher unfokussiert und wirklich komplette Forschung und Design.
Die meisten APIs benötigen über kurz oder lang eine Möglichkeit, Autorisierung
und Authentifizierung zu implementieren. 

Im einfachsten Fall wäre es bei wRPC möglich, für jede Methode ein
Token/API-Key oder ähnliches zu übergeben.

```rust
service FooService {
    def doDangerousStuff(token: String, otherParameter: String)
    def doDangerousStuff2(token: String, otherParameter2: String)
}
```

Aber auf Dauer wird das natürlich lästig. Besser wäre es das irgendwie zu
vereinheitlichen:

```rust
#(auth ???)
service FooService {
    def doDangerousStuff(otherParameter: String)
    def doDangerousStuff2(otherParameter2: String)
}
```

Nun stellt sich aber die Frage, was genau man für verschiedene
Programmiersprachen und deren Frameworks eigentlich sinnvoll generiert. Aktuell
würde aus dem `FooService` oben soetwas in Kotlin:

```kotlin
interface FooService {

    fun doDangerousStuff(token: String, otherParameter: String)
    fun doDangerousStuff2(token: String, otherParameter2: String)

}
```

Aber wenn man nun `auth` hätte, was würde man daraus generieren? Gibt es
vielleicht auch die Möglichkeit das noch zu generalisieren und ggf. ein anderes
Keyword `middleware` einzuführen, mittels dessen man dann eine Art Pipeline
definieren könnte, die nacheinander ausgeführt wird?

```rust
middleware Auth: (Request) -> Result<AuthError, User>
middleware Metrics: (Request) -> Data

#(pipe-through Metrics Auth)
service FooService {
    def doDangerousStuff(otherParameter: String)
    def doDangerousStuff2(otherParameter2: String)
}
```

Aber was würde man dann auf Client- und Serverseite generieren? Gibt es hier
Anhaltspunkte aus bestehenden Frameworks oder aus OpenAPI oder den anderen
IDLs?


[grpc]: https://grpc.io/
[protobuf]: https://protobuf.dev/
[typespec]: https://typespec.io/
[smithy]: https://smithy.io/2.0/index.html
[edn]: https://github.com/edn-format/edn
