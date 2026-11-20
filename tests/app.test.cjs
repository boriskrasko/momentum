const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
const source = fs.readFileSync(path.join(root, 'main.js'), 'utf8')
const tests = []
const test = (name, run) => tests.push({ name, run })
const flush = () => new Promise(resolve => setImmediate(resolve))

// A small DOM adapter exercises the real page markup and app script without a browser or network.
// Native layout and dialog focus trapping still require a browser check.
class Element {
  constructor(tag, document) {
    this.tagName = tag.toLowerCase()
    this.ownerDocument = document
    this.parentNode = null
    this.children = []
    this.attributes = new Map()
    this.dataset = {}
    this.listeners = new Map()
    this.classes = new Set()
    this.classList = {
      add: (...values) => values.forEach(value => this.classes.add(value)),
      remove: (...values) => values.forEach(value => this.classes.delete(value)),
      contains: value => this.classes.has(value),
      toggle: (value, force = !this.classes.has(value)) => {
        force ? this.classes.add(value) : this.classes.delete(value)
        return force
      }
    }
    this.style = { setProperty(key, value) { this[key] = value } }
    this._text = ''
    if (['input', 'textarea'].includes(this.tagName)) this.value = ''
    this.checked = false
    this.disabled = false
    this.hidden = false
    this.open = false
    this.scrollTop = 0
    this.clientHeight = this.tagName === 'textarea' ? 58 : 0
    this.offsetHeight = this.tagName === 'textarea' ? 60 : 0
    this._scrollHeight = null
  }
  get scrollHeight() {
    if (this._scrollHeight !== null) return this._scrollHeight
    return this.tagName === 'textarea' ? 26 + 32 * this.value.split('\n').length : 0
  }
  set scrollHeight(value) { this._scrollHeight = value }
  get className() { return [...this.classes].join(' ') }
  set className(value) { this.classes = new Set(value.split(/\s+/).filter(Boolean)) }
  get textContent() { return this._text + this.children.map(child => child.textContent).join('') }
  set textContent(value) {
    this.children.forEach(child => { child.parentNode = null })
    this.children = []
    this._text = String(value)
  }
  get innerText() { return this.textContent }
  set innerText(value) { this.textContent = value }
  setAttribute(key, value) {
    this.attributes.set(key, String(value))
    if (key === 'class') this.className = value
    if (key === 'hidden') this.hidden = true
    if (key.startsWith('data-')) {
      this.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value
    }
  }
  getAttribute(key) { return this.attributes.get(key) ?? null }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, [])
    this.listeners.get(type).push(listener)
  }
  dispatch(type, values = {}) {
    const event = {
      type, target: this, key: '', shiftKey: false, isComposing: false,
      defaultPrevented: false, propagationStopped: false,
      preventDefault() { this.defaultPrevented = true },
      stopPropagation() { this.propagationStopped = true },
      ...values
    }
    for (const listener of this.listeners.get(type) || []) listener(event)
    return event
  }
  focus() {
    if (this.ownerDocument.activeElement === this) return
    this.ownerDocument.activeElement?.blur()
    this.ownerDocument.activeElement = this
    this.dispatch('focus')
  }
  blur() {
    if (this.ownerDocument.activeElement !== this) return
    this.ownerDocument.activeElement = this.ownerDocument.body
    this.dispatch('blur')
  }
  click() {
    if (this.disabled) return
    this.focus()
    this.dispatch('click')
  }
  append(...elements) {
    for (const element of elements) {
      element.parentNode = this
      this.children.push(element)
    }
  }
  replaceChildren(...elements) { this.textContent = ''; this.append(...elements) }
  remove() {
    if (!this.parentNode) return
    const siblings = this.parentNode.children
    siblings.splice(siblings.indexOf(this), 1)
    this.parentNode = null
  }
  showModal() { this.ownerDocument.activeElement?.blur(); this.open = true }
  close() { this.open = false; this.dispatch('close') }
}

function matches(element, selector) {
  const parts = selector.split(' ')
  const simple = (node, part) => part.startsWith('.')
    ? node.classList.contains(part.slice(1)) : node.tagName === part
  if (!simple(element, parts.pop())) return false
  let parent = element.parentNode
  while (parts.length) {
    const part = parts.pop()
    while (parent && !simple(parent, part)) parent = parent.parentNode
    if (!parent) return false
    parent = parent.parentNode
  }
  return true
}

