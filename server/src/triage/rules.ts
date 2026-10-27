import type { OldcartsAnswers, PatientContext, Urgency } from './types.js'
import { moreUrgent } from './types.js'

// Deterministic safety screen. It runs before (and independently of) the model, and its
// urgency is a floor: the model may escalate it but can never lower it. Patterns are
// whole-word, and a match is ignored when a negation ("no", "not", "denies", …) appears
// within the three words before it.

interface RedFlag {
  label: string
  urgency: Urgency
  patterns: RegExp[]
  /** Extra condition on the whole history, e.g. chest pain plus breathlessness. */
  requires?: RegExp[]
}

const w = (phrase: string) => new RegExp(`\\b${phrase}\\b`, 'i')

const RED_FLAGS: RedFlag[] = [
  {
    label: 'Chest pain with breathlessness, sweating or spread to the arm, jaw or back',
    urgency: 'emergency',
    patterns: [w('chest (?:pain|pressure|tightness|heaviness)'), w('crushing')],
    requires: [w('(?:breath(?:less|lessness)?|short of breath|sweat(?:ing|y)?|clammy|arm|jaw|neck|back|nausea|vomit(?:ing)?)')],
  },
  {
    label: 'Severe difficulty breathing',
    urgency: 'emergency',
    patterns: [
      w("(?:can't|cannot|can not|unable to|struggling to|hard to) breathe"),
      w('gasping'),
      w('blue (?:lips|face|fingers)'),
      w('choking'),
    ],
  },
  {
    label: 'Possible stroke signs',
    urgency: 'emergency',
    patterns: [
      w('fac(?:e|ial)(?: is| was| has been| keeps| started| looks)? (?:droop(?:s|ing|y|ed)?|numb(?:ness)?|lopsided|twisted)'),
      w('droop(?:ing|y|ed)? (?:face|mouth|smile)'),
      w('slurred speech'),
      w("(?:can't|cannot|unable to) (?:speak|talk|move (?:my )?(?:arm|leg))"),
      w('(?:weakness|numbness) (?:on|in) one side'),
      w('one side (?:of my body )?(?:is )?(?:weak|numb)'),
      w('sudden (?:confusion|vision loss|loss of vision|blindness)'),
    ],
  },
  {
    label: 'Sudden severe ("worst ever") headache',
    urgency: 'emergency',
    patterns: [w('worst headache'), w('thunderclap')],
  },
  {
    label: 'Loss of consciousness or seizure',
    urgency: 'emergency',
    patterns: [w('(?:fainted|passed out|unconscious|blacked out|collapsed)'), w('(?:seizure|seizures|fitting|convulsion|convulsions)')],
  },
  {
    label: 'Heavy bleeding or blood in vomit, cough or stool',
    urgency: 'emergency',
    patterns: [
      w("(?:bleeding (?:heavily|a lot)|heavy bleeding|won't stop bleeding|bleeding (?:that )?won't stop)"),
      w('(?:vomiting|coughing up|throwing up) blood'),
      w('blood in (?:my )?(?:vomit|sick)'),
      w('(?:black|tarry) (?:stool|stools|poo)'),
    ],
  },
  {
    label: 'Thoughts of suicide or self-harm',
    urgency: 'emergency',
    patterns: [w('suicid(?:e|al)'), w('kill myself'), w('end my life'), w('self[- ]harm'), w('hurt(?:ing)? myself')],
  },
  {
    label: 'Possible severe allergic reaction',
    urgency: 'emergency',
    patterns: [w('(?:throat|tongue|lips?|face) (?:is )?(?:swelling|swollen|closing)'), w('anaphyla(?:xis|ctic)')],
  },
  {
    label: 'Fever with stiff neck or a rash that does not fade',
    urgency: 'emergency',
    patterns: [w('stiff neck'), w("rash (?:that )?(?:doesn't|does not|won't) fade")],
    requires: [w('(?:fever|feverish|temperature|hot)')],
  },
  {
    label: 'Bleeding or severe abdominal pain in pregnancy',
    urgency: 'emergency',
    patterns: [w('pregnan(?:t|cy)')],
    requires: [w('(?:bleeding|severe (?:abdominal|stomach|belly) pain)')],
  },
]

const NEGATION = /\b(?:no|not|never|without|denies|denied|don't|didn't|isn't|wasn't)\b/i

function mentioned(text: string, pattern: RegExp): boolean {
  const global = new RegExp(pattern.source, 'gi')
  for (const match of text.matchAll(global)) {
    const before = text.slice(0, match.index).split(/\s+/).slice(-4).join(' ')
    if (!NEGATION.test(before)) return true
  }
  return false
}

export interface RuleScreen {
  urgency: Urgency
  redFlags: string[]
}

export function screen(answers: OldcartsAnswers, patient: PatientContext): RuleScreen {
  const text = [
    answers.chiefComplaint,
    answers.onset,
    answers.location,
    answers.duration,
    answers.character,
    answers.aggravating,
    answers.relieving,
    answers.radiation,
    answers.timing,
    answers.associated,
  ]
    .join(' . ')
    .toLowerCase()

  let urgency: Urgency = 'self_care'
  const redFlags: string[] = []
  for (const flag of RED_FLAGS) {
    const hit = flag.patterns.some((pattern) => mentioned(text, pattern))
    const context = !flag.requires || flag.requires.some((pattern) => mentioned(text, pattern))
    if (hit && context) {
      redFlags.push(flag.label)
      urgency = moreUrgent(urgency, flag.urgency)
    }
  }

  if (answers.severity >= 9) urgency = moreUrgent(urgency, 'urgent')
  else if (answers.severity >= 7) urgency = moreUrgent(urgency, 'soon')
  else if (answers.severity >= 4) urgency = moreUrgent(urgency, 'routine')

  const vitals = patient.latestVitals
  if (vitals && vitals.severity === 'critical' && vitals.hoursAgo <= 24) {
    redFlags.push('Critical vital signs recorded in the last 24 hours')
    urgency = moreUrgent(urgency, 'urgent')
  }
  if (patient.age < 1 && mentioned(text, w('(?:fever|feverish|temperature|hot)'))) {
    redFlags.push('Fever in an infant under one year')
    urgency = moreUrgent(urgency, 'urgent')
  }

  return { urgency, redFlags }
}

/** Used when the model is unavailable: the screen's result, explained plainly. */
export function rulesOnlyAdvice(urgency: Urgency, emergencyNumber: string): string {
  switch (urgency) {
    case 'emergency':
      return `Your answers include warning signs that need emergency care. Call ${emergencyNumber} or go to the nearest emergency department now. Do not drive yourself.`
    case 'urgent':
      return `Please get seen today. Contact the clinic now, and call ${emergencyNumber} if you get worse.`
    case 'soon':
      return `Please book an appointment within the next one to three days. Call ${emergencyNumber} if you develop severe or new symptoms.`
    default:
      return `Book a routine appointment so the care team can review this. Call ${emergencyNumber} if your symptoms suddenly get worse.`
  }
}
