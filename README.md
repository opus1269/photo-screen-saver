# Photo Screen Saver Chrome Extension

This extension displays a screensaver composed of a slide show of photos in various formats from various sources. Supported photo sources include:

* The users own Google Photos Albums
* A subset of the background photos used by the Chromecast media streaming device
* Popular and fresh photos from 500<sup>px</sup>
* Space, earth, and animal photos from reddit
* Interesting photos from Flickr

Numerous options are available to control the appearance of the slide show including:

* Wait time after machine becomes idle to display screensaver
* Between photo time interval
* Photo display mode: Letterbox, Zoom, Full etc.
* Photo transition animations: Fade in, Scale up etc.
* A scheduler to control when the screensaver, display, and computer should remain on
* Optionally show on all connected displays
* Optionally display current time

It is implemented using Vanilla JavaScript and [Polymer](https://www.polymer-project.org/1.0/).

#### [View in Chrome Web Store](https://chrome.google.com/webstore/detail/kohpcmlfdjfdggcjmjhhbcbankgmppgc)

<a href="https://www.bithound.io/github/opus1269/photo-screen-saver"><img src="https://www.bithound.io/github/opus1269/photo-screen-saver/badges/score.svg" alt="bitHound Score" /></a>

### Frequently Asked Questions
<br />

* **How do I uninstall this?**

  Right click on the icon in the browser toolbar and select "Remove From Chrome..."

  ***

* **I received a Status: 500 error trying to load my Google Photos albums. What does that mean?**

  This is an error on the Server that provides the photos. This is probably
  a very temporary issue - please try again later.

  ***

* **Why is the time label incorrect on my Chromebook?**

  If you have this problem, go to "Settings" -> "Show Advanced Settings" and in
  the "Date and time" section uncheck the "Set time zone automatically using your location".
  You will need to re-start for the change to take effect.

  ***

* **What do the labels on the icon mean?**

  - No label: Screensaver is enabled and will be displayed when the computer is idle.
  - OFF: Screensaver is disabled.  
  - SLP: The time is in the inactive range of the scheduler. Screensaver will not display.
  - PWR: The scheduler will process the keep awake settings, but the screensaver will never display

  ***

* **I have the Keep awake off, but my display is not sleeping. Why is that?**

  Other applications may be preventing the display or computer from sleeping.

  On many Chrome OS devices the display will not sleep if the screensaver is running.
  You can use the Screensaver/Keep awake scheduling feature to control when the screensaver is displayed.

  ***

* **I have the Keep awake on, but my system is shutting down. Why is that?**

  The Keep awake features are requests to the computer and do not have to be honored.
  The display request is almost always honored, but the system request isn't. In
  particular, many PC's will put the computer to sleep if you have them set to do this.

  ***

* **Can I manually display the screensaver?**

  Yes. You can right click on the extension icon and select "Display screensaver".
  There is also a keyboard shortcut: Alt+Shift+D

  This will display the screensaver regardless of any other settings.

  ***

* **Can you add support for accessing the photos in my 500<sup>px</sup>/Flickr account?**

  I believe this will be doable and plan on adding it.

  ***

* **Can you add support for using files from my local computer?**

  No. Unfortunately, extensions are not allowed to access the local filesystem.

  <br />