function createDocument() {
  const document = new Element('#document', null)
  document.ownerDocument = document
  document.visibilityState = 'visible'
  document.createElement = tag => new Element(tag, document)
  document.querySelectorAll = selector => {
    const found = []
    function visit(node) {
      for (const child of node.children) {
        if (matches(child, selector)) found.push(child)
        visit(child)
      }
    }
    visit(document)
    return found
  }
  document.querySelector = selector => document.querySelectorAll(selector)[0] || null
  const stack = [document]
  const voidTags = new Set(['meta', 'link', 'input', 'img', 'br', 'hr'])
  const tokens = html.match(/<![^>]*>|<[^>]+>|[^<]+/g)
  for (const token of tokens) {
    if (token.startsWith('<!')) continue
    if (token.startsWith('</')) {
      assert.equal(stack.pop().tagName, token.slice(2, -1).trim(), 'HTML tags must nest correctly')
    } else if (token.startsWith('<')) {
      const [, tag, attributes] = token.match(/^<([\w-]+)([^>]*)>/)
      const element = document.createElement(tag)
      for (const attribute of attributes.matchAll(/([^\s=]+)(?:="([^"]*)")?/g)) {
        element.setAttribute(attribute[1], attribute[2] || '')
      }
      stack[stack.length - 1].append(element)
      if (!voidTags.has(tag)) stack.push(element)
    } else {
      stack[stack.length - 1]._text += token.replace(/&amp;/g, '&')
    }
  }
  assert.equal(stack.length, 1)
  document.body = document.querySelector('body')
  document.activeElement = document.body
  return document
}

function response(temperature = 8, icon = 803) {
  return {
    ok: true,
    json: async () => ({
      main: { temp: temperature, humidity: 90 }, wind: { speed: 4.12 },
      weather: [{ id: icon, description: 'broken clouds' }]
    })
  }
}

function boot(options = {}) {
  let now = (options.now || new Date(2026, 10, 20, 5, 30)).getTime()
  const storage = new Map(Object.entries(options.storage || {}))
  const document = createDocument()
  const window = new Element('#window', document)
  window.matchMedia = () => ({ matches: Boolean(options.reducedMotion) })
  const navigator = { onLine: options.online !== false }
  const timers = new Map()
  const requests = []
  const images = []
  let nextTimer = 1
  const timer = (callback, delay, repeat) => {
    const id = nextTimer++
    timers.set(id, { callback, delay, repeat, due: now + delay })
    return id
  }
  class ControlledDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])) }
    static now() { return now }
  }
  class ControlledImage {
    get src() { return this._src }
    set src(value) {
      this._src = value
      images.push(this)
      if (!options.manualImages) queueMicrotask(() => this.onload?.())
    }
    decode() { return options.imageDecode ? options.imageDecode(this) : Promise.resolve() }
  }
  const context = {
    document, window, navigator, Date: ControlledDate, Intl, URLSearchParams, AbortController,
    Image: ControlledImage,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    setInterval: (callback, delay) => timer(callback, delay, true),
    setTimeout: (callback, delay) => timer(callback, delay, false),
    clearTimeout: id => timers.delete(id),
    fetch: (url, config) => {
      requests.push({ url, config })
      return options.fetch ? options.fetch(url, config, requests.length) : Promise.resolve(response())
    }
  }
  vm.runInNewContext(source, context, { filename: 'main.js' })
  return {
    storage, document, window, navigator, timers, requests, images,
    get(selector) {
      const element = document.querySelector(selector)
      assert.ok(element, `Missing element: ${selector}`)
      return element
    },
    async interval(delay) {
      for (const entry of [...timers.values()]) {
        if (entry.repeat && entry.delay === delay) await entry.callback()
      }
      await flush()
    },
    async clock(date) { now = date.getTime(); await this.interval(1000) },
    async advance(milliseconds) {
      await flush()
      const end = now + milliseconds
      while (true) {
        const next = [...timers.entries()]
          .filter(([, entry]) => !entry.repeat && entry.due <= end)
          .sort((first, second) => first[1].due - second[1].due)[0]
        if (!next) break
        const [id, entry] = next
        timers.delete(id)
        now = Math.max(now, entry.due)
        await entry.callback()
        await flush()
      }
      now = end
      await flush()
    },
    setNow(date) { now = date.getTime() }
  }
}

function edit(app, selector, text) {
  const field = app.get(selector)
  field.focus()
  field.value = text
  field.dispatch('input')
  return field
}

function cache(city = 'Warsaw', updatedAt = new Date(2026, 10, 20, 5, 30).getTime()) {
  return JSON.stringify({ city, updatedAt, temperature: 8, humidity: 90,
    wind: 4.12, icon: 803, description: 'broken clouds' })
}

function selectedTheme(app) {
  return app.document.querySelectorAll('.variant-set-theme')
    .filter(button => button.classList.contains('is-selected')).map(button => button.dataset.theme)
}

