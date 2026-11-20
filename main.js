const currentTime = document.querySelector('.time')
const currentDate = document.querySelector('.date')
const greeting = document.querySelector('.greeting')
const nameField = document.querySelector('.name')
const focusField = document.querySelector('.focus')
const editName = document.querySelector('.edit-name')
const editFocus = document.querySelector('.edit-focus')
const focusBoard = document.querySelector('.focus-board')
const focusActions = document.querySelector('.focus-actions')
const focusStatus = document.querySelector('.focus-status')
const completeFocus = document.querySelector('.complete-focus')
const focusHistory = document.querySelector('.focus-history')
const focusHistoryList = document.querySelector('.focus-history-list')
const cityField = document.querySelector('.location')
const editCity = document.querySelector('.edit-city')
const weatherIcon = document.querySelector('.weather-icon')
const temperature = document.querySelector('.temperature')
const weatherDescription = document.querySelector('.weather-description')
const humidity = document.querySelector('.humidity')
const windSpeed = document.querySelector('.wind-speed')
const weatherStatus = document.querySelector('.weather-status')
const curtainBackground = document.querySelector('.curtain')
const arrowButtons = document.querySelectorAll('.arrow-button')
const themeButtons = Array.from(document.querySelectorAll('.variant-set-theme'))
const themeDialog = document.querySelector('.set-theme')
const settingsButton = document.querySelector('.settings button')
const closeSettings = document.querySelector('.close-set-theme')
const gradient = document.querySelector('.gradient')
const blackAndWhite = document.querySelector('.gray-or-color')
const resetButton = document.querySelector('.reset')
const clearDataButton = document.querySelector('.clear-personal-data')
const personalDataStatus = document.querySelector('.personal-data-status')

const defaultTheme = '24hr-MonumentValley-5K'
const wallpaperCount = 16
const weatherInterval = 15 * 60 * 1000
const themes = themeButtons.map(button => button.dataset.theme)
let currentTheme = themes.includes(localStorage.getItem('theme'))
  ? localStorage.getItem('theme') : defaultTheme
let currentWallpaper = 0
let lastBackgroundSlot = ''
let lastDate = ''
let weatherController = null
let weatherRequest = 0
let pendingWeatherCity = ''
let displayedBackground = ''
let requestedBackground = ''
let requestedBackgroundTiming = 'ease-in-out'
let loadingBackground = ''
let backgroundLoad = 0
const backgroundLayers = []
const decodedBackgrounds = new Map()
const warmingBackgrounds = new Set()

const pad = value => String(value).padStart(2, '0')
const localDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const backgroundSlot = date => Math.floor((date.getHours() * 60 + date.getMinutes()) / 90)
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
})
const weatherTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
})

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

function storeText(key, value) {
  if (value) localStorage.setItem(key, value)
  else localStorage.removeItem(key)
}

function readEditable(field, multiline = false) {
  const text = field.value.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ')
  return (multiline ? text : text.replace(/\n+/g, ' ')).trim()
}

function writeEditable(field, value) {
  field.value = value
  if (field === focusField) resizeFocus()
}

function resizeFocus() {
  const scrollTop = focusField.scrollTop
  focusField.style.height = 'auto'
  const borderHeight = focusField.offsetHeight - focusField.clientHeight
  focusField.style.height = `${focusField.scrollHeight + borderHeight}px`
  focusField.scrollTop = scrollTop
}

function setupEditable(field, key, options = {}) {
  let snapshot = null
  let cancelling = false
  const save = () => {
    const previous = localStorage.getItem(key) || ''
    const value = readEditable(field, options.multiline)
    storeText(key, value)
    if (options.onSave) options.onSave(value, previous)
    return value
  }

  field.addEventListener('focus', () => {
    snapshot = {
      text: readEditable(field, options.multiline),
      stored: localStorage.getItem(key),
      extra: options.capture ? options.capture() : null
    }
  })
  field.addEventListener('input', save)
  field.addEventListener('blur', () => {
    if (cancelling) return
    writeEditable(field, save())
    field.scrollTop = 0
    if (options.onCommit) options.onCommit()
  })
  field.addEventListener('keydown', event => {
    if (event.isComposing) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (snapshot) {
        writeEditable(field, snapshot.text)
        storeText(key, snapshot.stored)
        if (options.restore) options.restore(snapshot.extra)
      }
      cancelling = true
      field.blur()
      cancelling = false
    } else if (event.key === 'Enter' && !(options.multiline && event.shiftKey)) {
      event.preventDefault()
      field.blur()
    }
  })
}

