<script lang="ts">
  import AppName from "./AppName.svelte";
  import Say from "./Say.svelte";
</script>

<p>
  The JLPT (Japanese-Language Proficiency Test) is the best-known Japanese exam.
  It has five levels, from N5, the most basic, to N1, close to native. N5 asks
  for about 700 words, a hundred or so kanji and simple grammar: enough to read
  short sentences about everyday life.
</p>
<p>
  Since the test publishes no official word list, <AppName /> uses a widely shared
  unofficial one: 678 words such as <Say text="水" reading="みず" /> (mizu, water),
  <Say text="食べる" reading="たべる" /> (taberu, to eat) and
  <Say text="大きい" reading="おおきい" /> (ookii, big).
</p>

<h3>Words with kanji</h3>
<p>
  Most of these words are written with kanji, characters that carry a meaning
  and can be read in more than one way. You don't need to study kanji yet. In
  practice, <AppName /> shows each word as it is written and you type its reading
  in romaji. When you check, it shows the reading in hiragana over each kanji, so
  the shapes start to feel familiar on their own.
</p>
<p>
  If you don't know the hiragana and katakana yet, start with those lessons:
  every reading is in kana.
</p>

<h3>Practicing them</h3>
<ul>
  <li>
    By default you answer with the reading. In Settings, “Answer words by” can
    ask for the meaning instead, or both.
  </li>
  <li>
    The words you miss come up more often, so there's no need to go through the
    list in order.
  </li>
  <li>
    678 words at once can be a lot. In Vocabulary, search for #JLPT-N5 and
    deactivate the ones you want to leave for later.
  </li>
</ul>

<!-- the licenses of the list (CC BY) and of the meanings (CC BY-SA) both ask for credit -->
<p class="mt-6 text-xs text-muted">
  Unofficial JLPT N5 list by Jonathan Waller (tanos.co.uk), CC BY. Meanings:
  JMdict (EDRDG), CC BY-SA 4.0.
</p>
