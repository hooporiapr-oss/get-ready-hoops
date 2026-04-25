# Get Ready Hoops — Episode Production Format

**Status:** Locked as of Episode 001.
**Purpose:** Ship every episode the same way. The format never changes. Only the content changes.

---

## What gets delivered per episode

Two things:

1. A new HTML file at `/episode-XXX.html` (copy of episode-001.html, six fields edited)
2. One new entry added to the `EPISODES` registry in `/api/episode.js`

That's it. No new components, no new layouts, no new CSS files.

---

## The six fields that change per episode

When building Episode 002, 003, ... 030, only these change:

### 1. Episode metadata
- `EPISODE_ID` constant in the page script (e.g. `'002'`)
- `<title>` and OG meta tags
- `.episode-num` text (e.g. `Episode 002 · Level 1: Awareness`)
- `.episode-title` text (e.g. `Social Media`)
- `.episode-sub` text (the one-line description)
- The footer CTA heading (`That's Episode 002.`)

### 2. The accent color
A single CSS variable block at the top of `:root`:

```css
--accent:#XXXXXX;
--accent-soft:rgba(X,X,X,.13);
--accent-border:rgba(X,X,X,.25);
--accent-glow:rgba(X,X,X,.4);
```

See "Color system by level" below.

### 3. The Step 1 section heading
The two-line poster-style header above the script (e.g. `Skill Gets You Noticed. Value Gets You Chosen.`). Should distill the episode's core thesis in eight words or fewer.

### 4. The scripted Host Bot ↔ Bori opener
6–8 alternating bubbles in `SCRIPT.en` and `SCRIPT.es`. Always starts with Host Bot, always ends with Bori delivering the closing question or pointing toward it. The last Bori line should set up the question, not redundantly state it.

### 5. The closing question
- `.question-text` in the page (with one word wrapped in `<span>` for the gold accent)
- Bori's opening line in the chat (`.msg.bori .msg-text`)

### 6. The episode context in `/api/episode.js`
Add a new entry to `EPISODES`:

```js
'002': {
  title: 'Social Media',
  context: `CONTEXT: This is Episode 002: Social Media. The player just listened to...

"What would your page say about you?"

Their next message is their answer...

EPISODE-SPECIFIC GUIDANCE:
- If they say [common answer pattern] — push them to [specific direction]
- If they say [other pattern] — redirect to [other direction]
- If they ask about [off-topic thing] — bring it back to [topic]`
}
```

Everything else — `BORI_PERSONA`, the model, the streaming logic, the SSE parsing, the conversation history limits — is shared and never changes per episode.

---

## Color system by level

The five colors at the bottom of the homepage hero are the brand palette. We use three of them as level-defining accents. Green and red stay reserved as utility colors (Live indicators, errors, success states).

### Level 1: Awareness (Episodes 001–010) — Gold spectrum
The waking-up phase. Warm, attention-grabbing, primary brand color.

| Episode | Topic | Accent hex | Notes |
|---|---|---|---|
| 001 | Basketball Money | `#e8b94a` | Pure gold — brand anchor |
| 002 | Social Media | `#f4a83a` | Warm amber — slightly oranger |
| 003 | Influence | `#d9a440` | Deeper gold |
| 004 | Peak Early | `#ffb84d` | Bright honey |
| 005 | What Coaches Notice | `#e0a838` | Antique gold |
| 006 | After Opportunity | `#f0c052` | Champagne |
| 007 | Comparison | `#d49b3a` | Burnt gold |
| 008 | Identity | `#ffc857` | Light amber |
| 009 | Discipline | `#c89030` | Dark mustard |
| 010 | Busy vs Productive | `#e8b94a` | Returns to anchor — closes the level |

All gold-family. Player feels Level 1 as one continuous chapter with subtle shifts.

### Level 2: Separation (Episodes 011–020) — Blue spectrum
The standing-apart phase. Cool, observational, focused. Different shades of blue from steel to electric.

(Specific hexes assigned when we build Episode 011.)

### Level 3: Mastery (Episodes 021–030) — Purple spectrum
The earned-complexity phase. Royal, mature, internal.

(Specific hexes assigned when we build Episode 021.)

### Reserved utility colors

These don't change per episode and don't appear as episode accents:
- **Green** `#7cff6b` — Live indicators, success, "Interactive" pill
- **Red** `#ff4f6d` — Errors, the Live pulsing dot
- **Blue** `#48c6ff` — The Host Bot's color in chat bubbles (keeps Host Bot consistent across all episodes)
- **White** `#f4f1e8` — Body text, player's name in chat

---

## What never changes — the locked elements

These are production. Don't touch them per episode without a deliberate reason:

**Visual system**
- Barlow Condensed for all headings, Barlow for body
- The dark `#07070b` background with `#101018` panels
- The grid-overlay pattern on the hero background
- The pulsing red Live dot in the eyebrow pill
- All section spacing, max-widths, and breakpoints

**Structure**
- Top nav with logo + EN/ES toggle
- Episode hero with eyebrow → episode number → title → subtitle → "Back To Series" link
- Three-step strip (1. Listen / 2. Reflect / 3. Talk) that highlights as you scroll
- Step 1: scripted bubbles in a panel labeled "Live Chatcast / Interactive"
- Step 2: the question block with gold gradient and centered uppercase text
- Step 3: chat shell with streaming Bori cursor
- Footer CTA pointing back to `/#episodes`
- Educational-content disclaimer

**Behavior**
- EN/ES toggle persists via localStorage
- Step strip updates on scroll
- Streaming chat with blinking accent-color cursor while Bori types
- 429 rate-limit handling with translated error
- Conversation resets on refresh (free preview)

**Backend**
- Single `/api/episode` Edge function
- Shared `BORI_PERSONA` with episode-specific `context` appended
- `claude-sonnet-4-5` model, `max_tokens: 400`, last 20 messages capped at 2000 chars each

---

## Workflow for shipping a new episode

1. **Decide the angle.** What's the one realization this episode plants? Distill it to one sentence. That sentence becomes the Step 1 heading.

2. **Write the closing question.** Sharp, second-person, eight words or fewer. This is the heaviest line in the episode.

3. **Write the 6–8 bubble script.** Host Bot opens with the cultural confusion ("everybody talks about X, but nobody explains Y"). Bori reframes. Two more rounds. Bori lands the closing question. Same beat structure as Episode 001.

4. **Write the API context.** Topic-specific guidance for Bori — what common player answers to expect and how to push back on each. 4–6 bullets is plenty.

5. **Translate everything to Spanish.** Same length, natural register. The Spanish version isn't a translation of the English — it's the same idea spoken by a Puerto Rican mentor.

6. **Pick the accent hex.** From the level's color spectrum.

7. **Copy `episode-001.html` to `episode-XXX.html`.** Edit the six fields. Nothing else.

8. **Add the registry entry to `/api/episode.js`.** Push.

Target: 20 minutes from "we have the angle" to "it's deployed."

---

## Quality bar (what makes an episode work)

- The closing question is so direct the player can't dodge it
- Bori never lectures, never scores, never says "great answer"
- The script's last Bori line sets up the question, not states it
- The Spanish version reads like Puerto Rico, not Google Translate
- The accent color shifts the *feeling* without breaking the brand
- A player who watched Episode 001 immediately recognizes Episode 002 as the same product

---

## Versioning

Format version: **1.0** (locked at Episode 001).
Any change to the locked elements requires bumping to 1.1 and updating all shipped episodes to match.
