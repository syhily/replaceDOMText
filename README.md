# replaceDOMText

[![npm version](https://img.shields.io/npm/v/replaceDOMText.svg?style=flat-square)](https://www.npmjs.com/package/replaceDOMText)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/replaceDOMText?style=flat-square)](https://bundlephobia.com/package/replaceDOMText)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![ESM Only](https://img.shields.io/badge/module-ESM%20only-brightgreen?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

**A modern TypeScript + ESM rewrite of [James Padolsey’s findAndReplaceDOMText](https://github.com/padolsey/findAndReplaceDOMText)**

Search, replace, or wrap matching text in the DOM — even when matches span **multiple nodes**.
Now written in **TypeScript**, distributed as **ES modules**, and fully typed for better developer experience.

## ✨ Features

- 🔍 Find text using **RegExp** or **string**
- 🧩 **Replace** or **wrap** matches with text or DOM elements
- 💬 Supports **cross-node matches**
- 🧠 Fully **typed API** with IntelliSense
- ⚙️ Built-in `preset: 'prose'` for natural text replacement
- ♻️ Supports **revert()** to undo replacements
- 📦 Ships as **pure ESM + `.d.ts`** definitions

## 🚀 Installation

```bash
npm install replaceDOMText
```

Or via CDN:

```html
<script type="module">
  import replaceDOMText from 'https://cdn.jsdelivr.net/npm/replaceDOMText/+esm'
</script>
```

## 🧩 Basic Usage

```html
<p id="t">123 456 Hello</p>
```

```ts
import replaceDOMText from 'replaceDOMText'

replaceDOMText(document.getElementById('t')!, {
  find: /Hello/,
  wrap: 'em',
})
```

**Result:**

```html
<p id="t">123 456 <em>Hello</em></p>
```

## 💡 Cross-Node Matching

```html
<p id="t">123 456 Hell<span>o Goodbye</span></p>
```

```ts
replaceDOMText(document.getElementById('t')!, {
  find: /Hello/,
  wrap: 'em',
})
```

**Result:**

```html
<p id="t">
  123 456 <em>Hell</em><span><em>o</em> Goodbye</span>
</p>
```

## ⚙️ API

```ts
replaceDOMText(
  element: Element | Text,
  options: ReplaceDOMTextOptions,
): Finder
```

### `ReplaceDOMTextOptions`

| Option             | Type                                           | Description                                                                                      |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **find**           | `RegExp \| string`                             | Text or pattern to search for. Add `/g` for multiple matches.                                    |
| **replace**        | `string \| (portion, match) => string \| Node` | Replace matches with text or a Node. Supports `$0`, `$1`, `$&`, `$'`, `$``.                      |
| **wrap**           | `string \| Node`                               | Wrap each match in an element (`'span'`, `'em'`, etc.) or clone a provided node.                 |
| **wrapClass**      | `string`                                       | CSS class to apply to the wrapping element. Ignored if `wrap` is not used.                       |
| **portionMode**    | `'retain' \| 'first'`                          | Preserve node boundaries (`retain`, default) or merge into the first node (`first`).             |
| **filterElements** | `(el: Element) => boolean`                     | Return `false` to skip specific elements.                                                        |
| **forceContext**   | `boolean \| (el: Element) => boolean`          | Force elements to act as their own matching contexts.                                            |
| **preset**         | `'prose'`                                      | Ignore non-text elements (`<script>`, `<svg>`, etc.) and restrict matches within block elements. |

### 🔤 Using a Function for `replace`

```ts
replaceDOMText(document.getElementById('container')!, {
  find: 'function',
  replace: (portion, match) => `[${portion.index}]`,
})
```

**Input:**

```html
<div id="container">Explaining how to write a replace <em>fun</em>ction</div>
```

**Output:**

```html
<div id="container">Explaining how to write a replace <em>[0]</em>[1]</div>
```

### 🎨 Wrapping Matches

```ts
replaceDOMText(document.getElementById('container')!, {
  find: 'with ',
  wrap: 'em',
  wrapClass: 'highlight',
})
```

**CSS:**

```css
.highlight {
  background: yellow;
}
```

**Result:**

```html
<em class="highlight">with </em>
```

### 🧱 Context Control

Prevent matches from crossing certain element boundaries:

```ts
replaceDOMText(document.getElementById('test')!, {
  find: 'amazing',
  wrap: 'em',
  forceContext: el => el.matches('p'),
})
```

### 🧰 Instance API

```ts
const finder = replaceDOMText(node, options)

// Revert changes
finder.revert()
```

> ⚠️ Reversion only works if the DOM has not been modified after replacement.

## 🧠 Presets

### `preset: 'prose'`

Optimized for prose and text content.
Skips non-prose elements and prevents matches across block boundaries.

```ts
replaceDOMText(element, {
  preset: 'prose',
  find: 'something',
  replace: 'something else',
})
```

## 🧾 Type Definitions

TypeScript users get full type support out of the box:

```ts
import replaceDOMText, {
  Finder,
  Portion,
  ReplaceDOMTextOptions,
} from 'replaceDOMText'
```

## 🧩 Example Projects

- [Kanji Typesetting](https://github.com/syhily/kanji-typesetting)

## 📜 License

**MIT License**
Originally by [James Padolsey](https://github.com/padolsey)
TypeScript & ESM rewrite © 2025 by Yufan Sheng
