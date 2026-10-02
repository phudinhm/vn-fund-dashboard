/**
 * Bộ đọc .xls (định dạng Excel 97-2003, BIFF8 trong container OLE2) tối giản,
 * chỉ lấy GIÁ TRỊ Ô của từng sheet: số và chuỗi. Không công thức, không định
 * dạng, không macro, không ảnh.
 *
 * Vì sao tự viết: báo cáo tài sản thường là .xls cũ, thư viện đọc đủ dùng (SheetJS)
 * không còn bản sạch trên npm (0.18.5 có lỗ hổng đã biết khi đọc file lạ). Định
 * dạng này đơn giản khi chỉ cần giá trị ô, và bộ đọc nhỏ giữ được bề mặt tấn
 * công nhỏ: mọi vòng lặp đều bị chặn bởi kích thước file, mọi chỉ số đều được
 * kiểm tra biên, lỗi ném `XlsError` thay vì treo hay đọc ngoài vùng.
 */

export class XlsError extends Error {}

export type CellValue = string | number | null
export interface XlsSheet { name: string; rows: CellValue[][] }
export interface XlsWorkbook { sheets: XlsSheet[] }

const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const MAX_FILE_BYTES = 20 * 1024 * 1024
const MAX_CELLS = 2_000_000
const ENDOFCHAIN = 0xfffffffe
const FREESECT = 0xffffffff

function fail(msg: string): never { throw new XlsError(msg) }

// ─── OLE2 container ───────────────────────────────────────────────────────────

function readOleStream(buf: Uint8Array, wanted: string[]): Uint8Array {
  if (buf.length < 512 || OLE_MAGIC.some((b, i) => buf[i] !== b)) fail('not-xls')
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const sectorShift = dv.getUint16(0x1e, true)
  const miniShift = dv.getUint16(0x20, true)
  if (sectorShift !== 9 && sectorShift !== 12) fail('bad-sector-size')
  const sectorSize = 1 << sectorShift
  const miniSize = 1 << miniShift
  const nSectors = Math.floor((buf.length - 512) / sectorSize) + 1 // gồm cả sector đầu header
  const sectorOffset = (id: number) => (id + 1) * sectorSize
  const sectorOk = (id: number) => id >= 0 && id < nSectors && sectorOffset(id) + sectorSize <= buf.length

  // FAT: danh sách sector chứa FAT nằm ở DIFAT (109 mục trong header + chuỗi DIFAT).
  const fatSectors: number[] = []
  for (let i = 0; i < 109; i++) {
    const id = dv.getUint32(0x4c + i * 4, true)
    if (id !== FREESECT && id !== ENDOFCHAIN) fatSectors.push(id)
  }
  let difat = dv.getUint32(0x44, true)
  const difatCount = dv.getUint32(0x48, true)
  for (let n = 0; n < difatCount && difat !== ENDOFCHAIN && difat !== FREESECT; n++) {
    if (!sectorOk(difat)) fail('bad-difat')
    const base = sectorOffset(difat)
    const per = sectorSize / 4 - 1
    for (let i = 0; i < per; i++) {
      const id = dv.getUint32(base + i * 4, true)
      if (id !== FREESECT && id !== ENDOFCHAIN) fatSectors.push(id)
    }
    difat = dv.getUint32(base + per * 4, true)
  }
  const fat: number[] = []
  for (const s of fatSectors) {
    if (!sectorOk(s)) fail('bad-fat')
    for (let i = 0; i < sectorSize / 4; i++) fat.push(dv.getUint32(sectorOffset(s) + i * 4, true))
  }

  const readChain = (start: number, limit = nSectors + 1): Uint8Array => {
    const parts: Uint8Array[] = []
    let id = start
    for (let n = 0; id !== ENDOFCHAIN && id !== FREESECT; n++) {
      if (n > limit || !sectorOk(id)) fail('bad-chain')
      parts.push(buf.subarray(sectorOffset(id), sectorOffset(id) + sectorSize))
      id = fat[id] ?? ENDOFCHAIN
    }
    return concat(parts)
  }

  // Thư mục: các mục 128 byte.
  const dir = readChain(dv.getUint32(0x30, true))
  const ddv = new DataView(dir.buffer, dir.byteOffset, dir.byteLength)
  let root: { start: number; size: number } | null = null
  let target: { start: number; size: number } | null = null
  for (let off = 0; off + 128 <= dir.length; off += 128) {
    const nameLen = ddv.getUint16(off + 64, true)
    if (nameLen < 2 || nameLen > 64) continue
    let name = ''
    for (let i = 0; i < nameLen / 2 - 1; i++) name += String.fromCharCode(ddv.getUint16(off + i * 2, true))
    const type = dir[off + 66]!
    const entry = { start: ddv.getUint32(off + 116, true), size: ddv.getUint32(off + 120, true) }
    if (type === 5) root = entry
    else if (type === 2 && target === null && wanted.includes(name)) target = entry
  }
  if (!target) fail('no-workbook')
  if (target.size > MAX_FILE_BYTES) fail('too-large')

  const cutoff = dv.getUint32(0x38, true)
  if (target.size >= cutoff) return readChain(target.start).subarray(0, target.size)

  // Stream nhỏ: nằm trong mini stream (container là stream của mục gốc).
  if (!root) fail('no-root')
  const miniStream = readChain(root.start)
  const miniFatRaw = readChain(dv.getUint32(0x3c, true))
  const mdv = new DataView(miniFatRaw.buffer, miniFatRaw.byteOffset, miniFatRaw.byteLength)
  const parts: Uint8Array[] = []
  let id = target.start
  for (let n = 0; id !== ENDOFCHAIN && id !== FREESECT; n++) {
    const off = id * miniSize
    if (n > miniStream.length / miniSize + 1 || off + miniSize > miniStream.length) fail('bad-mini-chain')
    parts.push(miniStream.subarray(off, off + miniSize))
    id = id * 4 + 4 <= miniFatRaw.length ? mdv.getUint32(id * 4, true) : ENDOFCHAIN
  }
  return concat(parts).subarray(0, target.size)
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}

