import Tesseract from 'tesseract.js'

export interface OcrResult {
  amount: string | null
  date: string | null
  vendor: string | null
  rawText: string
}

const AMOUNT_PATTERNS = [
  /(?:total|amount\s*due|balance\s*due|grand\s*total|subtotal|amt)\s*[:.]?\s*\$?\s*(\d{1,6}[.,]\d{2})/i,
  /\$\s*(\d{1,6}[.,]\d{2})/,
  /(\d{1,6}\.\d{2})\s*(?:USD|usd)?/,
]

const DATE_PATTERNS = [
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})/,
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})(?!\d)/,
  /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)\s+(\d{1,2}),?\s+(20\d{2})/i,
  /(\d{1,2})\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)\s+(20\d{2})/i,
]

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

function parseAmount(text: string): string | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const matches = [...text.matchAll(new RegExp(pattern, 'g'))]
    if (matches.length > 0) {
      const last = matches[matches.length - 1]
      return last[1].replace(',', '.')
    }
  }
  return null
}

function parseDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern)
    if (!match) continue

    if (/[a-z]/i.test(match[0])) {
      const monthStr = (match[1].match(/[a-z]+/i)?.[0] || match[2].match(/[a-z]+/i)?.[0] || '').toLowerCase().slice(0, 3)
      const month = MONTH_MAP[monthStr]
      if (!month) continue
      const dayStr = match[0].match(/\d{1,2}/)?.[0]
      const yearStr = match[0].match(/20\d{2}/)?.[0]
      if (!dayStr || !yearStr) continue
      return `${yearStr}-${month}-${dayStr.padStart(2, '0')}`
    }

    let [, p1, p2, p3] = match
    let year = p3.length === 2 ? `20${p3}` : p3
    let month = p1.padStart(2, '0')
    let day = p2.padStart(2, '0')
    if (parseInt(month) > 12) {
      [month, day] = [day, month]
    }
    if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
      return `${year}-${month}-${day}`
    }
  }
  return null
}

function parseVendor(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2)
  for (const line of lines.slice(0, 5)) {
    const cleaned = line.replace(/[^a-zA-Z0-9\s&'.,-]/g, '').trim()
    if (cleaned.length >= 3 && cleaned.length <= 60 && /[a-zA-Z]{2,}/.test(cleaned)) {
      if (/^\d+$/.test(cleaned)) continue
      if (/^(date|time|total|subtotal|tax|cash|change|card|visa|master)/i.test(cleaned)) continue
      return cleaned
    }
  }
  return null
}

export async function scanReceipt(imageFile: File): Promise<OcrResult> {
  const { data } = await Tesseract.recognize(imageFile, 'eng', {
    logger: () => {},
  })

  const rawText = data.text
  return {
    amount: parseAmount(rawText),
    date: parseDate(rawText),
    vendor: parseVendor(rawText),
    rawText,
  }
}
