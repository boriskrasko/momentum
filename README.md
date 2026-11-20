# Momentum

[**Momentum**](https://boriskrasko.github.io/momentum) - is an analogue of the app of the same name in the Chrome web store. The application shows the time and username, his goal for the current day. The background image changes depending on the time of day. App uses local storage to store data..

## Application Structure:
1. Time block
2. Greeting block
3. Weather block
4. Settings

## How to install
- Clone or download the repoistory
- Enable developer mode in Chrome Extensions
- Choose `Load Unpacked` button and locate this repository
- You are done


## [Deploy](https://boriskrasko.github.io/momentum)

 ### Start Screen 
 
 ![](https://boriskrasko.github.io/momentum/pages/momentum-mars.png)

## Stack: 
  * JavaScript(ES6)
  * CSS3, owfont
  * HTML5
  
## +
 * API
 * Local Storage
 * CSS Flex 
 * Eslint airbnb

## Editing and saved data

Name, focus and city edits save automatically. Enter finishes editing, Escape restores the value
from before editing, and Shift+Enter adds a new line to the focus. The focus grows to five visible
lines, then scrolls internally without a visible scrollbar.

Use **Mark as done** to complete today's focus and **Undo** to reopen it. A new local calendar day
starts with an empty focus; **Previous focuses** keeps the latest 30 recorded days.

**Reset** restores the default wallpaper and turns off visual effects. It preserves your name,
city and focuses. **Personal data** contains a separate action for clearing those saved values.

Weather refreshes every 15 minutes. Cached weather stays visible while offline, together with
the time of its last successful update.

Wallpaper changes blend over one second after the next image has decoded. Repeated clicks start
new transitions immediately; temporary image layers are removed when their transitions finish.
All layers share the same fixed viewport and black-and-white effect.

## Development checks

Run `node tests/app.test.cjs` and `node --check main.js`. No dependencies are required.
The checks exercise the actual HTML and application script with a small DOM adapter, a controlled
clock and mocked weather responses. Browser layout, native dialog focus trapping and the live
weather service require separate browser verification.
 
 ## Development process:
 
 ### Mobile first html-structure (iPhone SE)
 
 ![](https://boriskrasko.github.io/momentum/pages/momentum-mobile-first-markup-structure.png)
 
 ![](https://boriskrasko.github.io/momentum/pages/momentum-mobile-first-markup.png)
 
 ![](https://boriskrasko.github.io/momentum/pages/momentum-mobile-first.png)
 
 ### Settings
 
 ![](https://boriskrasko.github.io/momentum/pages/momentum-settings.png)
 
 ### Testing
 
 ![](https://boriskrasko.github.io/momentum/pages/momentum-testing.png)
 
 ![](https://boriskrasko.github.io/momentum/pages/momentum-spice.png)
  
 ![](https://boriskrasko.github.io/momentum/pages/momentum-los-angeles.png)
