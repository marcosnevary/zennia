# Glossary

Names used in the code for the practice flow and the word list. Keep new code consistent with them.

**Practice session**: one run of answering items in a practice mode, with its score (hits, total, streak, best streak). Lives in [src/data/practice-session.ts](src/data/practice-session.ts). The score is cleared by "Reset session"; changing the kana selection starts a fresh session.

**Practice mode**: what differs between the word practice and the kana practice: the pool, how an item is identified, its draw weight, how an answer is checked and where the outcome is recorded. Built by `wordsMode` and `kanaMode` in [src/data/practice-modes.ts](src/data/practice-modes.ts).

**Pool**: the items a practice mode may draw next (enabled words, or the selected kana). The previous item is excluded from the draw unless it is the only one.

**Focus**: what the user types for a word in the word practice: its reading (romaji), its meaning, or both. The question is always the Japanese word. With both, the answer is correct only when the reading and the meaning are both correct (an "almost" reading with a correct meaning is "almost"). Not to be confused with the practice mode. Changing the focus starts a fresh practice session.

**Meaning**: required on every new word. A meaning may list several accepted answers separated by `;` or `,`, and typing any one of them is correct. Words saved before this rule may lack one; they are kept, flagged as needing a meaning, and left out of the pool when the focus includes the meaning.

**Tag**: a free-text label on a word, used only to organize and filter the word list in Settings. A word can have many tags and the same tag can be on many words. A tag exists only while some word has it; tags never affect the pool. Two tags are the same when they match ignoring case and surrounding spaces. Renaming a tag changes it on every word, and renaming it to an existing tag merges the two.