// ─── BIFF8 ────────────────────────────────────────────────────────────────────

const REC = {
  BOF: 0x0809, EOF: 0x000a, BOUNDSHEET: 0x0085, SST: 0x00fc, CONTINUE: 0x003c,
  LABELSST: 0x00fd, LABEL: 0x0204, NUMBER: 0x0203, RK: 0x027e, MULRK: 0x00bd,
  FORMULA: 0x0006, STRING: 0x0207,
} as const

interface Chunk { data: Uint8Array }

/** Đọc chuỗi Unicode của BIFF8 từ một dãy chunk (SST có thể bị CONTINUE cắt ngang). */
class ChunkReader {
  private ci = 0
  private pos = 0
  constructor(private readonly chunks: Chunk[]) {}
  private cur(): Uint8Array { return this.chunks[this.ci]?.data ?? fail('sst-eof') }
  atEnd(): boolean { return this.ci >= this.chunks.length || (this.ci === this.chunks.length - 1 && this.pos >= this.cur().length) }
  private ensure(): void {
    while (this.pos >= this.cur().length) {
      this.ci++
      this.pos = 0
      if (this.ci >= this.chunks.length) fail('sst-eof')
    }
  }
  u8(): number { this.ensure(); return this.cur()[this.pos++]! }
  u16(): number { return this.u8() | (this.u8() << 8) }
  u32(): number { return (this.u16() | (this.u16() << 16)) >>> 0 }
  skip(n: number): void { for (let i = 0; i < n; i++) { if (this.pos >= this.cur().length) { if (this.ci + 1 >= this.chunks.length) fail('sst-eof'); this.ci++; this.pos = 0 } this.pos++ } }
  /** Đọc `cch` ký tự; mỗi lần qua chunk mới có 1 byte cờ mã hoá đứng đầu phần còn lại. */
  chars(cch: number, utf16: boolean): string {
    let out = ''
    let wide = utf16
    let remaining = cch
    while (remaining > 0) {
      if (this.pos >= this.cur().length) {
        this.ci++
        this.pos = 0
        if (this.ci >= this.chunks.length) fail('sst-eof')
        wide = (this.cur()[this.pos++]! & 1) === 1
        continue
      }
      const bytesPer = wide ? 2 : 1
      const avail = Math.floor((this.cur().length - this.pos) / bytesPer)
      const take = Math.min(avail, remaining)
      if (take === 0) fail('sst-bad')
      const d = this.cur()
      for (let i = 0; i < take; i++) {
        out += wide
          ? String.fromCharCode(d[this.pos + i * 2]! | (d[this.pos + i * 2 + 1]! << 8))
          : String.fromCharCode(d[this.pos + i]!)
      }
      this.pos += take * bytesPer
      remaining -= take
    }
    return out
  }
}

function readUnicodeString(r: ChunkReader, lenBytes: 1 | 2): string {
  const cch = lenBytes === 1 ? r.u8() : r.u16()
  const flags = r.u8()
  const utf16 = (flags & 1) === 1
  const rich = (flags & 8) !== 0
  const ext = (flags & 4) !== 0
  const runs = rich ? r.u16() : 0
  const extSize = ext ? r.u32() : 0
  const s = r.chars(cch, utf16)
  if (runs) r.skip(runs * 4)
  if (extSize) r.skip(extSize)
  return s
}

function decodeRk(rk: number): number {
  let v: number
  if (rk & 2) {
    v = rk >> 2 // dịch số học: giữ dấu của số nguyên 30 bit
  } else {
    const b = new DataView(new ArrayBuffer(8))
    b.setUint32(4, (rk & 0xfffffffc) >>> 0, true)
    v = b.getFloat64(0, true)
  }
  return rk & 1 ? v / 100 : v
}

