/**
 * replaceDOMText v1.0.0
 * @author Yufan Sheng <https://yufan.me>
 *
 * Modified version of findAndReplaceDOMText by James Padolsey (https://github.com/padolsey/findAndReplaceDOMText)
 */
enum PortionMode {
  RETAIN = 'retain',
  FIRST = 'first',
}

enum Preset {
  PROSE = 'prose',
}

interface Portion {
    node: HTMLElement;
    index: number;
    text: string;
    indexInMatch: number;
    indexInNode: number;
    endIndexInNode: number;
    isEnd: boolean;
}

interface Options {
    /**
     * Something to search for. A string will perform a global search by default (looking for all matches),
     * but a RegExp will only do so if you include the global (/.../g) flag.
     */
    find: RegExp | string;
    /**
     * A String of text to replace matches with, or a Function which should return replacement Node or String. If you use a string, it can contain various tokens:
     *
     * $n to represent the nth captured group of a regular expression (i.e. $1, $2, ...)
     * $0 or $& to represent the entire match
     * $` to represent everything to the left of the match.
     * $' to represent everything to the right of the match.
     */
    replace?: string | ((portion: Portion, match?: any) => string | number | HTMLElement | Text) | undefined;
    /**
     * A string representing the node-name of an element that will be wrapped around matches (e.g. span or em).
     * Or a Node (i.e. a stencil node) that we will clone for each match portion.
     */
    wrap?: string | HTMLElement | undefined;
    /**
     * A string representing the class name to be assigned to the wrapping element (e.g. <span class="myClass">found text</span>).
     * If the wrap option is not specified, then this option is ignored.
     */
    wrapClass?: string | undefined;
    /**
     * Indicates whether to re-use existing node boundaries when replacing a match with text (i.e. the default, "retain"),
     * or whether to instead place the entire replacement in the first-found match portion's node.
     *
     * Most of the time you'll want the default.
     */
    portionMode?: PortionMode | undefined;
    /**
     * A function to be called on every element encountered by findAndReplaceDOMText.
     * If the function returns false the element will be altogether ignored.
     */
    filterElements?: ((el: HTMLElement) => boolean) | undefined;
    /**
     * A boolean or a boolean-returning function that'll be called on every element
     * to determine if it should be considered as its own matching context.
     */
    forceContext?: boolean | ((el: HTMLElement) => boolean) | undefined;
    /**
     * Currently there's only one preset: prose.
     */
    preset?: Preset | undefined;
}

interface Return {
    /**
     * Reversion occurs backwards so as to avoid nodes subsequently replaced during the matching phase.
     */
    revert: () => Return;
}

const NON_PROSE_ELEMENTS = {
  br: 1,
  hr: 1,
  // Media / Source elements:
  script: 1,
  style: 1,
  img: 1,
  video: 1,
  audio: 1,
  canvas: 1,
  svg: 1,
  map: 1,
  object: 1,
  // Input elements
  input: 1,
  textarea: 1,
  select: 1,
  option: 1,
  optgroup: 1,
  button: 1,
}

// Elements that will not contain prose or block elements where we don't
// want prose to be matches across element borders:
const NON_CONTIGUOUS_PROSE_ELEMENTS = {
  // Block Elements
  address: 1,
  article: 1,
  aside: 1,
  blockquote: 1,
  dd: 1,
  div: 1,
  dl: 1,
  fieldset: 1,
  figcaption: 1,
  figure: 1,
  footer: 1,
  form: 1,
  h1: 1,
  h2: 1,
  h3: 1,
  h4: 1,
  h5: 1,
  h6: 1,
  header: 1,
  hgroup: 1,
  hr: 1,
  main: 1,
  nav: 1,
  noscript: 1,
  ol: 1,
  output: 1,
  p: 1,
  pre: 1,
  section: 1,
  ul: 1,
  // Other misc. elements that are not part of continuous inline prose:
  br: 1,
  li: 1,
  summary: 1,
  dt: 1,
  details: 1,
  rp: 1,
  rt: 1,
  rtc: 1,
  // Media / Source elements:
  script: 1,
  style: 1,
  img: 1,
  video: 1,
  audio: 1,
  canvas: 1,
  svg: 1,
  map: 1,
  object: 1,
  // Input elements
  input: 1,
  textarea: 1,
  select: 1,
  option: 1,
  optgroup: 1,
  button: 1,
  // Table related elements:
  table: 1,
  tbody: 1,
  thead: 1,
  th: 1,
  tr: 1,
  td: 1,
  caption: 1,
  col: 1,
  tfoot: 1,
  colgroup: 1,
}

// Presets accessed via `options.preset` when calling findAndReplaceDOMText():
const PRESETS: Record<string, Partial<Options>> = {
  prose: {
    forceContext: (el: HTMLElement) => el.nodeName.toLocaleLowerCase() in NON_CONTIGUOUS_PROSE_ELEMENTS,
    filterElements: (el: HTMLElement) => !(el.nodeName.toLocaleLowerCase() in NON_PROSE_ELEMENTS),
  },
}

function escapeRegExp(str: string): string {
  return String(str).replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1')
}

/**
 * findAndReplaceDOMText searches for regular expression matches in a given DOM
 * node and replaces or wraps each match with a node or piece of text that you can specify.
 */
function findAndReplaceDOMText(node: HTMLElement, options: Options): Finder {
  return new Finder(node, options)
}

/**
 * Finder -- encapsulates logic to find and replace.
 */
class Finder {
  constructor(node: HTMLElement, options: Options) {
    const preset = options.preset && PRESETS[options.preset]
    options.portionMode = options.portionMode || PortionMode.RETAIN
    if (preset) {
      for (const i in preset) {
        options[i] = preset[i]
      }
    }

  }
}