function readFocusHistory() {
  const history = readJSON('focusHistory')
  if (!Array.isArray(history)) return []
  return history.filter(entry => entry && typeof entry.text === 'string'
    && entry.text.trim() && typeof entry.date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
    && !Number.isNaN(new Date(`${entry.date}T12:00:00`).getTime()))
}

function renderFocusHistory() {
  const history = readFocusHistory().slice(-30).reverse()
  focusHistory.hidden = history.length === 0
  focusHistoryList.replaceChildren()
  history.forEach(entry => {
    const item = document.createElement('li')
    const date = document.createElement('span')
    date.className = 'focus-history-date'
    date.textContent = dateFormatter.format(new Date(`${entry.date}T12:00:00`))
    const text = document.createElement('p')
    text.textContent = entry.text
    const status = document.createElement('span')
    status.className = 'focus-history-status'
    status.textContent = entry.completed ? 'Completed' : 'Not completed'
    item.append(date, text, status)
    focusHistoryList.append(item)
  })
}

function renderFocusState() {
  const hasFocus = Boolean(localStorage.getItem('focus'))
  const completed = hasFocus && localStorage.getItem('focusCompleted') === 'true'
  focusBoard.classList.toggle('is-completed', completed)
  focusActions.hidden = !hasFocus
  completeFocus.disabled = !hasFocus
  completeFocus.setAttribute('aria-pressed', String(completed))
  completeFocus.textContent = completed ? 'Undo' : 'Mark as done'
  focusStatus.textContent = completed ? 'Completed for today' : ''
}

function syncDailyFocus(now) {
  const today = localDate(now)
  const previousDate = localStorage.getItem('focusDate')
  if (previousDate && previousDate !== today) {
    if (document.activeElement === focusField) focusField.blur()
    const text = localStorage.getItem('focus')
    if (text) {
      const history = readFocusHistory().filter(entry => entry.date !== previousDate)
      history.push({
        date: previousDate,
        text,
        completed: localStorage.getItem('focusCompleted') === 'true'
      })
      localStorage.setItem('focusHistory', JSON.stringify(history.slice(-30)))
    }
    localStorage.removeItem('focus')
    localStorage.removeItem('focusCompleted')
    writeEditable(focusField, '')
    focusField.scrollTop = 0
    renderFocusHistory()
    renderFocusState()
  }
  localStorage.setItem('focusDate', today)
}

function rememberBackground(source, image) {
  decodedBackgrounds.set(source, image)
  if (decodedBackgrounds.size > themes.length) {
    decodedBackgrounds.delete(decodedBackgrounds.keys().next().value)
  }
}

function warmThemeBackgrounds() {
  themes.forEach(theme => {
    const source = `images/${theme}-${currentWallpaper}.jpg`
    if (decodedBackgrounds.has(source) || warmingBackgrounds.has(source)) return
    warmingBackgrounds.add(source)
    const image = new Image()
    image.onerror = () => warmingBackgrounds.delete(source)
    image.onload = async () => {
      try {
        await image.decode()
        rememberBackground(source, image)
      } catch {
        // A failed preview can be loaded again when the user selects its theme.
      } finally {
        warmingBackgrounds.delete(source)
      }
    }
    image.src = source
  })
}

function loadNextBackground() {
  const source = requestedBackground
  const latestLayer = backgroundLayers[backgroundLayers.length - 1]
  if (source === (latestLayer ? latestLayer.source : displayedBackground)) {
    backgroundLoad++
    loadingBackground = ''
    return
  }
  if (source === loadingBackground) return
  const request = ++backgroundLoad
  loadingBackground = source
  if (decodedBackgrounds.has(source)) {
    loadingBackground = ''
    startBackgroundTransition(source, requestedBackgroundTiming)
    return
  }
  const image = new Image()
  const failed = () => {
    if (request === backgroundLoad) loadingBackground = ''
  }
  image.onerror = failed
  image.onload = async () => {
    try {
      await image.decode()
    } catch {
      failed()
      return
    }
    if (request !== backgroundLoad) return
    loadingBackground = ''
    rememberBackground(source, image)
    startBackgroundTransition(source, requestedBackgroundTiming)
  }
  image.src = source
}

