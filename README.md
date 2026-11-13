# Atmosphere Splash Injector

Client-side browser tool that injects a 1280×720 splash into a stock Atmosphère `package3`, using the same layout as [`utilities/insert_splash_screen.py`](https://github.com/Atmosphere-NX/Atmosphere/blob/master/utilities/insert_splash_screen.py).

Files never leave your browser. Official Atmosphère only.

## Use

Open `index.html` in a desktop browser (Chrome, Firefox, Edge). No install and no server required.

Drop a stock Atmosphère `package3` and a 1280×720 image, then download the patched file to `atmosphere/package3` on the SD card.

If your browser blocks local file access, serve the folder with any static file server, for example:

```bat
npx --yes serve .
```

or open the folder with VS Code / Cursor Live Server.

## License

GNU General Public License, version 2. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

This project reimplements splash conversion logic from Atmosphère (GPLv2). It is not affiliated with Atmosphere-NX.