test('name and focus use native controls with placeholders and restore saved values', () => {
  const app = boot({ storage: { name: 'Boris', focus: 'One\nTwo' } })
  const name = app.get('.name')
  const focus = app.get('.focus')
  assert.equal(name.tagName, 'input')
  assert.equal(name.getAttribute('type'), 'text')
  assert.ok(name.getAttribute('placeholder'))
  assert.equal(focus.tagName, 'textarea')
  assert.equal(focus.getAttribute('rows'), '1')
  assert.ok(focus.getAttribute('placeholder'))
  for (const field of [name, focus]) assert.equal(field.getAttribute('contenteditable'), null)
  assert.equal(name.value, 'Boris')
  assert.equal(focus.value, 'One\nTwo')
  edit(app, '.name', 'Updated name').dispatch('keydown', { key: 'Enter' })
  edit(app, '.focus', 'First\nSecond\nThird').blur()
  const reloaded = boot({ storage: Object.fromEntries(app.storage) })
  assert.equal(reloaded.get('.name').value, 'Updated name')
  assert.equal(reloaded.get('.focus').value, 'First\nSecond\nThird')
  reloaded.get('.clear-personal-data').click()
  assert.equal(reloaded.get('.name').value, '')
  assert.equal(reloaded.get('.focus').value, '')
})

test('focus resizes after input, deleting text, cancelling, resizing the window and daily rollover', async () => {
  const app = boot({ storage: { focus: 'Original', focusDate: '2026-11-20' } })
  const focus = app.get('.focus')
  assert.equal(focus.style.height, '60px')
  edit(app, '.focus', 'One\nTwo\nThree\nFour\nFive')
  assert.equal(focus.style.height, '188px')
  focus.value = 'Short'
  focus.dispatch('input')
  assert.equal(focus.style.height, '60px')
  focus.dispatch('keydown', { key: 'Escape' })
  assert.equal(focus.value, 'Original')
  assert.equal(focus.style.height, '60px')
  focus.scrollHeight = 122
  app.window.dispatch('resize')
  assert.equal(focus.style.height, '124px')
  focus.scrollHeight = null
  await app.clock(new Date(2026, 10, 21, 0, 0, 1))
  assert.equal(focus.value, '')
  assert.equal(focus.style.height, '60px')
})

test('Edit buttons focus the matching field and place the caret after its existing text', () => {
  const app = boot({ online: false,
    storage: { name: 'Boris', focus: 'First\nSecond', city: 'Warsaw' } })
  for (const [buttonSelector, fieldSelector, key] of [
    ['.edit-name', '.name', 'name'], ['.edit-focus', '.focus', 'focus'],
    ['.edit-city', '.location', 'city']
  ]) {
    const button = app.get(buttonSelector)
    const field = app.get(fieldSelector)
    const original = app.storage.get(key)
    assert.equal(button.getAttribute('aria-controls'), field.getAttribute('id'))
    button.click()
    assert.equal(app.document.activeElement, field)
    assert.equal(field.value, original)
    assert.equal(field.selectionStart, original.length)
    assert.equal(field.selectionEnd, original.length)
    edit(app, fieldSelector, 'Changed').dispatch('keydown', { key: 'Escape' })
    assert.equal(field.value, original)
    assert.equal(app.storage.get(key), original)
  }
})

test('existing text survives clicks and autosaves without moving focus', () => {
  const app = boot({ storage: { name: 'Boris', focus: 'Write a report' } })
  app.get('.name').click()
  assert.equal(app.get('.name').value, 'Boris')
  const field = edit(app, '.focus', 'Finish a report')
  assert.equal(app.storage.get('focus'), 'Finish a report')
  assert.equal(app.document.activeElement, field)
  field.click()
  assert.equal(field.value, 'Finish a report')
})

test('Escape restores the initial text and its saved value after autosaving', () => {
  const app = boot({ storage: { name: 'Boris' } })
  const name = edit(app, '.name', 'Changed')
  const event = name.dispatch('keydown', { key: 'Escape' })
  assert.ok(event.defaultPrevented)
  assert.equal(name.value, 'Boris')
  assert.equal(app.storage.get('name'), 'Boris')
  const focus = edit(app, '.focus', 'Draft')
  focus.dispatch('keydown', { key: 'Escape' })
  assert.equal(focus.value, '')
  assert.ok(!app.storage.has('focus'))
})

test('Shift+Enter permits a focus newline; Enter commits; IME composition is preserved', () => {
  const app = boot()
  const focus = edit(app, '.focus', 'One')
  assert.equal(focus.dispatch('keydown', { key: 'Enter', shiftKey: true }).defaultPrevented, false)
  focus.value = 'One\nTwo'
  focus.dispatch('input')
  assert.equal(focus.dispatch('keydown', { key: 'Enter', isComposing: true }).defaultPrevented, false)
  assert.equal(app.document.activeElement, focus)
  assert.equal(focus.dispatch('keydown', { key: 'Enter' }).defaultPrevented, true)
  assert.equal(app.storage.get('focus'), 'One\nTwo')
  assert.equal(app.document.activeElement, app.document.body)
})

