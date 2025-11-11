/**
 * replaceDOMText v1.0.0
 * @author Yufan Sheng <https://yufan.me>
 *
 * Modified version of findAndReplaceDOMText by James Padolsey (https://github.com/padolsey/findAndReplaceDOMText)
 */
export enum PortionMode {
  RETAIN = 'retain',
  FIRST = 'first',
}

export enum Preset {
  PROSE = 'prose',
}

export interface Portion {
  node: Text | HTMLElement
  index: number
  text: string
  indexInMatch: number
  indexInNode: number
  endIndexInNode: number
  isEnd?: boolean
}

export interface MatchWithMeta extends RegExpMatchArray {
  startIndex: number
  endIndex: number
  index: number
  input: string
}

export interface Options {
  /**
   * Something to search for. A string will perform a global search by default (looking for all matches),
   * but a RegExp will only do so if you include the global (/.../g) flag.
   */
  find: RegExp | string
  /**
   * A String of text to replace matches with, or a Function which should return replacement Node or String. If you use a string, it can contain various tokens:
   *
   * $n to represent the nth captured group of a regular expression (i.e. $1, $2, ...)
   * $0 or $& to represent the entire match
   * $` to represent everything to the left of the match.
   * $' to represent everything to the right of the match.
   */
  replace?: string | ((portion: Portion, match?: MatchWithMeta) => string | number | HTMLElement | Text) | undefined
  /**
   * A string representing the node-name of an element that will be wrapped around matches (e.g. span or em).
   * Or a Node (i.e. a stencil node) that we will clone for each match portion.
   */
  wrap?: string | HTMLElement | undefined
  /**
   * A string representing the class name to be assigned to the wrapping element (e.g. <span class="myClass">found text</span>).
   * If the wrap option is not specified, then this option is ignored.
   */
  wrapClass?: string | undefined
  /**
   * Indicates whether to re-use existing node boundaries when replacing a match with text (i.e. the default, "retain"),
   * or whether to instead place the entire replacement in the first-found match portion's node.
   *
   * Most of the time you'll want the default.
   */
  portionMode?: PortionMode | undefined
  /**
   * A function to be called on every element encountered by findAndReplaceDOMText.
   * If the function returns false the element will be altogether ignored.
   */
  filterElements?: ((el: HTMLElement) => boolean) | undefined
  /**
   * A boolean or a boolean-returning function that'll be called on every element
   * to determine if it should be considered as its own matching context.
   */
  forceContext?: boolean | ((el: HTMLElement) => boolean) | undefined
  /**
   * Currently there's only one preset: prose.
   */
  preset?: Preset | undefined
}

export interface Return {
  /**
   * Reversion occurs backwards so as to avoid nodes subsequently replaced during the matching phase.
   */
  revert: () => Return
}

export type TextAgg = Array<string | TextAgg>

