<script lang="ts">
  import KanaChart from "./KanaChart.svelte";
  import Say from "./Say.svelte";
</script>

<p>
  Katakana has the same sounds as hiragana, in sharper, more angular shapes. It
  is used for words that come from other languages, like <Say text="コーヒー" />
  (koohii, coffee) or <Say text="テレビ" /> (terebi, TV), for foreign names, and sometimes
  for emphasis, the way italics are used in English.
</p>

<h3>The same chart</h3>
<p>
  Every hiragana has a katakana twin with the same sound, so you already know
  how this chart is read. Some pairs look alike, like <Say text="か" /> and
  <Say text="カ" /> (ka), or <Say text="へ" /> and <Say text="ヘ" /> (he); most you'll
  learn from scratch.
</p>
<KanaChart
  script="katakana"
  section="main"
  rows={["", "k", "s", "t", "n", "h", "m", "y", "r", "w"]}
/>
<p>
  Watch for the pairs that are easy to mix up: <Say text="シ" /> (shi) and
  <Say text="ツ" /> (tsu), <Say text="ソ" /> (so) and <Say text="ン" /> (n). The strokes
  of shi and n rise from the bottom; those of tsu and so fall from the top.
</p>

<h3>Marks and combinations</h3>
<p>
  The dakuten and handakuten work just like in hiragana: <Say text="カ" /> (ka) becomes
  <Say text="ガ" /> (ga), <Say text="ハ" /> (ha) becomes <Say text="パ" /> (pa).
</p>
<KanaChart script="katakana" section="main" rows={["g", "z", "d", "b", "p"]} />
<p>
  So do the combinations: a character of the i column followed by a small
  <Say text="ャ" /> (ya), <Say text="ュ" /> (yu) or <Say text="ョ" /> (yo) makes one
  sound, as in <Say text="キャ" /> (kya).
</p>
<KanaChart script="katakana" section="combo" rows={["ky", "sh", "ch", "ny"]} />

<h3>The long vowel mark</h3>
<p>
  Katakana writes a long vowel with a dash, <span lang="ja">ー</span>, instead
  of an extra vowel: <Say text="コーヒー" /> (koohii) and <Say text="ケーキ" /> (keeki,
  cake). In practice, type the vowel twice.
</p>

<h3>Sounds Japanese didn't have</h3>
<p>
  To write foreign sounds, katakana pairs a character with a small vowel:
  <Say text="ファ" /> (fa), <Say text="ティ" /> (ti), <Say text="ウィ" /> (wi). You'll
  meet them in words like <Say text="パーティー" /> (paatii, party). They aren't in
  the practice chart, but you'll read them easily once you know the rest.
</p>
