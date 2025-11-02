# PWA Icon Generation Instructions

SVG icon files have been created. To convert them to PNG format, use one of the following methods:

## Method 1: ImageMagick (Recommended)

```bash
# Install ImageMagick
brew install imagemagick  # macOS
# or
sudo apt-get install imagemagick  # Ubuntu/Debian

# Convert SVG to PNG
cd web/public
convert icon-192.svg -background none icon-192.png
convert icon-512.svg -background none icon-512.png
```

## Method 2: Inkscape

```bash
# Install Inkscape
brew install inkscape  # macOS
# or
sudo apt-get install inkscape  # Ubuntu/Debian

# Convert SVG to PNG
cd web/public
inkscape icon-192.svg --export-filename=icon-192.png --export-width=192 --export-height=192
inkscape icon-512.svg --export-filename=icon-512.png --export-width=512 --export-height=512
```

## Method 3: Online Converter

1. Visit https://cloudconvert.com/svg-to-png
2. Upload `icon-192.svg` and `icon-512.svg`
3. Set dimensions: 192x192 and 512x512 respectively
4. Download the PNG files
5. Place them in `web/public/` directory

## Method 4: Node.js with Sharp (Alternative)

```bash
cd web
npm install sharp
node -e "
const sharp = require('sharp');
sharp('public/icon-192.svg').png().resize(192, 192).toFile('public/icon-192.png');
sharp('public/icon-512.svg').png().resize(512, 512).toFile('public/icon-512.png');
"
```

## Verification

After conversion, verify the files exist:
```bash
cd web/public
ls -lh icon-*.png
```

You should see:
- `icon-192.png` (~5-10 KB)
- `icon-512.png` (~15-30 KB)

## Icon Design

The icons feature:
- Blue gradient background (#0ea5e9 to #0369a1)
- White "LOS" text
- Rounded corners (20% radius)
- Clean, professional design

For the 512x512 icon, it also includes "Loan Origination" subtitle text.