function startBackgroundTransition(source, timing) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    backgroundLayers.splice(0).forEach(layer => {
      clearTimeout(layer.timer)
      layer.element.remove()
    })
    displayedBackground = source
    curtainBackground.style.backgroundImage = `url(${source})`
    return
  }
  const element = document.createElement('div')
  element.className = 'curtain-next'
  element.style.opacity = '0'
  element.style.backgroundImage = `url(${source})`
  curtainBackground.append(element)
  // Commit the hidden image before starting its opacity transition.
  void element.offsetWidth
  element.style.transition = `opacity 1000ms ${timing}`
  element.style.opacity = '1'
  const layer = { element, source, timer: null }
  backgroundLayers.push(layer)
  layer.timer = setTimeout(() => {
    const index = backgroundLayers.indexOf(layer)
    if (index === -1) return
    displayedBackground = source
    curtainBackground.style.backgroundImage = `url(${source})`
    // Fully opaque images can replace every older layer without changing the visible frame.
    backgroundLayers.splice(0, index + 1).forEach(previous => {
      clearTimeout(previous.timer)
      previous.element.remove()
    })
  }, 1050)
}

function renderBackground({ quick = false } = {}) {
  const source = `images/${currentTheme}-${currentWallpaper}.jpg`
  requestedBackground = source
  requestedBackgroundTiming = quick ? 'ease-out' : 'ease-in-out'
  if (!displayedBackground) {
    displayedBackground = source
    curtainBackground.style.backgroundImage = `url(${source})`
  } else {
    loadNextBackground()
  }
  themeButtons.forEach(button => {
    const selected = button.dataset.theme === currentTheme
    button.classList.toggle('is-selected', selected)
    button.setAttribute('aria-pressed', String(selected))
  })
}

function renderEffects() {
  greeting.classList.toggle('gradient-font', gradient.checked)
  nameField.classList.toggle('gradient-font', gradient.checked)
  const grayscale = blackAndWhite.checked ? '100%' : '0'
  curtainBackground.style.setProperty('--background-grayscale', grayscale)
  curtainBackground.style.filter = `grayscale(${grayscale})`
}

function syncClock(restoreBackground = false) {
  const now = new Date()
  const date = localDate(now)
  const hour = now.getHours()
  currentTime.textContent = `${hour}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  currentTime.dateTime = `${pad(hour)}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  if (date !== lastDate) {
    currentDate.textContent = dateFormatter.format(now)
    currentDate.dateTime = date
    syncDailyFocus(now)
    lastDate = date
  }
  const partOfDay = hour >= 6 && hour < 12 ? 'Morning'
    : hour >= 12 && hour < 18 ? 'Afternoon'
    : hour >= 18 ? 'Evening' : 'Night'
  greeting.textContent = `Good ${partOfDay},`
  const slot = `${date}:${backgroundSlot(now)}`
  if (restoreBackground || slot !== lastBackgroundSlot) {
    currentWallpaper = backgroundSlot(now)
    lastBackgroundSlot = slot
    renderBackground()
  }
}

function openThemeSelection() {
  if (themeDialog.open) return
  document.body.classList.add('theme-settings-open')
  settingsButton.setAttribute('aria-expanded', 'true')
  themeDialog.showModal()
  closeSettings.focus()
  warmThemeBackgrounds()
}

function closeThemeSelection() {
  if (themeDialog.open) themeDialog.close()
}

function resetAppearance() {
  for (const key of ['theme', 'selected', 'gradient', 'blackAndWhite']) {
    localStorage.removeItem(key)
  }
  currentTheme = defaultTheme
  currentWallpaper = backgroundSlot(new Date())
  gradient.checked = false
  blackAndWhite.checked = false
  renderEffects()
  renderBackground()
}

function weatherCity() {
  return (localStorage.getItem('city') || '').trim()
}

function sameCity(first, second) {
  return first.toLocaleLowerCase() === second.toLocaleLowerCase()
}

function validWeather(entry) {
  return entry && typeof entry.city === 'string' && Number.isFinite(entry.updatedAt)
    && Number.isFinite(entry.temperature) && Number.isFinite(entry.humidity)
    && Number.isFinite(entry.wind) && Number.isInteger(entry.icon)
    && entry.icon >= 200 && entry.icon <= 804 && typeof entry.description === 'string'
}

