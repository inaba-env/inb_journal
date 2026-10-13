# 記録のルール（構造化の基準）

Claude Code が入力（会話など）を読んで DB に入れるときの基準。
**ルールはここだけに書く。** スキルや移行スクリプトはこのファイルを参照する。

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
| 学び・振り返り・感謝・音楽など、その日に書き留めたこと | `notes`（下の「notes」参照） |
| 「明日に向けて」などの約束。翌日以降の Check / Act | `commitments` |
| 寝た・起きた時刻 | `sleep_logs`（`day` は起きた日） |
| ラン・筋トレなどの運動 | `activities`（ランの距離は `runs`、筋トレの種目は `workouts`。下の「activities」参照） |
| 「〇月は毎日〇〇する」という期間つきの目標 | `habits` |
| その目標を実施したか | `habit_checks`（運動の習慣は不要。下の「habits」参照） |
| オフィスに着いた・出た時刻 | `office_logs` |
| Claude Code での作業（時刻レンジ付き） | `work_sessions`（自動。下の「work_sessions」参照） |
| GitHub での作業（コミット・PR・Issue） | `github_activities`（自動。下の「github_activities」参照） |
| Aqua Voice（音声入力）の利用状況・短縮した時間 | `aqua_voice_stats`（自動。下の「aqua_voice_stats」参照） |
| 学習・自己投資の時間（読書、開発、ジャーナリング など） | `time_logs` |
| 読んだ・聞いたもの（本、Audible、ポッドキャスト、教材） | `media` |
| 参照したリンク・残しておきたいリンク | `links`（下の「links」参照） |
| Apple Music のリンク（曲・アルバム・プレイリストなど） | `apple_music_links`（下の「apple_music_links」参照） |
| 体重・歩数など数値で測るもの | `metrics` / `metric_logs` |
| 気分 | `days.mood` |

ジャーナルの「今日の一句」は記録しない。

予定（タイムラインの「〇時から朝ラン」など）は記録しない。**実際にやったと書かれていること**だけを入れる。

## notes

その日に書き留めたことは、すべて `notes` に1件1行で入れる。どの大分類・小分類に入れるかは表（`note_categories` / `note_kinds`）を正とし、**小分類の `description` を読んで判断する**。

| 大分類（`note_categories`） | 小分類（`note_kinds`） |
|---|---|
| 学び `learning` | 知識 `knowledge`／気づき `insight`／やり方 `practice` |
| 振り返り `reflection` | よかったこと `good`／うまくいかなかったこと `bad`／教訓 `lesson`／考えたこと `thought` |
| 今日の感謝 `gratitude` | 感謝 `gratitude` |
| 今日の音楽 `music` | 音楽 `music` |

- 学びと振り返りを区別する。知識・考え方・やり方は学び、自分の行動や出来事を振り返ったもの（自分の行動から得た教訓を含む）は振り返り
- 小分類を増やす・名前を変えるときは、`note_kinds` の行を直す（マイグレーション不要）。画面にもそのまま反映される

| 項目 | 基準 |
|---|---|
| `title` | 一言の見出し（30字程度まで）。学びには必ず付ける。振り返り・感謝・音楽は空でよい |
| `body` | 中身を1〜3文で。時刻や Markdown 記法は落とす |
| `context` | どの場面のことか（朝礼、案件対応中、読書 など）。分からなければ null |
| `reason` | 理由（うまくいかなかったことの理由など） |
| `next_action` | 次にどう活かすか。**入力に書いてあるときだけ** |
| `media_id` | 本・番組に関わるとき `media` につなぐ |
| `project_id` | 特定の案件に関わるときだけ `projects` につなぐ |
| タグ | `tags` / `note_tags`。学びには2〜4個付ける。既存のタグがあればそれを使い、表記を増やさない |
| 人 | 人名が出てきたら `people` / `note_people` につなぐ（感謝の相手も） |

- 「今日のワークアウト」は `notes` ではなく `activities` / `workouts` に入れる

## habits

- `activity_types` が入っている習慣（例：毎日なにかしら運動する＝`{run,strength}`）は、`activities` に記録すれば自動で達成になる。`habit_checks` には書かない
- それ以外の習慣は、実施した日に `habit_checks` を入れる
- 達成状況はビュー `habit_days`（習慣×日付の `done`）で見る

## activities / runs / workouts

- 1回の運動につき `activities` に1行入れる（`day`・`type`・時刻・`duration_min`・`avg_heart_rate`・`calories`・`note`・`is_private`）。種類ごとの中身は子テーブルに入れる
- Garmin のスクショなどで平均心拍・消費カロリーが分かれば `avg_heart_rate`（bpm）・`calories`（kcal）に入れ、`note` には書かない。ペースは開始・終了時刻と距離から画面で出すので入れない
  - ラン（`type = run`）：`runs` に1行（`activity_id`、`distance_km`）
  - 筋トレ（`type = strength`）：`workouts` に種目ごとに1行（`activity_id`、`sort_order`、`exercise`、`sets`、`reps`、`weight_kg`、`note`）。「腕立て10回×3セット、チューブ3セット」なら2行。分からない数は null
  - ウォーク・ストレッチなどは `activities` だけでよい
- 子テーブルは `(activity_id, type)` で親につながるので、種類の違う運動にはつなげられない。親を消すと子も消える
- 種目名は既存の `workouts.exercise` の表記に合わせる（腕立て、チューブ など）
- プロテインを飲んだなど、種目以外のことは `activities.note` に書く
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

