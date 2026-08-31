import type { CalibrationChord, ChordCalibrationProfile } from './chord-calibration.ts'

const calibrationChords: readonly CalibrationChord[] = ['Em', 'G', 'C', 'D']

export type ChordFrame = {
  identified: CalibrationChord
  confidence: number
  scores: Array<{ chord: CalibrationChord; confidence: number }>
}

export type ChordWindowOutcome =
  | { kind: 'recognized'; chord: CalibrationChord; confidence: number }
  | { kind: 'uncertain'; chord: null; confidence: 0 }

export const consumeChordAttack = <T>(active: T | null) => ({ outcome: active, active: null as null })

export const classifyChordOutcome = (outcome: ChordWindowOutcome, target: CalibrationChord) => (
  outcome.kind === 'uncertain' ? 'uncertain' : outcome.chord === target ? 'matched' : 'wrong'
)

const cosineSimilarity = (left: number[], right: number[]) => {
  let dot = 0
  let leftLength = 0
  let rightLength = 0
  for (let index = 0; index < 12; index += 1) {
    dot += (left[index] ?? 0) * (right[index] ?? 0)
    leftLength += (left[index] ?? 0) ** 2
    rightLength += (right[index] ?? 0) ** 2
  }
  const denominator = Math.sqrt(leftLength * rightLength)
  return denominator > 0 ? dot / denominator : 1
}

const calibrationSeparation = (profile: ChordCalibrationProfile, chord: CalibrationChord) => {
  const signature = profile.signatures[chord]
  const closestOther = Math.max(...calibrationChords
    .filter((candidate) => candidate !== chord)
    .map((candidate) => cosineSimilarity(signature, profile.signatures[candidate])))
  return Math.max(0, (1 - closestOther) * 100)
}

export const resolveChordWindow = (
  captured: ChordFrame[],
  totalFrames: number,
  profile: ChordCalibrationProfile | null,
): ChordWindowOutcome => {
  const votes = calibrationChords.map((chord) => ({
    chord,
    count: captured.filter((item) => item.identified === chord).length,
  }))
  let winner = votes[0]
  for (let index = 1; index < votes.length; index += 1) {
    if (votes[index].count > winner.count) winner = votes[index]
  }

  const winnerSamples = captured.filter((item) => item.identified === winner.chord)
  const averageConfidence = winnerSamples.length
    ? Math.round(winnerSamples.reduce((sum, item) => sum + item.confidence, 0) / winnerSamples.length)
    : 0
  const averageScores = calibrationChords.map((chord) => ({
    chord,
    confidence: captured.reduce((sum, item) => sum + (item.scores.find((score) => score.chord === chord)?.confidence ?? 0), 0)
      / Math.max(1, captured.length),
  })).toSorted((left, right) => right.confidence - left.confidence)
  const separation = profile ? calibrationSeparation(profile, winner.chord) : Number.POSITIVE_INFINITY
  const requiredVotes = Math.ceil(totalFrames * 0.6)
  const hasSupermajority = winner.count >= Math.ceil(totalFrames * 0.8)
  const requiredMargin = hasSupermajority
    ? Math.min(1, Math.max(0.2, separation * 0.5))
    : 1
  const stable = captured.length >= requiredVotes
    && winner.count >= requiredVotes
    && (!profile || averageConfidence >= 68)
    && (!profile || (averageScores[0].chord === winner.chord && averageScores[0].confidence - averageScores[1].confidence >= requiredMargin))

  return stable
    ? { kind: 'recognized', chord: winner.chord, confidence: averageConfidence }
    : { kind: 'uncertain', chord: null, confidence: 0 }
}
