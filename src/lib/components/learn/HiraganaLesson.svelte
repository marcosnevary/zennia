<script lang="ts">
  import KanaChart from "./KanaChart.svelte";
  import AppName from "./AppName.svelte";
  import Say from "./Say.svelte";
</script>

<p>
  Japanese is written with three scripts: hiragana, katakana and kanji. Hiragana
  is where everyone starts. Each character stands for a sound, almost always a
  syllable, so once you know them you can read any word written in hiragana, and
  the reading of any kanji too.
</p>

<h3>Five vowels, then rows</h3>
<p>
  Everything is built on five vowels: <Say text="あ" /> (a), <Say text="い" /> (i),
  <Say text="う" /> (u), <Say text="え" /> (e) and <Say text="お" /> (o). Each consonant
  then adds a row with the same five vowels: <Say text="か" /> (ka),
  <Say text="き" /> (ki), <Say text="く" /> (ku), <Say text="け" /> (ke) and
  <Say text="こ" /> (ko). Read the chart row by row, and say each sound out loud.
</p>
<KanaChart
  script="hiragana"
  section="main"
  rows={["", "k", "s", "t", "n", "h", "m", "y", "r", "w"]}
/>
<p>A few sounds break the pattern, so watch for them:</p>
<ul>
  <li>
    <Say text="し" /> (shi), <Say text="ち" /> (chi) and <Say text="つ" /> (tsu).
  </li>
  <li><Say text="ふ" /> (fu), softer than an English f.</li>
  <li>
    The y row has only <Say text="や" /> (ya), <Say text="ゆ" /> (yu) and
    <Say text="よ" /> (yo); the w row only <Say text="わ" /> (wa) and
    <Say text="を" /> (wo, said o).
  </li>
  <li>
    <Say text="ん" /> (n) stands on its own, the only consonant without a vowel.
  </li>
</ul>

<h3>Two small marks</h3>
<p>
  Two small marks on the top right change a consonant. The dakuten (<span
    lang="ja">゛</span
  >) turns k into g, s into z, t into d and h into b: <Say text="か" /> (ka) becomes
  <Say text="が" /> (ga). The handakuten (<span lang="ja">゜</span>) turns h
  into p: <Say text="は" /> (ha) becomes <Say text="ぱ" /> (pa).
</p>
<KanaChart script="hiragana" section="main" rows={["g", "z", "d", "b", "p"]} />

<h3>Combinations</h3>
<p>
  A character of the i column followed by a small <Say text="ゃ" /> (ya),
  <Say text="ゅ" /> (yu) or <Say text="ょ" /> (yo) makes one sound:
  <Say text="き" /> (ki) and <Say text="ゃ" /> (ya) become <Say text="きゃ" /> (kya).
</p>
<KanaChart script="hiragana" section="combo" rows={["ky", "sh", "ch", "ny"]} />

<h3>Small tsu and long vowels</h3>
<p>
  A small <Say text="っ" /> is a short pause that doubles the next consonant:
  <Say text="きって" /> (kitte, stamp).
</p>
<p>
  A vowel can also be held twice as long, and that changes the word:
  <Say text="おばさん" /> (obasan) is aunt, <Say text="おばあさん" /> (obaasan) is
  grandmother. A long o is usually written with <Say text="う" /> (u), as in
  <Say text="がっこう" /> (gakkou, school), and a long e with <Say text="い" /> (i),
  as in <Say text="せんせい" /> (sensei, teacher).
</p>

<h3>How <AppName /> checks you</h3>
<p>
  In practice you type what you read in romaji. <AppName /> compares sounds, not spellings,
  so shi and si, or tsu and tu, are both right. Length matters, though: type long
  vowels as the kana spell them, gakkou rather than gakko.
</p>
