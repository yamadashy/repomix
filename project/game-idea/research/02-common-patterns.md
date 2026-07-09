# Steamで1000万本以上売れたゲームの共通パターン分析

> 調査担当: リサーチエージェント(Opus) / 調査日: 2026-07-09
> 対象:Garry's Mod(2,540万)、Rust(2,820万)、PUBG、Valheim(1,650万)、Palworld(Steam 1,500万超/全体4,000万プレイヤー)、Black Myth: Wukong(2,500万)、Helldivers 2(Steam 1,310万/全体2,000万)、Baldur's Gate 3(1,000万超)、Elden Ring、Lethal Company(1,000万超)、Terraria(6,400万)、ARK(3,430万)ほか。数値は各出典の推計値。

## 総論:1000万本は「単品の完成度」ではなく「増殖する仕組み」で決まる

1000万本という水準は、通常の良作(数十万〜数百万本)から桁が2つ跳ねる領域であり、**プロダクト単体の品質ではなく「勝手に広がる構造」を内蔵しているか**で決まる。具体的には、(a)友人を巻き込む/配信映えするマルチ・ソーシャル性、(b)数百時間遊べるリプレイ構造による長期在庫化、(c)アーリーアクセス+継続更新による「話題の再燃」、(d)巨大な地域市場(中国)の一点突破、のいずれか(多くは複数)を備える。以下、観点別に事実と示唆を分けて示す。

---

## 1. ジャンル傾向

