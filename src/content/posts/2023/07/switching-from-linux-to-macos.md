---
title: Switching from Linux to macOS
summary: |
  Things to know when switching from linux to macOS.
tags: []
date: 2023-06-24
author: Matthias
---

At work, I have been switching to macOS due to learning iOS development.
I have been using Linux for more than 10 years now, so needless to say,
it takes some getting used to. This document contains things I had to
configure, learn or re-learn in the hope it helps others.

## Navigation

This section contains shortcuts and navigational things, I had to find on the internet, because it wasn’t clear to me, how to do them.

- Switching to the **home directory** in finder: `Cmd+Shift+H`
- Show **hidden files**: `Cmd+Shift+`.

## Software

This chapter contains software I use daily and therefore needs to work.

### Brew

If you are a developer, before you do anything, you should install [Homebrew](https://brew.sh/). You can think of homebrew as a package manager, like *apt*, *pacman* or whatever floats the boat of the linux distribution of your choice (been using Mint). There is also [sdkman](https://sdkman.io/), which also seems nice, but I am not sure, what the differences are yet.

### Fish

You can install a fish shell with `brew install fish`. Then you need to switch the shell in your **Terminal** settings to `/opt/homebrew/bin/fish`.

I also generally use [Starship](https://starship.rs/) and [Fisher](https://github.com/jorgebucaran/fisher). Especially Fisher makes it quite easy to setup NVM for NodeJS projects, which has been its main use for me. Starship is just brilliant in showing relevant information for the active environment in a project.

### Java

You can install Java via Homebrew with `brew install openjdk` or `brew install openjdk@17`. However, this doesn’t mean, that a call to `java —version` will yield anything meaningful. What you need to do is symlink the installed versions for example by using the following commands for Java 17.

```bash
# Allow macOS to detect the installed JDK.
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk \
        /Library/Java/JavaVirtualMachines/openjdk-17.jdk

# Set openjdk 17 as the default Java version:
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk \
        /Library/Java/JavaVirtualMachines/openjdk.jdk
```

Sometimes it is necessary to work with multiple versions, so in 
fish it's possible to set up the following aliases to easily 
switch between them:

```bash
alias java11="set --export --global JAVA_HOME (/usr/libexec/java_home -v 11)"
alias java17="set --export --global JAVA_HOME (/usr/libexec/java_home -v 17)"
alias java21="set --export --global JAVA_HOME (/usr/libexec/java_home -v 21)"
```

### Maven

Maven can be easily installed via `brew install maven`. It also does have a pretty recent version, which is pretty nice in comparison to the typical linux package manager.

### Node Version Manager (NVM)

You can install NVM with `fisher install jorgebucaran/nvm.fish` and then just use it. Otherwise, I don’t know.

### Docker

It is necessary to install Docker Desktop to work without hassle with docker containers.

You should be able to use podman instead of docker and even be able to essentially make an alias for docker. However, personally, I had a problem, where a container started by podman two weeks ago, could not be started and I still don’t really have any idea why.

So, I am a little cautious.

### No space left on device

By default, it seems, that docker images have a size limitation of 60GB. [https://forums.docker.com/t/no-space-left-on-device-error/10894/24?u=adnan](https://forums.docker.com/t/no-space-left-on-device-error/10894/24?u=adnan) 
In Docker Desktop, this can easily be configured in the settings dialog.

## Alt Tab

If you love the windows behavior of alt tab, you should install [AltTab](https://alt-tab-macos.netlify.app/).

```bash
brew install --cask alt-tab
```