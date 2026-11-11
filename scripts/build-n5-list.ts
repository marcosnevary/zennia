// Builds static/lists/n5.json from the unofficial JLPT N5 list by Jonathan Waller (tanos.co.uk, CC BY),
// as converted to CSV by https://github.com/Bluskyo/JLPT_Vocabulary (data/vocab/parsedData/n5_vocab_cleaned.csv),
// with the meanings of static/dictionary.json (JMdict).
// Usage: node scripts/build-n5-list.ts <n5_vocab_cleaned.csv>
import { readFileSync, writeFileSync } from "node:fs";
import type { DictionaryRow } from "#lib/data/dictionary.ts";
import { wordItemKey, type WordListItem } from "#lib/data/learn.ts";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/build-n5-list.ts <n5_vocab_cleaned.csv>");
  process.exit(1);
}

const GROUP_SIZE = 5;

type Fix = [japanese: string, reading: string, meaning?: string];

// Words of the CSV that match no dictionary row as written, by "written,reading". A fix without a meaning
// must match a row; one with a meaning keeps a form JMdict doesn't have among its common words, or writes oddly.
const FIXES: Record<string, Fix> = {
  // misspelled, or an older spelling than JMdict's
  "明い,あかるい": ["明るい", "あかるい"],
  "終る,おわる": ["終わる", "おわる"],
  "曲る,まがる": ["曲がる", "まがる"],
  "円い,まるい": ["丸い", "まるい"],
  "入口,いりぐち": ["入り口", "いりぐち"],
  "さ来年,さらいねん": ["再来年", "さらいねん"],
  "とり肉,とりにく": ["鶏肉", "とりにく"],
  "朝御飯,あさごはん": ["朝ごはん", "あさごはん"],
  "昼御飯,ひるごはん": ["昼ご飯", "ひるごはん"],
  "御飯,ごはん": ["ご飯", "ごはん"],
  "河,かわ": ["川", "かわ"],
  "初め,はじめ": ["始め", "はじめ"],
  "見る 観る,みる": ["見る", "みる"],
  "誰,だれか": ["誰か", "だれか"],
  "十,じゅう とお": ["十", "じゅう"],
  "ゆっくりと,ゆっくりと": ["ゆっくり", "ゆっくり"],
  "ラジオカセット,ラジオカセット": ["ラジカセ", "ラジカセ"],
  // written in kana here and in kanji by JMdict, or the other way round: JMdict's form, as Add from romaji gives it
  "あさって,あさって": ["明後日", "あさって"],
  "あびる,あびる": ["浴びる", "あびる"],
  "いす,いす": ["椅子", "いす"],
  "いちばん,いちばん": ["一番", "いちばん"],
  "おなか,おなか": ["お腹", "おなか"],
  "おもしろい,おもしろい": ["面白い", "おもしろい"],
  "かぎ,かぎ": ["鍵", "かぎ"],
  "きれい,きれい": ["綺麗", "きれい"],
  "しょうゆ,しょうゆ": ["醤油", "しょうゆ"],
  "せっけん,せっけん": ["石鹸", "せっけん"],
  "たいへん,たいへん": ["大変", "たいへん"],
  "たぶん,たぶん": ["多分", "たぶん"],
  "ちゃわん,ちゃわん": ["茶碗", "ちゃわん"],
  "ふろ,ふろ": ["風呂", "ふろ"],
  "ほか,ほか": ["他", "ほか"],
  "ほんとう,ほんとう": ["本当", "ほんとう"],
  "りっぱ,りっぱ": ["立派", "りっぱ"],
  "たて,たて": ["縦", "たて"],
  "はく,はく": ["履く", "はく"],
  // 橋 is in the list already
  "はし,はし": ["箸", "はし"],
  "煩い,うるさい": ["うるさい", "うるさい"],
  "無くす,なくす": ["なくす", "なくす"],
  "温い,ぬるい": ["ぬるい", "ぬるい"],
  "葉書,はがき": ["はがき", "はがき"],
  "眼鏡,めがね": ["めがね", "めがね"],
  "分かる,わかる": ["わかる", "わかる"],
  // する verbs: the noun, which is what JMdict lists and what is typed
  "コピーする,コピーする": ["コピー", "コピー"],
  "散歩,さんぽする": ["散歩", "さんぽ"],
  "掃除,そうじする": ["掃除", "そうじ"],
  "勉強,べんきょうする": ["勉強", "べんきょう"],
  "練習,れんしゅうする": ["練習", "れんしゅう"],
  // rows whose written form and reading belong to different words
  "いい,よい": ["良い", "よい"],
  "よい,いい": ["いい", "いい"],
  "よい,よい": ["良い", "よい"],
  "そうして,そして": ["そして", "そして"],
  "そして,そうして": ["そうして", "そうして"],
  "じゃ,じゃあ": ["じゃあ", "じゃあ"],
  "じゃあ,じゃ": ["じゃ", "じゃ"],
  "キロ,キログラム": ["キログラム", "キログラム"],
  "キログラム,キロ": ["キロ", "キロ"],
  "キロ,キロメートル": ["キロメートル", "キロメートル"],
  "キロメートル,キロ": ["キロ", "キロ"],
  "より,ほう": ["方", "ほう"],
  "ほう,より": ["より", "より"],
  "ほう,ほう": ["方", "ほう"],
  "伯父,おじいさん": ["おじいさん", "おじいさん"],
  "叔父,おじいさん": ["おじいさん", "おじいさん"],
  "伯父,おじさん": ["おじさん", "おじさん", "uncle; middle-aged man"],
  "叔父,おじさん": ["おじさん", "おじさん", "uncle; middle-aged man"],
  "伯母さん,おばさん": ["おばさん", "おばさん", "aunt; middle-aged woman"],
  "叔母さん,おばさん": ["おばさん", "おばさん", "aunt; middle-aged woman"],
  // JMdict writes these with full-width digits, archaic kanji or ateji, which a beginner wouldn't meet
  "一日,ついたち": ["一日", "ついたち", "first day of the month"],
  "二日,ふつか": ["二日", "ふつか", "2nd day of the month"],
  "三日,みっか": ["三日", "みっか", "3rd day of the month"],
  "四日,よっか": ["四日", "よっか", "4th day of the month"],
  "五日,いつか": ["五日", "いつか", "5th day of the month"],
  "六日,むいか": ["六日", "むいか", "6th day of the month"],
  "七日,なのか": ["七日", "なのか", "7th day of the month"],
  "八日,ようか": ["八日", "ようか", "8th day of the month"],
  "九日,ここのか": ["九日", "ここのか", "9th day of the month"],
  "十日,とおか": ["十日", "とおか", "10th day of the month"],
  "二十日,はつか": ["二十日", "はつか", "20th day of the month"],
  "ゼロ,ゼロ": ["ゼロ", "ゼロ", "zero; 0; nought"],
  "それから,それから": ["それから", "それから", "and then; after that"],
  "それでは,それでは": [
    "それでは",
    "それでは",
    "well, ...; right, ...; now, ...",
  ],
  "カレー,カレー": ["カレー", "カレー", "curry (esp. Japanese curry)"],
  // not among JMdict's common words in this form, or its row is a different word with the same reading
  "お酒,おさけ": ["お酒", "おさけ", "alcohol; sake"],
  "お皿,おさら": ["お皿", "おさら", "plate; dish; platter"],
  "居る,いる": ["いる", "いる", "to be (of animate objects); to exist"],
  "要る,いる": ["要る", "いる", "to be needed; to be necessary"],
  "速い,はやい": ["速い", "はやい", "fast; quick; rapid"],
  "貼る,はる": ["貼る", "はる", "to stick; to paste; to affix"],
  "登る,のぼる": ["登る", "のぼる", "to climb; to go up"],
  "易しい,やさしい": ["易しい", "やさしい", "easy; plain; simple"],
  "私,わたくし": ["私", "わたくし", "I; me (formal)"],
  "テープレコーダー,テープレコーダー": [
    "テープレコーダー",
    "テープレコーダー",
    "tape recorder",
  ],
};