test('completed focus survives reload; editing resets completion and Escape restores it', () => {
  const app = boot({ storage: { focus: 'Ship changes' } })
  app.get('.complete-focus').click()
  assert.equal(app.storage.get('focusCompleted'), 'true')
  assert.ok(app.get('.focus-board').classList.contains('is-completed'))
  const reloaded = boot({ storage: Object.fromEntries(app.storage) })
  assert.equal(reloaded.get('.complete-focus').textContent, 'Undo')
  const focus = edit(reloaded, '.focus', 'New task')
  assert.ok(!reloaded.storage.has('focusCompleted'))
  focus.dispatch('keydown', { key: 'Escape' })
  assert.equal(reloaded.storage.get('focusCompleted'), 'true')
  assert.equal(reloaded.storage.get('focus'), 'Ship changes')
  reloaded.get('.complete-focus').click()
  assert.equal(reloaded.storage.get('focusCompleted'), 'false')
})

test('midnight updates date, archives completed focus and offers a blank new focus', async () => {
  const app = boot({ now: new Date(2026, 10, 20, 23, 59, 59), storage: {
    focus: 'Yesterday', focusDate: '2026-11-20', focusCompleted: 'true'
  } })
  const previousDate = app.get('.date').textContent
  await app.clock(new Date(2026, 10, 21, 0, 0, 2))
  assert.notEqual(app.get('.date').textContent, previousDate)
  assert.equal(app.get('.date').dateTime, '2026-11-21')
  assert.equal(app.get('.time').textContent, '0:00:02')
  assert.equal(app.get('.focus').value, '')
  assert.ok(!app.storage.has('focusCompleted'))
  assert.deepEqual(JSON.parse(app.storage.get('focusHistory')), [
    { date: '2026-11-20', text: 'Yesterday', completed: true }
  ])
  assert.equal(app.get('.focus-history').hidden, false)
  assert.match(app.get('.focus-history-list').textContent, /Yesterday/)
  await app.advance(1100)
  assert.match(app.get('.curtain').style.backgroundImage, /-0\.jpg/)
})

test('loading a new day preserves the previous task in history, including unsaved active edits', async () => {
  const app = boot({ storage: { focus: 'First', focusDate: '2026-11-20' } })
  edit(app, '.focus', 'Edited before midnight')
  await app.clock(new Date(2026, 10, 21, 0, 0, 1))
  assert.equal(JSON.parse(app.storage.get('focusHistory'))[0].text, 'Edited before midnight')
  const reloaded = boot({ now: new Date(2026, 10, 22, 8), storage: Object.fromEntries(app.storage) })
  assert.equal(JSON.parse(reloaded.storage.get('focusHistory')).length, 1)
  assert.equal(reloaded.get('.focus').value, '')
})

test('history retains the latest 30 days and ignores corrupt stored entries', () => {
  const history = Array.from({ length: 30 }, (_, index) => ({
    date: `2026-10-${String(index + 1).padStart(2, '0')}`, text: `Task ${index}`, completed: false
  }))
  const app = boot({ storage: { focus: 'Latest', focusDate: '2026-11-19',
    focusHistory: JSON.stringify([null, { date: 'invalid', text: 'Bad' }, ...history]) } })
  const saved = JSON.parse(app.storage.get('focusHistory'))
  assert.equal(saved.length, 30)
  assert.equal(saved[0].text, 'Task 1')
  assert.equal(saved[29].text, 'Latest')
})

test('legacy placeholders migrate to empty editable fields without losing an existing focus', () => {
  const app = boot({ storage: { name: '[Enter Name]', city: 'Earth', focus: 'Keep me' } })
  assert.equal(app.get('.name').value, '')
  assert.equal(app.get('.location').value, '')
  assert.equal(app.get('.focus').value, 'Keep me')
  assert.equal(app.storage.get('focusDate'), '2026-11-20')
  assert.equal(app.get('.focus-actions').hidden, false)
})

test('wallpapers follow the current 90-minute slot without overriding manual changes each second', async () => {
  const app = boot({ now: new Date(2026, 10, 20, 5, 59, 50) })
  assert.match(app.get('.curtain').style.backgroundImage, /-3\.jpg/)
  app.document.querySelectorAll('.arrow-button')[1].click()
  await app.advance(1100)
  assert.match(app.get('.curtain').style.backgroundImage, /-4\.jpg/)
  await app.clock(new Date(2026, 10, 20, 5, 59, 59))
  assert.match(app.get('.curtain').style.backgroundImage, /-4\.jpg/)
  await app.clock(new Date(2026, 10, 20, 6, 0, 7))
  assert.match(app.get('.curtain').style.backgroundImage, /-4\.jpg/)
  await app.clock(new Date(2026, 10, 20, 7, 30, 8))
  await app.advance(1100)
  assert.match(app.get('.curtain').style.backgroundImage, /-5\.jpg/)
  assert.equal(app.get('.greeting').textContent, 'Good Morning,')
})

