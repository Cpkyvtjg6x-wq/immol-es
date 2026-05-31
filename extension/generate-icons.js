// Run with: node generate-icons.js
// Requires: npm install canvas
// Or open generate-icons.html in a browser to export manually

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  const r = size * 0.12 // corner radius
  const pad = size * 0.08

  // Background rounded rect
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.arcTo(size, 0, size, r, r)
  ctx.lineTo(size, size - r)
  ctx.arcTo(size, size, size - r, size, r)
  ctx.lineTo(r, size)
  ctx.arcTo(0, size, 0, size - r, r)
  ctx.lineTo(0, r)
  ctx.arcTo(0, 0, r, 0, r)
  ctx.closePath()
  ctx.fillStyle = '#0a0a0b'
  ctx.fill()

  // Emerald accent bar (left side)
  ctx.fillStyle = '#10b981'
  ctx.fillRect(pad, pad, size * 0.12, size - pad * 2)

  // "I" letter
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${size * 0.45}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('I', size * 0.62, size * 0.52)

  return canvas.toBuffer('image/png')
}

const sizes = [16, 48, 128]
for (const size of sizes) {
  const buf = drawIcon(size)
  fs.writeFileSync(path.join(__dirname, 'icons', `icon${size}.png`), buf)
  console.log(`✓ icon${size}.png`)
}
console.log('Icons generated!')
