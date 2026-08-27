import { board } from '@/lib/board'

// Reading warm cache entries for ~350 items takes a few seconds at worst.
export const maxDuration = 60

export async function GET() {
  return Response.json(await board())
}