export function readXlsWorkbook(input: ArrayBuffer | Uint8Array): XlsWorkbook {
  const buf = input instanceof Uint8Array ? input : new Uint8Array(input)
  if (buf.length > MAX_FILE_BYTES) fail('too-large')
  const wb = readOleStream(buf, ['Workbook', 'Book'])
  const dv = new DataView(wb.buffer, wb.byteOffset, wb.byteLength)

  const sstChunks: Chunk[] = []
  const sheetNames: string[] = []
  const sst: string[] = []
  const sheets: { name: string; cells: Map<string, CellValue>; maxRow: number; maxCol: number }[] = []
  let current: (typeof sheets)[number] | null = null
  let lastWasSst = false
  let pendingFormula: { r: number; c: number } | null = null
  let cellCount = 0
  let globalsDone = false

  const put = (r: number, c: number, v: CellValue) => {
    if (!current) return
    if (++cellCount > MAX_CELLS) fail('too-many-cells')
    current.cells.set(`${r},${c}`, v)
    if (r > current.maxRow) current.maxRow = r
    if (c > current.maxCol) current.maxCol = c
  }

  let pos = 0
  while (pos + 4 <= wb.length) {
    const id = dv.getUint16(pos, true)
    const len = dv.getUint16(pos + 2, true)
    const start = pos + 4
    if (start + len > wb.length) break
    const rec = wb.subarray(start, start + len)
    const rdv = new DataView(rec.buffer, rec.byteOffset, rec.byteLength)
    pos = start + len

    if (id === REC.CONTINUE) {
      if (lastWasSst) sstChunks.push({ data: rec })
      continue
    }
    if (lastWasSst && id !== REC.CONTINUE) {
      lastWasSst = false
      // SST kết thúc: giải mã một lần với đủ các chunk.
      const r = new ChunkReader(sstChunks)
      r.u32(); const unique = r.u32()
      for (let i = 0; i < unique && !r.atEnd(); i++) sst.push(readUnicodeString(r, 2))
    }

    switch (id) {
      case REC.BOUNDSHEET: {
        const cch = rec[6]!
        const wide = (rec[7]! & 1) === 1
        let name = ''
        for (let i = 0; i < cch; i++) name += wide ? String.fromCharCode(rdv.getUint16(8 + i * 2, true)) : String.fromCharCode(rec[8 + i]!)
        sheetNames.push(name)
        break
      }
      case REC.SST:
        sstChunks.length = 0
        sstChunks.push({ data: rec })
        lastWasSst = true
        break
      case REC.BOF: {
        const type = rdv.getUint16(2, true)
        if (type === 0x0010) { // worksheet
          globalsDone = true
          current = { name: sheetNames[sheets.length] ?? `Sheet${sheets.length + 1}`, cells: new Map(), maxRow: -1, maxCol: -1 }
          sheets.push(current)
        } else if (globalsDone) current = null
        break
      }
      case REC.LABELSST:
        put(rdv.getUint16(0, true), rdv.getUint16(2, true), sst[rdv.getUint32(6, true)] ?? null)
        break
      case REC.NUMBER:
        put(rdv.getUint16(0, true), rdv.getUint16(2, true), rdv.getFloat64(6, true))
        break
      case REC.RK:
        put(rdv.getUint16(0, true), rdv.getUint16(2, true), decodeRk(rdv.getUint32(6, true)))
        break
      case REC.MULRK: {
        const row = rdv.getUint16(0, true)
        const first = rdv.getUint16(2, true)
        const n = Math.floor((len - 6) / 6)
        for (let i = 0; i < n; i++) put(row, first + i, decodeRk(rdv.getUint32(4 + i * 6 + 2, true)))
        break
      }
      case REC.LABEL: {
        const r = new ChunkReader([{ data: rec.subarray(6) }])
        put(rdv.getUint16(0, true), rdv.getUint16(2, true), readUnicodeString(r, 2))
        break
      }
      case REC.FORMULA: {
        const row = rdv.getUint16(0, true)
        const col = rdv.getUint16(2, true)
        if (rdv.getUint16(6 + 6, true) === 0xffff) {
          pendingFormula = rec[6] === 0 ? { r: row, c: col } : null // 0 = kết quả là chuỗi, đứng ở record STRING kế tiếp
        } else {
          put(row, col, rdv.getFloat64(6, true))
          pendingFormula = null
        }
        break
      }
      case REC.STRING:
        if (pendingFormula) {
          const r = new ChunkReader([{ data: rec }])
          put(pendingFormula.r, pendingFormula.c, readUnicodeString(r, 2))
          pendingFormula = null
        }
        break
    }
  }

  if (sheets.length === 0) fail('no-sheets')
  return {
    sheets: sheets.map(s => {
      const rows: CellValue[][] = []
      for (let r = 0; r <= s.maxRow; r++) {
        const row: CellValue[] = []
        for (let c = 0; c <= s.maxCol; c++) row.push(s.cells.get(`${r},${c}`) ?? null)
        rows.push(row)
      }
      return { name: s.name, rows }
    }),
  }
}