test('returning to a hidden tab resynchronizes date, greeting, focus and wallpaper', async () => {
  const app = boot({ storage: { focus: 'Previous', focusDate: '2026-11-20' } })
  app.document.visibilityState = 'hidden'
  app.setNow(new Date(2026, 10, 22, 18, 42))
  app.document.dispatch('visibilitychange')
  assert.equal(app.get('.date').dateTime, '2026-11-20')
  app.document.visibilityState = 'visible'
  app.document.dispatch('visibilitychange')
  await flush()
  await app.advance(1100)
  assert.equal(app.get('.date').dateTime, '2026-11-22')
  assert.equal(app.get('.greeting').textContent, 'Good Evening,')
  assert.match(app.get('.curtain').style.backgroundImage, /-12\.jpg/)
  assert.equal(app.get('.focus').value, '')
})

test('opening settings prepares themes so selecting one starts its one-second fade immediately', async () => {
  const app = boot()
  app.get('.settings button').click()
  await flush()
  assert.equal(app.images.length, 3)
  const preparedImages = app.images.length
  const buttons = app.document.querySelectorAll('.variant-set-theme')
  buttons[1].click()
  assert.equal(app.images.length, preparedImages)
  const incoming = app.get('.curtain-next')
  assert.match(incoming.style.backgroundImage, /24hr-Earth-5K/)
  assert.equal(incoming.style.transition, 'opacity 1000ms ease-out')
  buttons[0].click()
  assert.equal(app.images.length, preparedImages)
  const layers = app.document.querySelectorAll('.curtain-next')
  assert.equal(layers.length, 2)
  assert.match(layers[1].style.backgroundImage, /24hr-LosAngeles2019-5K/)
  await app.advance(1100)
  assert.match(app.get('.curtain').style.backgroundImage, /24hr-LosAngeles2019-5K/)
  assert.equal(app.document.querySelectorAll('.curtain-next').length, 0)
})

test('wallpaper fades wait for decoding and preserve the outgoing image for one second', async () => {
  let decoded
  const app = boot({ manualImages: true,
    imageDecode: () => new Promise(resolve => { decoded = resolve }) })
  const background = app.get('.curtain')
  const original = background.style.backgroundImage
  app.document.querySelectorAll('.arrow-button')[1].click()
  assert.equal(background.style.backgroundImage, original)
  assert.equal(app.document.querySelectorAll('.curtain-next').length, 0)
  const loading = app.images[0].onload()
  assert.equal(app.document.querySelectorAll('.curtain-next').length, 0)
  decoded()
  await loading
  const incoming = app.get('.curtain-next')
  assert.match(incoming.style.backgroundImage, /-4\.jpg/)
  assert.equal(incoming.style.transition, 'opacity 1000ms ease-in-out')
  assert.equal(incoming.style.opacity, '1')
  await app.advance(500)
  assert.equal(background.style.backgroundImage, original)
  await app.advance(600)
  assert.match(background.style.backgroundImage, /-4\.jpg/)
  assert.equal(app.document.querySelectorAll('.curtain-next').length, 0)
})

test('rapid wallpaper clicks begin immediately and finish on the latest image', async () => {
  const app = boot()
  const next = app.document.querySelectorAll('.arrow-button')[1]
  next.click()
  await flush()
  await app.advance(250)
  next.click()
  await flush()
  assert.equal(app.document.querySelectorAll('.curtain-next').length, 2)
  await app.advance(250)
  next.click()
  await flush()
  let layers = app.document.querySelectorAll('.curtain-next')
  assert.equal(layers.length, 3)
  assert.match(layers[2].style.backgroundImage, /-6\.jpg/)
  await app.advance(600)
  assert.match(app.get('.curtain').style.backgroundImage, /-4\.jpg/)
  layers = app.document.querySelectorAll('.curtain-next')
  assert.equal(layers.length, 2)
  assert.match(layers[1].style.backgroundImage, /-6\.jpg/)
  await app.advance(500)
  assert.match(app.get('.curtain').style.backgroundImage, /-6\.jpg/)
  assert.equal(app.document.querySelectorAll('.curtain-next').length, 0)
})

test('a quick previous click smoothly returns to the outgoing wallpaper', async () => {
  const app = boot()
  const [previous, next] = app.document.querySelectorAll('.arrow-button')
  next.click()
  await app.advance(250)
  previous.click()
  await flush()
  const layers = app.document.querySelectorAll('.curtain-next')
  assert.equal(layers.length, 2)
  assert.match(layers[1].style.backgroundImage, /-3\.jpg/)
  await app.advance(1100)
  assert.match(app.get('.curtain').style.backgroundImage, /-3\.jpg/)
  assert.equal(app.document.querySelectorAll('.curtain-next').length, 0)
})

