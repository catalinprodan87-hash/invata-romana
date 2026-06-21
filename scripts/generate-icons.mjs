// Generates placeholder PWA icons (PNG) from inline SVG using sharp.
// Run with: npm run icons
//
// Produces:
//   public/icons/pwa-192x192.png            (any)
//   public/icons/pwa-512x512.png            (any)
//   public/icons/pwa-maskable-512x512.png   (maskable — full-bleed, safe zone)
//   public/icons/apple-touch-icon-180x180.png

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')

const PRIMARY = '#1E5AA8'
const PRIMARY_DARK = '#16407A'
const ACCENT = '#F2C037'

// Standard icon: rounded square + open book glyph. `pad` keeps the glyph inside the
// maskable safe zone when rendered full-bleed.
function iconSvg({ rounded = true, pad = 0.5 } = {}) {
  const radius = rounded ? 96 : 0
  const scale = 1 - pad * 0.18
  const t = 256 - 256 * scale
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${PRIMARY}" />
  <g transform="translate(${t}, ${t}) scale(${scale})">
    <!-- open book -->
    <path d="M256 144c0 0-90-20-150 20v220c60-40 150-20 150-20s90-20 150 20V164c-60-40-150-20-150-20z" fill="${ACCENT}" opacity="0.9"/>
    <rect x="246" y="144" width="20" height="220" fill="${PRIMARY_DARK}"/>
  </g>
</svg>`
}

async function render(svg, size, file) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
  await writeFile(join(outDir, file), png)
  console.log(`  ✓ ${file} (${size}×${size})`)
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const standard = iconSvg({ rounded: true, pad: 0 })
  const maskable = iconSvg({ rounded: false, pad: 1 })

  console.log('Generating PWA icons…')
  await render(standard, 192, 'pwa-192x192.png')
  await render(standard, 512, 'pwa-512x512.png')
  await render(maskable, 512, 'pwa-maskable-512x512.png')
  await render(standard, 180, 'apple-touch-icon-180x180.png')
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