export const NON_PROSE_ELEMENTS = {
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
export const NON_CONTIGUOUS_PROSE_ELEMENTS = {
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

export const NON_INLINE_PROSE = (el: HTMLElement) => el.nodeName.toLocaleLowerCase() in NON_CONTIGUOUS_PROSE_ELEMENTS

// Presets accessed via `options.preset` when calling findAndReplaceDOMText():
export const PRESETS: Record<string, Partial<Required<Options>>> = {
  prose: {
    forceContext: NON_INLINE_PROSE,
    filterElements: (el: HTMLElement) => !(el.nodeName.toLocaleLowerCase() in NON_PROSE_ELEMENTS),
  },
}

/**
 * Entry point.
 *
 * findAndReplaceDOMText searches for regular expression matches in a given DOM
 * node and replaces or wraps each match with a node or piece of text that you can specify.
 */
export default function findAndReplaceDOMText(node: HTMLElement, options: Options): Finder {
  return new Finder(node, options)
}

/**
 * Finder -- encapsulates logic to find and replace.
 */
export class Finder implements Return {
  private node: HTMLElement
  private options: Options
  private reverts: Array<() => void> = []
  private matches: MatchWithMeta[] = []
  private createdNodes: WeakSet<Node> = new WeakSet()

  constructor(node: HTMLElement, options: Options) {
    options.portionMode = options.portionMode || PortionMode.RETAIN

    // Apply preset if specified
    const preset = options.preset && PRESETS[options.preset]
    if (preset) {
      options = { ...options, ...preset }
    }

    this.node = node
    this.options = options
    this.matches = this.search()

    if (this.matches.length) {
      this.processMatches()
    }
  }

  /**
   * Searches for all matches that comply with the instance's 'match' option
   */
  private search(): MatchWithMeta[] {
    function escapeRegExp(str: string): string {
      return String(str).replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1')
    }
    let matchIndex = 0
    let offset = 0
    const rawFind = this.options.find
    const regex: RegExp
      = typeof rawFind === 'string' ? new RegExp(escapeRegExp(rawFind), 'g') : rawFind

    const textAggregation = this.getAggregateText() as TextAgg
    const matches: MatchWithMeta[] = []
    const matchAggregation = (textAgg: TextAgg) => {
      for (const item of textAgg) {
        if (typeof item !== 'string') {
          matchAggregation(item)
          continue
        }
        if (regex.global) {
          let m: RegExpExecArray | null = regex.exec(item)
          while (m) {
            matches.push(this.prepMatch(m, matchIndex++, offset))
            m = regex.exec(item)
          }
          regex.lastIndex = 0
        }
        else {
          const m = item.match(regex)
          if (m)
            matches.push(this.prepMatch(m as RegExpMatchArray, 0, offset))
        }
        offset += item.length
      }
    }

    matchAggregation(textAggregation)
    return matches
  }

  /**
   * Prepares a single match with useful meta info:
   */
  private prepMatch(match: RegExpMatchArray, matchIndex: number, characterOffset: number): MatchWithMeta {
    if (!match[0]) {
      throw new Error('findAndReplaceDOMText cannot handle zero-length matches')
    }

    const startIndex = (match as any).index ?? 0
    const input = (match as any).input ?? ''
    const endIndex = characterOffset + startIndex + match[0].length

    return Object.assign(match, {
      startIndex: characterOffset + startIndex,
      endIndex,
      index: matchIndex,
      input,
    }) as MatchWithMeta
  }

  /**
   * Gets aggregate text within subject node
   */
  private getAggregateText(): TextAgg {
    const { filterElements, forceContext } = this.options

    const getText = (node: Node): TextAgg => {
      if (node.nodeType === Node.TEXT_NODE)
        return [(node as Text).data]

      if (node.nodeType !== Node.ELEMENT_NODE)
        return []

      const el = node as HTMLElement
      if (filterElements && !filterElements(el))
        return []

      const txt: TextAgg = ['']
      let i = 0
      let child: ChildNode | null = el.firstChild

      while (child) {
        if (child.nodeType === Node.TEXT_NODE) {
          (txt[i] as string) += (child as Text).data
        }
        else {
          const innerText = getText(child)

          if (
            forceContext
            && (forceContext === true
              || (typeof forceContext === 'function' && forceContext(child as HTMLElement)))
          ) {
            txt[++i] = innerText
            txt[++i] = ''
          }
          else {
            if (typeof innerText[0] === 'string') {
              (txt[i] as string) += innerText.shift()!
            }
            if (innerText.length) {
              txt[++i] = innerText
              txt[++i] = ''
            }
          }
        }
        child = child.nextSibling
      }

      return txt
    }

    return getText(this.node)
  }

  /**
   * Steps through the target node, looking for matches, and
   * calling replaceFn when a match is found.
   */
  private processMatches(): void {
    const { filterElements } = this.options
    const matches = [...this.matches]

    let startPortion: Portion | null = null
    let endPortion: Portion | null = null
    let innerPortions: Portion[] = []
    let curNode: Node | null = this.node
    let match = matches.shift()
    let atIndex = 0
    let portionIndex = 0
    let consumedInMatch = 0
    const nodeStack: Node[] = [this.node]

    let done = false

    while (curNode && !done) {
      // Skip any nodes we have created during replacement so index accounting stays aligned
      if (this.createdNodes.has(curNode)) {
        if (curNode.nextSibling) {
          curNode = curNode.nextSibling
          continue
        }
        // Pop back up until we find a sibling or run out
        while (nodeStack.length > 0) {
          const parent = nodeStack.pop()!
          if (parent.nextSibling) {
            curNode = parent.nextSibling
            break
          }
          if (parent === this.node) {
            curNode = null
            done = true
            break
          }
        }
        continue
      }
      if (curNode.nodeType === Node.TEXT_NODE && match) {
        const curText = (curNode as Text).data
        const textLength = curText.length

        if (!endPortion && atIndex + textLength >= match.endIndex) {
          endPortion = {
            node: curNode as Text,
            index: portionIndex++,
            text: curText.substring(match.startIndex - atIndex, match.endIndex - atIndex),
            indexInMatch: consumedInMatch,
            indexInNode: match.startIndex - atIndex,
            endIndexInNode: match.endIndex - atIndex,
            isEnd: true,
          }
        }
        else if (startPortion) {
          innerPortions.push({
            node: curNode as Text,
            index: portionIndex++,
            text: curText,
            indexInMatch: consumedInMatch,
            indexInNode: 0,
            endIndexInNode: curText.length,
          })
          consumedInMatch += curText.length
        }

        if (!startPortion && atIndex + textLength > match.startIndex) {
          startPortion = {
            node: curNode as Text,
            index: portionIndex++,
            text: curText.substring(match.startIndex - atIndex, match.endIndex - atIndex),
            indexInMatch: 0,
            indexInNode: match.startIndex - atIndex,
            endIndexInNode: match.endIndex - atIndex,
          }
          consumedInMatch = startPortion.text.length
        }

        atIndex += textLength
      }

      const doAvoidNode
        = curNode.nodeType === Node.ELEMENT_NODE
          && filterElements
          && !filterElements(curNode as HTMLElement)

      if (startPortion && endPortion && match) {
        // Perform the replacement for the current match and continue from the following text node
        const nextNode = this.replaceMatch(match, startPortion, innerPortions, endPortion)
        // Clear portion tracking for the just-processed match
        startPortion = null
        endPortion = null
        innerPortions = []
        // Advance the aggregated index to the end of the processed match
        atIndex = match.endIndex
        // Move to the next match
        match = matches.shift()
        portionIndex = 0
        consumedInMatch = 0
        curNode = nextNode
        if (!match)
          done = true
        continue
      }

      if (!doAvoidNode && curNode.firstChild) {
        nodeStack.push(curNode)
        curNode = curNode.firstChild
        continue
      }

      if (curNode.nextSibling) {
        curNode = curNode.nextSibling
        continue
      }

      // Pop back up until we find a sibling or run out
      while (nodeStack.length > 0) {
        const parent = nodeStack.pop()!
        if (parent.nextSibling) {
          curNode = parent.nextSibling
          break
        }
        if (parent === this.node) {
          curNode = null
          done = true
          break
        }
      }
    }
  }

  /**
   * Reverts
   */
  revert(): Return {
    for (let i = this.reverts.length; i--;) this.reverts[i]()
    this.reverts = []
    return this
  }

  private prepareReplacementString(str: string, portion: Portion, match: MatchWithMeta): string {
    const portionMode = this.options.portionMode
    if (portionMode === PortionMode.FIRST && portion.indexInMatch > 0)
      return ''

    str = str.replace(/\$(\d+|[&`'])/g, (_, t: string) => {
      switch (t) {
        case '&': return match[0]
        case '`': return match.input.substring(0, match.startIndex)
        case '\'': return match.input.substring(match.endIndex)
        default: return match[+t] || ''
      }
    })

    if (portionMode === PortionMode.FIRST)
      return str
    if (portion.isEnd)
      return str.substring(portion.indexInMatch)
    return str.substring(portion.indexInMatch, portion.indexInMatch + portion.text.length)
  }

  private getPortionReplacementNode(portion: Portion, match: MatchWithMeta): Node {
    const { replace = '$&', wrap, wrapClass } = this.options

    // Handle functional replacements
    if (typeof replace === 'function') {
      const result = replace(portion, match)
      if (result instanceof Node)
        return result
      return document.createTextNode(String(result))
    }

    // Handle string replacement
    const replacementText = this.prepareReplacementString(replace, portion, match)
    const textNode = document.createTextNode(replacementText)

    // Handle wrapper (string tag or HTMLElement)
    if (!wrap)
      return textNode

    // If the replacement text is empty, avoid creating empty wrappers.
    if (replacementText.length === 0)
      return document.createTextNode('')

    const el
      = typeof wrap === 'string'
        ? document.createElement(wrap)
        // Clone the stencil element fresh for each replacement to avoid reusing the same node
        : (wrap as HTMLElement).cloneNode(false) as HTMLElement

    if (wrapClass)
      el.className = wrapClass

    el.appendChild(textNode)
    return el
  }

  private replaceMatch(
    match: MatchWithMeta,
    startPortion: Portion,
    innerPortions: Portion[],
    endPortion: Portion,
  ): Node | null {
    const matchStartNode = startPortion.node
    const matchEndNode = endPortion.node

    let precedingTextNode: Text | null = null
    let followingTextNode: Text | null = null

    if (!(matchStartNode instanceof Text) || !(matchEndNode instanceof Text)) {
      return null
    }

    if (matchStartNode === matchEndNode) {
      const node = matchStartNode
      const parent = node.parentNode!
      // Fast path intentionally avoided: modifying text directly breaks aggregated index alignment
      if (startPortion.indexInNode > 0) {
        precedingTextNode = document.createTextNode(node.data.substring(0, startPortion.indexInNode))
        parent.insertBefore(precedingTextNode, node)
      }

      const newNode = this.getPortionReplacementNode(endPortion, match)
      parent.insertBefore(newNode, node)
      this.createdNodes.add(newNode)

      if (endPortion.endIndexInNode < node.length) {
        followingTextNode = document.createTextNode(node.data.substring(endPortion.endIndexInNode))
        parent.insertBefore(followingTextNode, node)
      }

      parent.removeChild(node)

      this.reverts.push(() => {
        if (precedingTextNode?.parentNode === parent)
          parent.removeChild(precedingTextNode)
        if (followingTextNode?.parentNode === parent)
          parent.removeChild(followingTextNode)
        if (newNode.parentNode)
          newNode.parentNode.replaceChild(node, newNode)
      })

      // Continue traversal from the following text (original content after the match)
      return followingTextNode || newNode
    }
    else {
      // Handle start node: split around the matched portion
      const startPreceding = startPortion.indexInNode > 0
        ? document.createTextNode(matchStartNode.data.substring(0, startPortion.indexInNode))
        : null
      const startFollowing = startPortion.endIndexInNode < matchStartNode.length
        ? document.createTextNode(matchStartNode.data.substring(startPortion.endIndexInNode))
        : null

      const firstNode = this.getPortionReplacementNode(startPortion, match)
      this.createdNodes.add(firstNode)
      if (startPreceding) {
        matchStartNode.parentNode!.insertBefore(startPreceding, matchStartNode)
      }
      matchStartNode.parentNode!.insertBefore(firstNode, matchStartNode)
      if (startFollowing) {
        matchStartNode.parentNode!.insertBefore(startFollowing, matchStartNode)
      }
      matchStartNode.parentNode!.removeChild(matchStartNode)

      for (const portion of innerPortions) {
        const innerNode = this.getPortionReplacementNode(portion, match)
        portion.node.parentNode!.replaceChild(innerNode, portion.node)
        this.createdNodes.add(innerNode)
        this.reverts.push(() => {
          if (innerNode.parentNode)
            innerNode.parentNode.replaceChild(portion.node, innerNode)
        })
      }

      // Prepare end replacement node
      const lastNode = this.getPortionReplacementNode(endPortion, match)
      this.createdNodes.add(lastNode)

      // Handle end node: split around the matched portion
      const endPreceding = endPortion.indexInNode > 0
        ? document.createTextNode(matchEndNode.data.substring(0, endPortion.indexInNode))
        : null
      const endFollowing = endPortion.endIndexInNode < matchEndNode.length
        ? document.createTextNode(matchEndNode.data.substring(endPortion.endIndexInNode))
        : null

      if (endPreceding) {
        matchEndNode.parentNode!.insertBefore(endPreceding, matchEndNode)
      }
      matchEndNode.parentNode!.insertBefore(lastNode, matchEndNode)
      if (endFollowing) {
        matchEndNode.parentNode!.insertBefore(endFollowing, matchEndNode)
      }
      matchEndNode.parentNode!.removeChild(matchEndNode)

      this.reverts.push(() => {
        startPreceding?.parentNode?.removeChild(startPreceding)
        firstNode.parentNode?.replaceChild(matchStartNode, firstNode)
        startFollowing?.parentNode?.removeChild(startFollowing)
        endPreceding?.parentNode?.removeChild(endPreceding)
        lastNode.parentNode?.replaceChild(matchEndNode, lastNode)
        endFollowing?.parentNode?.removeChild(endFollowing)
      })

      // Continue traversal from the following text (original content after the match)
      return endFollowing || lastNode
    }
  }
}
