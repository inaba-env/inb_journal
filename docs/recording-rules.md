# 記録のルール（構造化の基準）

Claude Code が入力（`/learn`、ジャーナル、会話など）を読んで DB に入れるときの基準。
**ルールはここだけに書く。** `/learn` スキルや移行スクリプトはこのファイルを参照する。

## 基本

- Markdown の本文をそのまま入れない。中身を読んで、項目とテーブルに分けて入れる
- **入力にないことは足さない。** 要約・言い換え・誤字の修正はしてよいが、背景説明や推測は加えない
- 1レコード＝1つの事柄。1つの入力に複数の学びや出来事があれば、レコードを分ける
- 中身のない項目（「なし」、空欄、テンプレートのコメントだけ）は入れない
- 記録を入れる前に、その日の `days` の行を作る（`insert ... on conflict do nothing`）
- `source` には元ファイルのパス（`~/.secretary` からの相対パス）や「会話」などの出どころを入れる

## どのテーブルに入れるか

| 入力の中身 | テーブル |
|---|---|
| 知識・気づき・仕事のやり方・振り返りから得た教訓 | `learnings` |
| その日の出来事の振り返り（ハイライト、感謝、できたこと など） | `reflections` |
| 「明日に向けて」などの約束。翌日以降の Check / Act | `commitments` |
| 寝た・起きた時刻 | `sleep_logs`（`day` は起きた日） |
| ラン・筋トレなどの運動 | `workouts` |
| 「〇月は毎日〇〇する」という期間つきの目標 | `habits` |
| その目標を実施したか | `habit_checks`（運動の習慣は不要。下の「habits」参照） |
| オフィスに着いた・出た時刻 | `office_logs` |
| Claude Code での作業（時刻レンジ付き） | `work_sessions`（自動。下の「work_sessions」参照） |
| 学習・自己投資の時間（読書、開発、ジャーナリング など） | `time_logs` |
| 読んだ・聞いたもの（本、Audible、ポッドキャスト、教材） | `media` |
| 体重・歩数など数値で測るもの | `metrics` / `metric_logs` |
| 気分 | `days.mood` |

ジャーナルの「今日の一句」は記録しない。

予定（タイムラインの「〇時から朝ラン」など）は記録しない。**実際にやったと書かれていること**だけを入れる。

## learnings

| 項目 | 基準 |
|---|---|
| `title` | 一言の見出し。30字程度まで |
| `insight` | 学びの中身を1〜3文で。キャプチャの時刻や Markdown 記法は落とす |
| `kind` | `knowledge`（知識・用語）／`insight`（気づき・考え方）／`practice`（仕事のやり方・手順）／`reflection`（自分の行動の振り返りから得た教訓） |
| `context` | どの場面で得たか（朝礼、案件対応中、読書 など）。分からなければ null |
| `next_action` | 次にどう活かすか。**入力に書いてあるときだけ** |
| `project_id` | 特定の案件に関わるときだけ `projects` につなぐ |
| `media_id` | 本・番組から得た学びのとき `media` につなぐ |
| タグ | `tags` / `learning_tags` で2〜4個。既存のタグがあればそれを使い、表記を増やさない |
| 人 | 人名が出てきたら `people` / `learning_people` につなぐ |

## reflections

ジャーナルの各項目を、1行（1つの事柄）ずつ1レコードにする。

| ジャーナルの見出し | `kind` |
|---|---|
| 今日のハイライト | `highlight` |
| 考えたこと | `thought` |
| 感謝 | `gratitude`（相手は `reflection_people` にもつなぐ） |
| 静かな良いこと | `quiet_good` |
| できたこと | `went_well` |
| うまくいかなかったこと | `went_badly` |
| 繰り越したタスクと理由 | `carried_over`（理由は `reason` に） |
| キャッチアップ | `catch_up` |
| 今日の音楽 | `music` |

- 「気づき・学び」は `reflections` ではなく `learnings` に入れる
- 「今日のワークアウト」は `workouts` に入れる
- `sort_order` には、同じ日・同じ `kind` の中での並び順を入れる

## habits

- `workout_types` が入っている習慣（例：毎日なにかしら運動する＝`{run,strength}`）は、`workouts` に記録すれば自動で達成になる。`habit_checks` には書かない
- それ以外の習慣は、実施した日に `habit_checks` を入れる
- 達成状況はビュー `habit_days`（習慣×日付の `done`）で見る

## workouts

- 開始・終了時刻（`started_at` / `ended_at`）が分かれば入れる。タイムラインの「運動」の段に出る。「3時から30分走った」のように長さだけ分かるときは、`ended_at` を開始＋長さで入れる
- 時刻が分からなければ null のままでよい（運動の欄には出るが、タイムラインには出ない）

## 凡事徹底のチェックリスト

- `habits` のうち `in_checklist = true` の項目が、画面の「凡事徹底」のチェックリストに出る（並び順は `sort_order`）。終わりの日を決めない項目は `end_on` を空にする
- チェックは自動で付けない。本人が「3時半までに起きた」「今日は5時間勉強した」のように言ったときに、その日の `habit_checks`（`done = true`）を入れる
- 項目をやめるときは行を消さず、`end_on` にやめた日を入れる（過去の日のチェックリストが変わらないように）