test('stale or failed wallpaper loads never replace the visible image', async () => {
  const app = boot({ manualImages: true })
  const next = app.document.querySelectorAll('.arrow-button')[1]
  const original = app.get('.curtain').style.backgroundImage
  next.click()
  next.click()
  await app.images[0].onload()
  assert.equal(app.get('.curtain').style.backgroundImage, original)
  assert.equal(app.document.querySelectorAll('.curtain-next').length, 0)
  await app.images[1].onload()
  await app.advance(1100)
  assert.match(app.get('.curtain').style.backgroundImage, /-5\.jpg/)
  next.click()
  app.images[2].onerror()
  await app.advance(1100)
  assert.match(app.get('.curtain').style.backgroundImage, /-5\.jpg/)
  assert.equal(app.document.querySelectorAll('.curtain-next').length, 0)
})

test('all fading images share the fixed background and its black-and-white filter', async () => {
  const app = boot({ storage: { blackAndWhite: 'true' } })
  const next = app.document.querySelectorAll('.arrow-button')[1]
  next.click()
  await flush()
  next.click()
  await flush()
  const background = app.get('.curtain')
  const layers = app.document.querySelectorAll('.curtain-next')
  assert.equal(layers.length, 2)
  assert.ok(layers.every(layer => layer.parentNode === background))
  assert.equal(background.style.filter, 'grayscale(100%)')
  app.window.dispatch('resize')
  assert.equal(background.style.filter, 'grayscale(100%)')
  assert.equal(app.document.body.style.backgroundImage, undefined)
  app.get('.gray-or-color').checked = false
  app.get('.gray-or-color').dispatch('change')
  assert.equal(background.style.filter, 'grayscale(0)')
  await app.advance(1100)
  assert.equal(app.document.querySelectorAll('.curtain-next').length, 0)
})

test('reduced-motion preferences show decoded wallpapers without animation or waiting', async () => {
  const app = boot({ reducedMotion: true })
  app.document.querySelectorAll('.arrow-button')[1].click()
  await flush()
  assert.match(app.get('.curtain').style.backgroundImage, /-4\.jpg/)
  assert.equal(app.document.querySelectorAll('.curtain-next').length, 0)
})

test('Reset changes only appearance and selects the default wallpaper', () => {
  const personal = { name: 'Boris', focus: 'Keep focus', focusDate: '2026-11-20',
    focusCompleted: 'true', city: 'Warsaw', weatherCache: cache(),
    focusHistory: '[{"date":"2026-11-19","text":"Old","completed":true}]', otherApp: 'Keep' }
  const app = boot({ online: false, storage: { ...personal, theme: '24hr-Earth-5K',
    gradient: 'true', blackAndWhite: 'true', selected: 'true' } })
  app.get('.reset').click()
  for (const [key, value] of Object.entries(personal)) assert.equal(app.storage.get(key), value, key)
  for (const key of ['theme', 'selected', 'gradient', 'blackAndWhite']) assert.ok(!app.storage.has(key))
  assert.equal(app.get('.gradient').checked, false)
  assert.equal(app.get('.gray-or-color').checked, false)
  assert.equal(app.get('.curtain').style.filter, 'grayscale(0)')
  assert.deepEqual(selectedTheme(app), ['24hr-MonumentValley-5K'])
})

test('Clear data deletes personal data in one click and preserves appearance and unrelated keys', () => {
  const app = boot({ online: false, storage: { name: 'Boris', focus: 'Task', city: 'Warsaw',
    focusCompleted: 'true', weatherCache: cache(), theme: '24hr-Earth-5K',
    gradient: 'true', blackAndWhite: 'true', otherApp: 'Keep' } })
  assert.equal(app.storage.get('name'), 'Boris')
  assert.equal(app.document.querySelector('.clear-confirmation'), null)
  assert.equal(app.document.querySelector('.cancel-clear-data'), null)
  app.get('.clear-personal-data').click()
  for (const key of ['name', 'focus', 'city', 'focusCompleted', 'focusHistory', 'weatherCache']) {
    assert.ok(!app.storage.has(key), key)
  }
  assert.equal(app.storage.get('theme'), '24hr-Earth-5K')
  assert.equal(app.storage.get('gradient'), 'true')
  assert.equal(app.storage.get('blackAndWhite'), 'true')
  assert.equal(app.storage.get('otherApp'), 'Keep')
  assert.equal(app.get('.focus').value, '')
  assert.equal(app.get('.temperature').textContent, '--°C')
})

test('settings use a native modal, hide arrows, close on Escape and return focus to the trigger', () => {
  const app = boot()
  app.get('.settings button').click()
  const dialog = app.get('.set-theme')
  assert.equal(dialog.tagName, 'dialog')
  assert.equal(dialog.open, true)
  assert.ok(app.document.body.classList.contains('theme-settings-open'))
  assert.equal(app.get('.settings button').getAttribute('aria-expanded'), 'true')
  assert.equal(app.document.activeElement, app.get('.close-set-theme'))
  const event = dialog.dispatch('cancel')
  assert.ok(event.defaultPrevented)
  assert.equal(dialog.open, false)
  assert.ok(!app.document.body.classList.contains('theme-settings-open'))
  assert.equal(app.document.activeElement, app.get('.settings button'))
})

