let today = new Date()
let currentHours = today.getHours()
let currentMinutes = today.getMinutes()
let currentSeconds = today.getSeconds()
const dayOfMonth = today.getDate()
const numberDayOfWeek = today.getDay()
const updateInterval = 1000
const daysOfWeek = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  0: 'Sunday'
}
const numberOfMonth = today.getMonth()
const monthOfYear = {
  0:  'Jan',
  1:  'Feb',
  2:  'Mar',
  3:  'Apr',
  4:  'May',
  5:  'Jun',
  6:  'Jul',
  7:  'Aug',
  8:  'Sep',
  9:  'Oct',
  10: 'Nov',
  11: 'Dec'
}
const currentYear = Math.floor(today.getYear() + 1900)
const currentDayOfTheWeek = daysOfWeek[numberDayOfWeek]
const currentMonthOfYear = monthOfYear[numberOfMonth]
const currentTime = document.querySelector('.time')
const currentDate = document.querySelector('.date')

const showCurrentTime = () => {
  today = new Date()
  currentHours = today.getHours()
  currentMinutes = today.getMinutes()
  currentSeconds = today.getSeconds()
  currentTime.innerHTML = `${currentHours}:${addZero(currentMinutes)}:${addZero(currentSeconds)}`
  if (currentMinutes === 0 && currentSeconds === 0) showGreeting()
  if (currentHours === 0 && currentMinutes === 0 && currentSeconds === 0) setNextBackgrounImage()
  if (currentHours % 3 === 0 && currentMinutes === 0 && currentSeconds === 0) setNextBackgrounImage()
  if (currentHours % 2 !== 0 && currentMinutes === 30 && currentSeconds === 0) setNextBackgrounImage()
  if (currentHours % 2 == 0 && currentMinutes === 0 && currentSeconds === 0) {
    if (currentTheme !== '24hr-Earth-5K') curtainBackground.style.opacity = '0.5'
  }
  setTimeout(showCurrentTime, `${updateInterval}`)
}

const getDate = () => {
  currentDate.innerHTML = `${currentDayOfTheWeek} ${dayOfMonth} ${currentMonthOfYear}. ${currentYear}`
}

let addZero = (n) => {
  return (parseInt(n, 10) < 10 ? '0' : '') + n
}

let currentNumberBackgrounImage = Math.round(currentHours/1.5)
const arrowButton = document.querySelectorAll('.arrow-button')
let curtainBackground = document.querySelector('.curtain')
const theme = localStorage.getItem('theme')
let variantOfTheme = document.querySelectorAll('.variant-set-theme');
let selectedTheme = localStorage.getItem('selected')
const settings = document.querySelector('.settings')

const backgroundTheme = {
  1: '24hr-LosAngeles2019-5K',
  2: '24hr-Earth-5K',
  3: '24hr-MonumentValley-5K'
}
let currentTheme = (theme === null) ? '24hr-MonumentValley-5K' : localStorage.getItem('theme')

 const getStart = () => {
   setTimeout(() => {
    document.body.style.backgroundImage = `url(images/${currentTheme}-${currentNumberBackgrounImage + 1 }.jpg)`
   }, 2400)
   curtainBackground.style.backgroundImage = `url(images/${currentTheme}-${currentNumberBackgrounImage}.jpg)`;
 }

const changeBackground = () => {
  document.body.style.backgroundImage = `url(images/${currentTheme}-${currentNumberBackgrounImage + 2 }.jpg)`
  curtainBackground.style.backgroundImage = `url(images/${currentTheme}-${currentNumberBackgrounImage}.jpg)`
  curtainBackground.style.transition = '0.4s all'
  localStorage.setItem('theme', `${currentTheme}`)
  localStorage.setItem('selected', `${selectedTheme }`)
}

const setPrevBackgrounImage = () => {
  (currentNumberBackgrounImage !== 0) ? currentNumberBackgrounImage-- : currentNumberBackgrounImage = 15
  changeBackground()
}

let setNextBackgrounImage = () => {
  (currentNumberBackgrounImage <= 14) ? currentNumberBackgrounImage++ : currentNumberBackgrounImage = 0
  changeBackground()
}

