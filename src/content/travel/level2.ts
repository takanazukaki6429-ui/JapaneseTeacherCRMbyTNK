/**
 * 旅行のテキスト レベル2（2026-10-09 かずき決定・9-2／2026-10-10 充実）
 *
 * - 対象：旅行に少し慣れた人（N4 くらい）
 * - 5場面：旅館と温泉／観光案内所／予約の変更／居酒屋／新幹線
 * - 1場面＝目標・フレーズ12・使う場面4・会話2本・穴埋め8・文化のひとこと（2026-10-10 かずき決定）
 * - よみは教科書と同じ「漢字（かんじ）」の形。英語の訳を付ける
 * - 中身は Claude が書いた。あいちゃんに見てもらって直す・増やす
 * 型と並べ方は lib/travel.ts。下書きの確かめ方は scratchpad の validate_travel.py（テストは lib/__tests__/travel.test.ts）
 */
import type { TravelScene } from '@/lib/travel';

export const TRAVEL_LEVEL2: TravelScene[] = [
    {
        "id": "ryokan",
        "title": "旅館（りょかん）と温泉（おんせん）",
        "subtitle": "泊（と）まり方（かた）とマナー",
        "titleEn": "Ryokan and hot springs: staying and manners",
        "goal": {
            "ja": "旅館（りょかん）でチェックインして、夕食（ゆうしょく）の時間（じかん）を決（き）められる。浴衣（ゆかた）や温泉（おんせん）のルールについて質問（しつもん）できる。",
            "en": "Check in at a ryokan and choose your dinner time. Ask questions about yukata and hot spring rules."
        },
        "phrases": [
            {
                "ja": "予約（よやく）しているスミスですが、チェックインをお願（ねが）いします。",
                "en": "I’m Smith, and I have a reservation. I’d like to check in, please."
            },
            {
                "ja": "チェックインの前（まえ）に、荷物（にもつ）を預（あず）けてもいいですか。",
                "en": "May I leave my luggage with you before check-in?"
            },
            {
                "ja": "夕食（ゆうしょく）は7時（しちじ）でお願（ねが）いします。",
                "en": "Dinner at seven, please."
            },
            {
                "ja": "朝食（ちょうしょく）は何時（なんじ）から何時（なんじ）までですか。",
                "en": "What are the breakfast hours?"
            },
            {
                "ja": "浴衣（ゆかた）の着方（きかた）を教（おし）えてください。",
                "en": "Please show me how to wear the yukata."
            },
            {
                "ja": "もう少（すこ）し大（おお）きい浴衣（ゆかた）はありますか。",
                "en": "Do you have a slightly bigger yukata?"
            },
            {
                "ja": "浴衣（ゆかた）で外（そと）を歩（ある）いてもいいですか。",
                "en": "May I walk outside in the yukata?"
            },
            {
                "ja": "温泉（おんせん）は何時（なんじ）まで入（はい）ることができますか。",
                "en": "Until what time can I use the hot spring?"
            },
            {
                "ja": "タオルを持（も）って行（い）ったほうがいいですか。",
                "en": "Should I bring a towel?"
            },
            {
                "ja": "タトゥーがあるんですが、温泉（おんせん）に入（はい）ってもいいですか。",
                "en": "I have a tattoo. Is it all right for me to use the hot spring?"
            },
            {
                "ja": "貸切風呂（かしきりぶろ）を予約（よやく）したいんですが。",
                "en": "I’d like to book the private bath."
            },
            {
                "ja": "明日（あした）は早（はや）く出（で）るので、朝食（ちょうしょく）の時間（じかん）を早（はや）くしてもらえますか。",
                "en": "We’re leaving early tomorrow, so could we have breakfast earlier?"
            }
        ],
        "usage": [
            {
                "ja": "旅館（りょかん）では、チェックインの時（とき）に夕食（ゆうしょく）の時間（じかん）を聞（き）かれることが多（おお）いです。「7時（しちじ）でお願（ねが）いします」のように、時間（じかん）を決（き）めて答（こた）えましょう。",
                "en": "At a ryokan, you are often asked what time you’d like dinner when you check in. Pick a time and answer, for example “shichi-ji de onegaishimasu” (seven o’clock, please)."
            },
            {
                "ja": "「〜んですが」で先（さき）に自分（じぶん）のことを話（はな）してから質問（しつもん）すると、ていねいに聞（き）こえます。タトゥーがある人（ひと）は大浴場（だいよくじょう）に入（はい）れないことがあるので、「タトゥーがあるんですが」と先（さき）に聞（き）いておきましょう。",
                "en": "Explaining your situation first with “… n desu ga” and then asking sounds polite. People with tattoos may not be allowed in the large public bath, so ask in advance: “tatū ga aru n desu ga …”"
            },
            {
                "ja": "浴衣（ゆかた）は、左（ひだり）を右（みぎ）の上（うえ）に重（かさ）ねて着（き）ます。反対（はんたい）は亡（な）くなった人（ひと）の着方（きかた）なので、気（き）をつけましょう。わからない時（とき）は「浴衣（ゆかた）の着方（きかた）を教（おし）えてください」と聞（き）けば、教（おし）えてくれます。",
                "en": "Wear a yukata with the left side over the right. The opposite way is how the dead are dressed, so be careful. If you’re not sure, ask “yukata no kikata o oshiete kudasai” and the staff will show you."
            },
            {
                "ja": "温泉（おんせん）の入口（いりぐち）には、「男（おとこ）」「女（おんな）」と書（か）いてあるのれんがあります。青（あお）が男湯（おとこゆ）、赤（あか）が女湯（おんなゆ）のことが多（おお）いです。時間（じかん）で入（い）れ替（か）わる旅館（りょかん）もあるので、入（はい）る前（まえ）に必（かなら）ず確（たし）かめましょう。",
                "en": "Bath entrances have curtains marked with the kanji for “man” and “woman.” Blue is often the men’s bath and red the women’s. At some ryokan the two baths switch depending on the time, so always check before you go in."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "チェックインと食事（しょくじ）の時間（じかん）",
                    "en": "Checking in and meal times"
                },
                "lines": [
                    {
                        "speaker": "フロント",
                        "ja": "いらっしゃいませ。",
                        "en": "Welcome."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "予約（よやく）しているスミスですが、チェックインをお願（ねが）いします。",
                        "en": "I’m Smith, and I have a reservation. I’d like to check in, please."
                    },
                    {
                        "speaker": "フロント",
                        "ja": "スミス様（さま）、2名様（にめいさま）で1泊（いっぱく）ですね。夕食（ゆうしょく）は6時（ろくじ）と7時（しちじ）、どちらがよろしいですか。",
                        "en": "Mr./Ms. Smith, two people for one night. Would you like dinner at six or at seven?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "7時（しちじ）でお願（ねが）いします。夕食（ゆうしょく）はどこで食（た）べますか。",
                        "en": "Seven, please. Where do we have dinner?"
                    },
                    {
                        "speaker": "フロント",
                        "ja": "お部屋（へや）にお持（も）ちします。朝食（ちょうしょく）は1階（いっかい）の食堂（しょくどう）で、7時（しちじ）から9時（くじ）までです。",
                        "en": "We’ll bring it to your room. Breakfast is in the dining room on the first floor, from seven to nine."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "浴衣（ゆかた）を着（き）て、食堂（しょくどう）に行（い）ってもいいですか。",
                        "en": "May we go to the dining room in our yukata?"
                    },
                    {
                        "speaker": "フロント",
                        "ja": "はい、もちろんです。浴衣（ゆかた）はお部屋（へや）にありますので、どうぞ着（き）てください。",
                        "en": "Yes, of course. There are yukata in your room, so please feel free to wear them."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ありがとうございます。温泉（おんせん）は何時（なんじ）まで入（はい）ることができますか。",
                        "en": "Thank you. Until what time can we use the hot spring?"
                    },
                    {
                        "speaker": "フロント",
                        "ja": "夜（よる）は12時（じゅうにじ）までです。朝（あさ）は5時（ごじ）から入（はい）れます。",
                        "en": "Until midnight. In the morning, you can use it from five."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "わかりました。",
                        "en": "I see."
                    }
                ]
            },
            {
                "title": {
                    "ja": "温泉（おんせん）のルールを聞（き）く",
                    "en": "Asking about hot spring rules"
                },
                "lines": [
                    {
                        "speaker": "仲居（なかい）さん",
                        "ja": "こちらがお部屋（へや）です。何（なに）かあったら、フロントに電話（でんわ）してください。",
                        "en": "This is your room. If you need anything, please call the front desk."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、温泉（おんせん）にタオルを持（も）って行（い）ったほうがいいですか。",
                        "en": "Excuse me, should I bring a towel to the hot spring?"
                    },
                    {
                        "speaker": "仲居（なかい）さん",
                        "ja": "はい、お部屋（へや）のタオルを持（も）って行（い）ってください。小（ちい）さいタオルは、お湯（ゆ）に入（い）れないでくださいね。",
                        "en": "Yes, please take the towels in your room. Please don’t put the small towel in the water."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "わかりました。それから、タトゥーがあるんですが、温泉（おんせん）に入（はい）ってもいいですか。",
                        "en": "I see. Also, I have a tattoo. Is it all right for me to use the hot spring?"
                    },
                    {
                        "speaker": "仲居（なかい）さん",
                        "ja": "申（もう）し訳（わけ）ありませんが、大浴場（だいよくじょう）には入（はい）ることができません。でも、貸切風呂（かしきりぶろ）なら大丈夫（だいじょうぶ）です。",
                        "en": "I’m sorry, but you can’t use the large public bath. The private bath is fine, though."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "じゃあ、貸切風呂（かしきりぶろ）を予約（よやく）したいんですが。",
                        "en": "Then I’d like to book the private bath."
                    },
                    {
                        "speaker": "仲居（なかい）さん",
                        "ja": "はい。何時（なんじ）がよろしいですか。1回（いっかい）45分（よんじゅうごふん）です。",
                        "en": "Certainly. What time would you like? Each booking is 45 minutes."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "夕食（ゆうしょく）の後（あと）、9時（くじ）からお願（ねが）いします。",
                        "en": "From nine, after dinner, please."
                    },
                    {
                        "speaker": "仲居（なかい）さん",
                        "ja": "かしこまりました。9時（くじ）になったら、フロントで鍵（かぎ）を受（う）け取（と）ってください。",
                        "en": "Certainly. At nine, please pick up the key at the front desk."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ありがとうございます。",
                        "en": "Thank you."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "チェックインの前（まえ）に、荷物（にもつ）を預（あず）けても（　　）。",
                "answer": "いいですか",
                "en": "May I leave my luggage with you before check-in?"
            },
            {
                "q": "温泉（おんせん）は何時（なんじ）まで入（はい）る（　　）ができますか。",
                "answer": "こと",
                "en": "Until what time can I use the hot spring?"
            },
            {
                "q": "タオルを持（も）って行（い）った（　　）がいいですか。",
                "answer": "ほう",
                "en": "Should I bring a towel?"
            },
            {
                "q": "タトゥーがある（　　）が、温泉（おんせん）に入（はい）ってもいいですか。",
                "answer": "んです",
                "en": "I have a tattoo. Is it all right for me to use the hot spring?"
            },
            {
                "q": "貸切風呂（かしきりぶろ）を（　　）んですが。",
                "answer": "予約（よやく）したい",
                "en": "I’d like to book the private bath."
            },
            {
                "q": "浴衣（ゆかた）の着方（きかた）を（　　）ください。",
                "answer": "教（おし）えて",
                "en": "Please show me how to wear the yukata."
            },
            {
                "q": "明日（あした）は早（はや）く出（で）る（　　）、朝食（ちょうしょく）の時間（じかん）を早（はや）くしてもらえますか。",
                "answer": "ので",
                "en": "We’re leaving early tomorrow, so could we have breakfast earlier?"
            },
            {
                "q": "温泉（おんせん）から（　　）、水（みず）を飲（の）んだほうがいいです。",
                "answer": "出（で）たら",
                "en": "After you get out of the hot spring, you should drink some water."
            }
        ],
        "culture": {
            "ja": "温泉（おんせん）には、水着（みずぎ）を着（き）ないで入（はい）ります。お湯（ゆ）に入（はい）る前（まえ）に、体（からだ）を洗（あら）ってきれいにしましょう。小（ちい）さいタオルはお湯（ゆ）に入（い）れないで、頭（あたま）の上（うえ）にのせるか、お湯（ゆ）の外（そと）に置（お）きます。",
            "en": "You bathe in a hot spring without a swimsuit. Wash your body before you get into the water. Don’t put your small towel in the water: rest it on your head or leave it outside the bath."
        }
    },
    {
        "id": "tourist_info",
        "title": "観光案内所（かんこうあんないじょ）",
        "subtitle": "おすすめを聞（き）く",
        "titleEn": "Tourist information: asking for recommendations",
        "goal": {
            "ja": "観光案内所（かんこうあんないじょ）で、おすすめの場所（ばしょ）と行（い）き方（かた）、かかる時間（じかん）を聞（き）ける。地図（ちず）やイベントの情報（じょうほう）をもらえる。",
            "en": "Ask at a tourist information center for recommended places, how to get there, and how long it takes. Get maps and information about events."
        },
        "phrases": [
            {
                "ja": "この近（ちか）くで、おすすめの場所（ばしょ）はありますか。",
                "en": "Is there a place around here you’d recommend?"
            },
            {
                "ja": "半日（はんにち）しかないんですが、どこに行（い）ったらいいですか。",
                "en": "I only have half a day. Where should I go?"
            },
            {
                "ja": "雨（あめ）の日（ひ）でも楽（たの）しめる所（ところ）はありますか。",
                "en": "Is there a place I can enjoy even on a rainy day?"
            },
            {
                "ja": "ここからどうやって行（い）ったらいいですか。",
                "en": "How should I get there from here?"
            },
            {
                "ja": "ここから歩（ある）いて行（い）くことができますか。",
                "en": "Can I walk there from here?"
            },
            {
                "ja": "バスで何分（なんぷん）ぐらいかかりますか。",
                "en": "About how many minutes does it take by bus?"
            },
            {
                "ja": "何時（なんじ）まで開（あ）いていますか。",
                "en": "Until what time is it open?"
            },
            {
                "ja": "英語（えいご）の地図（ちず）をもらってもいいですか。",
                "en": "May I have a map in English?"
            },
            {
                "ja": "この地図（ちず）で、どこにあるか教（おし）えてください。",
                "en": "Please show me on this map where it is."
            },
            {
                "ja": "今週末（こんしゅうまつ）、何（なに）かイベントはありますか。",
                "en": "Are there any events this weekend?"
            },
            {
                "ja": "予約（よやく）したほうがいいですか。",
                "en": "Should I make a reservation?"
            },
            {
                "ja": "雨（あめ）が降（ふ）ったら、どうなりますか。",
                "en": "What happens if it rains?"
            }
        ],
        "usage": [
            {
                "ja": "「〜たらいいですか」は、アドバイスがほしい時（とき）に使（つか）います。「どこに行（い）ったらいいですか」「どうやって行（い）ったらいいですか」のように聞（き）きましょう。",
                "en": "Use “… tara ii desu ka” when you want advice, as in “doko ni ittara ii desu ka” (Where should I go?) or “dō yatte ittara ii desu ka” (How should I get there?)."
            },
            {
                "ja": "時間（じかん）や好（す）きなことを先（さき）に話（はな）すと、自分（じぶん）に合（あ）うおすすめを教（おし）えてもらえます。「半日（はんにち）しかないんですが」「お寺（てら）が好（す）きなんですが」のように話（はな）しましょう。",
                "en": "If you first say how much time you have and what you like, you’ll get recommendations that suit you. Say things like “hannichi shika nai n desu ga” (I only have half a day) or “otera ga suki na n desu ga” (I like temples)."
            },
            {
                "ja": "観光案内所（かんこうあんないじょ）には、英語（えいご）の地図（ちず）やパンフレットが置（お）いてあることが多（おお）いです。無料（むりょう）のものは、自由（じゆう）にもらうことができます。",
                "en": "Tourist information centers often have English maps and pamphlets. You can take the free ones as you like."
            },
            {
                "ja": "お寺（てら）や美術館（びじゅつかん）は、5時（ごじ）ごろに閉（し）まる所（ところ）が多（おお）いです。閉（し）まる30分前（さんじゅっぷんまえ）までしか入（はい）れないこともあるので、「何時（なんじ）まで開（あ）いていますか」と聞（き）いておきましょう。",
                "en": "Many temples and museums close around five, and you may only be able to enter until 30 minutes before closing. Ask “nan-ji made aite imasu ka” (Until what time is it open?) in advance."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "半日（はんにち）で行（い）ける場所（ばしょ）を聞（き）く",
                    "en": "Asking where to go in half a day"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません。半日（はんにち）しかないんですが、どこに行（い）ったらいいですか。",
                        "en": "Excuse me. I only have half a day. Where should I go?"
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "そうですね。お城（しろ）がおすすめです。中（なか）に入（はい）ることもできますよ。",
                        "en": "Let me see. I recommend the castle. You can go inside, too."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ここから歩（ある）いて行（い）くことができますか。",
                        "en": "Can I walk there from here?"
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "歩（ある）くと30分（さんじゅっぷん）ぐらいかかるので、バスのほうがいいと思（おも）います。",
                        "en": "It takes about 30 minutes on foot, so I think the bus is better."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "バスだと、何分（なんぷん）ぐらいですか。",
                        "en": "How many minutes is it by bus?"
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "10分（じゅっぷん）ぐらいです。駅前（えきまえ）の3番（さんばん）のバス停（てい）から乗（の）ってください。",
                        "en": "About ten minutes. Please take the bus from stop number 3 in front of the station."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "お城（しろ）は何時（なんじ）まで開（あ）いていますか。",
                        "en": "Until what time is the castle open?"
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "5時（ごじ）までです。でも、4時半（よじはん）までに入（はい）ってください。",
                        "en": "Until five. But please go in by 4:30."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "わかりました。英語（えいご）の地図（ちず）をもらってもいいですか。",
                        "en": "I see. May I have a map in English?"
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "はい、どうぞ。バス停（てい）は、駅（えき）を出（で）たらすぐ右（みぎ）にあります。",
                        "en": "Here you are. When you leave the station, the bus stop is just to your right."
                    }
                ]
            },
            {
                "title": {
                    "ja": "イベントについて聞（き）く",
                    "en": "Asking about events"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、今週末（こんしゅうまつ）、何（なに）かイベントはありますか。",
                        "en": "Excuse me, are there any events this weekend?"
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "土曜日（どようび）の夜（よる）に、花火大会（はなびたいかい）があります。",
                        "en": "There’s a fireworks festival on Saturday night."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "いいですね。どこで見（み）ることができますか。",
                        "en": "That sounds nice. Where can I watch it?"
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "川（かわ）の近（ちか）くです。ここから電車（でんしゃ）で二駅（ふたえき）です。",
                        "en": "Near the river. It’s two stops from here by train."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "予約（よやく）したほうがいいですか。",
                        "en": "Should I make a reservation?"
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "いいえ、予約（よやく）は要（い）りません。でも、人（ひと）がとても多（おお）いので、早（はや）めに行（い）ったほうがいいと思（おも）います。",
                        "en": "No, you don’t need one. But it gets very crowded, so I think you should go early."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "雨（あめ）が降（ふ）ったら、どうなりますか。",
                        "en": "What happens if it rains?"
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "雨（あめ）が強（つよ）かったら、日曜日（にちようび）になります。ホームページを見（み）てください。",
                        "en": "If the rain is heavy, it moves to Sunday. Please check the website."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "わかりました。このパンフレットをもらってもいいですか。",
                        "en": "I see. May I take this pamphlet?"
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "はい、どうぞ。英語（えいご）のもありますよ。",
                        "en": "Sure, go ahead. We have English ones, too."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "半日（はんにち）しかない（　　）が、どこに行（い）ったらいいですか。",
                "answer": "んです",
                "en": "I only have half a day. Where should I go?"
            },
            {
                "q": "ここからどうやって（　　）いいですか。",
                "answer": "行（い）ったら",
                "en": "How should I get there from here?"
            },
            {
                "q": "ここから歩（ある）いて行（い）く（　　）ができますか。",
                "answer": "こと",
                "en": "Can I walk there from here?"
            },
            {
                "q": "予約（よやく）した（　　）がいいですか。",
                "answer": "ほう",
                "en": "Should I make a reservation?"
            },
            {
                "q": "英語（えいご）の地図（ちず）をもらっても（　　）。",
                "answer": "いいですか",
                "en": "May I have a map in English?"
            },
            {
                "q": "歩（ある）くと30分（さんじゅっぷん）ぐらいかかる（　　）、バスのほうがいいと思（おも）います。",
                "answer": "ので",
                "en": "It takes about 30 minutes on foot, so I think the bus is better."
            },
            {
                "q": "雨（あめ）が（　　）、どうなりますか。",
                "answer": "降（ふ）ったら",
                "en": "What happens if it rains?"
            },
            {
                "q": "早（はや）めに行（い）ったほうがいいと（　　）。",
                "answer": "思（おも）います",
                "en": "I think you should go early."
            }
        ],
        "culture": {
            "ja": "人気（にんき）の観光地（かんこうち）は、週末（しゅうまつ）や祝日（しゅくじつ）、桜（さくら）と紅葉（こうよう）の季節（きせつ）にとても混（こ）みます。朝（あさ）の早（はや）い時間（じかん）に行（い）くと、人（ひと）が少（すく）なくて、写真（しゃしん）も撮（と）りやすいです。",
            "en": "Popular sights get very crowded on weekends, national holidays, and in the cherry blossom and autumn leaf seasons. If you go early in the morning, there are fewer people and it’s easier to take photos."
        }
    },
    {
        "id": "reservation",
        "title": "予約（よやく）の変更（へんこう）",
        "subtitle": "電話（でんわ）で変（か）える・キャンセルする",
        "titleEn": "Changing a reservation: changing or canceling by phone",
        "goal": {
            "ja": "電話（でんわ）で、ホテルやレストランの予約（よやく）の日（ひ）にちや人数（にんずう）を変（か）えたり、キャンセルしたりできる。キャンセル料（りょう）について聞（き）ける。",
            "en": "Change the date or number of people for a hotel or restaurant reservation by phone, or cancel it, and ask about cancellation fees."
        },
        "phrases": [
            {
                "ja": "もしもし、予約（よやく）を変更（へんこう）したいんですが。",
                "en": "Hello, I’d like to change my reservation."
            },
            {
                "ja": "10日（とおか）から2泊（にはく）で予約（よやく）しているスミスです。",
                "en": "This is Smith. I have a reservation for two nights from the 10th."
            },
            {
                "ja": "日（ひ）にちを変（か）えることができますか。",
                "en": "Is it possible to change the date?"
            },
            {
                "ja": "12日（じゅうににち）からの2泊（にはく）に変（か）えたいんですが。",
                "en": "I’d like to change it to two nights from the 12th."
            },
            {
                "ja": "人数（にんずう）を4人（よにん）に変（か）えてもいいですか。",
                "en": "May I change the number of people to four?"
            },
            {
                "ja": "予約（よやく）の時間（じかん）を少（すこ）し遅（おそ）くすることができますか。",
                "en": "Could I make my reservation a little later?"
            },
            {
                "ja": "電車（でんしゃ）が遅（おく）れているので、30分（さんじゅっぷん）ぐらい遅（おく）れます。",
                "en": "My train is delayed, so I’ll be about 30 minutes late."
            },
            {
                "ja": "予約（よやく）をキャンセルしたいんですが。",
                "en": "I’d like to cancel my reservation."
            },
            {
                "ja": "キャンセル料（りょう）はかかりますか。",
                "en": "Is there a cancellation fee?"
            },
            {
                "ja": "今日（きょう）キャンセルしたら、いくらかかりますか。",
                "en": "If I cancel today, how much will it cost?"
            },
            {
                "ja": "すみません、もう一度（いちど）ゆっくり言（い）ってもらえますか。",
                "en": "Sorry, could you say that again more slowly?"
            },
            {
                "ja": "確認（かくにん）のメールを送（おく）ってもらえますか。",
                "en": "Could you send me a confirmation email?"
            }
        ],
        "usage": [
            {
                "ja": "電話（でんわ）では、まず「予約（よやく）を変更（へんこう）したいんですが」のように、何（なに）をしたいかを先（さき）に言（い）いましょう。お店（みせ）の人（ひと）がすぐにわかります。",
                "en": "On the phone, start by saying what you want to do, like “yoyaku o henkō shitai n desu ga.” The staff will understand right away."
            },
            {
                "ja": "次（つぎ）に、名前（なまえ）と予約（よやく）の日（ひ）にち、時間（じかん）を言（い）います。「〜日（にち）に予約（よやく）している〜です」と言（い）えば、すぐ探（さが）してもらえます。",
                "en": "Next, give your name and the date and time of your reservation. If you say “… nichi ni yoyaku shite iru … desu” (I’m …, with a reservation on the …th), they can find it quickly."
            },
            {
                "ja": "日（ひ）にちは、特別（とくべつ）な読（よ）み方（かた）が多（おお）いので気（き）をつけましょう。例（たと）えば、1日（ついたち）、4日（よっか）、8日（ようか）、20日（はつか）などです。",
                "en": "Many dates have special readings, so be careful: for example, tsuitachi (the 1st), yokka (the 4th), yōka (the 8th), and hatsuka (the 20th)."
            },
            {
                "ja": "電話（でんわ）で聞（き）き取（と）れない時（とき）は、「もう一度（いちど）ゆっくり言（い）ってもらえますか」と頼（たの）みましょう。変更（へんこう）した後（あと）は、確認（かくにん）のメールを送（おく）ってもらうと安心（あんしん）です。",
                "en": "If you can’t catch something on the phone, ask “mō ichido yukkuri itte moraemasu ka.” After making a change, it’s reassuring to have them send you a confirmation email."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "ホテルの日（ひ）にちを変（か）える",
                    "en": "Changing the dates of a hotel stay"
                },
                "lines": [
                    {
                        "speaker": "ホテルの人（ひと）",
                        "ja": "お電話（でんわ）ありがとうございます。さくらホテルです。",
                        "en": "Thank you for calling. This is Sakura Hotel."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "もしもし、予約（よやく）を変更（へんこう）したいんですが。",
                        "en": "Hello, I’d like to change my reservation."
                    },
                    {
                        "speaker": "ホテルの人（ひと）",
                        "ja": "はい。お名前（なまえ）をお願（ねが）いします。",
                        "en": "Certainly. May I have your name, please?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "スミスです。10日（とおか）から2泊（にはく）で予約（よやく）しています。",
                        "en": "It’s Smith. I have a reservation for two nights from the 10th."
                    },
                    {
                        "speaker": "ホテルの人（ひと）",
                        "ja": "スミス様（さま）ですね。何日（なんにち）からがよろしいですか。",
                        "en": "Mr./Ms. Smith, yes. From which date would you like to stay?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "12日（じゅうににち）からの2泊（にはく）に変（か）えたいんですが、部屋（へや）は空（あ）いていますか。",
                        "en": "I’d like to change it to two nights from the 12th. Do you have a room available?"
                    },
                    {
                        "speaker": "ホテルの人（ひと）",
                        "ja": "少々（しょうしょう）お待（ま）ちください。……はい、空（あ）いています。",
                        "en": "Just a moment, please. … Yes, we do."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "よかった。料金（りょうきん）は同（おな）じですか。",
                        "en": "Great. Is the price the same?"
                    },
                    {
                        "speaker": "ホテルの人（ひと）",
                        "ja": "12日（じゅうににち）は土曜日（どようび）なので、その日（ひ）は2,000円（にせんえん）の追加料金（ついかりょうきん）がかかります。",
                        "en": "The 12th is a Saturday, so there’s an extra charge of 2,000 yen for that night."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "わかりました。それでお願（ねが）いします。",
                        "en": "I see. Please go ahead with that."
                    }
                ]
            },
            {
                "title": {
                    "ja": "レストランの予約（よやく）をキャンセルする",
                    "en": "Canceling a restaurant reservation"
                },
                "lines": [
                    {
                        "speaker": "店（みせ）の人（ひと）",
                        "ja": "お電話（でんわ）ありがとうございます。レストランみどりです。",
                        "en": "Thank you for calling. This is Restaurant Midori."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "もしもし、明日（あした）7時（しちじ）に予約（よやく）しているスミスです。",
                        "en": "Hello, this is Smith. I have a reservation for seven o’clock tomorrow."
                    },
                    {
                        "speaker": "店（みせ）の人（ひと）",
                        "ja": "スミス様（さま）、4名様（よんめいさま）ですね。",
                        "en": "Mr./Ms. Smith, a party of four, right?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい。友（とも）だちが熱（ねつ）を出（だ）したので、キャンセルしたいんですが。",
                        "en": "Yes. A friend of mine has a fever, so I’d like to cancel."
                    },
                    {
                        "speaker": "店（みせ）の人（ひと）",
                        "ja": "そうですか。前（まえ）の日（ひ）のキャンセルなので、キャンセル料（りょう）がかかりますが、よろしいですか。",
                        "en": "I see. Since you’re canceling the day before, there will be a cancellation fee. Is that all right?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "キャンセル料（りょう）はいくらですか。",
                        "en": "How much is the cancellation fee?"
                    },
                    {
                        "speaker": "店（みせ）の人（ひと）",
                        "ja": "コース料金（りょうきん）の半分（はんぶん）です。",
                        "en": "Half the price of the course."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "じゃあ、日（ひ）にちを変（か）えることはできますか。",
                        "en": "Then could we change the date instead?"
                    },
                    {
                        "speaker": "店（みせ）の人（ひと）",
                        "ja": "はい、変更（へんこう）ならキャンセル料（りょう）はかかりません。いつがよろしいですか。",
                        "en": "Yes, there’s no fee for changing the date. When would you like to come?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "来週（らいしゅう）の土曜日（どようび）の7時（しちじ）でお願（ねが）いします。",
                        "en": "Next Saturday at seven, please."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "もしもし、予約（よやく）を（　　）んですが。",
                "answer": "変更（へんこう）したい",
                "en": "Hello, I’d like to change my reservation."
            },
            {
                "q": "日（ひ）にちを変（か）える（　　）ができますか。",
                "answer": "こと",
                "en": "Is it possible to change the date?"
            },
            {
                "q": "人数（にんずう）を4人（よにん）に変（か）えても（　　）。",
                "answer": "いいですか",
                "en": "May I change the number of people to four?"
            },
            {
                "q": "電車（でんしゃ）が遅（おく）れている（　　）、30分（さんじゅっぷん）ぐらい遅（おく）れます。",
                "answer": "ので",
                "en": "My train is delayed, so I’ll be about 30 minutes late."
            },
            {
                "q": "今日（きょう）（　　）、いくらかかりますか。",
                "answer": "キャンセルしたら",
                "en": "If I cancel today, how much will it cost?"
            },
            {
                "q": "もう一度（いちど）ゆっくり言（い）って（　　）か。",
                "answer": "もらえます",
                "en": "Could you say that again more slowly?"
            },
            {
                "q": "10日（とおか）から2泊（にはく）で予約（よやく）（　　）スミスです。",
                "answer": "している",
                "en": "This is Smith. I have a reservation for two nights from the 10th."
            },
            {
                "q": "確認（かくにん）のメールを（　　）もらえますか。",
                "answer": "送（おく）って",
                "en": "Could you send me a confirmation email?"
            }
        ],
        "culture": {
            "ja": "予約（よやく）した日（ひ）に連絡（れんらく）しないで行（い）かないことを、「無断（むだん）キャンセル」と言（い）います。お店（みせ）はとても困（こま）ります。行（い）けなくなったら、短（みじか）い電話（でんわ）でもいいので、必（かなら）ず連絡（れんらく）しましょう。",
            "en": "Not showing up for a reservation without contacting the place is called “mudan kyanseru” (a no-show). It causes real trouble for the restaurant. If you can’t go, always let them know, even with a short phone call."
        }
    },
    {
        "id": "izakaya",
        "title": "居酒屋（いざかや）",
        "subtitle": "おすすめを聞（き）いて注文（ちゅうもん）する",
        "titleEn": "Izakaya: asking for recommendations and ordering",
        "goal": {
            "ja": "居酒屋（いざかや）で、おすすめを聞（き）いて注文（ちゅうもん）できる。アレルギーを伝（つた）えたり、ラストオーダーやお会計（かいけい）のことを話（はな）したりできる。",
            "en": "Order at an izakaya by asking for recommendations. Tell the staff about allergies, and handle last orders and the bill."
        },
        "phrases": [
            {
                "ja": "初（はじ）めてなんですが、何（なに）を頼（たの）んだらいいですか。",
                "en": "It’s our first time here. What should we order?"
            },
            {
                "ja": "今日（きょう）のおすすめは何（なん）ですか。",
                "en": "What do you recommend today?"
            },
            {
                "ja": "これはどんな料理（りょうり）ですか。",
                "en": "What kind of dish is this?"
            },
            {
                "ja": "これは何人分（なんにんぶん）ぐらいですか。",
                "en": "About how many people is this for?"
            },
            {
                "ja": "とりあえず、生（なま）ビールを二（ふた）つお願（ねが）いします。",
                "en": "Two draft beers to start, please."
            },
            {
                "ja": "お酒（さけ）が飲（の）めないので、ノンアルコールの飲（の）み物（もの）はありますか。",
                "en": "I can’t drink alcohol, so do you have any non-alcoholic drinks?"
            },
            {
                "ja": "えびのアレルギーがあるんですが、これは大丈夫（だいじょうぶ）ですか。",
                "en": "I’m allergic to shrimp. Is this all right for me?"
            },
            {
                "ja": "飲（の）み放題（ほうだい）はありますか。",
                "en": "Do you have an all-you-can-drink option?"
            },
            {
                "ja": "これは頼（たの）んでいないんですが。",
                "en": "I don’t think we ordered this."
            },
            {
                "ja": "ラストオーダーは何時（なんじ）ですか。",
                "en": "What time is last order?"
            },
            {
                "ja": "別々（べつべつ）に払（はら）ってもいいですか。",
                "en": "May we pay separately?"
            },
            {
                "ja": "一人（ひとり）いくらになりますか。",
                "en": "How much is it per person?"
            }
        ],
        "usage": [
            {
                "ja": "居酒屋（いざかや）では、最初（さいしょ）に飲（の）み物（もの）を頼（たの）むことが多（おお）いです。「とりあえず」は「まず」という意味（いみ）で、「とりあえず、生（なま）ビール」はよく聞（き）く言（い）い方（かた）です。",
                "en": "At an izakaya, people usually order drinks first. “Toriaezu” means “to start with,” and “toriaezu, nama bīru” (a draft beer to start) is a very common phrase."
            },
            {
                "ja": "料理（りょうり）は、みんなで分（わ）けて食（た）べることが多（おお）いです。「何人分（なんにんぶん）ぐらいですか」と聞（き）くと、注文（ちゅうもん）する数（かず）を決（き）めやすいです。",
                "en": "Dishes are usually shared. Asking “nan-nin-bun gurai desu ka” (About how many people is it for?) makes it easier to decide how many dishes to order."
            },
            {
                "ja": "アレルギーがある時（とき）は、「〜のアレルギーがあるんですが」と先（さき）に言（い）ってから質問（しつもん）しましょう。紙（かみ）に書（か）いて見（み）せると、もっと安心（あんしん）です。",
                "en": "If you have an allergy, first say “… no arerugī ga aru n desu ga,” and then ask your question. Showing it written on paper is even safer."
            },
            {
                "ja": "ラストオーダーは、閉店（へいてん）の30分（さんじゅっぷん）から1時間前（いちじかんまえ）ぐらいのことが多（おお）いです。店員（てんいん）さんが「そろそろラストオーダーです」と言（い）いに来（き）たら、最後（さいご）の注文（ちゅうもん）をしましょう。",
                "en": "Last order is usually 30 minutes to an hour before closing. When the staff come and say “sorosoro rasuto ōdā desu” (it’s almost last order), place your final order."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "おすすめの料理（りょうり）を注文（ちゅうもん）する",
                    "en": "Ordering the recommended dishes"
                },
                "lines": [
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "いらっしゃいませ。お飲（の）み物（もの）は何（なに）になさいますか。",
                        "en": "Welcome. What would you like to drink?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "とりあえず、生（なま）ビールを二（ふた）つお願（ねが）いします。",
                        "en": "Two draft beers to start, please."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "はい。お料理（りょうり）はお決（き）まりですか。",
                        "en": "Certainly. Have you decided on your food?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "初（はじ）めてなんですが、何（なに）を頼（たの）んだらいいですか。",
                        "en": "It’s our first time here. What should we order?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "今日（きょう）はいい魚（さかな）が入（はい）っているので、刺身（さしみ）の盛（も）り合（あ）わせがおすすめです。",
                        "en": "We have some good fish in today, so I recommend the assorted sashimi."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "それは何人分（なんにんぶん）ぐらいですか。",
                        "en": "About how many people is that for?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "二人分（ふたりぶん）ぐらいです。",
                        "en": "It’s about enough for two."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "じゃあ、それをお願（ねが）いします。あ、えびのアレルギーがあるんですが、えびは入（はい）っていますか。",
                        "en": "Then we’ll have that. Oh, I’m allergic to shrimp. Is there any shrimp in it?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "はい、入（はい）っています。えびなしで作（つく）ることもできますよ。",
                        "en": "Yes, there is. We can also make it without shrimp."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "じゃあ、えびなしでお願（ねが）いします。",
                        "en": "Then without shrimp, please."
                    }
                ]
            },
            {
                "title": {
                    "ja": "ラストオーダーとお会計（かいけい）",
                    "en": "Last order and paying the bill"
                },
                "lines": [
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "すみません、そろそろラストオーダーですが、ほかにご注文（ちゅうもん）はありますか。",
                        "en": "Excuse me, it’s almost time for last order. Would you like anything else?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "じゃあ、ウーロン茶（ちゃ）を二（ふた）つお願（ねが）いします。お店（みせ）は何時（なんじ）までですか。",
                        "en": "Then two oolong teas, please. What time do you close?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "11時（じゅういちじ）までです。",
                        "en": "We’re open until eleven."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、お会計（かいけい）をお願（ねが）いします。",
                        "en": "Excuse me, the check, please."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "はい、全部（ぜんぶ）で8,400円（はっせんよんひゃくえん）です。",
                        "en": "Sure. That’s 8,400 yen in total."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "この「お通（とお）し」というのは何（なん）ですか。",
                        "en": "What is this “otōshi” here?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "最初（さいしょ）にお出（だ）しした小（ちい）さい料理（りょうり）です。お一人様（ひとりさま）300円（さんびゃくえん）です。",
                        "en": "It’s the small dish we served at the start. It’s 300 yen per person."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "そうですか。別々（べつべつ）に払（はら）ってもいいですか。",
                        "en": "I see. May we pay separately?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "はい。お一人様（ひとりさま）4,200円（よんせんにひゃくえん）です。",
                        "en": "Sure. That’s 4,200 yen each."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "わかりました。ごちそうさまでした。",
                        "en": "All right. Thank you for the meal."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "初（はじ）めてなんですが、何（なに）を（　　）いいですか。",
                "answer": "頼（たの）んだら",
                "en": "It’s our first time here. What should we order?"
            },
            {
                "q": "えびのアレルギーがある（　　）が、これは大丈夫（だいじょうぶ）ですか。",
                "answer": "んです",
                "en": "I’m allergic to shrimp. Is this all right for me?"
            },
            {
                "q": "お酒（さけ）が飲（の）めない（　　）、ノンアルコールの飲（の）み物（もの）はありますか。",
                "answer": "ので",
                "en": "I can’t drink alcohol, so do you have any non-alcoholic drinks?"
            },
            {
                "q": "別々（べつべつ）に払（はら）っても（　　）。",
                "answer": "いいですか",
                "en": "May we pay separately?"
            },
            {
                "q": "店員（てんいん）さんが（　　）、注文（ちゅうもん）しましょう。",
                "answer": "来（き）たら",
                "en": "Let’s order when the server comes."
            },
            {
                "q": "（　　）、生（なま）ビールを二（ふた）つお願（ねが）いします。",
                "answer": "とりあえず",
                "en": "Two draft beers to start, please."
            },
            {
                "q": "ラストオーダーの前（まえ）に、もう一（ひと）つ頼（たの）んだほうがいいと（　　）。",
                "answer": "思（おも）います",
                "en": "I think we should order one more thing before last order."
            },
            {
                "q": "えびなしで作（つく）る（　　）ができますか。",
                "answer": "こと",
                "en": "Can you make it without shrimp?"
            }
        ],
        "culture": {
            "ja": "居酒屋（いざかや）では、席（せき）に座（すわ）ると「お通（とお）し」という小（ちい）さい料理（りょうり）が出（で）てきます。頼（たの）んでいなくても、300円（さんびゃくえん）から500円（ごひゃくえん）ぐらいがお会計（かいけい）に入（はい）ることが多（おお）いです。席（せき）のお金（かね）のようなものなので、びっくりしないでくださいね。",
            "en": "At an izakaya, a small dish called “otōshi” is served when you sit down. Even if you didn’t order it, about 300 to 500 yen is usually added to the bill. It’s like a table charge, so don’t be surprised."
        }
    },
    {
        "id": "shinkansen",
        "title": "新幹線（しんかんせん）",
        "subtitle": "指定席（していせき）と乗（の）り換（か）え",
        "titleEn": "Shinkansen: reserved seats and transfers",
        "goal": {
            "ja": "新幹線（しんかんせん）の指定席（していせき）を買（か）って、窓側（まどがわ）か通路側（つうろがわ）かを選（えら）べる。ホームや乗（の）り換（か）え、大（おお）きい荷物（にもつ）について聞（き）ける。",
            "en": "Buy a reserved seat on the shinkansen and choose a window or aisle seat. Ask about platforms, transfers, and large luggage."
        },
        "phrases": [
            {
                "ja": "京都（きょうと）までの指定席（していせき）を1枚（いちまい）お願（ねが）いします。",
                "en": "One reserved seat to Kyoto, please."
            },
            {
                "ja": "次（つぎ）の新幹線（しんかんせん）に乗（の）りたいんですが、席（せき）は空（あ）いていますか。",
                "en": "I’d like to take the next shinkansen. Are there any seats available?"
            },
            {
                "ja": "窓側（まどがわ）の席（せき）をお願（ねが）いします。",
                "en": "A window seat, please."
            },
            {
                "ja": "二人（ふたり）で並（なら）んで座（すわ）りたいんですが。",
                "en": "We’d like to sit next to each other."
            },
            {
                "ja": "富士山（ふじさん）が見（み）える席（せき）はありますか。",
                "en": "Is there a seat with a view of Mt. Fuji?"
            },
            {
                "ja": "自由席（じゆうせき）と指定席（していせき）は、いくら違（ちが）いますか。",
                "en": "What’s the price difference between non-reserved and reserved seats?"
            },
            {
                "ja": "何番線（なんばんせん）から出（で）ますか。",
                "en": "Which platform does it leave from?"
            },
            {
                "ja": "高山（たかやま）に行（い）きたいんですが、どこで乗（の）り換（か）えたらいいですか。",
                "en": "I want to go to Takayama. Where should I change trains?"
            },
            {
                "ja": "乗（の）り換（か）えの時間（じかん）は何分（なんぷん）ぐらいありますか。",
                "en": "About how many minutes do I have to change trains?"
            },
            {
                "ja": "大（おお）きいスーツケースがあるんですが、予約（よやく）が必要（ひつよう）ですか。",
                "en": "I have a large suitcase. Do I need a reservation for it?"
            },
            {
                "ja": "すみません、そこはわたしの席（せき）だと思（おも）うんですが。",
                "en": "Excuse me, I think that’s my seat."
            },
            {
                "ja": "乗（の）り遅（おく）れてしまったんですが、どうしたらいいですか。",
                "en": "I missed my train. What should I do?"
            }
        ],
        "usage": [
            {
                "ja": "新幹線（しんかんせん）には、指定席（していせき）と自由席（じゆうせき）があります。週末（しゅうまつ）や連休（れんきゅう）はとても混（こ）むので、指定席（していせき）を買（か）ったほうがいいです。",
                "en": "The shinkansen has reserved and non-reserved seats. Weekends and long holidays get very crowded, so it’s better to buy a reserved seat."
            },
            {
                "ja": "切符（きっぷ）を買（か）う時（とき）は、行（い）き先（さき）、枚数（まいすう）、時間（じかん）、席（せき）の順番（じゅんばん）で言（い）うと伝（つた）わりやすいです。席（せき）は「窓側（まどがわ）」か「通路側（つうろがわ）」で言（い）います。",
                "en": "When buying a ticket, it’s easier to be understood if you give the destination, number of tickets, time, and seat, in that order. For the seat, say “madogawa” (window) or “tsūrogawa” (aisle)."
            },
            {
                "ja": "縦（たて）・横（よこ）・高（たか）さを足（た）して160センチより大（おお）きい荷物（にもつ）は、東海道新幹線（とうかいどうしんかんせん）などでは、荷物（にもつ）を置（お）く場所（ばしょ）がある席（せき）を予約（よやく）しなければなりません。",
                "en": "On the Tokaido Shinkansen and some other lines, luggage larger than 160 cm in total (height + width + depth) requires you to reserve a seat with a luggage space."
            },
            {
                "ja": "乗（の）り遅（おく）れた時（とき）は、あわてないで駅員（えきいん）さんに「乗（の）り遅（おく）れてしまったんですが」と言（い）いましょう。同（おな）じ日（ひ）なら、後（あと）の新幹線（しんかんせん）の自由席（じゆうせき）に乗（の）れることが多（おお）いです。",
                "en": "If you miss your train, don’t panic. Tell the station staff “noriokurete shimatta n desu ga.” On the same day, you can usually ride in the non-reserved cars of a later train."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "指定席（していせき）を買（か）う",
                    "en": "Buying a reserved seat"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、京都（きょうと）までの指定席（していせき）を1枚（いちまい）お願（ねが）いします。",
                        "en": "Excuse me, one reserved seat to Kyoto, please."
                    },
                    {
                        "speaker": "駅員（えきいん）",
                        "ja": "何時（なんじ）ごろの新幹線（しんかんせん）がよろしいですか。",
                        "en": "About what time would you like to leave?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "次（つぎ）の新幹線（しんかんせん）に乗（の）りたいんですが、席（せき）は空（あ）いていますか。",
                        "en": "I’d like to take the next shinkansen. Are there any seats available?"
                    },
                    {
                        "speaker": "駅員（えきいん）",
                        "ja": "10時（じゅうじ）の「のぞみ」が空（あ）いています。窓側（まどがわ）と通路側（つうろがわ）、どちらがよろしいですか。",
                        "en": "There are seats on the 10:00 Nozomi. Would you like a window seat or an aisle seat?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "窓側（まどがわ）をお願（ねが）いします。富士山（ふじさん）が見（み）える席（せき）はありますか。",
                        "en": "A window seat, please. Is there a seat with a view of Mt. Fuji?"
                    },
                    {
                        "speaker": "駅員（えきいん）",
                        "ja": "では、右側（みぎがわ）の窓側（まどがわ）の席（せき）にしますね。晴（は）れていたら、よく見（み）えますよ。",
                        "en": "Then I’ll give you a window seat on the right side. If it’s clear, you’ll get a good view."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ありがとうございます。何番線（なんばんせん）から出（で）ますか。",
                        "en": "Thank you. Which platform does it leave from?"
                    },
                    {
                        "speaker": "駅員（えきいん）",
                        "ja": "17番線（じゅうななばんせん）です。こちらが切符（きっぷ）です。",
                        "en": "Platform 17. Here is your ticket."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "もし乗（の）り遅（おく）れたら、どうしたらいいですか。",
                        "en": "If I miss the train, what should I do?"
                    },
                    {
                        "speaker": "駅員（えきいん）",
                        "ja": "同（おな）じ日（ひ）なら、後（あと）の新幹線（しんかんせん）の自由席（じゆうせき）に乗（の）ることができますよ。",
                        "en": "On the same day, you can ride in the non-reserved cars of a later shinkansen."
                    }
                ]
            },
            {
                "title": {
                    "ja": "乗（の）り換（か）えと大（おお）きい荷物（にもつ）",
                    "en": "Transfers and large luggage"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、高山（たかやま）に行（い）きたいんですが、どこで乗（の）り換（か）えたらいいですか。",
                        "en": "Excuse me, I want to go to Takayama. Where should I change trains?"
                    },
                    {
                        "speaker": "駅員（えきいん）",
                        "ja": "名古屋（なごや）で特急（とっきゅう）「ひだ」に乗（の）り換（か）えてください。",
                        "en": "Change to the Hida limited express at Nagoya."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "乗（の）り換（か）えの時間（じかん）は何分（なんぷん）ぐらいありますか。",
                        "en": "About how many minutes do I have to change trains?"
                    },
                    {
                        "speaker": "駅員（えきいん）",
                        "ja": "15分（じゅうごふん）あるので、大丈夫（だいじょうぶ）だと思（おも）います。",
                        "en": "You’ll have 15 minutes, so I think you’ll be fine."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "大（おお）きいスーツケースがあるんですが、新幹線（しんかんせん）に持（も）って乗（の）ることができますか。",
                        "en": "I have a large suitcase. Can I take it on the shinkansen?"
                    },
                    {
                        "speaker": "駅員（えきいん）",
                        "ja": "とても大（おお）きい荷物（にもつ）は、置（お）く場所（ばしょ）を予約（よやく）しなければなりません。",
                        "en": "For very large luggage, you need to reserve a space for it."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "じゃあ、荷物（にもつ）を置（お）く場所（ばしょ）がある席（せき）をお願（ねが）いします。",
                        "en": "Then a seat with luggage space, please."
                    },
                    {
                        "speaker": "駅員（えきいん）",
                        "ja": "はい。いちばん後（うし）ろの席（せき）です。荷物（にもつ）は席（せき）の後（うし）ろに置（お）いてください。",
                        "en": "Certainly. It’s a seat in the last row. Please put your luggage behind the seat."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "わかりました。ありがとうございます。",
                        "en": "I see. Thank you."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "次（つぎ）の新幹線（しんかんせん）に（　　）んですが、席（せき）は空（あ）いていますか。",
                "answer": "乗（の）りたい",
                "en": "I’d like to take the next shinkansen. Are there any seats available?"
            },
            {
                "q": "高山（たかやま）に行（い）きたいんですが、どこで（　　）いいですか。",
                "answer": "乗（の）り換（か）えたら",
                "en": "I want to go to Takayama. Where should I change trains?"
            },
            {
                "q": "大（おお）きいスーツケースがある（　　）が、予約（よやく）が必要（ひつよう）ですか。",
                "answer": "んです",
                "en": "I have a large suitcase. Do I need a reservation for it?"
            },
            {
                "q": "すみません、そこはわたしの席（せき）だと（　　）んですが。",
                "answer": "思（おも）う",
                "en": "Excuse me, I think that’s my seat."
            },
            {
                "q": "（　　）、窓（まど）から富士山（ふじさん）が見（み）えますよ。",
                "answer": "晴（は）れていたら",
                "en": "If it’s clear, you can see Mt. Fuji from the window."
            },
            {
                "q": "乗（の）り換（か）えの時間（じかん）は15分（じゅうごふん）ある（　　）、大丈夫（だいじょうぶ）だと思（おも）います。",
                "answer": "ので",
                "en": "You’ll have 15 minutes to change trains, so I think you’ll be fine."
            },
            {
                "q": "同（おな）じ日（ひ）なら、後（あと）の新幹線（しんかんせん）の自由席（じゆうせき）に乗（の）る（　　）ができます。",
                "answer": "こと",
                "en": "On the same day, you can ride in the non-reserved cars of a later shinkansen."
            },
            {
                "q": "乗（の）り遅（おく）れて（　　）んですが、どうしたらいいですか。",
                "answer": "しまった",
                "en": "I missed my train. What should I do?"
            }
        ],
        "culture": {
            "ja": "新幹線（しんかんせん）では、駅弁（えきべん）を食（た）べたり、飲（の）み物（もの）を飲（の）んだりしてもいいです。席（せき）を後（うし）ろに倒（たお）す時（とき）は、後（うし）ろの人（ひと）に「倒（たお）してもいいですか」と聞（き）くと親切（しんせつ）です。電話（でんわ）は、席（せき）ではなくデッキで話（はな）しましょう。",
            "en": "On the shinkansen, it’s fine to eat an ekiben (a boxed lunch sold at stations) and have drinks. Before reclining your seat, it’s considerate to ask the person behind you, “taoshite mo ii desu ka” (May I recline?). Take phone calls in the deck area between cars, not at your seat."
        }
    }
];