test('only clicking the modal backdrop closes settings; rapid reopening stays open', () => {
  const app = boot()
  const dialog = app.get('.set-theme')
  app.get('.settings button').click()
  dialog.dispatch('click', { target: app.get('.set-theme-panel') })
  assert.ok(dialog.open)
  dialog.dispatch('click')
  assert.equal(dialog.open, false)
  app.get('.settings button').click()
  assert.ok(dialog.open)
})

test('theme controls are buttons with arrow, Home and End keyboard navigation and restored selection', () => {
  const app = boot()
  const buttons = app.document.querySelectorAll('.variant-set-theme')
  assert.ok(buttons.every(button => button.tagName === 'button'))
  buttons[0].focus()
  buttons[0].dispatch('keydown', { key: 'ArrowLeft' })
  assert.equal(app.document.activeElement, buttons[2])
  buttons[2].dispatch('keydown', { key: 'Home' })
  assert.equal(app.document.activeElement, buttons[0])
  buttons[0].dispatch('keydown', { key: 'End' })
  assert.equal(app.document.activeElement, buttons[2])
  buttons[1].click()
  assert.deepEqual(selectedTheme(app), ['24hr-Earth-5K'])
  assert.equal(buttons[1].getAttribute('aria-pressed'), 'true')
  const reloaded = boot({ storage: Object.fromEntries(app.storage) })
  assert.deepEqual(selectedTheme(reloaded), ['24hr-Earth-5K'])
})

test('weather encodes the city, caches successful data and displays the update time', async () => {
  const app = boot({ storage: { city: 'Washington & D.C.' } })
  await flush()
  assert.equal(new URL(app.requests[0].url).searchParams.get('q'), 'Washington & D.C.')
  assert.equal(app.get('.temperature').textContent, '8°C')
  assert.match(app.get('.weather-status').textContent, /^Updated /)
  assert.equal(JSON.parse(app.storage.get('weatherCache')).city, 'Washington & D.C.')
})

test('fresh cached weather renders immediately and prevents unnecessary requests on startup', async () => {
  const app = boot({ storage: { city: 'Warsaw', weatherCache: cache() } })
  await flush()
  assert.equal(app.requests.length, 0)
  assert.equal(app.get('.temperature').textContent, '8°C')
  assert.match(app.get('.weather-status').textContent, /^Updated /)
})

test('offline mode retains cached weather and identifies when it was last updated', () => {
  const app = boot({ online: false, storage: { city: 'Warsaw', weatherCache: cache() } })
  assert.equal(app.requests.length, 0)
  assert.equal(app.get('.temperature').textContent, '8°C')
  assert.match(app.get('.weather-status').textContent, /^Offline · Updated /)
})

test('weather refreshes every 15 minutes and retains the last result on network failure', async () => {
  const app = boot({ storage: { city: 'Warsaw' }, fetch: async (url, config, count) => {
    if (count === 3) throw new Error('Connection failed')
    return response(count === 1 ? 8 : 10, count === 1 ? 803 : 501)
  } })
  await flush()
  await app.interval(15 * 60 * 1000)
  assert.equal(app.requests.length, 2)
  assert.equal(app.get('.temperature').textContent, '10°C')
  assert.ok(app.get('.weather-icon').classList.contains('owf-501'))
  assert.ok(!app.get('.weather-icon').classList.contains('owf-803'))
  await app.interval(15 * 60 * 1000)
  assert.equal(app.get('.temperature').textContent, '10°C')
  assert.match(app.get('.weather-status').textContent, /^Could not refresh · Updated /)
})

test('city uses a native text input with a placeholder and restores its value on Escape', () => {
  const app = boot({ online: false, storage: { city: 'Warsaw' } })
  const city = app.get('.location')
  assert.equal(city.tagName, 'input')
  assert.equal(city.getAttribute('type'), 'text')
  assert.equal(city.getAttribute('placeholder'), 'Enter city')
  assert.equal(city.getAttribute('contenteditable'), null)
  assert.equal(city.parentNode.parentNode.tagName, 'td')
  assert.equal(city.value, 'Warsaw')
  edit(app, '.location', 'Paris')
  assert.equal(app.storage.get('city'), 'Paris')
  city.dispatch('keydown', { key: 'Escape' })
  assert.equal(city.value, 'Warsaw')
  assert.equal(app.storage.get('city'), 'Warsaw')
  edit(app, '.location', '  Paris  ').dispatch('keydown', { key: 'Enter' })
  assert.equal(city.value, 'Paris')
  assert.equal(app.storage.get('city'), 'Paris')
  const reloaded = boot({ online: false, storage: Object.fromEntries(app.storage) })
  assert.equal(reloaded.get('.location').value, 'Paris')
  reloaded.get('.clear-personal-data').click()
  assert.equal(reloaded.get('.location').value, '')
  assert.equal(reloaded.get('.location').getAttribute('placeholder'), 'Enter city')
})

