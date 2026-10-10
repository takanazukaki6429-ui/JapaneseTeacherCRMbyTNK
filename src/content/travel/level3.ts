/**
 * 旅行のテキスト レベル3（2026-10-09 かずき決定・9-2／2026-10-10 充実）
 *
 * - 対象：自分で旅を組み立てる人（N3 くらい）
 * - 5場面：地元の人と話す／困りごとを伝える／日本の家を訪ねる／地方の移動／体験の申し込み
 * - 1場面＝目標・フレーズ12・使う場面4・会話2本・穴埋め8・文化のひとこと（2026-10-10 かずき決定）
 * - よみは教科書と同じ「漢字（かんじ）」の形。英語の訳を付ける
 * - 中身は Claude が書いた。あいちゃんに見てもらって直す・増やす
 * 型と並べ方は lib/travel.ts。下書きの確かめ方は scratchpad の validate_travel.py（テストは lib/__tests__/travel.test.ts）
 */
import type { TravelScene } from '@/lib/travel';

export const TRAVEL_LEVEL3: TravelScene[] = [
    {
        "id": "smalltalk",
        "title": "地元（じもと）の人（ひと）と話（はな）す",
        "subtitle": "旅（たび）の感想（かんそう）",
        "titleEn": "Talking with local people: impressions of the trip",
        "goal": {
            "ja": "出身（しゅっしん）や旅（たび）の感想（かんそう）を話（はな）し、地元（じもと）の人（ひと）におすすめの場所（ばしょ）や食（た）べ物（もの）を聞（き）ける。",
            "en": "Talk about where you’re from and how your trip is going, and ask local people to recommend places and food."
        },
        "phrases": [
            {
                "ja": "どちらからいらっしゃったんですか。",
                "en": "Where are you from? (polite)"
            },
            {
                "ja": "オーストラリアから来（き）ました。昨日（きのう）着（つ）いたばかりです。",
                "en": "I’m from Australia. I just arrived yesterday."
            },
            {
                "ja": "思（おも）っていたより静（しず）かで、いい町（まち）ですね。",
                "en": "It’s quieter than I expected. It’s a lovely town."
            },
            {
                "ja": "せっかく来（き）たのに、雨（あめ）でちょっと残念（ざんねん）です。",
                "en": "I came all this way, so it’s a bit of a shame that it’s raining."
            },
            {
                "ja": "もっと長（なが）く泊（と）まればよかったです。",
                "en": "I wish I had stayed longer."
            },
            {
                "ja": "この辺（へん）の名物（めいぶつ）は何（なん）ですか。",
                "en": "What’s the local specialty around here?"
            },
            {
                "ja": "地元（じもと）の人（ひと）がよく行（い）くお店（みせ）を教（おし）えていただけませんか。",
                "en": "Could you tell me about a place where local people often go?"
            },
            {
                "ja": "この辺（へん）は秋（あき）の紅葉（こうよう）が有名（ゆうめい）だそうですね。",
                "en": "I hear this area is famous for its autumn leaves."
            },
            {
                "ja": "旅行中（りょこうちゅう）は、できるだけ日本語（にほんご）で話（はな）すようにしています。",
                "en": "While I’m traveling, I try to speak Japanese as much as possible."
            },
            {
                "ja": "日本語（にほんご）がぺらぺらなわけではないので、ゆっくり話（はな）していただけると助（たす）かります。",
                "en": "I’m not fluent in Japanese, so it would help if you could speak slowly."
            },
            {
                "ja": "いえいえ、まだまだです。",
                "en": "Oh no, I still have a long way to go."
            },
            {
                "ja": "お話（はな）しできて楽（たの）しかったです。",
                "en": "It was really nice talking with you."
            }
        ],
        "usage": [
            {
                "ja": "「どちらからいらっしゃったんですか」は「どこから来（き）ましたか」のていねいな言（い）い方（かた）です。答（こた）える時（とき）は「〜から来（き）ました」で大丈夫（だいじょうぶ）です。",
                "en": "“Dochira kara irasshatta n desu ka” is a polite way of asking “Where are you from?” You can simply answer “… kara kimashita.”"
            },
            {
                "ja": "日本語（にほんご）をほめられたら、「いえいえ、まだまだです」と軽（かる）く否定（ひてい）するのがふつうです。相手（あいて）の話（はな）し方（かた）が速（はや）い時（とき）は「ぺらぺらなわけではないので」と伝（つた）えると、ゆっくり話（はな）してもらえます。",
                "en": "When someone praises your Japanese, it’s normal to modestly deny it with “Iie iie, madamada desu.” If someone speaks fast, saying “perapera na wake de wa nai node” (since I’m not fluent) will get them to slow down."
            },
            {
                "ja": "おすすめを聞（き）く時（とき）は「地元（じもと）の人（ひと）がよく行（い）く〜」と言（い）うと、観光客向（かんこうきゃくむ）けではないお店（みせ）を教（おし）えてもらいやすくなります。",
                "en": "When asking for recommendations, saying “jimoto no hito ga yoku iku …” (… where local people often go) makes it more likely you’ll hear about places that aren’t just for tourists."
            },
            {
                "ja": "同（おな）じくらいの年（とし）の人（ひと）に「敬語（けいご）じゃなくていいよ」と言（い）われたら、「です・ます」を使（つか）わない話（はな）し方（かた）に変（か）えてもかまいません。",
                "en": "If someone around your age says “Keigo ja nakute ii yo” (You don’t have to be polite), it’s fine to switch to casual speech without “desu/masu.”"
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "観光地（かんこうち）で話（はな）しかけられる",
                    "en": "A local starts a conversation at a sightseeing spot"
                },
                "lines": [
                    {
                        "speaker": "地元（じもと）の人（ひと）",
                        "ja": "こんにちは。どちらからいらっしゃったんですか。",
                        "en": "Hello. Where are you from?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "オーストラリアから来（き）ました。昨日（きのう）着（つ）いたばかりです。",
                        "en": "I’m from Australia. I just arrived yesterday."
                    },
                    {
                        "speaker": "地元（じもと）の人（ひと）",
                        "ja": "そうですか。日本語（にほんご）がお上手（じょうず）ですね。",
                        "en": "Oh, really? Your Japanese is very good."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "いえいえ、まだまだです。旅行中（りょこうちゅう）は、できるだけ日本語（にほんご）で話（はな）すようにしているんです。",
                        "en": "Oh no, I still have a long way to go. While I’m traveling, I try to speak Japanese as much as I can."
                    },
                    {
                        "speaker": "地元（じもと）の人（ひと）",
                        "ja": "この町（まち）はどうですか。",
                        "en": "How do you like this town?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "思（おも）っていたより静（しず）かで、いい町（まち）ですね。でも、明日（あした）にはもう東京（とうきょう）に戻（もど）るんです。",
                        "en": "It’s quieter than I expected, and it’s a lovely town. But I’m already going back to Tokyo tomorrow."
                    },
                    {
                        "speaker": "地元（じもと）の人（ひと）",
                        "ja": "え、もう帰（かえ）るんですか。山（やま）の上（うえ）の温泉（おんせん）には行（い）きましたか。",
                        "en": "Oh, you’re leaving already? Have you been to the hot spring up on the mountain?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "いいえ、まだです。もっと長（なが）く泊（と）まればよかったです。",
                        "en": "No, not yet. I wish I had stayed longer."
                    },
                    {
                        "speaker": "地元（じもと）の人（ひと）",
                        "ja": "じゃあ、次（つぎ）はぜひゆっくりいらしてくださいね。",
                        "en": "Well then, next time please come and stay a little longer."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい、ぜひ。お話（はな）しできて楽（たの）しかったです。",
                        "en": "I definitely will. It was really nice talking with you."
                    }
                ]
            },
            {
                "title": {
                    "ja": "居酒屋（いざかや）で地元（じもと）の人（ひと）と話（はな）す",
                    "en": "Chatting with a local at an izakaya (casual speech)"
                },
                "lines": [
                    {
                        "speaker": "地元（じもと）の人（ひと）",
                        "ja": "どこから来（き）たの？",
                        "en": "Where are you from?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "カナダから来（き）ました。一人（ひとり）で東北（とうほく）を回（まわ）っています。",
                        "en": "I’m from Canada. I’m traveling around Tohoku on my own."
                    },
                    {
                        "speaker": "地元（じもと）の人（ひと）",
                        "ja": "へえ、すごいね。敬語（けいご）じゃなくていいよ。同（おな）い年（どし）くらいでしょ？",
                        "en": "Wow, that’s cool. You don’t have to be so polite. We’re about the same age, right?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "じゃあ、そうするね。ねえ、この辺（へん）の名物（めいぶつ）って何（なに）？",
                        "en": "Okay, I will. Hey, what’s the local specialty around here?"
                    },
                    {
                        "speaker": "地元（じもと）の人（ひと）",
                        "ja": "牛（ぎゅう）タンかな。あと、地酒（じざけ）もおいしいよ。",
                        "en": "Beef tongue, I’d say. The local sake is good too."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "牛（ぎゅう）タン、昨日（きのう）食（た）べた！すごくおいしかった。",
                        "en": "I had beef tongue yesterday! It was so good."
                    },
                    {
                        "speaker": "地元（じもと）の人（ひと）",
                        "ja": "でしょ？明日（あした）はどこ行（い）くの？",
                        "en": "Right? Where are you going tomorrow?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "まだ決（き）めてないんだ。どこかおすすめある？",
                        "en": "I haven’t decided yet. Any recommendations?"
                    },
                    {
                        "speaker": "地元（じもと）の人（ひと）",
                        "ja": "松島（まつしま）がいいよ。電車（でんしゃ）で30分（さんじゅっぷん）くらいだし、景色（けしき）が最高（さいこう）だよ。",
                        "en": "Matsushima is great. It’s only about 30 minutes by train, and the views are amazing."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "いいね！じゃあ、明日（あした）は松島（まつしま）に行（い）くことにする。ありがとう！",
                        "en": "Sounds great! Then I’ll go to Matsushima tomorrow. Thanks!"
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "どちらから（　　）んですか。",
                "answer": "いらっしゃった",
                "en": "Where are you from? (polite)"
            },
            {
                "q": "昨日（きのう）着（つ）いた（　　）です。",
                "answer": "ばかり",
                "en": "I just arrived yesterday."
            },
            {
                "q": "せっかく来（き）た（　　）、雨（あめ）でちょっと残念（ざんねん）です。",
                "answer": "のに",
                "en": "I came all this way, so it’s a bit of a shame that it’s raining."
            },
            {
                "q": "もっと長（なが）く（　　）よかったです。",
                "answer": "泊（と）まれば",
                "en": "I wish I had stayed longer."
            },
            {
                "q": "この辺（へん）は秋（あき）の紅葉（こうよう）が有名（ゆうめい）だ（　　）ね。",
                "answer": "そうです",
                "en": "I hear this area is famous for its autumn leaves."
            },
            {
                "q": "旅行中（りょこうちゅう）は、できるだけ日本語（にほんご）で話（はな）す（　　）。",
                "answer": "ようにしています",
                "en": "While I’m traveling, I try to speak Japanese as much as possible."
            },
            {
                "q": "日本語（にほんご）がぺらぺらな（　　）ので、ゆっくり話（はな）していただけると助（たす）かります。",
                "answer": "わけではない",
                "en": "I’m not fluent in Japanese, so it would help if you could speak slowly."
            },
            {
                "q": "明日（あした）は松島（まつしま）に行（い）く（　　）。",
                "answer": "ことにしました",
                "en": "I’ve decided to go to Matsushima tomorrow."
            }
        ],
        "culture": {
            "ja": "初（はじ）めて会（あ）った人（ひと）とは、天気（てんき）や食（た）べ物（もの）、旅行（りょこう）の話（はなし）から始（はじ）めると話（はな）しやすいです。給料（きゅうりょう）など、お金（かね）のことはあまり聞（き）かないほうがいいでしょう。居酒屋（いざかや）では、カウンター席（せき）に座（すわ）ると、店（みせ）の人（ひと）や地元（じもと）の人（ひと）と話（はな）すきっかけができやすいです。",
            "en": "With someone you’ve just met, it’s easy to start with the weather, food, or your trip. It’s better not to ask about money, such as someone’s salary. At an izakaya, sitting at the counter makes it easier to start talking with the staff and local people."
        }
    },
    {
        "id": "complaint",
        "title": "困（こま）りごとを伝（つた）える",
        "subtitle": "部屋（へや）の不具合（ふぐあい）と返金（へんきん）",
        "titleEn": "Explaining a problem: room trouble and refunds",
        "goal": {
            "ja": "ホテルの部屋（へや）の問題（もんだい）を具体的（ぐたいてき）に説明（せつめい）し、部屋（へや）の変更（へんこう）や返金（へんきん）・割引（わりびき）をていねいに相談（そうだん）できる。",
            "en": "Explain a problem with your hotel room clearly, and politely ask about changing rooms, a refund, or a discount."
        },
        "phrases": [
            {
                "ja": "部屋（へや）のエアコンをつけても、冷（つめ）たい風（かぜ）が出（で）ないんです。",
                "en": "Even when I turn on the air conditioner in my room, no cold air comes out."
            },
            {
                "ja": "隣（となり）の部屋（へや）の音（おと）がうるさくて、あまり眠（ねむ）れなかったんです。",
                "en": "The noise from the room next door was loud, and I couldn’t sleep well."
            },
            {
                "ja": "禁煙（きんえん）の部屋（へや）を予約（よやく）したんですが、たばこのにおいがするんです。",
                "en": "I booked a non-smoking room, but it smells of cigarettes."
            },
            {
                "ja": "ツインをお願（ねが）いしたんですが、ベッドが一（ひと）つしかないんです。",
                "en": "I asked for a twin room, but there’s only one bed."
            },
            {
                "ja": "文句（もんく）を言（い）いたいわけではないんですが、少（すこ）し相談（そうだん）させていただけますか。",
                "en": "I don’t mean to complain, but may I talk to you about something?"
            },
            {
                "ja": "一度（いちど）、部屋（へや）を見（み）に来（き）ていただけませんか。",
                "en": "Could you come and take a look at the room?"
            },
            {
                "ja": "ほかの部屋（へや）に変（か）えていただけませんか。",
                "en": "Could you move me to another room?"
            },
            {
                "ja": "いつごろ直（なお）りそうですか。",
                "en": "About when do you think it will be fixed?"
            },
            {
                "ja": "念（ねん）のため、写真（しゃしん）を撮（と）っておきました。",
                "en": "Just in case, I took some photos."
            },
            {
                "ja": "一泊分（いっぱくぶん）だけでも、返金（へんきん）していただけないでしょうか。",
                "en": "Could you refund at least one night’s charge?"
            },
            {
                "ja": "料金（りょうきん）を少（すこ）し割引（わりびき）していただくことはできませんか。",
                "en": "Would it be possible to get a small discount?"
            },
            {
                "ja": "すぐに対応（たいおう）していただいて、ありがとうございました。",
                "en": "Thank you for taking care of it so quickly."
            }
        ],
        "usage": [
            {
                "ja": "問題（もんだい）を伝（つた）える時（とき）は、何（なに）がどうなっているかを具体的（ぐたいてき）に言（い）いましょう。「エアコンをつけても、冷（つめ）たい風（かぜ）が出（で）ない」のように言（い）うと、すぐに分（わ）かってもらえます。",
                "en": "When you report a problem, say exactly what is wrong. Saying something like “Even when I turn on the air conditioner, no cold air comes out” helps staff understand right away."
            },
            {
                "ja": "「〜んですが」で話（はな）し始（はじ）めると、やわらかく聞（き）こえます。「〜のに」は不満（ふまん）の気持（きも）ちが強（つよ）く出（で）るので、ホテルの人（ひと）にはあまり使（つか）わないほうがいいです。",
                "en": "Starting with “… n desu ga” sounds soft. “… noni” shows strong dissatisfaction, so it’s better not to use it much with hotel staff."
            },
            {
                "ja": "相手（あいて）に何（なに）かをしてほしい時（とき）は「〜ていただけませんか」、自分（じぶん）が何（なに）かをしたい時（とき）は「〜させていただけますか」を使（つか）います。どちらもていねいな頼（たの）み方（かた）です。",
                "en": "Use “… te itadakemasen ka” when you want someone to do something, and “… sasete itadakemasu ka” when you want to do something yourself. Both are polite ways to ask."
            },
            {
                "ja": "返金（へんきん）や割引（わりびき）は、いきなり求（もと）めるより、「少（すこ）し相談（そうだん）させていただけますか」と切（き）り出（だ）して、まず何（なに）があったかを説明（せつめい）しましょう。そのほうが話（はなし）がスムーズに進（すす）みます。",
                "en": "Rather than demanding a refund or discount right away, start with “Sukoshi sōdan sasete itadakemasu ka” and explain what happened first. The conversation will go more smoothly that way."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "エアコンが壊（こわ）れている",
                    "en": "The air conditioner is broken"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、805号室（はっぴゃくごごうしつ）の者（もの）なんですが、エアコンが壊（こわ）れているようなんです。",
                        "en": "Excuse me, I’m staying in room 805. The air conditioner seems to be broken."
                    },
                    {
                        "speaker": "フロントの人（ひと）",
                        "ja": "大変（たいへん）申（もう）し訳（わけ）ございません。どのような状態（じょうたい）でしょうか。",
                        "en": "I’m terribly sorry. What seems to be the problem with it?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "つけても、冷（つめ）たい風（かぜ）が出（で）ないんです。リモコンの設定（せってい）も確（たし）かめたんですが…。",
                        "en": "Even when I turn it on, no cold air comes out. I checked the remote control settings too, but…"
                    },
                    {
                        "speaker": "フロントの人（ひと）",
                        "ja": "かしこまりました。すぐに係（かかり）の者（もの）がお部屋（へや）に伺（うかが）います。",
                        "en": "Certainly. A staff member will come to your room right away."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "いつごろ直（なお）りそうですか。今夜（こんや）も暑（あつ）くなるそうなので、少（すこ）し心配（しんぱい）で…。",
                        "en": "About when do you think it will be fixed? I heard it’ll be hot again tonight, so I’m a little worried."
                    },
                    {
                        "speaker": "フロントの人（ひと）",
                        "ja": "今日中（きょうじゅう）に直（なお）らない場合（ばあい）は、別（べつ）のお部屋（へや）をご用意（ようい）いたします。",
                        "en": "If it can’t be fixed today, we’ll prepare another room for you."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "できれば、今（いま）すぐほかの部屋（へや）に変（か）えていただけませんか。明日（あした）は朝（あさ）が早（はや）いので。",
                        "en": "If possible, could you move me to another room right now? I have to get up early tomorrow."
                    },
                    {
                        "speaker": "フロントの人（ひと）",
                        "ja": "確認（かくにん）いたします。同（おな）じタイプのお部屋（へや）が空（あ）いておりますので、すぐにご案内（あんない）いたします。",
                        "en": "Let me check. A room of the same type is available, so I’ll show you there right away."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "よかった。すぐに対応（たいおう）していただいて、ありがとうございます。",
                        "en": "What a relief. Thank you for taking care of it so quickly."
                    }
                ]
            },
            {
                "title": {
                    "ja": "チェックアウトで料金（りょうきん）を相談（そうだん）する",
                    "en": "Talking about the charge at check-out"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "チェックアウトをお願（ねが）いします。それと、少（すこ）し相談（そうだん）させていただけますか。",
                        "en": "I’d like to check out, please. Also, may I talk to you about something?"
                    },
                    {
                        "speaker": "フロントの人（ひと）",
                        "ja": "はい、どのようなことでしょうか。",
                        "en": "Of course. What is it about?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "文句（もんく）を言（い）いたいわけではないんですが、昨日（きのう）の夜（よる）は隣（となり）の部屋（へや）の音（おと）がうるさくて、ほとんど眠（ねむ）れなかったんです。",
                        "en": "I don’t mean to complain, but last night the noise from the room next door was so loud that I could hardly sleep."
                    },
                    {
                        "speaker": "フロントの人（ひと）",
                        "ja": "それは大変（たいへん）失礼（しつれい）いたしました。",
                        "en": "We’re very sorry about that."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "夜中（よなか）だったので、電話（でんわ）しなかったんです。すぐに電話（でんわ）すればよかったんですが…。",
                        "en": "It was the middle of the night, so I didn’t call. I should have called right away, though."
                    },
                    {
                        "speaker": "フロントの人（ひと）",
                        "ja": "とんでもございません。責任者（せきにんしゃ）に確認（かくにん）してまいりますので、少々（しょうしょう）お待（ま）ちいただけますか。",
                        "en": "Not at all. I’ll go and check with the manager. Could you wait a moment, please?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい、お願（ねが）いします。",
                        "en": "Sure, thank you."
                    },
                    {
                        "speaker": "フロントの人（ひと）",
                        "ja": "お待（ま）たせいたしました。おわびとして、宿泊料金（しゅくはくりょうきん）を二割引（にわりび）きにさせていただきます。",
                        "en": "Thank you for waiting. As an apology, we’d like to give you 20% off your room charge."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ありがとうございます。そうしていただけると助（たす）かります。",
                        "en": "Thank you. That would really help."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "ほかの部屋（へや）に変（か）えて（　　）。",
                "answer": "いただけませんか",
                "en": "Could you move me to another room?"
            },
            {
                "q": "少（すこ）し相談（そうだん）（　　）。",
                "answer": "させていただけますか",
                "en": "May I talk to you about something?"
            },
            {
                "q": "文句（もんく）を言（い）いたい（　　）んですが、少（すこ）し困（こま）っています。",
                "answer": "わけではない",
                "en": "I don’t mean to complain, but I’m having a bit of a problem."
            },
            {
                "q": "すぐに電話（でんわ）（　　）よかったです。",
                "answer": "すれば",
                "en": "I should have called right away."
            },
            {
                "q": "今夜（こんや）も暑（あつ）くなる（　　）。",
                "answer": "そうです",
                "en": "I heard it will be hot again tonight."
            },
            {
                "q": "エアコンを（　　）、冷（つめ）たい風（かぜ）が出（で）ないんです。",
                "answer": "つけても",
                "en": "Even when I turn on the air conditioner, no cold air comes out."
            },
            {
                "q": "禁煙（きんえん）の部屋（へや）を予約（よやく）した（　　）、たばこのにおいがするんです。",
                "answer": "んですが",
                "en": "I booked a non-smoking room, but it smells of cigarettes."
            },
            {
                "q": "念（ねん）のため、写真（しゃしん）を撮（と）って（　　）。",
                "answer": "おきました",
                "en": "Just in case, I took some photos."
            }
        ],
        "culture": {
            "ja": "日本（にほん）のホテルでは、問題（もんだい）があったらその場（ば）ですぐに伝（つた）えるのが一番（いちばん）です。チェックアウトの後（あと）や帰国（きこく）した後（あと）では、対応（たいおう）してもらうのが難（むずか）しくなります。フロントに24時間（にじゅうよじかん）人（ひと）がいるホテルなら、夜中（よなか）でも遠慮（えんりょ）せずに電話（でんわ）しましょう。",
            "en": "At Japanese hotels, it’s best to report a problem right away. After check-out, or once you’re back home, it becomes much harder to get it dealt with. If the front desk is staffed 24 hours, don’t hesitate to call, even in the middle of the night."
        }
    },
    {
        "id": "homestay",
        "title": "日本（にほん）の家（いえ）を訪（たず）ねる",
        "subtitle": "手土産（てみやげ）とあいさつ",
        "titleEn": "Visiting a Japanese home: gifts and greetings",
        "goal": {
            "ja": "日本（にほん）の家（いえ）を訪（たず）ねた時（とき）に、ていねいにあいさつして手土産（てみやげ）を渡（わた）せる。食事（しょくじ）の時（とき）や帰（かえ）る時（とき）に、自然（しぜん）にお礼（れい）が言（い）える。",
            "en": "Greet your hosts politely and give a gift when you visit a Japanese home, and thank them naturally at the meal and when you leave."
        },
        "phrases": [
            {
                "ja": "お邪魔（じゃま）します。",
                "en": "Sorry to intrude. (said when entering someone’s home)"
            },
            {
                "ja": "本日（ほんじつ）はお招（まね）きいただき、ありがとうございます。",
                "en": "Thank you for inviting me today."
            },
            {
                "ja": "ほんの気持（きも）ちですが、皆（みな）さんで召（め）し上（あ）がってください。",
                "en": "It’s just a small token, but please enjoy it with everyone."
            },
            {
                "ja": "国（くに）のお菓子（かし）です。お口（くち）に合（あ）うといいんですが。",
                "en": "These are sweets from my country. I hope you like them."
            },
            {
                "ja": "靴（くつ）はここで脱（ぬ）げばいいですか。",
                "en": "Should I take my shoes off here?"
            },
            {
                "ja": "何（なに）かお手伝（てつだ）いしましょうか。",
                "en": "Is there anything I can help with?"
            },
            {
                "ja": "では、遠慮（えんりょ）なくいただきます。",
                "en": "Then I’ll help myself. Thank you."
            },
            {
                "ja": "生（なま）の魚（さかな）が食（た）べられないわけではないんですが、少（すこ）し苦手（にがて）なんです。",
                "en": "It’s not that I can’t eat raw fish, but I’m not very fond of it."
            },
            {
                "ja": "これは何（なん）という料理（りょうり）ですか。",
                "en": "What is this dish called?"
            },
            {
                "ja": "もう十分（じゅうぶん）いただきました。",
                "en": "I’ve had plenty, thank you."
            },
            {
                "ja": "そろそろ失礼（しつれい）します。",
                "en": "I should be going now."
            },
            {
                "ja": "今日（きょう）は本当（ほんとう）にお世話（せわ）になりました。",
                "en": "Thank you so much for everything today."
            }
        ],
        "usage": [
            {
                "ja": "家（いえ）に上（あ）がる時（とき）は「お邪魔（じゃま）します」、帰（かえ）る時（とき）は「お邪魔（じゃま）しました」と言（い）います。玄関（げんかん）で靴（くつ）を脱（ぬ）ぐ前（まえ）に言（い）うのが自然（しぜん）です。",
                "en": "Say “Ojama shimasu” when you step into someone’s home and “Ojama shimashita” when you leave. It’s natural to say it at the entrance before you take off your shoes."
            },
            {
                "ja": "手土産（てみやげ）は紙袋（かみぶくろ）から出（だ）して、両手（りょうて）で渡（わた）すのがていねいです。「皆（みな）さんで召（め）し上（あ）がってください」と言（い）って渡（わた）すと自然（しぜん）です。",
                "en": "It’s polite to take the gift out of its paper bag and hand it over with both hands. Saying “Minasan de meshiagatte kudasai” (Please enjoy it together) as you hand it over sounds natural."
            },
            {
                "ja": "苦手（にがて）な食（た）べ物（もの）は、「嫌（きら）いです」より「少（すこ）し苦手（にがて）なんです」と言（い）うほうがやわらかく聞（き）こえます。おかわりを断（ことわ）る時（とき）は「もう十分（じゅうぶん）いただきました」と言（い）いましょう。",
                "en": "For food you don’t like, “Sukoshi nigate na n desu” (I’m not very good with it) sounds softer than “Kirai desu” (I don’t like it). To turn down a second helping, say “Mō jūbun itadakimashita.”"
            },
            {
                "ja": "帰（かえ）る時（とき）は、お客（きゃく）さんのほうから「そろそろ失礼（しつれい）します」と言（い）い出（だ）すのがふつうです。次（つぎ）の日（ひ）にメッセージで改（あらた）めてお礼（れい）を伝（つた）えると、とても喜（よろこ）ばれます。",
                "en": "It’s usual for the guest to be the one who says “Sorosoro shitsurei shimasu” when it’s time to leave. Sending another thank-you message the next day will be greatly appreciated."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "家（いえ）に着（つ）いて手土産（てみやげ）を渡（わた）す",
                    "en": "Arriving and giving a gift"
                },
                "lines": [
                    {
                        "speaker": "お母（かあ）さん",
                        "ja": "いらっしゃい。遠（とお）いところ、よく来（き）てくれましたね。",
                        "en": "Welcome! Thank you for coming all this way."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "こんにちは。本日（ほんじつ）はお招（まね）きいただき、ありがとうございます。",
                        "en": "Hello. Thank you for inviting me today."
                    },
                    {
                        "speaker": "お母（かあ）さん",
                        "ja": "どうぞ、上（あ）がってください。",
                        "en": "Please, come on in."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "お邪魔（じゃま）します。靴（くつ）はここで脱（ぬ）げばいいですか。",
                        "en": "Sorry to intrude. Should I take my shoes off here?"
                    },
                    {
                        "speaker": "お母（かあ）さん",
                        "ja": "ええ。スリッパをどうぞ。リビングはこちらです。",
                        "en": "Yes. Here are some slippers. The living room is this way."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "あの、これ、国（くに）のお菓子（かし）なんです。ほんの気持（きも）ちですが、皆（みな）さんで召（め）し上（あ）がってください。",
                        "en": "Um, these are sweets from my country. It’s just a small token, but please enjoy them with everyone."
                    },
                    {
                        "speaker": "お母（かあ）さん",
                        "ja": "まあ、ありがとう。気（き）を遣（つか）わなくてもよかったのに。",
                        "en": "Oh, thank you. You really didn’t have to."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "お口（くち）に合（あ）うといいんですが。",
                        "en": "I hope you like them."
                    },
                    {
                        "speaker": "お母（かあ）さん",
                        "ja": "夫（おっと）も甘（あま）いものが大好（だいす）きなので、きっと喜（よろこ）びます。",
                        "en": "My husband loves sweets too, so I’m sure he’ll be happy."
                    }
                ]
            },
            {
                "title": {
                    "ja": "食事（しょくじ）と帰（かえ）りのあいさつ",
                    "en": "Dinner and saying goodbye"
                },
                "lines": [
                    {
                        "speaker": "お母（かあ）さん",
                        "ja": "たくさん作（つく）ったので、どうぞ召（め）し上（あ）がってください。",
                        "en": "I made plenty, so please help yourself."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ありがとうございます。では、遠慮（えんりょ）なくいただきます。",
                        "en": "Thank you. Then I’ll help myself."
                    },
                    {
                        "speaker": "お父（とう）さん",
                        "ja": "お刺身（さしみ）は大丈夫（だいじょうぶ）ですか。",
                        "en": "Is sashimi all right for you?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "食（た）べられないわけではないんですが、少（すこ）し苦手（にがて）なんです。でも、この煮物（にもの）はとてもおいしいです。",
                        "en": "It’s not that I can’t eat it, but I’m not very fond of it. This simmered dish is really delicious, though."
                    },
                    {
                        "speaker": "お母（かあ）さん",
                        "ja": "よかった。肉（にく）じゃがっていうんですよ。もう少（すこ）しいかがですか。",
                        "en": "I’m glad. It’s called nikujaga. Would you like a little more?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ありがとうございます。でも、もう十分（じゅうぶん）いただきました。ごちそうさまでした。",
                        "en": "Thank you, but I’ve had plenty. Thank you for the meal."
                    },
                    {
                        "speaker": "お母（かあ）さん",
                        "ja": "お粗末（そまつ）さまでした。",
                        "en": "Oh, it was nothing special."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "もうこんな時間（じかん）ですね。そろそろ失礼（しつれい）します。今日（きょう）は本当（ほんとう）にお世話（せわ）になりました。",
                        "en": "Oh, look at the time. I should be going. Thank you so much for everything today."
                    },
                    {
                        "speaker": "お父（とう）さん",
                        "ja": "こちらこそ、楽（たの）しかったです。またいつでも遊（あそ）びに来（き）てくださいね。",
                        "en": "We enjoyed it too. Please come and visit again anytime."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ありがとうございます。お邪魔（じゃま）しました。",
                        "en": "Thank you. Thank you for having me."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "本日（ほんじつ）はお招（まね）き（　　）、ありがとうございます。",
                "answer": "いただき",
                "en": "Thank you for inviting me today."
            },
            {
                "q": "ほんの気持（きも）ちですが、皆（みな）さんで（　　）ください。",
                "answer": "召（め）し上（あ）がって",
                "en": "It’s just a small token, but please enjoy it with everyone."
            },
            {
                "q": "靴（くつ）はここで（　　）いいですか。",
                "answer": "脱（ぬ）げば",
                "en": "Should I take my shoes off here?"
            },
            {
                "q": "気（き）を遣（つか）わなくてもよかった（　　）。",
                "answer": "のに",
                "en": "You really didn’t have to go to the trouble."
            },
            {
                "q": "生（なま）の魚（さかな）が食（た）べられない（　　）んですが、少（すこ）し苦手（にがて）なんです。",
                "answer": "わけではない",
                "en": "It’s not that I can’t eat raw fish, but I’m not very fond of it."
            },
            {
                "q": "もう十分（じゅうぶん）（　　）。",
                "answer": "いただきました",
                "en": "I’ve had plenty, thank you."
            },
            {
                "q": "今日（きょう）は本当（ほんとう）にお世話（せわ）に（　　）。",
                "answer": "なりました",
                "en": "Thank you so much for everything today."
            },
            {
                "q": "日本（にほん）の家（いえ）では、脱（ぬ）いだ靴（くつ）をそろえる（　　）。",
                "answer": "ようにしています",
                "en": "In Japanese homes, I make a point of lining up the shoes I take off."
            }
        ],
        "culture": {
            "ja": "日本（にほん）の家（いえ）では、玄関（げんかん）で靴（くつ）を脱（ぬ）いだら、つま先（さき）をドアのほうに向（む）けてそろえておくとていねいです。たたみの部屋（へや）では、スリッパも脱（ぬ）ぎます。穴（あな）の開（あ）いた靴下（くつした）は目立（めだ）つので、訪問（ほうもん）する日（ひ）はきれいな靴下（くつした）をはいていきましょう。",
            "en": "In Japanese homes, after taking off your shoes at the entrance, it’s polite to line them up with the toes pointing toward the door. In tatami rooms, take off your slippers too. Holes in your socks are easy to notice, so wear clean socks on the day of your visit."
        }
    },
    {
        "id": "local_transport",
        "title": "地方（ちほう）の移動（いどう）",
        "subtitle": "バスとレンタカー",
        "titleEn": "Getting around rural areas: buses and rental cars",
        "goal": {
            "ja": "本数（ほんすう）の少（すく）ないバスの時間（じかん）や乗（の）り方（かた）を確（たし）かめられる。レンタカーを借（か）りて、ガソリンを入（い）れられる。",
            "en": "Check the times and how to ride buses that run only a few times a day, rent a car, and fill up with gas."
        },
        "phrases": [
            {
                "ja": "次（つぎ）の川上温泉行（かわかみおんせんゆ）きのバスは何時（なんじ）ですか。",
                "en": "What time is the next bus to Kawakami Onsen?"
            },
            {
                "ja": "一日（いちにち）に何本（なんぼん）ありますか。",
                "en": "How many buses are there a day?"
            },
            {
                "ja": "乗（の）る時（とき）に、整理券（せいりけん）を取（と）ればいいんですよね。",
                "en": "I just take a numbered ticket when I get on, right?"
            },
            {
                "ja": "運賃（うんちん）は降（お）りる時（とき）に払（はら）うんですか。",
                "en": "Do I pay the fare when I get off?"
            },
            {
                "ja": "千円札（せんえんさつ）を両替（りょうがえ）できますか。",
                "en": "Can I get change for a 1,000-yen bill?"
            },
            {
                "ja": "川上温泉（かわかみおんせん）に着（つ）いたら、教（おし）えていただけませんか。",
                "en": "Could you let me know when we get to Kawakami Onsen?"
            },
            {
                "ja": "バスが少（すく）ないので、レンタカーを借（か）りることにしました。",
                "en": "There aren’t many buses, so I decided to rent a car."
            },
            {
                "ja": "予約（よやく）していたジョンソンです。",
                "en": "I’m Johnson. I have a reservation."
            },
            {
                "ja": "国際運転免許証（こくさいうんてんめんきょしょう）を持（も）ってきました。",
                "en": "I’ve brought my international driving permit."
            },
            {
                "ja": "保険（ほけん）は料金（りょうきん）に含（ふく）まれていますか。",
                "en": "Is insurance included in the price?"
            },
            {
                "ja": "ガソリンは満（まん）タンにして返（かえ）すんですか。",
                "en": "Do I need to return it with a full tank?"
            },
            {
                "ja": "レギュラー満（まん）タンでお願（ねが）いします。",
                "en": "Regular, fill it up, please."
            }
        ],
        "usage": [
            {
                "ja": "地方（ちほう）のバスは、一日（いちにち）に数本（すうほん）しかないこともあります。「一日（いちにち）に何本（なんぼん）ありますか」「最終（さいしゅう）は何時（なんじ）ですか」と、乗（の）る前（まえ）に確（たし）かめておきましょう。",
                "en": "Rural buses may run only a few times a day. Before you ride, check by asking “Ichinichi ni nanbon arimasu ka” (How many a day?) and “Saishū wa nanji desu ka” (What time is the last one?)."
            },
            {
                "ja": "整理券（せいりけん）は、乗（の）ったバス停（てい）の番号（ばんごう）が書（か）いてある紙（かみ）です。降（お）りる時（とき）は、前（まえ）の画面（がめん）でその番号（ばんごう）の運賃（うんちん）を確（たし）かめて、整理券（せいりけん）といっしょに運賃箱（うんちんばこ）に入（い）れます。",
                "en": "A seiriken is a slip of paper showing the number of the stop where you got on. When you get off, check the fare for that number on the screen at the front, and put the fare and the ticket in the fare box together."
            },
            {
                "ja": "運賃箱（うんちんばこ）はおつりが出（で）ないことが多（おお）いです。小銭（こぜに）がない時（とき）は、バスが止（と）まっている間（あいだ）に、運賃箱（うんちんばこ）の両替機（りょうがえき）で千円札（せんえんさつ）を両替（りょうがえ）しておきましょう。ICカードが使（つか）えるバスなら、乗（の）る時（とき）と降（お）りる時（とき）にタッチするだけです。",
                "en": "Fare boxes often don’t give change. If you don’t have coins, change a 1,000-yen bill at the change machine on the fare box while the bus is stopped. If the bus accepts IC cards, just tap your card when you get on and off."
            },
            {
                "ja": "日本（にほん）で車（くるま）を運転（うんてん）するには、国際運転免許証（こくさいうんてんめんきょしょう）か、国（くに）によっては免許証（めんきょしょう）の日本語訳（にほんごやく）が必要（ひつよう）です。借（か）りる日（ひ）は、自分（じぶん）の国（くに）の免許証（めんきょしょう）とパスポートも持（も）っていきましょう。",
                "en": "To drive in Japan, you need an international driving permit or, for some countries, an official Japanese translation of your license. On the day you rent, bring your own license and your passport too."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "本数（ほんすう）の少（すく）ないバスに乗（の）る",
                    "en": "Taking a bus that runs only a few times a day"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、このバスは川上温泉（かわかみおんせん）に行（い）きますか。",
                        "en": "Excuse me, does this bus go to Kawakami Onsen?"
                    },
                    {
                        "speaker": "運転手（うんてんしゅ）",
                        "ja": "行（い）きますよ。終点（しゅうてん）の一（ひと）つ手前（てまえ）です。",
                        "en": "Yes, it does. It’s the stop before the last one."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "乗（の）る時（とき）に、整理券（せいりけん）を取（と）ればいいんですよね。",
                        "en": "I just take a numbered ticket when I get on, right?"
                    },
                    {
                        "speaker": "運転手（うんてんしゅ）",
                        "ja": "そうです。降（お）りる時（とき）に、整理券（せいりけん）といっしょに運賃（うんちん）を入（い）れてください。",
                        "en": "That’s right. When you get off, put the fare in together with the ticket."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "千円札（せんえんさつ）しかないんですが、両替（りょうがえ）できますか。",
                        "en": "I only have a 1,000-yen bill. Can I get change?"
                    },
                    {
                        "speaker": "運転手（うんてんしゅ）",
                        "ja": "はい、運賃箱（うんちんばこ）でできますよ。バスが止（と）まっている時（とき）にお願（ねが）いします。",
                        "en": "Yes, you can do it at the fare box. Please do it while the bus is stopped."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "分（わ）かりました。帰（かえ）りのバスは一日（いちにち）に何本（なんぼん）ありますか。",
                        "en": "Got it. How many return buses are there a day?"
                    },
                    {
                        "speaker": "運転手（うんてんしゅ）",
                        "ja": "三本（さんぼん）だけです。最終（さいしゅう）は夕方（ゆうがた）4時（よじ）10分（じゅっぷん）ですよ。",
                        "en": "Only three. The last one is at 4:10 in the afternoon."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "そんなに早（はや）いんですか。乗（の）り遅（おく）れないようにします。あと、川上温泉（かわかみおんせん）に着（つ）いたら、教（おし）えていただけませんか。",
                        "en": "That early? I’ll make sure not to miss it. Also, could you let me know when we get to Kawakami Onsen?"
                    },
                    {
                        "speaker": "運転手（うんてんしゅ）",
                        "ja": "いいですよ。アナウンスもありますから、安心（あんしん）してください。",
                        "en": "Sure. There will also be an announcement, so don’t worry."
                    }
                ]
            },
            {
                "title": {
                    "ja": "レンタカーを借（か）りる",
                    "en": "Renting a car"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "こんにちは。予約（よやく）していたジョンソンです。",
                        "en": "Hello. I’m Johnson. I have a reservation."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "ジョンソン様（さま）ですね。国際運転免許証（こくさいうんてんめんきょしょう）とパスポートを拝見（はいけん）できますか。",
                        "en": "Mr./Ms. Johnson, yes. May I see your international driving permit and passport?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい、どうぞ。保険（ほけん）は料金（りょうきん）に含（ふく）まれていますか。",
                        "en": "Here you are. Is insurance included in the price?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "基本（きほん）の保険（ほけん）は含（ふく）まれています。追加（ついか）の補償（ほしょう）は一日（いちにち）1,100円（せんひゃくえん）です。",
                        "en": "Basic insurance is included. Extra coverage is 1,100 yen per day."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "山道（やまみち）を走（はし）るので、追加（ついか）の補償（ほしょう）もお願（ねが）いします。",
                        "en": "I’ll be driving on mountain roads, so I’d like the extra coverage too."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "かしこまりました。ガソリンは満（まん）タンにしてお返（かえ）しください。",
                        "en": "Certainly. Please return the car with a full tank."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "この近（ちか）くにガソリンスタンドはありますか。",
                        "en": "Is there a gas station near here?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "駅前（えきまえ）にあります。夜（よる）7時（しちじ）に閉（し）まるので、気（き）をつけてください。",
                        "en": "There’s one in front of the station. It closes at 7 p.m., so please keep that in mind."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "分（わ）かりました。早（はや）めに入（い）れるようにします。",
                        "en": "Got it. I’ll make sure to fill up early."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "時刻表（じこくひょう）を先（さき）に調（しら）べて（　　）よかったです。",
                "answer": "おけば",
                "en": "I should have checked the timetable beforehand."
            },
            {
                "q": "乗（の）る時（とき）に、整理券（せいりけん）を（　　）いいんですよね。",
                "answer": "取（と）れば",
                "en": "I just take a numbered ticket when I get on, right?"
            },
            {
                "q": "川上温泉（かわかみおんせん）に着（つ）いたら、教（おし）えて（　　）。",
                "answer": "いただけませんか",
                "en": "Could you let me know when we get to Kawakami Onsen?"
            },
            {
                "q": "バスが少（すく）ないので、レンタカーを借（か）りる（　　）。",
                "answer": "ことにしました",
                "en": "There aren’t many buses, so I decided to rent a car."
            },
            {
                "q": "最終（さいしゅう）のバスに乗（の）り遅（おく）れない（　　）。",
                "answer": "ようにします",
                "en": "I’ll make sure not to miss the last bus."
            },
            {
                "q": "保険（ほけん）は料金（りょうきん）に（　　）か。",
                "answer": "含（ふく）まれています",
                "en": "Is insurance included in the price?"
            },
            {
                "q": "レギュラー（　　）でお願（ねが）いします。",
                "answer": "満（まん）タン",
                "en": "Regular, fill it up, please."
            },
            {
                "q": "冬（ふゆ）はこの道（みち）が雪（ゆき）で通（とお）れなくなる（　　）。",
                "answer": "そうです",
                "en": "I hear this road becomes impassable in winter because of snow."
            }
        ],
        "culture": {
            "ja": "地方（ちほう）のガソリンスタンドは、夜（よる）早（はや）く閉（し）まったり、日曜日（にちようび）が休（やす）みだったりすることがあります。店員（てんいん）が入（い）れてくれる店（みせ）では、窓（まど）を開（あ）けて「レギュラー満（まん）タンで」と言（い）うだけで大丈夫（だいじょうぶ）です。山（やま）の多（おお）い地域（ちいき）では、ガソリンが半分（はんぶん）くらいになったら、早（はや）めに入（い）れておきましょう。",
            "en": "In rural areas, gas stations may close early in the evening or be closed on Sundays. At full-service stations, you can just open your window and say “Regyurā mantan de” (Regular, full tank). In mountainous areas, fill up early, when you’re down to about half a tank."
        }
    },
    {
        "id": "experience",
        "title": "体験（たいけん）の申（もう）し込（こ）み",
        "subtitle": "着物（きもの）や茶道（さどう）",
        "titleEn": "Booking an experience: kimono and tea ceremony",
        "goal": {
            "ja": "着物（きもの）や茶道（さどう）などの体験（たいけん）を申（もう）し込（こ）み、料金（りょうきん）に含（ふく）まれるもの・時間（じかん）・ルール・キャンセルについて確（たし）かめられる。",
            "en": "Book an experience such as kimono or tea ceremony, and check what’s included, the times, the rules, and the cancellation policy."
        },
        "phrases": [
            {
                "ja": "着物（きもの）の体験（たいけん）を申（もう）し込（こ）みたいんですが。",
                "en": "I’d like to book a kimono experience."
            },
            {
                "ja": "明日（あした）の午後（ごご）、二人（ふたり）で予約（よやく）できますか。",
                "en": "Can we book for two people tomorrow afternoon?"
            },
            {
                "ja": "料金（りょうきん）には何（なに）が含（ふく）まれていますか。",
                "en": "What is included in the price?"
            },
            {
                "ja": "着付（きつ）けと髪（かみ）のセットもお願（ねが）いできますか。",
                "en": "Could I also have help with dressing and hair styling?"
            },
            {
                "ja": "着物（きもの）を着（き）たまま、町（まち）を歩（ある）いてもいいですか。",
                "en": "May I walk around town in the kimono?"
            },
            {
                "ja": "何時（なんじ）までに返（かえ）せばいいですか。",
                "en": "By what time should I return it?"
            },
            {
                "ja": "雨（あめ）の場合（ばあい）はどうなりますか。",
                "en": "What happens if it rains?"
            },
            {
                "ja": "キャンセルはいつまでできますか。",
                "en": "Until when can I cancel?"
            },
            {
                "ja": "初（はじ）めてでも参加（さんか）できますか。",
                "en": "Can I take part even if it’s my first time?"
            },
            {
                "ja": "正座（せいざ）が苦手（にがて）なんですが、大丈夫（だいじょうぶ）でしょうか。",
                "en": "I find kneeling (seiza) difficult. Will that be all right?"
            },
            {
                "ja": "写真（しゃしん）を撮（と）らせていただけますか。",
                "en": "May I take photos?"
            },
            {
                "ja": "すみません、今（いま）、何（なん）とおっしゃいましたか。",
                "en": "Excuse me, what did you just say?"
            }
        ],
        "usage": [
            {
                "ja": "申（もう）し込（こ）む前（まえ）に、「料金（りょうきん）には何（なに）が含（ふく）まれていますか」と聞（き）いておくと安心（あんしん）です。着付（きつ）けや髪（かみ）のセット、バッグや草履（ぞうり）などが別料金（べつりょうきん）のこともあります。",
                "en": "Before booking, it’s a good idea to ask “Ryōkin ni wa nani ga fukumarete imasu ka” (What’s included in the price?). Dressing, hair styling, or items such as bags and sandals sometimes cost extra."
            },
            {
                "ja": "キャンセルの決（き）まりは、店（みせ）によって違（ちが）います。「キャンセルはいつまでできますか」「雨（あめ）の場合（ばあい）はどうなりますか」と、予約（よやく）の時（とき）に確（たし）かめておきましょう。",
                "en": "Cancellation rules differ from place to place. When you book, check “Kyanseru wa itsu made dekimasu ka” (Until when can I cancel?) and “Ame no baai wa dō narimasu ka” (What happens if it rains?)."
            },
            {
                "ja": "写真（しゃしん）を撮（と）りたい時（とき）は、「撮（と）らせていただけますか」と先（さき）に聞（き）きましょう。茶室（ちゃしつ）や寺（てら）の中（なか）など、撮影（さつえい）できない場所（ばしょ）もあります。",
                "en": "If you want to take photos, ask first with “Torasete itadakemasu ka.” Photography isn’t allowed in some places, such as inside tea rooms and temples."
            },
            {
                "ja": "説明（せつめい）が聞（き）き取（と）れなかった時（とき）は、「今（いま）、何（なん）とおっしゃいましたか」と聞（き）き返（かえ）しましょう。先生（せんせい）やお店（みせ）の人（ひと）にも使（つか）える、ていねいな言（い）い方（かた）です。",
                "en": "If you didn’t catch an explanation, ask “Ima, nan to osshaimashita ka.” It’s a polite way to ask teachers or staff to repeat themselves."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "着物（きもの）レンタルを予約（よやく）する",
                    "en": "Booking a kimono rental"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、着物（きもの）の体験（たいけん）を申（もう）し込（こ）みたいんですが。",
                        "en": "Excuse me, I’d like to book a kimono experience."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "ありがとうございます。ご希望（きぼう）の日（ひ）にちはございますか。",
                        "en": "Thank you. Do you have a date in mind?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "明日（あした）の午後（ごご）、二人（ふたり）で予約（よやく）できますか。",
                        "en": "Can we book for two people tomorrow afternoon?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "はい、1時（いちじ）からでしたら空（あ）いております。",
                        "en": "Yes, we have openings from 1 o’clock."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "料金（りょうきん）には何（なに）が含（ふく）まれていますか。",
                        "en": "What is included in the price?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "着物（きもの）と帯（おび）、着付（きつ）け、バッグと草履（ぞうり）です。髪（かみ）のセットは別料金（べつりょうきん）で、1,500円（せんごひゃくえん）です。",
                        "en": "The kimono and obi, dressing, a bag, and zori sandals. Hair styling costs extra: 1,500 yen."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "じゃあ、髪（かみ）のセットもお願（ねが）いします。着物（きもの）を着（き）たまま、町（まち）を歩（ある）いてもいいですか。",
                        "en": "Then we’d like hair styling too. May we walk around town in the kimono?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "はい、どうぞ。夕方（ゆうがた）5時（ごじ）までにお返（かえ）しください。",
                        "en": "Yes, of course. Please return it by 5 p.m."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "分（わ）かりました。雨（あめ）の場合（ばあい）は、キャンセルできますか。",
                        "en": "All right. Can we cancel if it rains?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "前日（ぜんじつ）までなら無料（むりょう）です。当日（とうじつ）のキャンセルは、料金（りょうきん）の半分（はんぶん）をいただいております。",
                        "en": "It’s free until the day before. For cancellations on the day, we charge half the price."
                    }
                ]
            },
            {
                "title": {
                    "ja": "茶道（さどう）を体験（たいけん）する",
                    "en": "Trying a tea ceremony"
                },
                "lines": [
                    {
                        "speaker": "先生（せんせい）",
                        "ja": "ようこそいらっしゃいました。茶道（さどう）は初（はじ）めてですか。",
                        "en": "Welcome. Is this your first time trying tea ceremony?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい、初（はじ）めてです。正座（せいざ）が苦手（にがて）なんですが、大丈夫（だいじょうぶ）でしょうか。",
                        "en": "Yes, it’s my first time. I find kneeling (seiza) difficult. Will that be all right?"
                    },
                    {
                        "speaker": "先生（せんせい）",
                        "ja": "足（あし）が痛（いた）くなったら、崩（くず）してもかまいませんよ。",
                        "en": "If your legs start to hurt, feel free to sit more comfortably."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "よかった。あの、写真（しゃしん）を撮（と）らせていただけますか。",
                        "en": "That’s a relief. Um, may I take some photos?"
                    },
                    {
                        "speaker": "先生（せんせい）",
                        "ja": "お点前（てまえ）の間（あいだ）はご遠慮（えんりょ）ください。終（お）わってからなら、どうぞ。",
                        "en": "Please don’t take photos while I’m preparing the tea. Afterward is fine."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "分（わ）かりました。終（お）わってから撮（と）るようにします。",
                        "en": "I understand. I’ll wait until afterward to take them."
                    },
                    {
                        "speaker": "先生（せんせい）",
                        "ja": "では、先（さき）にお菓子（かし）を召（め）し上（あ）がってください。",
                        "en": "Now, please have the sweet first."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、今（いま）、何（なん）とおっしゃいましたか。",
                        "en": "Excuse me, what did you just say?"
                    },
                    {
                        "speaker": "先生（せんせい）",
                        "ja": "お茶（ちゃ）の前（まえ）に、お菓子（かし）を食（た）べてくださいという意味（いみ）です。",
                        "en": "I mean, please eat the sweet before the tea."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "そうなんですね。では、いただきます。",
                        "en": "I see. Then I’ll have it. Thank you."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "料金（りょうきん）には何（なに）が（　　）か。",
                "answer": "含（ふく）まれています",
                "en": "What is included in the price?"
            },
            {
                "q": "着物（きもの）を（　　）まま、町（まち）を歩（ある）いてもいいですか。",
                "answer": "着（き）た",
                "en": "May I walk around town in the kimono?"
            },
            {
                "q": "何時（なんじ）までに（　　）いいですか。",
                "answer": "返（かえ）せば",
                "en": "By what time should I return it?"
            },
            {
                "q": "写真（しゃしん）を（　　）いただけますか。",
                "answer": "撮（と）らせて",
                "en": "May I take photos?"
            },
            {
                "q": "すみません、今（いま）、何（なん）と（　　）か。",
                "answer": "おっしゃいました",
                "en": "Excuse me, what did you just say?"
            },
            {
                "q": "先（さき）にお菓子（かし）を（　　）ください。",
                "answer": "召（め）し上（あ）がって",
                "en": "Please have the sweet first."
            },
            {
                "q": "当日（とうじつ）のキャンセルは、料金（りょうきん）の半分（はんぶん）がかかる（　　）。",
                "answer": "そうです",
                "en": "I heard that cancelling on the day costs half the price."
            },
            {
                "q": "雨（あめ）が降（ふ）りそうなので、着物（きもの）は明日（あした）にする（　　）。",
                "answer": "ことにしました",
                "en": "It looks like rain, so I’ve decided to do the kimono tomorrow."
            }
        ],
        "culture": {
            "ja": "茶道（さどう）では、お菓子（かし）を先（さき）に食（た）べてから、お茶（ちゃ）をいただきます。飲（の）む前（まえ）に茶碗（ちゃわん）を少（すこ）し回（まわ）すのは、茶碗（ちゃわん）の正面（しょうめん）から飲（の）まないようにするためです。茶室（ちゃしつ）に入（はい）る前（まえ）に、道具（どうぐ）を傷（きず）つけないよう、指輪（ゆびわ）や時計（とけい）を外（はず）しておくとていねいです。",
            "en": "In tea ceremony, you eat the sweet first and then drink the tea. You turn the bowl a little before drinking so that you don’t drink from its front. Before entering the tea room, it’s polite to take off rings and watches so they don’t scratch the utensils."
        }
    }
];