function cachedWeather(city) {
  const cache = readJSON('weatherCache')
  return validWeather(cache) && sameCity(cache.city, city) ? cache : null
}

function renderWeather(entry, message = '') {
  weatherIcon.className = 'weather-icon owf gradient-font'
  weatherIcon.classList.add(`owf-${entry.icon}`)
  weatherIcon.replaceChildren()
  temperature.textContent = `${Math.round(entry.temperature)}°C`
  humidity.textContent = `Humidity: ${entry.humidity}%`
  windSpeed.textContent = `Wind Speed: ${entry.wind}m/s`
  weatherDescription.textContent = entry.description
  const updated = `Updated ${weatherTimeFormatter.format(new Date(entry.updatedAt))}`
  weatherStatus.textContent = message ? `${message} · ${updated}` : updated
}

function renderEmptyWeather(message = '') {
  weatherIcon.className = 'weather-icon owf'
  const icon = document.createElement('img')
  icon.src = 'svg/overcast-gradient.svg'
  icon.alt = ''
  weatherIcon.replaceChildren(icon)
  temperature.textContent = '--°C'
  humidity.textContent = weatherCity() ? '' : 'Enter your location to get started'
  windSpeed.textContent = ''
  weatherDescription.textContent = ''
  weatherStatus.textContent = message
}

function cancelWeatherRequest() {
  weatherRequest++
  if (weatherController) weatherController.abort()
  weatherController = null
  pendingWeatherCity = ''
}

