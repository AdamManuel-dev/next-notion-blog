---
title: "package.json “—help” CLI"
id: "9489cdd63f794fcda076c3f80d6e8be9"
slug: "package-json-help-cli"
source_url: "https://adams-blog.notion.site/package-json-help-CLI-9489cdd63f794fcda076c3f80d6e8be9"
extracted_at: "2026-10-30T19:38:37.768Z"
cover: null
---

# package.json “—help” CLI

<a id="e0059465b1e24fd2847435055250f63c"></a>

#### 1\. Installation (optional)

<a id="b72934053bab42dcaddaf8cee7bdb8cd"></a>

Install the “fx” package from npm globally. It’s a JSON Explorer UI in the terminal

<a id="8dff742dcd9448f4b91dfc61b477cdf0"></a>

```
npm i -g fx
```

<a id="d5fc8543c116480eba70d3940b7d8c44"></a>

<a id="6940915ea32848a2901989dd07082f2e"></a>

> if you wish to skip this step, replace all the instances of `fx` with `npx fx`

<a id="6c3b3c57652a465d9f17eba83288fa1b"></a>

#### 2\. Create Alias

<a id="4461d629d70f44f284f2b655621b1b9b"></a>

Create this alias in your terminal rc. For bash it will be `~/.bashrc` and Zsh it will be `~/.zshrc`

<a id="536a648afd934480b7075f3d2af1f2ea"></a>

```
alias npm-help="cat package.json | fx '.scripts'"
```

<a id="eaab3840d5fc4a74b4246ebae14d2536"></a>

#### 3\. Restart the terminal session

<a id="dccbe9cdd0024d00b57eb3a600b20aa4"></a>

Either close the terminal and repoen it, or run `source` on teh file you just added the alias to

<a id="e6b8aa1fe96b4287b1940f67cb237943"></a>

ex `source ~/.zshrc`

<a id="f6574918e4f849208fc91552274c3960"></a>

#### 4\. Use the new npm help command!

<a id="157a2a07b31d4f13a401387143675bb4"></a>

```
> npm-help

{
  "dev": "next",
  "dev:storybook": "npm run storybook",
  "build": "next build",
  "start": "next start",
  "storybook": "start-storybook -p 6006",
  "build-storybook": "build-storybook"
}
```

<a id="263cf11985ce4131acca488402d123a6"></a>

#### (extra) Use grep for larger projects

<a id="8565283a470e430fbe9f0053c14da79e"></a>

```
> npm-help | grep 'storybook'

  "dev:storybook": "npm run storybook",
  "storybook": "start-storybook -p 6006",
  "build-storybook": "build-storybook"
```