### 事実(根拠つき)
- **収益ではアクションが支配的**:Steam全収益の約58%をアクションが占め、リリース比に対する収益効率が最も高い。RPGは全収益の約17%で、うちアクションRPGが最も稼ぐ(RPG収益の約26%)。([GAMES.GG / GameDiscoverCo](https://games.gg/news/steam-revenue-distribution-by-genre/))
- **サバイバルクラフトは「1000万到達」の常連ジャンル**:Rust 2,820万、ARK 3,430万、Valheim 1,650万、Terraria 6,400万、Minecraft 3.5億。Palworld(サバイバル+モンスター収集)はEA開始34日で全体2,500万プレイヤー。([Video Game Sales Wiki](https://vgsales.fandom.com/wiki/Best-selling_survival_craft_games)、[GamingOnLinux](https://www.gamingonlinux.com/2024/02/palworld-has-now-sold-over-15-million-copies-on-steam/))
- **協力ホラー/「フレンドスロップ(friendslop)」が新たな量産ジャンル**:Lethal Company(1,000万本超・推計収益1.14億ドル)、R.E.P.O.(初週23万同接)、Content Warning(配信映えホラー)、Peak(協力クライミング)。2025年のトップセラーは協力系とRPGが席巻した。([Push To Talk](https://www.pushtotalk.gg/p/how-lethal-company-sold-10-million-copies)、[Kotaku](https://kotaku.com/steam-top-selling-2025-friendslop-rpgs-sales-2000654157))
- **バトルロイヤル/アリーナFPSは1本あたり平均収益が突出**:アリーナシューター平均6.35億ドル、バトルロイヤル平均3.54億ドル。PUBGは全Steam史上最高の同接325万人(2018年)。([GAMES.GG](https://games.gg/news/steam-game-revenue-by-genre-and-subgenre/)、[Statista](https://www.statista.com/statistics/1489272/steam-all-time-top-games-peak-concurrent-users-2024/))

### そこから導ける示唆
- 1000万到達ジャンルは「**単発消費型ではなく、セッション反復型**」に強く偏る。サバイバルクラフト・協力ホラー・BR・アリーナFPSはいずれも「毎回結果が変わる」「他人と遊ぶ」構造を持つ。
- アクション/RPGは母数が大きく収益効率が高いが、AAA級の投資を要する。対してサバイバル・協力ホラーは**小規模開発でも1000万到達が起こる稀有なジャンル**であり、インディーにとって唯一「桁違いの当たり」を狙える領域。

---

## 2. 価格戦略

### 事実(根拠つき)
- **1000万クラスの価格帯は二極化+中間の3層に分布する**。
  - **無料(F2P)**:CS2、Dota 2、現在はF2P化したPUBG。現行Steamトップ10のうち7本がF2P。([PCGamesN](https://www.pcgamesn.com/playerunknowns-battlegrounds/pubg-free-to-play-player-count))
  - **超低価格($5〜10)**:Vampire Survivors($4.99)、Peak(8ドル未満、発売1か月で500万本)、Content Warning($7.99・発売時24時間無料で620万人取得)、Lethal Company(約10ドル)。([Steam](https://store.steampowered.com/app/1794680/Vampire_Survivors/)、[Screen Rant](https://screenrant.com/peak-viral-game-popular/))
  - **中価格($20〜40)**:Hades($24.99)、Deep Rock Galactic($29.99)、Valheim、Palworld(約30ドル)、Helldivers 2($40)。
  - **AAA($60〜80)**:Black Myth: Wukong、Baldur's Gate 3、Elden Ring、Resident Evil Requiem($70〜80で200万本超)。
- インディーは2024年にSteam全フルゲーム収益の**48%(約49億ドル、前年比+82%)**を占め、初めてAA/AAAに肉薄。ただしその大半はBlack Myth(約10億ドル)とPalworld(約5億ドル)の2本に集中。([Game World Observer / VG Insights](https://gameworldobserver.com/2024/10/16/indie-games-revenue-steam-vs-aaa-titles-vg-insights))

### そこから導ける示唆
- **「安さ」は本数を稼ぐ増幅器**。$5〜10帯は「友人4人で誘い合う」際の心理的障壁を消し、協力ゲームのバイラル拡散と極めて相性が良い(Peak・Content Warning・Lethal Companyはこの帯)。
- 一方AAAは**1本の単価が高く、地域市場(中国)や強IPと結合したときのみ**1000万に届く。価格そのものより「価格×拡散構造の掛け算」が本数を決める。
- $60〜70の一本道単発ゲームで1000万に届くのは、BG3・Elden Ringのように「数百時間級のボリューム」か「圧倒的批評評価」を伴う例外に限られる。

---

## 3. マルチプレイヤー要素

### 事実(根拠つき)
- **協力プレイの投入対効果が異常に高い**:2023年にSteamでリリースされた協力対応ゲームは全体の**わずか6%**だが、**総販売本数の36%(約1億8,100万本中6,516万本)**を占めた。([Game Rant](https://gamerant.com/steam-co-op-games-popularity-blowing-up-study/))
- 協力ゲームは2025年上半期だけでSteamに**41億ドルの収益**をもたらした。([Alinea Analytics](https://alineaanalytics.substack.com/p/games-with-co-op-generated-over-4))
- 1000万級のほぼ全てがマルチ/ソーシャル要素を持つ:Rust(PvPレイド)、PUBG/CS2/Dota2(PvP)、Valheim/Palworld(協力サバイバル)、Helldivers 2(4人協力)、Lethal Company/REPO/Peak(協力+近接ボイスチャット)。

### そこから導ける示唆
- **マルチプレイは「口コミの燃料」そのもの**。1人が買うと友人3〜4人を巻き込むため、1本の販売が指数的に連鎖する(単発シングルにはこの乗数が無い)。
- とりわけ**近接ボイスチャット(proximity chat)**は、Lethal Company/REPO/Peakに共通する「配信で笑いが生まれる装置」。技術的には安価だが、バイラル効果は絶大。低予算で1000万を狙うなら最優先の設計要素。
- Epic CEOも「プレイヤーは友人とより多く遊べる巨大タイトルへ流れている」と指摘しており、ソーシャル性は一過性でなく構造的トレンド。

---

## 4. バイラル性(配信・ミーム・口コミ)

### 事実(根拠つき)
- **Among Us**:リリースは2018年だが、2020年に大手ストリーマーが取り上げたことで爆発。「配信者が同時に遊べる」ソーシャル推理という設計がバイラルの核。([How To Market A Game](https://howtomarketagame.com/2020/09/14/among-us-the-4-lessons-of-their-viral-success/))
- **Lethal Company**:ソロ開発者Zeekerss(過去19作をリリース)の20作目。TwitchとYouTubeを席巻し、その配信視聴がそのままPC販売に転化。CoDをSteamで上回った。([Push To Talk](https://www.pushtotalk.gg/p/how-lethal-company-sold-10-million-copies))
- **Content Warning**:「怖い映像を撮ってバズる」ことがゲーム目的そのもの=バイラルをゲーム内に内蔵。24時間無料配布で620万人取得、初日20万同接。([Game World Observer](https://gameworldobserver.com/2024/04/02/content-warning-140k-ccu-4-5-million-downloads-landfall))
- **Peak**:YouTuber SMii7yの紹介動画が1日で約200万再生、発売9日で200万本、1か月で500万本。([Screen Rant](https://screenrant.com/peak-viral-game-popular/))
- Helldivers 2・Palworldも、大量の配信者/YouTuber生成コンテンツが販売急増を牽引。([Alinea Analytics](https://alineaanalytics.substack.com/p/games-with-co-op-generated-over-4))

### そこから導ける示唆
- **配信映え=最強かつ最安のマーケティング**。「予測不能な事故が起きる」「複数人が同時に映える」「短尺で笑いが完結する」の3条件を満たすゲームは、広告費ゼロで数百万本規模の露出を得る。
- 最先端の設計は**バイラルをゲームメカニクスに組み込む**(Content Warningの「動画を撮ってバズる」がゲーム目的)。マーケティングとゲームデザインの境界が消えつつある。
- ただしバイラルは「点火」に過ぎず、**配信者の視聴者維持率が高い=面白い**という実体が伴わないと持続しない。品質はバイラルの前提条件。

---

## 5. アーリーアクセス・継続アップデート戦略

### 事実(根拠つき)
- **Palworld**:2024年1月EA開始、初週で1億ドル超・Steam同接210万人(PUBGに次ぐ史上2番目)。EAのまま2.5年で4,000万プレイヤー、2026年7月10日に正式1.0。([GAMES.GG](https://games.gg/news/palworld-crosses-25-million-copies-sold/)、[Game World Observer](https://gameworldobserver.com/2025/02/19/palworld-32-million-players-first-year-indie-games))
- **Valheim**:2021年EA投入直後に1,200万本超(開発は5人)。Steamベストセラー1位を2か月連続維持、最高同接50万人。([Screen Rant](https://screenrant.com/valheim-top-selling-steam-game-two-months/))
- **Rust**:長年のEA+継続更新を経て2,820万本。
- EAで正式リリースに到達するゲームは全体の約25%にすぎず、成功例の希少性が高い。([Shattered.io](https://shattered.io/palworld-1-0-launch-2026/))

### そこから導ける示唆
- EAは「未完成品の販売」ではなく、**発売を1回のイベントから連続的な話題創出装置へ変える手法**。大型アップデートごとに配信・売上が再燃し、単発ローンチでは得られない複数回のピークを生む。
- ただしEAは諸刃の剣で、**約75%が1.0に到達しない**。1000万到達は「EAだから」ではなく「EA×継続更新×コミュニティ運営を完遂できた」少数に限られる。
- 継続更新は「一度買った層」ではなく「離脱→復帰」と「新規流入」を作る。長期在庫化(観点6)と相互補強する。

---

## 6. リプレイ性・プレイ時間

### 事実(根拠つき)
- 1000万級は**数百時間遊べる構造**を持つジャンルに集中:サバイバルサンドボックス(Rust・Valheim・ARK・Terraria)、ローグライク/ライト(Hades・Vampire Survivors・Peak)、周回型協力(Lethal Company・Helldivers 2)。
- 逆に「一度クリアして終わり(one and done)」の作品は、更新が少なく同接が伸びず、配信者経由の再流入が起きにくいため構造的に不利。([GameDiscoverCo](https://newsletter.gamediscover.co/p/game-discovery-where-do-shortniche))

### そこから導ける示唆
- 高リプレイ性は**「Steamでの長期滞留」を生む**。プレイ時間が長い=同接が高い=Steamの人気ランキング/おすすめ枠に露出し続ける=無料の恒常的マーケティングという好循環。
- ローグライク・サンドボックスの「毎回違う」構造は、(a)配信ネタが尽きない、(b)値引きセールのたびに再燃、(c)MOD/コミュニティ創作、の3点で長期販売を支える。**1000万は「発売月の瞬発力」ではなく「数年の積分」で達成される**ケースが多い(Garry's Mod・Rust・Terrariaが典型)。

---

## 7. 地域要因(中国・アジア市場)

### 事実(根拠つき)
- **Black Myth: Wukong**:発売3日で1,000万本、1か月で2,000万本、累計2,500万本。ただし売上の**約75%が中国**、発売後のSteamアクティビティの88%が中国から。中国初のAAAとして中国ゲーム市場を四半期過去最高に押し上げた。([Game World Observer](https://gameworldobserver.com/2025/01/31/black-myth-wukong-25m-copies-sold-merchandise-china)、[Travis Clark](https://travisclark.substack.com/p/black-myth-wukong-china-video-game-sales))
- **PUBG**:韓国(Krafton)発、アジア圏の巨大プレイヤーベースが史上最高同接325万を支えた。

### そこから導ける示唆
- **中国市場は「単一タイトルを一夜で1000万本級に押し上げる」ほぼ唯一の地域変数**。西洋で中程度でも、中国で文化的共鳴(西遊記)を起こせば桁が変わる。
- ただし中国依存は**再現性・分散リスクの問題**を伴う(Black Mythの売上地理は極端に偏る)。地域要因は「掛け算の一項」であり、グローバルで成立する設計と組み合わさって初めて安定した1000万になる。
- アジア発スタジオ(Krafton・Game Science・Pocketpair)の台頭は、1000万クラスの供給源が北米・欧州から多極化していることを示す。

---

## 8. 失敗との対比:高品質でも1000万に届かないゲーム

### 事実(根拠つき)
- 開発者が挙げる最大の障壁は**発見可能性(discoverability)31.5%**と**市場飽和 26%**。([This Week In Video Games / GameDiscoverCo](https://thisweekinvideogames.com/feature/game-discovery-talk-how-come-so-many-great-reviewed-games-dont-sell/))
- **ウィッシュリストは売上に自動転換しない**:あるシティビルダーはEA開始時3.5万WL超を抱えながら販売300本未満(転換率ほぼ0%)。購入判断は「貯めたWL」より「その瞬間に見聞きした話題」で下される。([GamesRadar](https://www.gamesradar.com/games/city-builder/7-years-and-35-000-wishlists-later-one-of-steams-most-popular-city-builder-demos-failed-miserably-enough-at-early-access/))
- **物語重視の単発シングルはアルゴリズム上不利**:他作品と似ていない/更新が少ない/同接が伸びない作品は、Steamのおすすめ導線から助けを得にくい。([GameDiscoverCo](https://newsletter.gamediscover.co/p/game-discovery-where-do-shortniche))

### そこから導ける示唆
- 高評価でも1000万に届かない典型は「**面白いが、他人を巻き込む理由・配信で映える瞬間・再訪する理由が無い**」作品。品質(Metascore)と拡散構造は別軸であり、**1000万を決めるのは後者**。
- 単発ナラティブは「良作だが増殖しない」構造的宿命を負う。BG3・Elden Ringが例外的に届いたのは、圧倒的ボリューム+批評的頂点+強力なDLC更新という「単発の弱点を物量で補う」条件を満たしたため。
- 逆に言えば、**発見可能性・話題性・再訪性のどれかを設計段階で仕込めていない限り、品質をいくら上げても1000万の壁は越えない**——これが成功例全体から導かれる最も一貫した結論。

---

## 結論:1000万本の「共通方程式」

観測される1000万到達ゲームは、次の要素の**掛け算**でほぼ説明できる:

> **(マルチ/ソーシャル性 or 数百時間のリプレイ性)× 配信映え/バイラル装置 × 参入障壁の低い価格 or 強力なIP × 継続更新(EA含む)× (任意)中国など巨大地域の点火**

- **インディーの勝ち筋**:安価($5〜10)×協力×近接ボイス×配信映え(Lethal Company / Peak / REPO型)。または中価格($20〜30)×サバイバルクラフト×EA継続更新(Valheim / Palworld型)。
- **AAAの勝ち筋**:$60〜70×圧倒的物量/批評評価×DLC更新(BG3 / Elden Ring型)、あるいは強力な文化的IP×巨大地域市場(Black Myth: Wukong型)。
- **共通する落とし穴**:品質のみに投資し、「他人を巻き込む理由」「配信で映える瞬間」「再訪する理由」を設計しないこと。これらを欠いた良作は、発見可能性の壁に阻まれ1000万に到達しない。

---

## 情報源リスト

**市場分析・データ**
- [GAMES.GG / GameDiscoverCo — Steam Revenue Distribution by Genre](https://games.gg/news/steam-revenue-distribution-by-genre/)
- [GAMES.GG — Steam Game Revenue by Genre and Subgenre](https://games.gg/news/steam-game-revenue-by-genre-and-subgenre/)
- [Game World Observer / VG Insights — Indie games near AAA revenue on Steam 2024](https://gameworldobserver.com/2024/10/16/indie-games-revenue-steam-vs-aaa-titles-vg-insights)
- [Alinea Analytics — Games with co-op generated over $4 billion](https://alineaanalytics.substack.com/p/games-with-co-op-generated-over-4)
- [Game Rant — Co-Op Games Blowing Up (6% of releases, 36% of units)](https://gamerant.com/steam-co-op-games-popularity-blowing-up-study/)
- [Statista — Steam all-time peak concurrent users](https://www.statista.com/statistics/1489272/steam-all-time-top-games-peak-concurrent-users-2024/)
- [Video Game Sales Wiki — Best-selling survival craft games](https://vgsales.fandom.com/wiki/Best-selling_survival_craft_games)

**GameDiscoverCo(発見可能性・失敗分析)**
- [How Come So Many Great-Reviewed Games Don't Sell?](https://thisweekinvideogames.com/feature/game-discovery-talk-how-come-so-many-great-reviewed-games-dont-sell/)
- [Game discovery: where do short/niche games fit?](https://newsletter.gamediscover.co/p/game-discovery-where-do-shortniche)
- [Which genres have 'ruled' Steam?](https://newsletter.gamediscover.co/p/which-genres-have-ruled-steam-a-new)
- [GamesRadar — 35,000 wishlists, under 300 sales](https://www.gamesradar.com/games/city-builder/7-years-and-35-000-wishlists-later-one-of-steams-most-popular-city-builder-demos-failed-miserably-enough-at-early-access/)

**個別タイトル事例**
- [Push To Talk — How Lethal Company Sold 10 Million Copies](https://www.pushtotalk.gg/p/how-lethal-company-sold-10-million-copies)
- [How To Market A Game — Among Us viral success lessons](https://howtomarketagame.com/2020/09/14/among-us-the-4-lessons-of-their-viral-success/)
- [GAMES.GG — Palworld Crosses 25 Million](https://games.gg/news/palworld-crosses-25-million-copies-sold/)
- [Game World Observer — Palworld 32 million players](https://gameworldobserver.com/2025/02/19/palworld-32-million-players-first-year-indie-games)
- [Screen Rant — Valheim top-selling Steam game two months](https://screenrant.com/valheim-top-selling-steam-game-two-months/)
- [Game World Observer — Black Myth: Wukong tops 25 million / China merch](https://gameworldobserver.com/2025/01/31/black-myth-wukong-25m-copies-sold-merchandise-china)
- [Travis Clark — Black Myth: Wukong, mostly China](https://travisclark.substack.com/p/black-myth-wukong-china-video-game-sales)
- [Alinea Analytics — Helldivers 2 sells 20M copies](https://alineaanalytics.substack.com/p/helldivers-2-sells-20m-copies)
- [Screen Rant — Peak, most viral game of 2025 under $8](https://screenrant.com/peak-viral-game-popular/)
- [Game World Observer — Content Warning 140k CCU / 4.5M downloads](https://gameworldobserver.com/2024/04/02/content-warning-140k-ccu-4-5-million-downloads-landfall)
- [PCGamesN — PUBG free-to-play player count / all-time record](https://www.pcgamesn.com/playerunknowns-battlegrounds/pubg-free-to-play-player-count)
- [Kotaku — 'Friendslop' dominated top-selling Steam games 2025](https://kotaku.com/steam-top-selling-2025-friendslop-rpgs-sales-2000654157)

> 注記:Steam単体の販売本数は公式非公開のものが多く、上記数値はVG Insights・GameDiscoverCo・Alinea Analyticsなどの推計、または全プラットフォーム合算値を含む。特にBlack Myth: WukongとHelldivers 2の「2,500万/2,000万」は全機種合算で、Steam単体分はその一部(Helldivers 2はSteam約1,310万)。ジャンル別収益シェアはリリース年・集計期間により変動する点に留意。
