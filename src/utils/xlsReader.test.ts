import { describe, it, expect } from 'vitest'
import { readXlsWorkbook, XlsError } from './xlsReader'

// ─── Trình dựng .xls tổng hợp (chỉ cho test) ─────────────────────────────────

const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff]
const u32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]
const f64 = (x: number) => Array.from(new Uint8Array(new Float64Array([x]).buffer))
const rec = (id: number, data: number[]) => [...u16(id), ...u16(data.length), ...data]
const ascii = (s: string) => Array.from(s).map(c => c.charCodeAt(0))
const utf16 = (s: string) => Array.from(s).flatMap(c => u16(c.charCodeAt(0)))

/** Chuỗi Unicode BIFF8 (cch 16-bit, cờ, ký tự). */
function ustr(s: string, wide = false): number[] {
  return [...u16(s.length), wide ? 1 : 0, ...(wide ? utf16(s) : ascii(s))]
}

function rkInt(n: number): number[] { return u32(((n << 2) | 2) >>> 0) }

interface SheetSpec { name: string; cells: number[][] } // mỗi ô là một record đã đóng gói

function biff(sst: string[], sheets: SheetSpec[], opts: { splitSstAt?: number } = {}): number[] {
  const globals: number[] = [...rec(0x0809, [...u16(0x600), ...u16(0x5), ...u16(0), ...u16(0), ...u32(0), ...u32(0)])]
  // BOUNDSHEET cần offset BOF của sheet; tính sau khi biết độ dài phần globals.
  const sstData = [...u32(sst.length), ...u32(sst.length), ...sst.flatMap(s => ustr(s, /[^\x00-\x7f]/.test(s)))]
  let sstRecords: number[]
  if (opts.splitSstAt !== undefined && sstData.length > opts.splitSstAt) {
    // Cắt giữa một chuỗi: phần sau nằm trong CONTINUE, mở đầu bằng 1 byte cờ mã hoá của phần còn lại.
    const head = sstData.slice(0, opts.splitSstAt)
    const tail = sstData.slice(opts.splitSstAt)
    sstRecords = [...rec(0x00fc, head), ...rec(0x003c, [1, ...tail])]
  } else sstRecords = rec(0x00fc, sstData)

  const boundLens = sheets.map(s => rec(0x0085, [...u32(0), 0, 0, s.name.length, 0, ...ascii(s.name)]).length)
  const globalsLen = globals.length + boundLens.reduce((a, b) => a + b, 0) + sstRecords.length + rec(0x000a, []).length
  const sheetBlobs = sheets.map(s => [
    ...rec(0x0809, [...u16(0x600), ...u16(0x10), ...u16(0), ...u16(0), ...u32(0), ...u32(0)]),
    ...s.cells.flat(), ...rec(0x000a, []),
  ])
  let off = globalsLen
  const bounds = sheets.flatMap((s, i) => {
    const r = rec(0x0085, [...u32(off), 0, 0, s.name.length, 0, ...ascii(s.name)])
    off += sheetBlobs[i]!.length
    return r
  })
  return [...globals, ...bounds, ...sstRecords, ...rec(0x000a, []), ...sheetBlobs.flat()]
}

const labelSst = (r: number, c: number, idx: number) => rec(0x00fd, [...u16(r), ...u16(c), ...u16(0), ...u32(idx)])
const number = (r: number, c: number, x: number) => rec(0x0203, [...u16(r), ...u16(c), ...u16(0), ...f64(x)])
const rk = (r: number, c: number, n: number) => rec(0x027e, [...u16(r), ...u16(c), ...u16(0), ...rkInt(n)])
const mulrk = (r: number, c0: number, ns: number[]) =>
  rec(0x00bd, [...u16(r), ...u16(c0), ...ns.flatMap(n => [...u16(0), ...rkInt(n)]), ...u16(c0 + ns.length - 1)])

/** Đóng gói thành container OLE2. `mini` = để stream nhỏ vào mini stream. */
function ole(workbook: number[], mini = false): Uint8Array {
  const S = 512
  const pad = (a: number[], to: number) => { const b = a.slice(); while (b.length % to) b.push(0); return b }
  const dirEntry = (name: string, type: number, start: number, size: number, children = [0xffffffff, 0xffffffff, 0xffffffff]) => {
    const nm = utf16(name)
    const e = new Array(128).fill(0)
    nm.forEach((b, i) => { e[i] = b })
    e.splice(64, 2, ...u16(nm.length + 2))
    e[66] = type
    e[67] = 1
    e.splice(68, 12, ...children.flatMap(c => u32(c)))
    e.splice(116, 4, ...u32(start))
    e.splice(120, 4, ...u32(size))
    return e
  }
  const END = 0xfffffffe
  const FATSECT = 0xfffffffd
  let fat: number[]
  let sectors: number[][]
  let header: { miniFatStart: number; miniFatCount: number }
  if (!mini) {
    const data = pad(workbook, S)
    const n = data.length / S
    fat = [FATSECT, END, ...Array.from({ length: n }, (_, i) => (i === n - 1 ? END : 3 + i))]
    const dir = [...dirEntry('Root Entry', 5, END, 0, [1, 0xffffffff, 0xffffffff]), ...dirEntry('Workbook', 2, 2, workbook.length), ...new Array(256).fill(0)]
    sectors = [pad(fat.flatMap(u32), S), dir, ...Array.from({ length: n }, (_, i) => data.slice(i * S, (i + 1) * S))]
    header = { miniFatStart: END, miniFatCount: 0 }
  } else {
    const miniData = pad(workbook, 64)
    const nMini = miniData.length / 64
    const miniFat = Array.from({ length: nMini }, (_, i) => (i === nMini - 1 ? END : i + 1))
    const container = pad(miniData, S)
    const nCont = container.length / S
    // s0 FAT, s1 dir, s2 miniFAT, s3.. container
    fat = [FATSECT, END, END, ...Array.from({ length: nCont }, (_, i) => (i === nCont - 1 ? END : 4 + i))]
    const dir = [...dirEntry('Root Entry', 5, 3, miniData.length, [1, 0xffffffff, 0xffffffff]), ...dirEntry('Workbook', 2, 0, workbook.length), ...new Array(256).fill(0)]
    sectors = [pad(fat.flatMap(u32), S), dir, pad(miniFat.flatMap(u32), S), ...Array.from({ length: nCont }, (_, i) => container.slice(i * S, (i + 1) * S))]
    header = { miniFatStart: 2, miniFatCount: 1 }
  }
  const h = new Array(512).fill(0xff)
  ;[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].forEach((b, i) => { h[i] = b })
  const set = (off: number, bytes: number[]) => bytes.forEach((b, i) => { h[off + i] = b })
  set(0x1a, u16(3)); set(0x1c, u16(0xfffe)); set(0x1e, u16(9)); set(0x20, u16(6))
  set(0x22, [0, 0, 0, 0, 0, 0])
  set(0x2c, u32(1)); set(0x30, u32(1)); set(0x34, u32(0)); set(0x38, u32(4096))
  set(0x3c, u32(header.miniFatStart)); set(0x40, u32(header.miniFatCount))
  set(0x44, u32(END)); set(0x48, u32(0))
  set(0x4c, u32(0)) // DIFAT[0] = sector 0 là FAT
  return new Uint8Array([...h, ...sectors.flat()])
}

