/**
 * Write a rebuilt data file only if it is not markedly worse than the one on
 * disk.
 *
 * Both history scripts catch per-item failures and write whatever they
 * collected, which is right for a first run and wrong for a rebuild: when
 * WynnVentory throttles - and it does, hard, once a few hundred calls are in
 * flight - a run can come back with a fraction of the series and quietly
 * replace good committed data with it. On a deploy that ships empty charts.
 *
 * Keeping the old file and saying so is the safe failure: the board still has
 * its history, and the next run can try again.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

/** Below this share of the previous run, the new file is treated as a bad pull. */
const FLOOR = 0.8

export function writeIfNotWorse(path: string, next: Record<string, unknown>): boolean {
  const count = Object.keys(next).length

  if (existsSync(path)) {
    let before = 0
    try {
      before = Object.keys(JSON.parse(readFileSync(path, 'utf8')) as object).length
    } catch {
      before = 0
    }
    if (before > 0 && count < before * FLOOR) {
      console.warn(
        `  kept the existing ${path}: this run got ${count} of ${before} series ` +
          `(${Math.round((count / before) * 100)}%), which reads as a throttled pull`,
      )
      return false
    }
  }

  writeFileSync(path, JSON.stringify(next))
  return true
}
