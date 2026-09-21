# GitHub Markdown Image Lightbox

English | [简体中文](./README.zh-CN.md)

Preview images from GitHub READMEs, issues, pull requests, and Gists without
leaving the page. The userscript adds an in-page lightbox with zoom, pan,
image navigation, and keyboard controls.

- Version: `0.1.0`
- Requires: Chrome, Edge, or Firefox with Tampermonkey

## Why this exists

Images in GitHub Markdown often link to a raw file or an external page. A
normal click can take you away from what you were reading, and returning means
finding your place again.

```text
GitHub's default behavior

Read -> click an image -> leave the page -> go back -> find your place again

With this userscript

Read -> click an image -> open an in-page lightbox
                              |-- zoom with the mouse wheel
                              |-- drag to pan
                              |-- move between images
                    close it -> continue where you left off
```

The script prefers image URLs that GitHub has already rendered. For images
linked to repository files, it can convert a `blob` URL to a `raw` URL. It
keeps `camo.githubusercontent.com` URLs for external images to reduce failures
caused by GitHub's Content Security Policy.

## Features

- Opens eligible Markdown images without leaving the current page
- Works in READMEs and rendered Markdown in issues, pull requests, and Gists
- Zooms around the pointer up to `8x` the initial fitted size
- Pans a zoomed image by dragging
- Moves between images with buttons or arrow keys
- Supports `Escape` to close and `0` to reset the image transform
- Supports keyboard activation and keeps focus inside the open lightbox
- Handles GitHub's in-page navigation without reloading the userscript
- Filters known badge URLs, GitHub emoji/avatar classes, and small images
- Stores no browsing data or settings

## Install

### Step 1: Install Tampermonkey

Install Tampermonkey from your browser's official extension store:

- [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- [Tampermonkey's official version list](https://www.tampermonkey.net/faq.php?q=Q406)

Choose `Add to Chrome`, `Get`, or `Add to Firefox`, then confirm the browser
prompt. If the Tampermonkey icon is hidden, open the Extensions menu and pin
it to the toolbar.

### Step 2: Allow user scripts in Chromium browsers

Tampermonkey 5.3 and later needs access to the User Scripts API in Chrome,
Edge, and other Chromium-based browsers. On Chrome 138 and later:

1. Right-click the Tampermonkey toolbar icon.
2. Select `Manage extension`.
3. Enable `Allow User Scripts`.

If that switch is unavailable, open `chrome://extensions` in Chrome or
`edge://extensions` in Edge and enable `Developer mode`. Either setting grants
the required access. See [Tampermonkey's official instructions](https://www.tampermonkey.net/faq.php?q=Q209)
for details. Firefox usually does not require this step.

### Step 3: Install the userscript

Use the direct installation link:

**[Install GitHub Markdown Image Lightbox](https://raw.githubusercontent.com/cloudy-liu/github-markdown-lightbox/master/github-markdown-lightbox.user.js)**

Tampermonkey should open its installation screen. Check that the script name
is `GitHub Markdown Image Lightbox`, confirm that it matches `github.com` and
`gist.github.com`, then select `Install`.

Refresh a GitHub page that contains Markdown images. Eligible images show a
zoom-in cursor and open in the lightbox when clicked. If the page has more
than one eligible image, the lightbox shows the current and total count, such
as `1 / 4`.

### Manual installation

If the direct link only displays JavaScript source:

1. Open [`github-markdown-lightbox.user.js`](./github-markdown-lightbox.user.js).
2. Select `Raw` in the upper-right corner of the GitHub file page.
3. Copy the complete source.
4. Open the Tampermonkey dashboard.
5. Select `Add a new script` or the `+` tab.
6. Delete the generated template and paste the copied source.
7. Press `Ctrl+S`, use `Command+S` on macOS, or select the editor's save button.
8. Make sure the script is enabled, then refresh GitHub.

## Use

Click an eligible image inside rendered GitHub Markdown to open the lightbox.

| Action | Result |
| --- | --- |
| Click an eligible content image | Open the lightbox |
| Scroll while the pointer is over the image | Zoom around the pointer |
| Drag after zooming in | Pan the image |
| Select the left or right button | Show the previous or next image |
| Press `Left` or `Right` | Show the previous or next image |
| Press `0` | Reset zoom and position |
| Press `Escape` | Close the lightbox |
| Click the image at the initial `1x` scale | Close the lightbox |
| Click the dark area outside the image | Close the lightbox |
| Press `Tab` or `Shift+Tab` | Move focus between lightbox controls |

Press `Enter` to open a linked image. For an unlinked image, use `Enter` or
`Space`.

## How it works

```text
Click an image inside .markdown-body
  -> reject known badges, GitHub-specific image classes, and small images
  -> resolve an image URL suitable for the lightbox
     -> reuse rendered URLs for external images, including GitHub Camo URLs
     -> convert repository blob image links to raw URLs when needed
  -> create the lightbox on the current page
  -> provide zoom, pan, navigation, and keyboard controls
```

The userscript requests only the `GM_addStyle` permission, which it uses to
add the lightbox styles. Its runtime logic has no remote code dependency. It
sends no analytics and uses no Tampermonkey storage.

## Troubleshooting

### Nothing happens when I click an image

Check the following:

1. Tampermonkey is enabled.
2. `GitHub Markdown Image Lightbox` is enabled in the Tampermonkey dashboard.
3. Chrome or Edge allows user scripts or has Developer mode enabled.
4. The page URL starts with `https://github.com/` or `https://gist.github.com/`.
5. You refreshed GitHub after installing the userscript.

### A badge, avatar, or small icon does not open

This is intentional. The script skips known build badge providers, GitHub
emoji and avatar classes, and images whose natural width and height are both
below `200` pixels. A normal content image remains eligible if either side is
at least `200` pixels.

### An image still fails to load

Check whether GitHub can display the image on the original page. The script
prefers the URL GitHub already rendered and may convert a repository image
link from `/blob/` to `/raw/`. The lightbox cannot load an inaccessible
resource.

### The direct link does not open Tampermonkey

Use the manual installation steps above. Also check that Tampermonkey can
access GitHub and that your browser allows user scripts.

### Updating

This project does not configure `@updateURL` or `@downloadURL`. To update,
open the installation link again and confirm the update in Tampermonkey. You
can also replace the old source in Tampermonkey's editor.

### Uninstalling

Open the Tampermonkey dashboard, find `GitHub Markdown Image Lightbox`, and
delete it. Refresh any open GitHub pages afterward.

## Privacy and permissions

- Matches only `github.com` and `gist.github.com`
- Does not read or store account credentials
- Does not collect browsing history or usage data
- Sends no analytics or telemetry
- Opening the lightbox may request the displayed image from its source URL
- Does not include `@updateURL` or `@downloadURL`
- Requests only the `GM_addStyle` Tampermonkey permission

## Development check

The project has no build step or runtime package dependency. After changing
the userscript, check its JavaScript syntax with:

```powershell
node --check .\github-markdown-lightbox.user.js
```

## License

MIT