const pad4096 = (wb: number[]) => [...wb, ...rec(0x00e1, new Array(4200).fill(0).map(() => 0)).slice(0, 4100)]

// ─── Test ────────────────────────────────────────────────────────────────────

describe('readXlsWorkbook', () => {
  const sst = ['Sản phẩm', 'DCBF', 'Linh hoạt / Flexible', 'Tổng']
  const sheet: SheetSpec = {
    name: 'Data',
    cells: [
      labelSst(0, 0, 0), labelSst(0, 1, 1),
      number(1, 0, 653.4), rk(1, 1, 42), rk(1, 2, -7),
      mulrk(2, 0, [1, 2, 3]),
      labelSst(3, 5, 3),
    ],
  }

  it('reads strings (incl. non-ASCII), floats, RK integers and MULRK runs', () => {
    const wb = readXlsWorkbook(ole(pad4096(biff(sst, [sheet]))))
    expect(wb.sheets).toHaveLength(1)
    const rows = wb.sheets[0]!.rows
    expect(wb.sheets[0]!.name).toBe('Data')
    expect(rows[0]![0]).toBe('Sản phẩm')
    expect(rows[0]![1]).toBe('DCBF')
    expect(rows[1]![0]).toBeCloseTo(653.4, 10)
    expect(rows[1]![1]).toBe(42)
    expect(rows[1]![2]).toBe(-7)
    expect(rows[2]!.slice(0, 3)).toEqual([1, 2, 3])
    expect(rows[3]![5]).toBe('Tổng')
    expect(rows[3]![0]).toBeNull()
  })

  it('reads a workbook stored in the mini stream (small files)', () => {
    const small = biff(['abc', 'xyz'], [{ name: 'S', cells: [labelSst(0, 0, 0), number(0, 1, 2.5), labelSst(1, 0, 1)] }])
    expect(small.length).toBeLessThan(4096)
    const wb = readXlsWorkbook(ole(small, true))
    expect(wb.sheets[0]!.rows).toEqual([['abc', 2.5], ['xyz', null]])
  })

  it('stitches a shared string split across a CONTINUE record', () => {
    const long = 'Quỹ đầu tư trái phiếu An Bình'
    const wb = readXlsWorkbook(ole(pad4096(biff(['ab', long, 'cd'], [
      { name: 'S', cells: [labelSst(0, 0, 0), labelSst(0, 1, 1), labelSst(0, 2, 2)] },
    ], { splitSstAt: 30 }))))
    expect(wb.sheets[0]!.rows[0]).toEqual(['ab', long, 'cd'])
  })

  it('reads several sheets in order', () => {
    const wb = readXlsWorkbook(ole(pad4096(biff(['a', 'b'], [
      { name: 'One', cells: [labelSst(0, 0, 0)] },
      { name: 'Two', cells: [labelSst(0, 0, 1)] },
    ]))))
    expect(wb.sheets.map(s => [s.name, s.rows[0]![0]])).toEqual([['One', 'a'], ['Two', 'b']])
  })

  it('rejects input that is not an .xls', () => {
    expect(() => readXlsWorkbook(new Uint8Array(1000))).toThrow(XlsError)
    expect(() => readXlsWorkbook(new TextEncoder().encode('date,price\n2024-01-01,1'))).toThrow(XlsError)
  })

  it('does not hang or read out of bounds on a corrupted container', () => {
    const good = ole(pad4096(biff(sst, [sheet])))
    const bad = good.slice()
    // phá FAT: mọi sector trỏ vòng về chính nó
    for (let i = 0; i < 128; i++) { bad[512 + i * 4] = 2; bad[512 + i * 4 + 1] = 0; bad[512 + i * 4 + 2] = 0; bad[512 + i * 4 + 3] = 0 }
    expect(() => readXlsWorkbook(bad)).toThrow(XlsError)
    expect(() => readXlsWorkbook(good.slice(0, 600))).toThrow(XlsError)
  })
})