- `~/.secretary/bin/journal-sync.py` が `ログ/YYYY-MM-DD.md`（Claude Code の日次ログ）から自動で入れる。毎時0分と8時（前日分）に launchd で実行され、同じ日の `source = 'claude_code'` の行は丸ごと置き換える
- 書き込みは Data API で関数 `replace_work_sessions` を呼んで行う。`service_role` にはテーブルへの書き込み権限を与えず、この関数（と `replace_github_activities`）を呼ぶ権限だけを与えている。接続情報は `~/.secretary/.credentials/inb_journal_api.env`
- カテゴリは `work_categories` を正とする。カテゴリを増やすときはこのテーブルに行を足す（スクリプトは毎回ここから読む）
- 手で足す作業は `source` を `manual` などにして、自動の置き換えに巻き込まれないようにする

## github_activities

- `~/.secretary/bin/journal-sync.py` が `gh search` で集め、関数 `replace_github_activities` で自動で入れる。毎時0分と8時（前日分）に launchd で実行され（`cc-daily-summary.sh` から呼ぶ）、同じ日の行は丸ごと置き換える。手では入れない
- 入るのは inaba-env が書いたコミット・作ったPR・マージされたPR・作ったIssue。コミットは GitHub の検索の仕様上、既定ブランチに入ったものだけで、マージコミットは除く

## aqua_voice_stats

- `~/.secretary/bin/journal-sync.py` が Aqua Voice の `users/stats/` を呼び、関数 `replace_aqua_voice_stats` で自動で入れる。毎時0分に launchd で実行され（`cc-daily-summary.sh` から呼ぶ）、その日の行をその時点の値で上書きする。手では入れない
- Aqua Voice が返すのは当日分（語数・文字数）と累計（短縮時間など）だけで、過去の日の値は取れない。なので入れるのは**今日の行だけ**。8時の前日分の実行では入れず、前日の行は23時台に取れた値で確定する
- その日に短縮した時間（`time_saved_min`）は、前の日の行の累計（`time_saved_hours`）との差。累計が減った（Aqua Voice 側の集計期間が変わったなど）ときは空にする
- 認証には Aqua Voice アプリのログイン情報（`~/Library/Application Support/Aqua Voice/settings.json` の `token`）を使う。発行できる API キー（`aqk_…`）は文字起こしの API 専用で、`users/stats/` には通らない

## time_logs

- 「4時から5時まで読書」のような時間の記録を1件1行で入れる。もとは凡事徹底スプシの【時間】シート（2026年1〜10月分は取り込み済み、`source` が `凡事徹底スプシ/…`）
- カテゴリは `time_categories` の `is_active = true` のものから選ぶ（開発／読書／Audible／ポッドキャスト／研修／その他インプット／その他アウトプット／ジャーナリング／業務）。当てはまらなければ、勝手に足さずに確認する
- 「書籍・ポッドキャスト」は2026年10月までの過去の記録用。新しい記録には使わない
- 読書・Audible・ポッドキャストのときは `media_id` で何を読んだ・聞いたかをつなぎ、`content` には章やエピソード名を書く
- 書名や技術名など「何をしたか」は `content`、寝落ち などの補足は `note`
- 日をまたぐとき（23:00〜0:30）は `ended_at` を翌日の時刻にする。`day` は始めた日

## media

- 本は `book`、Audible は `audiobook`、ポッドキャストは番組単位で `podcast`、教材・研修は `course`。エピソードは `media` にせず、`time_logs.content` に書く
- `status` は `planned`／`in_progress`／`finished`／`dropped`。読み終えたら `finished_on` も入れる
- `~/.secretary/読書リスト/` に読書メモがある本は `note_path` にメモのパスを入れる
- 本や番組から得た学びや教訓は、`notes.media_id` でつなぐ

## links

- その日に参照したリンク・残しておきたいリンクを1件1行で入れる。画面では「振り返り」の下の「リンク」に出る
- `url` は必須。`title` はページの題名（分かれば入れる。無ければ画面には URL がそのまま出る）。`note` には残した理由や何に使ったかを、**入力に書いてあるときだけ**入れる
- 教材や本のページ（解説ページ、公式サイトなど）は `media_id` でその `media` につなぐ
- 社内の URL や顧客名が分かる URL、私生活に関わるページは `is_private = true` にする（下の「公開・非公開」参照）

## apple_music_links

- `music.apple.com` のリンクは `links` ではなくこちらに1件1行で入れる（ほかの URL は入らないよう制約がある）。画面では「今日の音楽」の下の「Apple Music」に、曲・アルバム・プレイリストは埋め込みプレーヤーで出る
- `url` は共有リンクをそのまま入れる。`title`（曲名・アルバム名など）と `artist` は分かれば入れる。`note` には聴いた場面や残した理由を、**入力に書いてあるときだけ**入れる
- 「今日の音楽」に感想などを書いたときは、その文は `notes`（音楽）に入れ、リンクはこちらに分ける

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

`note_categories.content_private = true` の大分類（今日の感謝）は、中身が必ず非公開になる（入れるときにトリガーで `is_private = true` にそろう）。件数だけはチームにも見せる。

運動は、ラン（`runs` の距離も含めて）は全部見せてよい。筋トレは中身をすべて非公開にする：`workouts`（種目・セット・回数・負荷・メモ）と、筋トレの `activities.note` は本人にだけ見せ、チームには「筋トレ・2種目・30分」のように、筋トレをしたことと時刻・長さ・種目の数だけを見せる。画面の側で必ず隠すので、`workouts` には `is_private` を持たせず、筋トレの `activities.is_private` も中身のために `true` にする必要はない。運動の回数は、非公開の運動も含めて見せる。

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
