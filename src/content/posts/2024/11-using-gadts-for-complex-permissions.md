---
title: "Modeling location dependent permissions"
summary: "This post explores a type-safe way to model complex, location dependent permissions."
date: 2024-11-22
author: Matthias Metzger
draft: false
tags: []
---

Imagine you were tasked with modeling permissions and roles for an app in a
company with several locations across a country. Employees, as users of the
system, might interact (create, edit, update, delete, view) with data at any
location, provided they have the permission for that location. This means that
each relevant entity should be assigned one or more locations. It should also
be possible to show an HTML page with all available permissions and their
dependencies.

On a technical level, checking for permissions may happen in different
contexts. It can either happen at the application level or at the database
level. At the application level, we might want to check whether a button is
visible or an action can be executed. At the database level, we want to ensure,
that we only retrieve data, that an employee has permissions for. In both
cases, we want to get a reminder from our friendly neighborhood compiler, if we
forget to supply a required context while checking a permission.

To make this more concrete, imagine a car manufacturer, with cars and their
parts at specific locations. An employee with permissions for location A should
not be able to interact with data from location B.

If you just want to see the corresponding code, take a look
[here](https://gist.github.com/noobymatze/22e0e8459708487aecf359b91008d0a9).

## Example

To illustrate this in action, let's look at an example. Suppose the two
permissions `viewCar` and `viewCarPart` exist. To view a `CarPart`, you can
either have permissions for the location of the car or its part. I know, this
is slightly contrived, but bear with me here.

```kotlin
val viewCar = Permission(
    name = "View car",
    dependsOn = LocationSource.Car,
)

val viewCarPart = Permission(
    name = "View car part",
    dependsOn = LocationSource.CarPart or LocationSource.Car,
)
```

Now let's define some locations and cars at specific locations, as well as some
assigned permissions an employee might have.


```kotlin
val locA = Location(1)
val locB = Location(2)
val car = Car(location = locA)
val carPart = CarPart(location = locB)

val permissions = AssignedPermissions(
    locA to setOf(viewCar),
    locB to setOf(viewCar, viewCarPart)
)
```

We have two locations and a car and a car part at said locations. The employee
(our user) has some permissions assigned to each location. They can view cars
for `locA` and view cars and their parts for `locB`.

To check a permission at the application level, we can use a function called
`has`:

```kotlin
val buttonVisible = permissions.has(viewCar, car.ref)
```

This checks, whether an employee has the permission to view a car for the given
specific car. Don't worry about the `.ref` property for now. 

If we attempt to use this permission with a `CarPart` instead, the compiler
will throw an error.

```kotlin
// ERROR
val buttonVisible = permissions.has(viewCar, carPart.ref)
```

To check a permission at the database level, we can use a function called
`check`, which transforms the check into a JOOQ/SQL condition, thereby allowing
us to retrieve only data, that the user has permission for.

```kotlin
dsl.select(CAR_PART.asterisk())
    .from(CAR_PART)
    .join(CAR).on(CAR.ID.eq(CAR_PART.CAR_ID))
    .where(permissions.check(viewCarPart, CAR_PART.loc or CAR.loc))
    .fetch()
```

But how do we get there?


## Starting simple

Let's start by modeling a permission in the simplest way possible - using an
enum for `ViewCar` and `ViewCarPart`.

```kotlin
enum Permission {
    ViewCar,
    ViewCarPart,
}
```

However, to describe the dependency of a permission on one or more entities, we
need to add some kind of `LocationSource`.


```kotlin
enum LocationSource {
    Car,
    CarPart,
    None,
}
```

Let's tie this up with our `Permission`.

```kotlin
enum Permission(val dependsOn: LocationSource) {
    ViewCar(dependsOn = LocationSource.Car),
    ViewCarPart(dependsOn = LocationSource.CarPart),
}
```

For every permission it is now possible to specify a dependency. This means, a
user only has the permission to view a car, if they have this permission at the
location of said car. However, if we were to implement the `has` function we
would run into a few problems. Consider this call to `AssignedPermissions.has`. 

```kotlin
permissions.has(Permission.ViewCar, CarPart(...))
```

`ViewCar` expects a car as a dependency but during its check gets a `CarPart`.
So it's entirely possible to supply the wrong dependency to the `has` function.
Additionally, it is not possible to specify multiple dependencies. The latter
problem could be fixed by remodeling the `LocationSource` slightly or making
the `dependsOn` property a `Set<LocationSource>`. The first problem however,
requires rethinking how we model permissions alltogether.


## Generics to the rescue

To address this, we need a way to make the second argument to the function
depend on the first. For example, if a permission requires a `Car`, the second
argument to the function should be a `Car`. If it requires a `CarPart`, the
second argument should be a `CarPart`. 

This is where generics come in.

```kotlin
fun <A> AssignedPermissions.has(
    permission: Permission<A>,
    reference: A,
): Boolean = TODO()
```

This way, whatever the type of `A` in a `Permission` is, it needs to be the
second argument to the function. However, it cannot be just a generic type `A`,
because we also want to allow multiple distinct types as arguments, think about
the `or` case, when viewing a car part. This is were the following type comes
in.

```kotlin
sealed interface Ref<A: Ref<A>> {

    data object None: Ref<None>

    data class Car(val permissions.Car): Ref<Car>

    data class CarPart(val permissions.CarPart): Ref<CarPart>

    data class Or<A: Ref<A>, B: Ref<B>>(
        val left: Ref<A>,
        val right: Ref<B>
    ): Ref<Or<A, B>>

    infix fun <B: Ref<B>> or(other: Ref<B>): Ref<Or<A, B>> =
        Or(this, other)

}
```

A `Ref` defines a type, that will contain the actual references to location
based entities. `None` can be used, when just having the permission at any
location suffices and `Or` to supply multiple dependencies in an `or`
relationship. You could also define an `And` relationship, but let's ignore
this for brevity.

The `LocationSource` will look structurally similar, because we need to tie
these two up.

```kotlin
sealed interface LocationSource<A: Ref<A>> {

    data object None: LocationSource<Ref.None>

    data object Car: LocationSource<Ref.Car>

    data object CarPart: LocationSource<Ref.CarPart>

    data class Or<A: Ref<A>, B: Ref<B>>(
        val a: LocationSource<A>,
        val b: LocationSource<B>
    ): LocationSource<Ref.Or<A, B>>

    infix fun <B: Ref<B>> or(other: LocationSource<B>): LocationSource<Ref.Or<A, B>> =
        Or(this, other)

}
```

Using these two types, we can now refine the `Permission` type.

```kotlin
data class Permission<T: Ref<T>>(
    val name: String,
    val dependsOn: LocationSource<T>,
)
```

## Back to where we started

With these updates, we can redefine permissions and implement type-safe
permissions checks at both the application and database level.

```kotlin
val viewCar = Permission(
    name = "View car",
    dependsOn = LocationSource.Car,
)

val viewCarPart = Permission(
    name = "View car part",
    dependsOn = LocationSource.CarPart or LocationSource.Car,
)
```

And we can also now implement the `has` function to check permissions.

```kotlin
fun <R: Ref<R>> AssignedPermissions.has(
    permission: Permission<R>,
    reference: Ref<R>,
): Boolean = when (reference) {
    is Ref.None ->
        permissionsPerLocation
            .any { (_, permissions) -> permission in permissions }

    is Ref.Car ->
        permissionsPerLocation[reference.car.loc]
            ?.contains(permission) == true

    is Ref.CarPart ->
        permissionsPerLocation[reference.part.loc]
            ?.contains(permission) == true

    is Ref.Or<*, *> ->
        @Suppress("UNCHECKED_CAST")
        hasPermission(permission, reference.a as Ref<R>) 
            || hasPermission(permission, reference.b as Ref<R>)
}
```

`CarPart` and `Car` are straightforward, just checking the permissions for the
respective location of the car or car part. `None` checks, whether the
permission exists at any location. You could also define the semantics of
`None` differently and require a separate global set of permissions and only
check those, but let's just keep it simple for now. 

`Or` is the most difficult part and since Kotlin does not support generalized
algebraic data types (GADTs) has to be implemented with incorrect casts (`as
Ref<R>`). Fortunately, since we never really do anything with the generic type,
these casts will not blow up.

But the interesting thing is, that our function signature is type-safe by
construction but the implementation uses unsafe mechanisms to implement it.

With a few convenience properties, the initial example should work now and also
explain the weird `.ref` property from the beginning.

```kotlin
val Car.ref get() = Ref.Car(this)
val CarPart.ref get() = Ref.CarPart(this)

// WOHOO
val buttonVisible = permissions.has(viewCar, car.ref)
```


## What about the database?

To implement a check in the database, we essentially implement the `Ref<A>`
again with other properties. I haven't found a way in Kotlin to make `Ref<A>`
so generic, that we would only need to implement it once. Therefore, we need a
second type.

```kotlin
sealed interface RefCondition<A: Ref<A>> {

    data object None: RefCondition<Ref.None>

    data class Car(val locField: Field<Long>): RefCondition<Ref.Car>

    data class CarPart(val locField: Field<Long>): RefCondition<Ref.CarPart>

    data class Or<A: Ref<A>, B: Ref<B>>(
        val a: RefCondition<A>,
        val b: RefCondition<B>
    ): RefCondition<Ref.Or<A, B>>

    infix fun <B: Ref<B>> or(other: RefCondition<B>): RefCondition<Ref.Or<A, B>> =
        Or(this, other)

}
```

This allows us to implement the `check` function for the database from the
beginning.

```kotlin
fun <R: Ref<R>> AssignedPermissions.check(
    permission: Permission<R>,
    reference: RefCondition<R>,
): Condition {
    fun checkHelp(ref: RefCondition<R>, locationsWithPermission: List<Long>): Condition =
        when (ref) {
            RefCondition.None -> DSL.trueCondition()
            is RefCondition.Car -> ref.locField.`in`(locationsWithPermission)
            is RefCondition.CarPart -> ref.locField.`in`(locationsWithPermission)
            is RefCondition.Or<*, *> -> DSL.or(
                @Suppress("UNCHECKED_CAST")
                whereHelp(ref.a as RefCondition<R>, locationsWithPermission),
                @Suppress("UNCHECKED_CAST")
                whereHelp(ref.b as RefCondition<R>, locationsWithPermission),
            )
        }

    val locationsWithPermission = permissionsPerLocation
        .mapNotNull { (loc, permissions) -> loc.id.takeIf { permission in permissions } }

    return checkHelp(reference, locationsWithPermission)
}
```

We fetch all locations for the given permission and evaluate the
`RefCondition<A>`, the same way we did for `has`, but this time building a
JOOQ-Condition instead of a boolean.

And finally, we are able to build a query with the condition using a few helper
properties.

```kotlin
val Table<CarRecord>.loc get(): RefCondition<Car> = 
    RefCondition.Car(CAR.LOCATION)

val Table<CarPartRecord>.loc get(): RefCondition<CarPart> = 
    RefCondition.CarPart(CAR_PART.LOCATION)

dsl.select(CAR_PART.asterisk())
    .from(CAR_PART)
    .join(CAR).on(CAR.ID.eq(CAR_PART.CAR_ID))
    .where(permissions.check(viewCarPart, CAR_PART.loc or CAR.loc))
    .fetch()
```

### Conclusion

This post has shown how to model location dependent permissions and make their
usage type-safe by using generics, thereby avoiding passing the wrong
dependencies during the actual permission checks and allowing complex logical
dependencies on locations.

The ideas presented in this post are inspired by work of my fellow colleague
Sören at the [lambda9](https://lambda9.de), who implemented the non type-safe
version.

Over several years something like this, I was wondering, whether there could be
a type-safe variant, because we had the problem of supplying the wrong
arguments to permissions several times over the years and they are always
annoying to track down.

Take care!