const meanings = new Map<string, string>();
const dictionary: DictionaryRow[] = JSON.parse(
  readFileSync(new URL("../static/dictionary.json", import.meta.url), "utf8"),
);
for (const [reading, japanese, meaning] of dictionary) {
  const key = wordItemKey(japanese, reading);
  if (!meanings.has(key)) meanings.set(key, meaning);
}

const items: WordListItem[] = [];
const unmatched: string[] = [];
const duplicates: string[] = [];
const lines = readFileSync(file, "utf8").trim().split(/\r?\n/).slice(1);
for (const line of lines) {
  const fix = Object.hasOwn(FIXES, line) ? FIXES[line] : undefined;
  const [japanese, hiragana, given] = fix ?? line.split(",");
  const key = wordItemKey(japanese, hiragana);
  const meaning = given ?? meanings.get(key);
  if (!meaning) unmatched.push(line);
  else if (items.some((item) => item.key === key)) duplicates.push(line);
  else
    items.push({
      key,
      group: Math.floor(items.length / GROUP_SIZE),
      japanese,
      hiragana,
      meaning,
    });
}

if (unmatched.length) {
  console.error(`No dictionary row for:\n${unmatched.join("\n")}`);
  process.exit(1);
}

writeFileSync(
  new URL("../static/lists/n5.json", import.meta.url),
  JSON.stringify({ id: "n5", items }),
);
console.log(
  `${items.length} words; dropped as duplicates: ${duplicates.join(" · ")}`,
);