async function refreshWeather({ force = false } = {}) {
  const city = weatherCity()
  if (!city) {
    cancelWeatherRequest()
    renderEmptyWeather()
    return
  }
  if (document.activeElement === cityField) return
  const cache = cachedWeather(city)
  const offline = navigator.onLine === false
  if (cache) renderWeather(cache, offline ? 'Offline' : '')
  else renderEmptyWeather()
  if (offline) {
    cancelWeatherRequest()
    if (!cache) renderEmptyWeather('Offline · Weather unavailable')
    return
  }
  const age = cache ? Date.now() - cache.updatedAt : Infinity
  if (!force && age >= 0 && age < weatherInterval) return
  if (sameCity(pendingWeatherCity, city)) {
    weatherStatus.textContent = 'Updating weather…'
    return
  }
  cancelWeatherRequest()
  const request = weatherRequest
  const controller = new AbortController()
  weatherController = controller
  pendingWeatherCity = city
  weatherStatus.textContent = 'Updating weather…'
  const timeout = setTimeout(() => controller.abort(), 12000)
  const query = new URLSearchParams({
    q: city, lang: 'en', units: 'metric', appid: 'a57c9f6933ed7c0b00fde3258e699267'
  })
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?${query}`, {
      signal: controller.signal
    })
    if (!response.ok) {
      throw new Error(response.status === 404 ? 'City not found. Check the name.' : 'Weather unavailable')
    }
    const data = await response.json()
    const entry = {
      city, updatedAt: Date.now(), temperature: data.main?.temp,
      humidity: data.main?.humidity, wind: data.wind?.speed,
      icon: data.weather?.[0]?.id, description: data.weather?.[0]?.description
    }
    if (!validWeather(entry)) throw new Error('Weather unavailable')
    if (request !== weatherRequest || !sameCity(city, weatherCity())) return
    localStorage.setItem('weatherCache', JSON.stringify(entry))
    renderWeather(entry)
  } catch (error) {
    if (request !== weatherRequest || !sameCity(city, weatherCity())) return
    if (cache) renderWeather(cache, navigator.onLine === false ? 'Offline' : 'Could not refresh')
    else renderEmptyWeather(error.message === 'City not found. Check the name.'
      ? error.message : 'Weather unavailable · Will retry automatically')
  } finally {
    clearTimeout(timeout)
    if (request === weatherRequest) {
      weatherController = null
      pendingWeatherCity = ''
    }
  }
}

function clearPersonalData() {
  cancelWeatherRequest()
  for (const key of ['name', 'city', 'focus', 'focusDate', 'focusCompleted',
    'focusHistory', 'weatherCache']) {
    localStorage.removeItem(key)
  }
  nameField.value = ''
  cityField.value = ''
  writeEditable(focusField, '')
  localStorage.setItem('focusDate', localDate(new Date()))
  renderFocusHistory()
  renderFocusState()
  renderEmptyWeather()
  personalDataStatus.textContent = 'Personal data cleared.'
  clearDataButton.focus()
}

for (const [key, placeholder] of [['name', '[Enter Name]'], ['focus', '[Enter Focus]'],
  ['city', 'Earth']]) {
  if (localStorage.getItem(key) === placeholder) localStorage.removeItem(key)
}
nameField.value = localStorage.getItem('name') || ''
writeEditable(focusField, localStorage.getItem('focus') || '')
cityField.value = localStorage.getItem('city') || ''
gradient.checked = localStorage.getItem('gradient') === 'true'
blackAndWhite.checked = localStorage.getItem('blackAndWhite') === 'true'

setupEditable(nameField, 'name')
setupEditable(focusField, 'focus', {
  multiline: true,
  onSave(value, previous) {
    if (value !== previous) localStorage.removeItem('focusCompleted')
    renderFocusState()
  },
  capture: () => localStorage.getItem('focusCompleted'),
  restore(value) {
    storeText('focusCompleted', value)
    renderFocusState()
  }
})
setupEditable(cityField, 'city', { onCommit: () => refreshWeather({ force: true }) })
focusField.addEventListener('input', resizeFocus)

function startEditing(field) {
  field.focus()
  field.setSelectionRange(field.value.length, field.value.length)
  if (field === focusField) field.scrollTop = field.scrollHeight
}

editName.addEventListener('click', () => startEditing(nameField))
editFocus.addEventListener('click', () => startEditing(focusField))
editCity.addEventListener('click', () => startEditing(cityField))

completeFocus.addEventListener('click', () => {
  if (!localStorage.getItem('focus')) return
  const completed = localStorage.getItem('focusCompleted') === 'true'
  localStorage.setItem('focusCompleted', String(!completed))
  renderFocusState()
})
arrowButtons.forEach((button, index) => button.addEventListener('click', () => {
  currentWallpaper = (currentWallpaper + (index === 0 ? -1 : 1) + wallpaperCount) % wallpaperCount
  renderBackground()
}))
themeButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    currentTheme = button.dataset.theme
    localStorage.setItem('theme', currentTheme)
    renderBackground({ quick: true })
  })
  button.addEventListener('keydown', event => {
    const directions = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    let next = index
    if (event.key in directions) {
      next = (index + directions[event.key] + themeButtons.length) % themeButtons.length
    } else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = themeButtons.length - 1
    else return
    event.preventDefault()
    themeButtons[next].focus()
  })
})
settingsButton.addEventListener('click', openThemeSelection)
closeSettings.addEventListener('click', closeThemeSelection)
themeDialog.addEventListener('cancel', event => {
  event.preventDefault()
  closeThemeSelection()
})
themeDialog.addEventListener('click', event => {
  if (event.target === themeDialog) closeThemeSelection()
})
themeDialog.addEventListener('close', () => {
  document.body.classList.remove('theme-settings-open')
  settingsButton.setAttribute('aria-expanded', 'false')
  personalDataStatus.textContent = ''
  settingsButton.focus()
})
resetButton.addEventListener('click', resetAppearance)
gradient.addEventListener('change', () => {
  localStorage.setItem('gradient', String(gradient.checked))
  renderEffects()
})
blackAndWhite.addEventListener('change', () => {
  localStorage.setItem('blackAndWhite', String(blackAndWhite.checked))
  renderEffects()
})
clearDataButton.addEventListener('click', clearPersonalData)

function resumeApp() {
  if (document.visibilityState === 'hidden') return
  syncClock(true)
  refreshWeather()
}
document.addEventListener('visibilitychange', resumeApp)
window.addEventListener('focus', resumeApp)
window.addEventListener('resize', resizeFocus)
window.addEventListener('online', () => refreshWeather({ force: true }))
window.addEventListener('offline', () => {
  cancelWeatherRequest()
  const cache = cachedWeather(weatherCity())
  if (cache) renderWeather(cache, 'Offline')
  else renderEmptyWeather(weatherCity() ? 'Offline · Weather unavailable' : '')
})

renderEffects()
renderFocusHistory()
renderFocusState()
syncClock()
refreshWeather()
setInterval(syncClock, 1000)
setInterval(() => refreshWeather({ force: true }), weatherInterval)
document.querySelectorAll('img').forEach(icon => icon.setAttribute('draggable', 'false'))