const setThemeContainer = document.querySelector('.set-theme')

const setThemeLA = () => {
  currentTheme = '24hr-LosAngeles2019-5K'
  selectedTheme = true
  changeBackground()
}

const setThemeEarth = () => {
  currentTheme = '24hr-Earth-5K'
  selectedTheme = true
  changeBackground()
}

const setThemeMonumentValley = () => {
  currentTheme = '24hr-MonumentValley-5K'
  selectedTheme = true
  changeBackground()
}

const closeThemeSelection = () => {
  setThemeContainer.style.transition = '0.2s all';
  setThemeContainer.style.transform = 'translateY(200px)';
  setThemeContainer.style.opacity = '0';
  setTimeout(()=> {
    setThemeContainer.style.display = 'none';
  }, 250)
}

const openThemeSelection = () => {
  setThemeContainer.style.display = 'block'
  setThemeContainer.style.opacity = '1';
  setThemeContainer.style.transform = 'translateY(0)';
}

const greeting = document.querySelector('.greeting')
const name = document.querySelector('.name')
const previousName = localStorage.getItem('name')
const focus = document.querySelector('.focus')
const previousFocus = localStorage.getItem('focus')
const mainContent = document.querySelector('.main')
const grayOrColorIcon = document.querySelector('.gray-or-color')
const temperature = document.querySelector('.temperature')
const weatherDescription = document.querySelector('.weather-description')
const weatherSettings = document.querySelector('.weather-settings')
const weatherIcon = document.querySelector('.weather-icon')
const city = document.querySelector('.location')
const humidity = document.querySelector('.humidity')
const windSpeed = document.querySelector('.wind-speed')
const reset = document.querySelector('.reset')
const close = document.querySelector('.close')
const gradient = document.querySelector('.gradient')

let showGreeting = () => {
  let partOfDay = ''
  if ( currentHours < 12 && currentHours > 5) {
    partOfDay = 'Morning'
  } else if (currentHours < 18 && currentHours > 11) {
    partOfDay= 'Afternoon'
  } else if (currentHours < 24 && currentHours > 17){
    partOfDay = 'Evening'
  } else {
    partOfDay = 'Night'
  }
  greeting.innerHTML = `Good ${partOfDay},  `
}

const cleanStorage = () => {
  selectedTheme = false
  localStorage.clear()
  name.textContent = '[Enter Name]'
  focus.textContent = '[Enter Focus]'
  city.textContent = 'Earth'
  curtainBackground.style.filter = 'blur(10px)'
  grayOrColorIcon.src = 'svg/contrast.svg'
  document.body.style.overflow = 'hidden'
  setTimeout(backgroundFilter, 500);
  gradient.classList.remove('active');
  greeting.classList.remove('gradient-font');
  name.classList.remove('gradient-font');
  gradient.querySelector('img').src = 'svg/gradient.svg';
}

const setGradient = () => {
  greeting.classList.toggle('gradient-font');
  name.classList.toggle('gradient-font');
  gradient.classList.toggle('active');
  const imgSrc = gradient.classList.contains('active') ? 'svg/gradient-active.svg' : 'svg/gradient.svg';
  gradient.querySelector('img').src = imgSrc;
}

function clearStoredText() {
  const entry = this.textContent
  if (entry === '') this.textContent = localStorage.getItem(this.id)
  else localStorage.setItem(this.id, this.textContent)
}

let backgroundFilter = () => {
  curtainBackground.style.filter = 'blur(0)'
  mainContent.style.filter = 'grayscale(0)'
  setTimeout(function () {
    document.body.style.overflow = 'auto'
  }, 1000)
}

const madeWhiteAndBlack = () => {
  if (curtainBackground.style.filter == 'grayscale(100%)') {
    curtainBackground.style.filter = 'grayscale(0)'
    grayOrColorIcon.src = 'svg/contrast.svg'
  } else {
    curtainBackground.style.filter = 'grayscale(100%)'
    grayOrColorIcon.src = 'svg/contrast-gradient.svg'
  }
}