## office_logs

- 1日1行。着いた時刻（`arrived_at`）か出た時刻（`left_at`）の片方だけでも入れ、あとからもう片方を埋める
- 「5時台にオフィス入り」のように分まで分からないときは、`note` に原文を残し、時刻は書かれている範囲の最初（5:00）を入れる

## work_sessions

- `~/.secretary/bin/cc-timeline-sheet.py` が `ログ/YYYY-MM-DD.md`（Claude Code の日次ログ）から自動で入れる。8時・18時に launchd で実行され、同じ日の `source = 'claude_code'` の行は丸ごと置き換える
- 書き込みには専用ユーザー `cc_writer`（`work_sessions` と `days` にだけ書ける）を使う。接続情報は `~/.secretary/.credentials/inb_journal_cc_writer.env`
- カテゴリは `work_categories` を正とする。カテゴリを増やすときはこのテーブルに行を足す（スクリプトは毎回ここから読む）
- 手で足す作業は `source` を `manual` などにして、自動の置き換えに巻き込まれないようにする

## time_logs

- 「4時から5時まで読書」のような時間の記録を1件1行で入れる。もとは凡事徹底スプシの【時間】シート（2026年1〜10月分は取り込み済み、`source` が `凡事徹底スプシ/…`）
- カテゴリは `time_categories` の `is_active = true` のものから選ぶ（開発／読書／Audible／ポッドキャスト／その他インプット／その他アウトプット／ジャーナリング／業務）。当てはまらなければ、勝手に足さずに確認する
- 「書籍・ポッドキャスト」は2026年10月までの過去の記録用。新しい記録には使わない
- 読書・Audible・ポッドキャストのときは `media_id` で何を読んだ・聞いたかをつなぎ、`content` には章やエピソード名を書く
- 書名や技術名など「何をしたか」は `content`、寝落ち などの補足は `note`
- 日をまたぐとき（23:00〜0:30）は `ended_at` を翌日の時刻にする。`day` は始めた日

## media

- 本は `book`、Audible は `audiobook`、ポッドキャストは番組単位で `podcast`、教材・研修は `course`。エピソードは `media` にせず、`time_logs.content` に書く
- `status` は `planned`／`in_progress`／`finished`／`dropped`。読み終えたら `finished_on` も入れる
- `~/.secretary/読書リスト/` に読書メモがある本は `note_path` にメモのパスを入れる
- 本や番組から得た学びは、`learnings.media_id` でつなぐ

## commitments

- 「明日に向けて」の1項目を1レコードにし、`made_on` に書いた日を入れる
- 翌日以降の「昨日の約束の振り返り」で、`result`（`done`／`partial`／`not_done`）と `review_note`（次のアクション）、`reviewed_on` を埋める

## 公開・非公開（is_private）

システムチームは、`is_private = false` の記録を見られる。次のどれかに当たれば `true` にする。

- 人名が出てくる（同僚・家族・顧客の担当者など）
- 顧客名・案件の内部事情（不具合の中身、金額、社内の評価など）が書いてある
- 家族・恋愛・健康・お金など、私生活に踏み込んだ内容
- 迷ったら `true`

例外として、`sleep_logs`（起床・就寝）は凡事徹底の中心の項目なので `false`（公開）にする。

感謝（`reflections` の `kind = 'gratitude'`）は、中身を必ず `true`（非公開）にする。件数だけは画面の「今日の感謝」でチームにも見せる。

`days.is_private` は、その日の `mood` を隠すかどうか。私生活に触れていれば `true`。

## マスターの扱い

- `projects.key` は英小文字とアンダースコア（例：`tsh_hamada`、`ai_ocr`）。同じ案件に別の key を作らない
- `people.name` は記録での呼び方に揃える（例：宮田さん）
- 人の分類は次の3つの列に分けて入れる。記録から読み取れなければ null にし、推測で埋めない

  | 列 | 値 | 意味 |
  |---|---|---|
  | `category` | `family` 家族／`company` 会社の人／`customer` お客さん／`other` その他 | どこの人か |
  | `seniority` | `senior` 先輩／`peer` 同期／`junior` 後輩 | 会社の人のときだけ |
  | `is_teammate` | true / false | 自分と同じチーム（システムチーム）か。会社の人のときだけ |

- システムチームのメンバーは `~/.secretary/会社/チーム/メンバー一覧.md`（朝礼メンバー）を正とする。ここに載っている人は `is_teammate = true`、載っていない会社の人は `false`。`seniority` は入社年度を本人（23卒）と比べて決める
- メンバー一覧に載っていない会社の人は、呼び方で `seniority` を決める。「さん」付けなら `senior`、呼び捨てなら `peer` か `junior`（どちらか分からなければ null）
- 音声入力で名前が化けることがある（例：「岳」→「竹」）。`people` に新しい人を作る前に、既存の人の聞き間違いでないか確かめる
- `people.relation` には分類より細かい関係や役割を入れる（祖母、上司、システムチームのリーダー など）
- `tags.name` は日本語か、技術名なら原表記
