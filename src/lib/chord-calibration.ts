export const calibrationChords = ['Em', 'G', 'C', 'D'] as const
export type CalibrationChord = (typeof calibrationChords)[number]
export type ChordSignature = number[]

export type ChordCalibrationProfile = {
  version: 1
  userId: string
  createdAt: string
  samplesPerChord: number
  signatures: Record<CalibrationChord, ChordSignature>
}

const storageKey = (userId: string) => `meu-violao:chord-calibration:v1:${userId}`

export const expectedPitchClasses: Record<CalibrationChord, number[]> = {
  Em: [4, 7, 11],
  G: [7, 11, 2],
  C: [0, 4, 7],
  D: [2, 6, 9],
}

export const extractChordSignature = (spectrum: Uint8Array, sampleRate: number, fftSize: number) => {
  const chroma = Array.from({ length: 12 }, () => 0)
  const binHz = sampleRate / fftSize

  for (let index = Math.ceil(65 / binHz); index <= Math.floor(700 / binHz); index += 1) {
    const magnitude = spectrum[index] / 255
    if (magnitude < 0.04) continue
    const frequency = index * binHz
    const midi = Math.round(69 + 12 * Math.log2(frequency / 440))
    const pitchClass = ((midi % 12) + 12) % 12
    const lowFrequencyWeight = 1 / Math.sqrt(frequency / 82)
    chroma[pitchClass] += Math.pow(magnitude, 1.35) * lowFrequencyWeight
  }

  const total = chroma.reduce((sum, value) => sum + value, 0)
  if (total === 0) return null
  return { signature: chroma.map((value) => value / total), energy: total }
}

export const averageSignatures = (samples: ChordSignature[]) => {
  const average = Array.from({ length: 12 }, () => 0)
  for (const sample of samples) {
    for (let index = 0; index < 12; index += 1) average[index] += sample[index] ?? 0
  }
  const total = average.reduce((sum, value) => sum + value, 0)
  return average.map((value) => value / total)
}

const cosineSimilarity = (left: ChordSignature, right: ChordSignature) => {
  let dot = 0
  let leftLength = 0
  let rightLength = 0
  for (let index = 0; index < 12; index += 1) {
    dot += left[index] * right[index]
    leftLength += left[index] * left[index]
    rightLength += right[index] * right[index]
  }
  return dot / Math.sqrt(leftLength * rightLength)
}

export const compareWithCalibration = (
  spectrum: Uint8Array,
  sampleRate: number,
  fftSize: number,
  profile: ChordCalibrationProfile,
) => {
  const extracted = extractChordSignature(spectrum, sampleRate, fftSize)
  if (!extracted) return null

  const scores = calibrationChords.map((chord) => ({
    chord,
    score: cosineSimilarity(extracted.signature, profile.signatures[chord]),
    confidence: Math.max(0, Math.min(100, Math.round(cosineSimilarity(extracted.signature, profile.signatures[chord]) * 100))),
  }))
  let identified = scores[0]
  for (let index = 1; index < scores.length; index += 1) {
    if (scores[index].score > identified.score) identified = scores[index]
  }
  return { scores, identified: identified.chord, confidence: identified.confidence }
}

export const analyzeWithCalibration = (
  spectrum: Uint8Array,
  sampleRate: number,
  fftSize: number,
  requestedChord: CalibrationChord,
  profile: ChordCalibrationProfile,
) => {
  const comparison = compareWithCalibration(spectrum, sampleRate, fftSize, profile)
  if (!comparison) return { matched: false, confidence: 0 }
  const { scores } = comparison
  const requestedScore = scores.find((item) => item.chord === requestedChord)?.score ?? 0
  const bestOtherScore = Math.max(...scores.filter((item) => item.chord !== requestedChord).map((item) => item.score))
  return {
    matched: requestedScore >= 0.82 && requestedScore >= bestOtherScore + 0.025,
    confidence: Math.max(0, Math.min(100, Math.round(requestedScore * 100))),
  }
}

export const saveChordCalibration = (profile: ChordCalibrationProfile) => {
  localStorage.setItem(storageKey(profile.userId), JSON.stringify(profile))
}

export const loadChordCalibration = (userId: string): ChordCalibrationProfile | null => {
  try {
    const stored = localStorage.getItem(storageKey(userId))
    if (!stored) return null
    const profile = JSON.parse(stored) as ChordCalibrationProfile
    if (profile.version !== 1 || profile.userId !== userId) return null
    if (!calibrationChords.every((chord) => profile.signatures[chord]?.length === 12)) return null
    return profile
  } catch {
    return null
  }
}

export const removeChordCalibration = (userId: string) => localStorage.removeItem(storageKey(userId))