const getEmptyName = () => {
  if (name.textContent === '[Enter Name]')
    name.innerHTML = ''
  if (name.textContent !=='[Enter Name]')
    name.innerHTML = ''
}

const getEmptyFocus = () => {
  if (focus.textContent === '[Enter Focus]')
    focus.innerHTML = ''
  if (focus.textContent !=='[Enter Focus]')
    focus.innerHTML = ''
}

const getEmptyCity = () => {
  if (city.textContent === 'Earth')
    city.innerHTML = ''
}

const getName = () => {
  if (localStorage.getItem('name') === null) {
    name.textContent = '[Enter Name]'
  } else {
    name.textContent = localStorage.getItem('name')
  }
}

const setName = (e) => {
  if (e.type === 'keypress') {
    if (e.which == 13 || e.keyCode == 13) {
      if (name.textContent == '' && localStorage.getItem('name') === null) {
        name.textContent = '[Enter Name]'
        localStorage.setItem('name', e.target.innerText)
      } else if (name.textContent == '' && previousName === '[Enter Name]') {
        name.textContent = '[Enter Name]'
      } else if (name.textContent !== '' && previousName === '[Enter Name]') {
        localStorage.setItem('name', name.textContent)
        name.textContent = name.textContent
      } else if (name.textContent == '' && previousName !== '[Enter Name]') {
        name.textContent = localStorage.getItem('name')
      } else if (name.textContent !== '' && previousName !== '[Enter Name]') {
        localStorage.setItem('name', name.textContent)
        name.textContent = localStorage.getItem('name')
      }
      localStorage.setItem('name', e.target.innerText)
      name.blur()
    }
  } else if (name.textContent == '' && localStorage.getItem('name') === null) {
    name.textContent = '[Enter Name]'
    localStorage.setItem('name', e.target.innerText)
  } else if (name.textContent == '' && previousName === '[Enter Name]') {
    name.textContent = '[Enter Name]'
  } else if (name.textContent !== '' && previousName === '[Enter Name]') {
    localStorage.setItem('name', name.textContent)
    name.textContent = name.textContent
  } else if (name.textContent == '' && previousName !== '[Enter Name]') {
    name.textContent = localStorage.getItem('name')
  } else if (name.textContent !== '' && previousName !== '[Enter Name]') {
    localStorage.setItem('name', name.textContent)
    name.textContent = localStorage.getItem('name')
  }
}

const getFocus = () => {
  if (localStorage.getItem('focus') === null) {
    focus.textContent = '[Enter Focus]'
  } else {
    focus.textContent = localStorage.getItem('focus')
  }
}

const setFocus = (e) => {
  if (e.type === 'keypress') {
    if (e.which == 13 || e.keyCode == 13) {
      if (focus.textContent == '' && localStorage.getItem('focus') === null) {
        focus.textContent = '[Enter Focus]'
        localStorage.setItem('focus', e.target.innerText)
      } else if (focus.textContent == '' && previousFocus === '[Enter Focus]') {
        focus.textContent = '[Enter Focus]'
      } else if (focus.textContent !== '' && previousFocus === '[Enter Focus]') {
        localStorage.setItem('focus', focus.textContent)
        focus.textContent = focus.textContent
      } else if (focus.textContent == '' && previousFocus !== '[Enter Focus]') {
        focus.textContent = localStorage.getItem('focus')
      } else if (focus.textContent !== '' && previousFocus !== '[Enter Focus]') {
        localStorage.setItem('focus', focus.textContent)
        focus.textContent = localStorage.getItem('focus')
      }
      localStorage.setItem('focus', e.target.innerText)
      focus.blur()
    }
  } else if (focus.textContent == '' && localStorage.getItem('focus') === null) {
    focus.textContent = '[Enter Focus]'
    localStorage.setItem('focus', e.target.innerText)
  } else if (focus.textContent == '' && previousFocus === '[Enter Focus]') {
    focus.textContent = '[Enter Focus]'
  } else if (focus.textContent !== '' && previousFocus === '[Enter Focus]') {
    localStorage.setItem('focus', focus.textContent)
    focus.textContent = focus.textContent
  } else if (focus.textContent == '' && previousFocus !== '[Enter Focus]') {
    focus.textContent = localStorage.getItem('focus')
  } else if (focus.textContent !== '' && previousFocus !== '[Enter Focus]') {
    localStorage.setItem('focus', focus.textContent)
    focus.textContent = localStorage.getItem('focus')
  }
}

