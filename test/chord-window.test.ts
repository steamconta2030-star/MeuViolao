import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyChordOutcome, consumeChordAttack, resolveChordWindow, type ChordFrame } from '../src/lib/chord-window.ts'
import type { CalibrationChord, ChordCalibrationProfile, ChordSignature } from '../src/lib/chord-calibration.ts'

const signature = (...notes: number[]): ChordSignature => Array.from({ length: 12 }, (_, index) => notes.includes(index) ? 1 / notes.length : 0)
const profile: ChordCalibrationProfile = {
  version: 1,
  userId: 'test',
  createdAt: '2026-08-31T00:00:00.000Z',
  samplesPerChord: 5,
  signatures: {
    Em: [0.19, 0, 0, 0, 0.3, 0, 0, 0.3, 0, 0, 0, 0.21],
    G: signature(7, 11, 2),
    C: [0.21, 0, 0, 0, 0.3, 0, 0, 0.3, 0, 0, 0, 0.19],
    D: signature(2, 6, 9),
  },
}

const frame = (identified: CalibrationChord, scores: Record<CalibrationChord, number>, confidence = scores[identified]): ChordFrame => ({
  identified,
  confidence,
  scores: (Object.entries(scores) as Array<[CalibrationChord, number]>).map(([chord, value]) => ({ chord, confidence: value })),
})
const stableFrames = (chord: CalibrationChord, runnerUp: CalibrationChord, confidence = 85, gap = 0.3) => Array.from({ length: 5 }, () => frame(chord, {
  Em: 35,
  G: 30,
  C: 34,
  D: 25,
  [chord]: confidence,
  [runnerUp]: confidence - gap,
}))

test('reconhece Em estável mesmo com margem estreita coerente com a calibração', () => {
  assert.deepEqual(resolveChordWindow(stableFrames('Em', 'C'), 5, profile), { kind: 'recognized', chord: 'Em', confidence: 85 })
})

test('reconhece C estável mesmo com margem estreita coerente com a calibração', () => {
  assert.deepEqual(resolveChordWindow(stableFrames('C', 'Em'), 5, profile), { kind: 'recognized', chord: 'C', confidence: 85 })
})

for (const chord of ['G', 'D'] as const) {
  test(`mantém o reconhecimento estável de ${chord}`, () => {
    assert.deepEqual(resolveChordWindow(stableFrames(chord, chord === 'G' ? 'Em' : 'G', 89, 3), 5, profile), { kind: 'recognized', chord, confidence: 89 })
  })
}

test('acorde diferente não vira acerto do acorde pedido', () => {
  const outcome = resolveChordWindow(stableFrames('G', 'Em', 89, 3), 5, profile)
  assert.equal(classifyChordOutcome(outcome, 'Em'), 'wrong')
  assert.notEqual(classifyChordOutcome(outcome, 'Em'), 'matched')
})

test('maioria estreita em calibração pouco separável mantém a proteção contra falso positivo', () => {
  const frames = [
    ...stableFrames('Em', 'C').slice(0, 3),
    ...stableFrames('C', 'Em').slice(0, 2),
  ]
  assert.deepEqual(resolveChordWindow(frames, 5, profile), { kind: 'uncertain', chord: null, confidence: 0 })
})

test('leitura instável continua incerta', () => {
  const frames = [
    frame('Em', { Em: 85, G: 30, C: 84, D: 20 }),
    frame('C', { Em: 84, G: 30, C: 85, D: 20 }),
    frame('G', { Em: 30, G: 85, C: 30, D: 20 }),
    frame('D', { Em: 20, G: 30, C: 20, D: 85 }),
    frame('Em', { Em: 85, G: 30, C: 84, D: 20 }),
  ]
  assert.deepEqual(resolveChordWindow(frames, 5, profile), { kind: 'uncertain', chord: null, confidence: 0 })
})

test('uma janela de um ataque produz no máximo um resultado', () => {
  const first = consumeChordAttack({ id: 1 })
  const second = consumeChordAttack(first.active)
  assert.deepEqual(first.outcome, { id: 1 })
  assert.equal(second.outcome, null)
})