test('a city is autosaved while typing but weather requests wait for editing to finish', async () => {
  const app = boot({ storage: { city: 'Warsaw', weatherCache: cache() } })
  const city = edit(app, '.location', 'Paris')
  assert.equal(app.storage.get('city'), 'Paris')
  await app.interval(15 * 60 * 1000)
  assert.equal(app.requests.length, 0)
  city.dispatch('keydown', { key: 'Escape' })
  assert.equal(app.storage.get('city'), 'Warsaw')
  assert.equal(app.requests.length, 0)
  edit(app, '.location', 'Paris').blur()
  await flush()
  assert.equal(app.requests.length, 1)
  assert.equal(JSON.parse(app.storage.get('weatherCache')).city, 'Paris')
})

test('a late response for a previous city cannot overwrite weather for the new city', async () => {
  const pending = []
  const app = boot({ storage: { city: 'Warsaw' }, fetch: () => new Promise(resolve => pending.push(resolve)) })
  edit(app, '.location', 'Paris').blur()
  assert.equal(app.requests.length, 2)
  assert.equal(app.requests[0].config.signal.aborted, true)
  pending[1](response(20))
  await flush()
  pending[0](response(8))
  await flush()
  assert.equal(app.get('.temperature').textContent, '20°C')
  assert.equal(JSON.parse(app.storage.get('weatherCache')).city, 'Paris')
})

test('clearing personal data cancels a pending request and cannot recreate the deleted cache', async () => {
  let resolve
  const app = boot({ storage: { city: 'Warsaw' }, fetch: () => new Promise(done => { resolve = done }) })
  app.get('.clear-personal-data').click()
  resolve(response())
  await flush()
  assert.equal(app.requests[0].config.signal.aborted, true)
  assert.ok(!app.storage.has('weatherCache'))
  assert.equal(app.get('.temperature').textContent, '--°C')
})

test('wrong-city or malformed cache is never displayed, and HTTP errors are explained', async () => {
  const offline = boot({ online: false, storage: { city: 'Paris', weatherCache: cache('Warsaw') } })
  assert.equal(offline.get('.temperature').textContent, '--°C')
  const app = boot({ storage: { city: 'Missing', weatherCache: '{broken' },
    fetch: async () => ({ ok: false, status: 404 }) })
  await flush()
  assert.equal(app.get('.weather-status').textContent, 'City not found. Check the name.')
  assert.equal(app.get('.temperature').textContent, '--°C')
})

test('weather request timeouts release the pending request and allow the next refresh', async () => {
  const app = boot({ storage: { city: 'Warsaw' }, fetch: (url, config, count) => {
    if (count > 1) return Promise.resolve(response(12))
    return new Promise((resolve, reject) => {
      config.signal.addEventListener('abort', () => reject(new Error('Request aborted')))
    })
  } })
  for (const timer of [...app.timers.values()]) {
    if (!timer.repeat && timer.delay === 12000) timer.callback()
  }
  await flush()
  assert.equal(app.requests[0].config.signal.aborted, true)
  assert.match(app.get('.weather-status').textContent, /Will retry automatically/)
  await app.interval(15 * 60 * 1000)
  assert.equal(app.requests.length, 2)
  assert.equal(app.get('.temperature').textContent, '12°C')
})

test('malformed weather responses preserve the last valid cached result', async () => {
  const saved = cache('Warsaw', new Date(2026, 10, 20, 5).getTime())
  const app = boot({ storage: { city: 'Warsaw', weatherCache: saved },
    fetch: async () => ({ ok: true, json: async () => ({ unexpected: true }) }) })
  await flush()
  assert.equal(app.storage.get('weatherCache'), saved)
  assert.equal(app.get('.temperature').textContent, '8°C')
  assert.match(app.get('.weather-status').textContent, /^Could not refresh · Updated /)
})

test('reconnecting refreshes cached weather, and stale caches are refreshed on return', async () => {
  const app = boot({ online: false, storage: { city: 'Warsaw', weatherCache: cache() } })
  app.navigator.onLine = true
  app.window.dispatch('online')
  await flush()
  assert.equal(app.requests.length, 1)
  app.setNow(new Date(2026, 10, 20, 6, 10))
  app.window.dispatch('focus')
  await flush()
  assert.equal(app.requests.length, 2)
  app.navigator.onLine = false
  app.window.dispatch('offline')
  assert.match(app.get('.weather-status').textContent, /^Offline · Updated /)
})

;(async () => {
  let failed = 0
  for (const { name, run } of tests) {
    try {
      await run()
      console.log(`PASS ${name}`)
    } catch (error) {
      failed++
      console.error(`FAIL ${name}\n${error.stack}`)
    }
  }
  console.log(`\n${tests.length - failed}/${tests.length} checks passed`)
  if (failed) process.exitCode = 1
})()