const getCity = () => {
  if (localStorage.getItem('city') === null) {
    city.textContent = 'Earth'
  } else {
    city.textContent = localStorage.getItem('city')
  }
}

const setCity = (e) => {
  if (e.type === 'keypress') {
    if (e.which == 13 || e.keyCode == 13) {
      if ( city.textContent == '')
        if(localStorage.getItem('city') === null ) {
          city.textContent = 'Earth'
        } else {
          city.textContent = localStorage.getItem('city')
        }
      localStorage.setItem('city', e.target.innerText)
      city.blur()
    }
  } else {
    if ( city.textContent == '')
      if(localStorage.getItem('city') === null ) {
        city.textContent = 'Earth'
      } else {
        city.textContent = localStorage.getItem('city')
      }
    localStorage.setItem('city', e.target.innerText)
  }
  getWeather()
}
async function getWeather() {
  const link = localStorage.getItem('city')
  if (link !== null) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${link}&lang=en&appid=a57c9f6933ed7c0b00fde3258e699267&units=metric`
    try {
      const res = await fetch(url)
      const data = await res.json()
      weatherIcon.innerHTML = ''
      weatherIcon.classList.add(`owf-${data.weather[0].id}`)
      weatherIcon.classList.add(`gradient-font`)
      temperature.textContent = `${Math.round(data.main.temp)}°C`
      temperature.style.fontWeight = '300'
      humidity.textContent = `Humidity: ${data.main.humidity}%`
      windSpeed.textContent = `Wind Speed: ${data.wind.speed}m/s`
      windSpeed.style.color = '#fff';
      weatherDescription.textContent = data.weather[0].description
    } catch {
      weatherIcon.innerHTML = '<img src="svg/overcast-gradient.svg">'
      weatherIcon.className = "owf"
      weatherDescription.textContent = ':('
      humidity.textContent = ''
      windSpeed.textContent = 'Connection error'
      windSpeed.style.color = '#fa7'
      temperature.textContent = '--°C'
    }

  } else {
    weatherIcon.innerHTML = '<img src="svg/overcast-gradient.svg">'
    weatherDescription.innerHTML = ''
    humidity.textContent = 'Enter your location to get started'
    windSpeed.textContent = ''
    temperature.textContent = '--°C'
  }
};

for (let i = 0; i < arrowButton.length; i++) {
  arrowButton[0].addEventListener('click', setPrevBackgrounImage);
  arrowButton[1].addEventListener('click', setNextBackgrounImage);
}

for (let i = 0; i < variantOfTheme.length; i++) {
  variantOfTheme[0].addEventListener('click', setThemeLA);
  variantOfTheme[1].addEventListener('click', setThemeEarth);
  variantOfTheme[2].addEventListener('click', setThemeMonumentValley);
}

name.addEventListener('click', getEmptyName)
name.addEventListener('keypress', setName)
name.addEventListener('blur', setName)
focus.addEventListener('keypress', setFocus)
focus.addEventListener('blur', setFocus)
focus.addEventListener('click', getEmptyFocus)
city.addEventListener('keypress', setCity)
city.addEventListener('blur', setCity)
city.addEventListener('click', getEmptyCity)
settings.addEventListener('click', openThemeSelection)
reset.addEventListener('click', cleanStorage)
grayOrColorIcon.addEventListener('click', madeWhiteAndBlack)
close.addEventListener('click', closeThemeSelection)
gradient.addEventListener('click', setGradient)

showCurrentTime()
getStart()
showGreeting()
getWeather()
getDate()
getName()
getFocus()
getCity()

document.querySelectorAll('img').forEach(icon => icon.setAttribute('draggable', 'false'));