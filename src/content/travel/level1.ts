/**
 * 旅行のテキスト レベル1（2026-10-09 かずき決定・9-2／2026-10-10 充実）
 *
 * - 対象：初めて日本へ行く人（N5 くらい）
 * - 10場面：空港／ホテル／レストラン／買い物／電車と道／コンビニ／タクシー／観光地／病院と薬局／困った時
 * - 1場面＝目標・フレーズ12・使う場面4・会話2本・穴埋め8・文化のひとこと（2026-10-10 かずき決定）
 * - よみは教科書と同じ「漢字（かんじ）」の形。英語の訳を付ける
 * - 中身は Claude が書いた。あいちゃんに見てもらって直す・増やす
 * 型と並べ方は lib/travel.ts。下書きの確かめ方は scratchpad の validate_travel.py（テストは lib/__tests__/travel.test.ts）
 */
import type { TravelScene } from '@/lib/travel';

export const TRAVEL_LEVEL1: TravelScene[] = [
    {
        "id": "airport",
        "title": "空港（くうこう）",
        "subtitle": "入国（にゅうこく）と荷物（にもつ）",
        "titleEn": "Airport: immigration and baggage",
        "goal": {
            "ja": "入国審査（にゅうこくしんさ）で、旅行（りょこう）の目的（もくてき）と日数（にっすう）を言（い）える。荷物（にもつ）の場所（ばしょ）を聞（き）ける。",
            "en": "Answer the purpose and length of your stay at immigration, and ask where your baggage is."
        },
        "phrases": [
            {
                "ja": "観光（かんこう）です。",
                "en": "It’s for sightseeing."
            },
            {
                "ja": "一週間（いっしゅうかん）います。",
                "en": "I’ll stay for one week."
            },
            {
                "ja": "ホテルに泊（と）まります。",
                "en": "I’ll stay at a hotel."
            },
            {
                "ja": "荷物（にもつ）はどこですか。",
                "en": "Where is the baggage?"
            },
            {
                "ja": "わたしのスーツケースがありません。",
                "en": "My suitcase isn’t here."
            },
            {
                "ja": "両替（りょうがえ）はどこですか。",
                "en": "Where can I exchange money?"
            },
            {
                "ja": "電車（でんしゃ）の切符（きっぷ）はどこで買（か）いますか。",
                "en": "Where do I buy a train ticket?"
            },
            {
                "ja": "すみません、もう一度（いちど）お願（ねが）いします。",
                "en": "Sorry, could you say that again, please?"
            },
            {
                "ja": "青（あお）くて、大（おお）きいスーツケースです。",
                "en": "It’s a big blue suitcase."
            },
            {
                "ja": "ホテルに送（おく）ってください。",
                "en": "Please send it to my hotel."
            },
            {
                "ja": "ゆっくり話（はな）してください。",
                "en": "Please speak slowly."
            },
            {
                "ja": "ATMはどこですか。",
                "en": "Where is the ATM?"
            }
        ],
        "usage": [
            {
                "ja": "入国審査（にゅうこくしんさ）では、旅行（りょこう）の目的（もくてき）と日数（にっすう）をよく聞（き）かれます。「観光（かんこう）です」「一週間（いっしゅうかん）います」と短（みじか）く答（こた）えれば大丈夫（だいじょうぶ）です。",
                "en": "At immigration you are often asked your purpose and length of stay. Short answers like “Sightseeing” and “One week” are fine."
            },
            {
                "ja": "パスポートを渡（わた）す時（とき）は「お願（ねが）いします」と言（い）いましょう。",
                "en": "Say “onegaishimasu” when you hand over your passport."
            },
            {
                "ja": "聞（き）き取（と）れない時（とき）は「もう一度（いちど）お願（ねが）いします」と言（い）えば、もう一度（いちど）言（い）ってくれます。",
                "en": "If you can’t catch something, say “mō ichido onegaishimasu” and they will repeat it."
            },
            {
                "ja": "スーツケースが出（で）てこない時（とき）は、荷物（にもつ）のタグを見（み）せて、「わたしのスーツケースがありません」と言（い）いましょう。",
                "en": "If your suitcase doesn’t come out, show your baggage tag and say “watashi no sūtsukēsu ga arimasen.”"
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "入国審査（にゅうこくしんさ）で",
                    "en": "At immigration"
                },
                "lines": [
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "パスポートをお願（ねが）いします。",
                        "en": "Your passport, please."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい、お願（ねが）いします。",
                        "en": "Here you are."
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "旅行（りょこう）の目的（もくてき）は何（なん）ですか。",
                        "en": "What is the purpose of your trip?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "観光（かんこう）です。",
                        "en": "Sightseeing."
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "何日（なんにち）いますか。",
                        "en": "How many days will you stay?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "一週間（いっしゅうかん）います。",
                        "en": "One week."
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "どこに泊（と）まりますか。",
                        "en": "Where will you stay?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "東京（とうきょう）のホテルに泊（と）まります。",
                        "en": "At a hotel in Tokyo."
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "はい、どうぞ。",
                        "en": "All right, go ahead."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ありがとうございます。",
                        "en": "Thank you."
                    }
                ]
            },
            {
                "title": {
                    "ja": "スーツケースが出（で）てこない時（とき）",
                    "en": "When your suitcase doesn’t come out"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、わたしのスーツケースがありません。",
                        "en": "Excuse me, my suitcase isn’t here."
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "荷物（にもつ）のタグを見（み）せてください。",
                        "en": "Please show me your baggage tag."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい、これです。",
                        "en": "Here it is."
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "どんなスーツケースですか。",
                        "en": "What does your suitcase look like?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "青（あお）くて、大（おお）きいスーツケースです。",
                        "en": "It’s a big blue suitcase."
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "少々（しょうしょう）お待（ま）ちください。……スーツケースは次（つぎ）の飛行機（ひこうき）で来（き）ます。",
                        "en": "Just a moment, please. … Your suitcase will come on the next flight."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "そうですか。ホテルに送（おく）ってください。",
                        "en": "I see. Please send it to my hotel."
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "はい、送（おく）ります。ここにホテルの名前（なまえ）と電話番号（でんわばんごう）を書（か）いてください。",
                        "en": "Sure, we will. Please write the hotel name and your phone number here."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "分（わ）かりました。ありがとうございます。",
                        "en": "All right. Thank you."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "旅行（りょこう）の目的（もくてき）は（　　）です。",
                "answer": "観光（かんこう）",
                "en": "The purpose of my trip is sightseeing."
            },
            {
                "q": "一週間（いっしゅうかん）（　　）。",
                "answer": "います",
                "en": "I’ll stay for one week."
            },
            {
                "q": "荷物（にもつ）は（　　）ですか。",
                "answer": "どこ",
                "en": "Where is the baggage?"
            },
            {
                "q": "ホテルに（　　）。",
                "answer": "泊（と）まります",
                "en": "I’ll stay at a hotel."
            },
            {
                "q": "すみません、もう一度（いちど）（　　）。",
                "answer": "お願（ねが）いします",
                "en": "Sorry, could you say that again, please?"
            },
            {
                "q": "わたしのスーツケースが（　　）。",
                "answer": "ありません",
                "en": "My suitcase isn’t here."
            },
            {
                "q": "青（あお）くて、（　　）スーツケースです。",
                "answer": "大（おお）きい",
                "en": "It’s a big blue suitcase."
            },
            {
                "q": "ホテルに（　　）ください。",
                "answer": "送（おく）って",
                "en": "Please send it to my hotel."
            }
        ],
        "culture": {
            "ja": "日本（にほん）には、カードが使（つか）えない店（みせ）もあります。空港（くうこう）で、少（すこ）し現金（げんきん）を用意（ようい）しておくと安心（あんしん）です。",
            "en": "Some shops in Japan don’t accept cards, so it’s a good idea to get a little cash at the airport."
        }
    },
    {
        "id": "hotel",
        "title": "ホテル",
        "subtitle": "チェックイン",
        "titleEn": "Hotel: checking in",
        "goal": {
            "ja": "予約（よやく）の名前（なまえ）を言（い）って、チェックインできる。時間（じかん）や物（もの）について聞（き）ける。",
            "en": "Check in by giving the name on your reservation, and ask about times and things you need."
        },
        "phrases": [
            {
                "ja": "チェックインをお願（ねが）いします。",
                "en": "I’d like to check in, please."
            },
            {
                "ja": "予約（よやく）しています。スミスです。",
                "en": "I have a reservation. My name is Smith."
            },
            {
                "ja": "朝（あさ）ごはんは何時（なんじ）からですか。",
                "en": "What time does breakfast start?"
            },
            {
                "ja": "チェックアウトは何時（なんじ）ですか。",
                "en": "What time is check-out?"
            },
            {
                "ja": "Wi-Fi（ワイファイ）のパスワードは何（なん）ですか。",
                "en": "What is the Wi-Fi password?"
            },
            {
                "ja": "荷物（にもつ）を預（あず）かってください。",
                "en": "Please keep my luggage for me."
            },
            {
                "ja": "タオルをもう一枚（いちまい）ください。",
                "en": "One more towel, please."
            },
            {
                "ja": "エアコンがつきません。",
                "en": "The air conditioner doesn’t turn on."
            },
            {
                "ja": "チェックアウトをお願（ねが）いします。",
                "en": "I’d like to check out, please."
            },
            {
                "ja": "502号室（ごひゃくにごうしつ）のスミスです。",
                "en": "This is Smith in room 502."
            },
            {
                "ja": "お湯（ゆ）が出（で）ません。",
                "en": "There’s no hot water."
            },
            {
                "ja": "近（ちか）くにコンビニはありますか。",
                "en": "Is there a convenience store nearby?"
            }
        ],
        "usage": [
            {
                "ja": "予約（よやく）の名前（なまえ）は、パスポートと同（おな）じ名前（なまえ）を言（い）いましょう。",
                "en": "Give the same name as on your passport for the reservation."
            },
            {
                "ja": "チェックインの前（まえ）やチェックアウトの後（あと）でも、荷物（にもつ）を預（あず）かってくれるホテルが多（おお）いです。",
                "en": "Many hotels will keep your luggage before check-in or after check-out."
            },
            {
                "ja": "部屋（へや）で困（こま）った時（とき）は「〜がつきません」「〜がありません」で伝（つた）えられます。",
                "en": "If something is wrong in your room, you can say “… ga tsukimasen” (… doesn’t turn on) or “… ga arimasen” (there is no …)."
            },
            {
                "ja": "フロントに電話（でんわ）する時（とき）は、はじめに部屋（へや）の番号（ばんごう）と名前（なまえ）を言（い）いましょう。",
                "en": "When you call the front desk, first say your room number and your name."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "フロントでチェックイン",
                    "en": "Checking in at the front desk"
                },
                "lines": [
                    {
                        "speaker": "フロント",
                        "ja": "いらっしゃいませ。",
                        "en": "Welcome."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "チェックインをお願（ねが）いします。予約（よやく）しています。",
                        "en": "I’d like to check in. I have a reservation."
                    },
                    {
                        "speaker": "フロント",
                        "ja": "お名前（なまえ）をお願（ねが）いします。",
                        "en": "Your name, please."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "スミスです。",
                        "en": "It’s Smith."
                    },
                    {
                        "speaker": "フロント",
                        "ja": "スミス様（さま）ですね。パスポートをお願（ねが）いします。",
                        "en": "Mr./Ms. Smith. Your passport, please."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい。朝（あさ）ごはんは何時（なんじ）からですか。",
                        "en": "Here you are. What time does breakfast start?"
                    },
                    {
                        "speaker": "フロント",
                        "ja": "7時（しちじ）からです。お部屋（へや）は502号室（ごひゃくにごうしつ）です。",
                        "en": "From seven. Your room is number 502."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ありがとうございます。",
                        "en": "Thank you."
                    }
                ]
            },
            {
                "title": {
                    "ja": "部屋（へや）からフロントに電話（でんわ）する",
                    "en": "Calling the front desk from your room"
                },
                "lines": [
                    {
                        "speaker": "フロント",
                        "ja": "はい、フロントです。",
                        "en": "Hello, front desk."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、502号室（ごひゃくにごうしつ）のスミスです。",
                        "en": "Excuse me, this is Smith in room 502."
                    },
                    {
                        "speaker": "フロント",
                        "ja": "スミス様（さま）ですね。どうされましたか。",
                        "en": "Mr./Ms. Smith. What seems to be the problem?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "エアコンがつきません。",
                        "en": "The air conditioner doesn’t turn on."
                    },
                    {
                        "speaker": "フロント",
                        "ja": "申（もう）し訳（わけ）ありません。すぐに見（み）に行（い）きます。",
                        "en": "I’m sorry. We’ll come and check it right away."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "お願（ねが）いします。それから、タオルをもう一枚（いちまい）ください。",
                        "en": "Thank you. Also, one more towel, please."
                    },
                    {
                        "speaker": "フロント",
                        "ja": "かしこまりました。一緒（いっしょ）にお持（も）ちします。",
                        "en": "Certainly. We’ll bring one at the same time."
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
                "q": "チェックインを（　　）。",
                "answer": "お願（ねが）いします",
                "en": "I’d like to check in, please."
            },
            {
                "q": "（　　）しています。",
                "answer": "予約（よやく）",
                "en": "I have a reservation."
            },
            {
                "q": "朝（あさ）ごはんは（　　）からですか。",
                "answer": "何時（なんじ）",
                "en": "What time does breakfast start?"
            },
            {
                "q": "タオルをもう一枚（いちまい）（　　）。",
                "answer": "ください",
                "en": "One more towel, please."
            },
            {
                "q": "エアコンが（　　）。",
                "answer": "つきません",
                "en": "The air conditioner doesn’t turn on."
            },
            {
                "q": "荷物（にもつ）を（　　）ください。",
                "answer": "預（あず）かって",
                "en": "Please keep my luggage for me."
            },
            {
                "q": "お湯（ゆ）が（　　）。",
                "answer": "出（で）ません",
                "en": "There’s no hot water."
            },
            {
                "q": "近（ちか）くにコンビニは（　　）か。",
                "answer": "あります",
                "en": "Is there a convenience store nearby?"
            }
        ],
        "culture": {
            "ja": "日本（にほん）のホテルの部屋（へや）には、たいていスリッパがあります。旅館（りょかん）や畳（たたみ）の部屋（へや）では、入（い）り口（ぐち）で靴（くつ）を脱（ぬ）ぎます。",
            "en": "Hotel rooms in Japan usually have slippers. At a ryokan (a traditional inn) or in a tatami room, take off your shoes at the entrance."
        }
    },
    {
        "id": "restaurant",
        "title": "レストラン",
        "subtitle": "注文（ちゅうもん）とお会計（かいけい）",
        "titleEn": "Restaurant: ordering and paying",
        "goal": {
            "ja": "人数（にんずう）を言（い）って席（せき）に着（つ）き、注文（ちゅうもん）とお会計（かいけい）ができる。",
            "en": "Tell the number of people, order, and pay the bill."
        },
        "phrases": [
            {
                "ja": "二人（ふたり）です。",
                "en": "Two people."
            },
            {
                "ja": "メニューをください。",
                "en": "A menu, please."
            },
            {
                "ja": "これをください。",
                "en": "I’ll have this, please."
            },
            {
                "ja": "おすすめは何（なん）ですか。",
                "en": "What do you recommend?"
            },
            {
                "ja": "水（みず）をください。",
                "en": "Water, please."
            },
            {
                "ja": "肉（にく）は食（た）べられません。",
                "en": "I can’t eat meat."
            },
            {
                "ja": "お会計（かいけい）をお願（ねが）いします。",
                "en": "The check, please."
            },
            {
                "ja": "カードは使（つか）えますか。",
                "en": "Can I pay by card?"
            },
            {
                "ja": "すみません、注文（ちゅうもん）をお願（ねが）いします。",
                "en": "Excuse me, I’d like to order, please."
            },
            {
                "ja": "魚（さかな）は大丈夫（だいじょうぶ）です。",
                "en": "Fish is fine for me."
            },
            {
                "ja": "卵（たまご）アレルギーがあります。",
                "en": "I’m allergic to eggs."
            },
            {
                "ja": "ごちそうさまでした。",
                "en": "Thank you for the meal."
            }
        ],
        "usage": [
            {
                "ja": "店（みせ）に入（はい）ると「何名様（なんめいさま）ですか」と聞（き）かれます。指（ゆび）で人数（にんずう）を見（み）せながら「二人（ふたり）です」と言（い）いましょう。",
                "en": "When you enter, you’ll be asked “How many people?” Say “futari desu” while showing the number with your fingers."
            },
            {
                "ja": "食（た）べられない物（もの）がある時（とき）は、注文（ちゅうもん）の前（まえ）に伝（つた）えましょう。",
                "en": "If there is something you can’t eat, say so before you order."
            },
            {
                "ja": "日本（にほん）では、チップは要（い）りません。",
                "en": "There is no tipping in Japan."
            },
            {
                "ja": "お会計（かいけい）は、テーブルではなくレジで払（はら）う店（みせ）が多（おお）いです。",
                "en": "At many restaurants you pay at the register, not at the table."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "注文（ちゅうもん）からお会計（かいけい）まで",
                    "en": "From ordering to paying"
                },
                "lines": [
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "いらっしゃいませ。何名様（なんめいさま）ですか。",
                        "en": "Welcome. How many people?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "二人（ふたり）です。",
                        "en": "Two."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "こちらへどうぞ。",
                        "en": "This way, please."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、おすすめは何（なん）ですか。",
                        "en": "Excuse me, what do you recommend?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "天（てん）ぷらそばです。",
                        "en": "The tempura soba."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "じゃあ、これを二（ふた）つください。",
                        "en": "Then two of these, please."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "はい、少々（しょうしょう）お待（ま）ちください。",
                        "en": "Certainly. Just a moment, please."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、お会計（かいけい）をお願（ねが）いします。",
                        "en": "Excuse me, the check, please."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "2,400円（にせんよんひゃくえん）です。",
                        "en": "That will be 2,400 yen."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "カードは使（つか）えますか。",
                        "en": "Can I pay by card?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "はい、使（つか）えます。",
                        "en": "Yes, you can."
                    }
                ]
            },
            {
                "title": {
                    "ja": "食（た）べられない物（もの）を伝（つた）える",
                    "en": "Telling the staff what you can’t eat"
                },
                "lines": [
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "ご注文（ちゅうもん）はお決（き）まりですか。",
                        "en": "Are you ready to order?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、肉（にく）は食（た）べられません。",
                        "en": "Sorry, I can’t eat meat."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "魚（さかな）は大丈夫（だいじょうぶ）ですか。",
                        "en": "Is fish all right?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい、魚（さかな）は大丈夫（だいじょうぶ）です。",
                        "en": "Yes, fish is fine."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "では、焼（や）き魚（ざかな）の定食（ていしょく）がおすすめです。",
                        "en": "Then I recommend the grilled fish set meal."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "じゃあ、それをください。",
                        "en": "Then I’ll have that, please."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "お飲（の）み物（もの）はいかがですか。",
                        "en": "Would you like something to drink?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "水（みず）をください。",
                        "en": "Water, please."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "かしこまりました。少々（しょうしょう）お待（ま）ちください。",
                        "en": "Certainly. Just a moment, please."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "（　　）です。（2人（ふたり）の時（とき））",
                "answer": "二人（ふたり）",
                "en": "Two people."
            },
            {
                "q": "メニューを（　　）。",
                "answer": "ください",
                "en": "A menu, please."
            },
            {
                "q": "おすすめは（　　）ですか。",
                "answer": "何（なん）",
                "en": "What do you recommend?"
            },
            {
                "q": "お会計（かいけい）を（　　）。",
                "answer": "お願（ねが）いします",
                "en": "The check, please."
            },
            {
                "q": "カードは（　　）か。",
                "answer": "使（つか）えます",
                "en": "Can I pay by card?"
            },
            {
                "q": "肉（にく）は（　　）。",
                "answer": "食（た）べられません",
                "en": "I can’t eat meat."
            },
            {
                "q": "魚（さかな）は（　　）です。",
                "answer": "大丈夫（だいじょうぶ）",
                "en": "Fish is fine for me."
            },
            {
                "q": "卵（たまご）アレルギーが（　　）。",
                "answer": "あります",
                "en": "I’m allergic to eggs."
            }
        ],
        "culture": {
            "ja": "日本（にほん）のレストランでは、店員（てんいん）を呼（よ）ぶ時（とき）、手（て）をあげて「すみません」と言（い）います。テーブルにボタンがある店（みせ）では、そのボタンを押（お）します。",
            "en": "In Japanese restaurants, you raise your hand and say “sumimasen” to call the staff. If there is a button on the table, press it."
        }
    },
    {
        "id": "shopping",
        "title": "買（か）い物（もの）",
        "subtitle": "値段（ねだん）とサイズ",
        "titleEn": "Shopping: prices and sizes",
        "goal": {
            "ja": "値段（ねだん）を聞（き）き、サイズや色（いろ）を伝（つた）えて買（か）える。",
            "en": "Ask the price, tell the size and color you want, and buy it."
        },
        "phrases": [
            {
                "ja": "これはいくらですか。",
                "en": "How much is this?"
            },
            {
                "ja": "もっと大（おお）きいのはありますか。",
                "en": "Do you have a bigger one?"
            },
            {
                "ja": "Mサイズはありますか。",
                "en": "Do you have it in medium?"
            },
            {
                "ja": "ほかの色（いろ）はありますか。",
                "en": "Do you have other colors?"
            },
            {
                "ja": "着（き）てみてもいいですか。",
                "en": "May I try it on?"
            },
            {
                "ja": "これにします。",
                "en": "I’ll take this."
            },
            {
                "ja": "袋（ふくろ）は要（い）りません。",
                "en": "I don’t need a bag."
            },
            {
                "ja": "免税（めんぜい）できますか。",
                "en": "Can I buy this tax-free?"
            },
            {
                "ja": "見（み）ているだけです。",
                "en": "I’m just looking."
            },
            {
                "ja": "もっと安（やす）いのはありますか。",
                "en": "Do you have a cheaper one?"
            },
            {
                "ja": "ちょっと小（ちい）さいです。",
                "en": "It’s a little small."
            },
            {
                "ja": "ちょうどいいです。",
                "en": "It’s just right."
            }
        ],
        "usage": [
            {
                "ja": "値段（ねだん）は「〜円（えん）」で言（い）います。数字（すうじ）が聞（き）き取（と）れない時（とき）は、レジの画面（がめん）を見（み）ましょう。",
                "en": "Prices are said in yen. If you can’t catch the numbers, look at the screen at the register."
            },
            {
                "ja": "日本（にほん）では、値段（ねだん）の交渉（こうしょう）はほとんどしません。",
                "en": "Bargaining is rare in Japan."
            },
            {
                "ja": "袋（ふくろ）はお金（かね）がかかる店（みせ）が多（おお）いです。「袋（ふくろ）は要（い）りますか」と聞（き）かれます。",
                "en": "Many shops charge for bags. You’ll be asked “Do you need a bag?”"
            },
            {
                "ja": "免税（めんぜい）で買（か）う時（とき）は、パスポートが要（い）ります。",
                "en": "You need your passport to shop tax-free."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "値段（ねだん）と色（いろ）を聞（き）く",
                    "en": "Asking about price and color"
                },
                "lines": [
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "いらっしゃいませ。",
                        "en": "Welcome."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、これはいくらですか。",
                        "en": "Excuse me, how much is this?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "3,000円（さんぜんえん）です。",
                        "en": "It’s 3,000 yen."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ほかの色（いろ）はありますか。",
                        "en": "Do you have other colors?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "白（しろ）と黒（くろ）があります。",
                        "en": "We have white and black."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "じゃあ、黒（くろ）をください。Mサイズはありますか。",
                        "en": "Then black, please. Do you have it in medium?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "はい、こちらです。",
                        "en": "Yes, here it is."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "これにします。",
                        "en": "I’ll take this."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "袋（ふくろ）は要（い）りますか。",
                        "en": "Do you need a bag?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "いいえ、要（い）りません。",
                        "en": "No, I don’t."
                    }
                ]
            },
            {
                "title": {
                    "ja": "着（き）てみて、免税（めんぜい）で買（か）う",
                    "en": "Trying it on and buying it tax-free"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、これを着（き）てみてもいいですか。",
                        "en": "Excuse me, may I try this on?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "はい、試着室（しちゃくしつ）はこちらです。",
                        "en": "Sure. The fitting room is this way."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、ちょっと小（ちい）さいです。もっと大（おお）きいのはありますか。",
                        "en": "Excuse me, it’s a little small. Do you have a bigger one?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "はい、Lサイズがあります。どうぞ。",
                        "en": "Yes, we have it in large. Here you are."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ちょうどいいです。これにします。",
                        "en": "It’s just right. I’ll take it."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "ありがとうございます。お会計（かいけい）はこちらです。",
                        "en": "Thank you. The register is over here."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "免税（めんぜい）できますか。",
                        "en": "Can I buy it tax-free?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "はい、パスポートをお願（ねが）いします。",
                        "en": "Yes. Your passport, please."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい、これです。",
                        "en": "Here it is."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "これは（　　）ですか。",
                "answer": "いくら",
                "en": "How much is this?"
            },
            {
                "q": "ほかの（　　）はありますか。",
                "answer": "色（いろ）",
                "en": "Do you have other colors?"
            },
            {
                "q": "もっと（　　）のはありますか。",
                "answer": "大（おお）きい",
                "en": "Do you have a bigger one?"
            },
            {
                "q": "これに（　　）。",
                "answer": "します",
                "en": "I’ll take this."
            },
            {
                "q": "袋（ふくろ）は（　　）。",
                "answer": "要（い）りません",
                "en": "I don’t need a bag."
            },
            {
                "q": "着（き）てみても（　　）ですか。",
                "answer": "いい",
                "en": "May I try it on?"
            },
            {
                "q": "ちょっと（　　）です。",
                "answer": "小（ちい）さい",
                "en": "It’s a little small."
            },
            {
                "q": "見（み）ている（　　）です。",
                "answer": "だけ",
                "en": "I’m just looking."
            }
        ],
        "culture": {
            "ja": "店（みせ）に入（はい）ると、店員（てんいん）が「いらっしゃいませ」と言（い）います。これは「ようこそ」という意味（いみ）です。返事（へんじ）はしなくても大丈夫（だいじょうぶ）です。",
            "en": "When you enter a shop, the staff say “irasshaimase.” It means “welcome.” You don’t need to reply."
        }
    },
    {
        "id": "train",
        "title": "電車（でんしゃ）と道（みち）",
        "subtitle": "駅（えき）と道（みち）を聞（き）く",
        "titleEn": "Trains and directions",
        "goal": {
            "ja": "駅（えき）や道（みち）を聞（き）いて、電車（でんしゃ）の行（い）き先（さき）を確（たし）かめられる。",
            "en": "Ask the way to a station or place, and check where a train is going."
        },
        "phrases": [
            {
                "ja": "すみません、駅（えき）はどこですか。",
                "en": "Excuse me, where is the station?"
            },
            {
                "ja": "ここに行（い）きたいです。",
                "en": "I want to go here."
            },
            {
                "ja": "ここから遠（とお）いですか。",
                "en": "Is it far from here?"
            },
            {
                "ja": "新宿（しんじゅく）までいくらですか。",
                "en": "How much is it to Shinjuku?"
            },
            {
                "ja": "この電車（でんしゃ）は新宿（しんじゅく）に行（い）きますか。",
                "en": "Does this train go to Shinjuku?"
            },
            {
                "ja": "何番線（なんばんせん）ですか。",
                "en": "Which platform is it?"
            },
            {
                "ja": "次（つぎ）は何駅（なにえき）ですか。",
                "en": "What is the next station?"
            },
            {
                "ja": "まっすぐ行（い）って、右（みぎ）です。",
                "en": "Go straight, and it’s on the right."
            },
            {
                "ja": "どうやって行（い）きますか。",
                "en": "How do I get there?"
            },
            {
                "ja": "歩（ある）いて何分（なんぷん）ですか。",
                "en": "How many minutes is it on foot?"
            },
            {
                "ja": "どこで乗（の）り換（か）えますか。",
                "en": "Where do I change trains?"
            },
            {
                "ja": "この電車（でんしゃ）は渋谷（しぶや）に止（と）まりますか。",
                "en": "Does this train stop at Shibuya?"
            }
        ],
        "usage": [
            {
                "ja": "道（みち）を聞（き）く時（とき）は、スマホの地図（ちず）を見（み）せながら「ここに行（い）きたいです」と言（い）うと伝（つた）わりやすいです。",
                "en": "When asking the way, show the map on your phone and say “koko ni ikitai desu.” It is easy to understand."
            },
            {
                "ja": "駅（えき）では「〜番線（ばんせん）」の数字（すうじ）でホームを探（さが）します。",
                "en": "At the station, find your platform by its number, “… bansen.”"
            },
            {
                "ja": "交通系（こうつうけい）ICカード（Suica・PASMOなど）があると、切符（きっぷ）を買（か）わずに乗（の）れます。",
                "en": "With a transit IC card (Suica, PASMO, etc.), you can ride without buying tickets."
            },
            {
                "ja": "電車（でんしゃ）の中（なか）では、電話（でんわ）で話（はな）さないのがマナーです。",
                "en": "It is good manners not to talk on the phone on the train."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "駅（えき）で電車（でんしゃ）を確（たし）かめる",
                    "en": "Checking your train at the station"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、この電車（でんしゃ）は新宿（しんじゅく）に行（い）きますか。",
                        "en": "Excuse me, does this train go to Shinjuku?"
                    },
                    {
                        "speaker": "駅員（えきいん）",
                        "ja": "いいえ、行（い）きません。3番線（さんばんせん）の電車（でんしゃ）です。",
                        "en": "No, it doesn’t. Take the train on platform 3."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "3番線（さんばんせん）はどこですか。",
                        "en": "Where is platform 3?"
                    },
                    {
                        "speaker": "駅員（えきいん）",
                        "ja": "あの階段（かいだん）を上（あ）がって、右（みぎ）です。",
                        "en": "Go up those stairs, and it’s on the right."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "新宿（しんじゅく）まで何分（なんぷん）ですか。",
                        "en": "How many minutes is it to Shinjuku?"
                    },
                    {
                        "speaker": "駅員（えきいん）",
                        "ja": "15分（じゅうごふん）ぐらいです。",
                        "en": "About fifteen minutes."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ありがとうございます。",
                        "en": "Thank you."
                    }
                ]
            },
            {
                "title": {
                    "ja": "道（みち）で人（ひと）に聞（き）く",
                    "en": "Asking someone for directions"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、ここに行（い）きたいです。",
                        "en": "Excuse me, I want to go here."
                    },
                    {
                        "speaker": "通行人（つうこうにん）",
                        "ja": "ああ、東京（とうきょう）タワーですね。",
                        "en": "Oh, Tokyo Tower."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ここから遠（とお）いですか。",
                        "en": "Is it far from here?"
                    },
                    {
                        "speaker": "通行人（つうこうにん）",
                        "ja": "いいえ、歩（ある）いて10分（じゅっぷん）ぐらいです。",
                        "en": "No, it’s about ten minutes on foot."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "どうやって行（い）きますか。",
                        "en": "How do I get there?"
                    },
                    {
                        "speaker": "通行人（つうこうにん）",
                        "ja": "この道（みち）をまっすぐ行（い）って、二（ふた）つ目（め）の信号（しんごう）を右（みぎ）に曲（ま）がってください。",
                        "en": "Go straight along this street and turn right at the second traffic light."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "二（ふた）つ目（め）の信号（しんごう）を右（みぎ）ですね。",
                        "en": "So, right at the second traffic light?"
                    },
                    {
                        "speaker": "通行人（つうこうにん）",
                        "ja": "はい、そうです。",
                        "en": "Yes, that’s right."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ありがとうございました。",
                        "en": "Thank you very much."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "駅（えき）は（　　）ですか。",
                "answer": "どこ",
                "en": "Where is the station?"
            },
            {
                "q": "（　　）に行（い）きたいです。",
                "answer": "ここ",
                "en": "I want to go here."
            },
            {
                "q": "新宿（しんじゅく）まで（　　）ですか。",
                "answer": "いくら",
                "en": "How much is it to Shinjuku?"
            },
            {
                "q": "この電車（でんしゃ）は新宿（しんじゅく）に（　　）か。",
                "answer": "行（い）きます",
                "en": "Does this train go to Shinjuku?"
            },
            {
                "q": "まっすぐ行（い）って、（　　）です。",
                "answer": "右（みぎ）",
                "en": "Go straight, and it’s on the right."
            },
            {
                "q": "（　　）行（い）きますか。",
                "answer": "どうやって",
                "en": "How do I get there?"
            },
            {
                "q": "歩（ある）いて（　　）ですか。",
                "answer": "何分（なんぷん）",
                "en": "How many minutes is it on foot?"
            },
            {
                "q": "ここから（　　）ですか。",
                "answer": "遠（とお）い",
                "en": "Is it far from here?"
            }
        ],
        "culture": {
            "ja": "駅（えき）のホームでは、床（ゆか）の印（しるし）のところに並（なら）んで電車（でんしゃ）を待（ま）ちます。降（お）りる人（ひと）が先（さき）で、乗（の）る人（ひと）は後（あと）です。",
            "en": "On the platform, people line up at the marks on the floor to wait for the train. Let people get off first, then get on."
        }
    },
    {
        "id": "convenience",
        "title": "コンビニ",
        "subtitle": "お弁当（べんとう）と支払（しはら）い",
        "titleEn": "Convenience store: bento and paying",
        "goal": {
            "ja": "お弁当（べんとう）を温（あたた）めてもらえる。袋（ふくろ）やお箸（はし）が要（い）るかどうか答（こた）えて、カードやICカードで払（はら）える。",
            "en": "Get your bento heated, say whether you need a bag or chopsticks, and pay by card or IC card."
        },
        "phrases": [
            {
                "ja": "これを温（あたた）めてください。",
                "en": "Please heat this up."
            },
            {
                "ja": "いいえ、大丈夫（だいじょうぶ）です。",
                "en": "No, thank you."
            },
            {
                "ja": "袋（ふくろ）を一（ひと）つください。",
                "en": "One bag, please."
            },
            {
                "ja": "お箸（はし）をください。",
                "en": "Chopsticks, please."
            },
            {
                "ja": "お湯（ゆ）はどこですか。",
                "en": "Where is the hot water?"
            },
            {
                "ja": "カードでお願（ねが）いします。",
                "en": "By card, please."
            },
            {
                "ja": "Suicaで払（はら）えますか。",
                "en": "Can I pay with Suica?"
            },
            {
                "ja": "ここにタッチしますか。",
                "en": "Do I tap it here?"
            },
            {
                "ja": "ポイントカードはありません。",
                "en": "I don’t have a point card."
            },
            {
                "ja": "レシートは要（い）りません。",
                "en": "I don’t need the receipt."
            },
            {
                "ja": "トイレを借（か）りてもいいですか。",
                "en": "May I use the restroom?"
            },
            {
                "ja": "ATMはどこですか。",
                "en": "Where is the ATM?"
            }
        ],
        "usage": [
            {
                "ja": "お弁当（べんとう）を買（か）うと、「温（あたた）めますか」と聞（き）かれます。温（あたた）めてほしい時（とき）は「はい、お願（ねが）いします」と言（い）いましょう。",
                "en": "When you buy a bento, you’ll be asked “atatamemasu ka?” (Shall I heat it up?). If you want it heated, say “hai, onegaishimasu.”"
            },
            {
                "ja": "「大丈夫（だいじょうぶ）です」は「要（い）りません」の意味（いみ）でもよく使（つか）います。温（あたた）めなくていい時（とき）や、袋（ふくろ）やお箸（はし）が要（い）らない時（とき）に使（つか）えます。",
                "en": "People often say “daijōbu desu” to mean “No, thank you.” Use it when you don’t need your food heated, or don’t need a bag or chopsticks."
            },
            {
                "ja": "「ポイントカードはお持（も）ちですか」とよく聞（き）かれます。ない時（とき）は「ありません」と答（こた）えれば大丈夫（だいじょうぶ）です。",
                "en": "You’ll often be asked “pointo kādo wa omochi desu ka?” (Do you have a point card?). If you don’t have one, just answer “arimasen.”"
            },
            {
                "ja": "レジの画面（がめん）を押（お）して、支払（しはら）いの方法（ほうほう）を自分（じぶん）で選（えら）ぶ店（みせ）が多（おお）いです。ICカードで払（はら）う時（とき）は、選（えら）んだ後（あと）でカードを機械（きかい）にタッチします。",
                "en": "At many stores, you press the screen at the register to choose how you will pay. To pay with an IC card, choose it first, then tap your card on the reader."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "お弁当（べんとう）を買（か）う",
                    "en": "Buying a bento"
                },
                "lines": [
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "いらっしゃいませ。",
                        "en": "Welcome."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "これをお願（ねが）いします。",
                        "en": "This, please."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "お弁当（べんとう）は温（あたた）めますか。",
                        "en": "Would you like the bento heated?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい、温（あたた）めてください。",
                        "en": "Yes, please heat it up."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "お箸（はし）は要（い）りますか。",
                        "en": "Do you need chopsticks?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい、お願（ねが）いします。",
                        "en": "Yes, please."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "袋（ふくろ）は要（い）りますか。",
                        "en": "Do you need a bag?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "いいえ、大丈夫（だいじょうぶ）です。",
                        "en": "No, thank you."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "780円（ななひゃくはちじゅうえん）です。",
                        "en": "That’s 780 yen."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "カードでお願（ねが）いします。",
                        "en": "By card, please."
                    }
                ]
            },
            {
                "title": {
                    "ja": "ICカードで払（はら）う",
                    "en": "Paying with an IC card"
                },
                "lines": [
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "ポイントカードはお持（も）ちですか。",
                        "en": "Do you have a point card?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "いいえ、ありません。",
                        "en": "No, I don’t."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "250円（にひゃくごじゅうえん）です。",
                        "en": "That’s 250 yen."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "Suicaで払（はら）えますか。",
                        "en": "Can I pay with Suica?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "はい。画面（がめん）のここを押（お）してから、カードをタッチしてください。",
                        "en": "Yes. Press here on the screen, then tap your card."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ここにタッチしますか。",
                        "en": "Do I tap it here?"
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "はい、そうです。レシートは要（い）りますか。",
                        "en": "Yes, that’s right. Do you need the receipt?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "いいえ、要（い）りません。",
                        "en": "No, I don’t."
                    },
                    {
                        "speaker": "店員（てんいん）",
                        "ja": "ありがとうございました。",
                        "en": "Thank you very much."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "これを（　　）ください。",
                "answer": "温（あたた）めて",
                "en": "Please heat this up."
            },
            {
                "q": "いいえ、（　　）です。",
                "answer": "大丈夫（だいじょうぶ）",
                "en": "No, thank you."
            },
            {
                "q": "袋（ふくろ）を（　　）ください。",
                "answer": "一（ひと）つ",
                "en": "One bag, please."
            },
            {
                "q": "カード（　　）お願（ねが）いします。",
                "answer": "で",
                "en": "By card, please."
            },
            {
                "q": "Suicaで（　　）か。",
                "answer": "払（はら）えます",
                "en": "Can I pay with Suica?"
            },
            {
                "q": "ポイントカードは（　　）。",
                "answer": "ありません",
                "en": "I don’t have a point card."
            },
            {
                "q": "レシートは（　　）。",
                "answer": "要（い）りません",
                "en": "I don’t need the receipt."
            },
            {
                "q": "トイレを（　　）もいいですか。",
                "answer": "借（か）りて",
                "en": "May I use the restroom?"
            }
        ],
        "culture": {
            "ja": "日本（にほん）の道（みち）には、ごみ箱（ばこ）があまりありません。コンビニで買（か）った物（もの）のごみは、その店（みせ）のごみ箱（ばこ）に捨（す）てましょう。ほかのごみは、ホテルに持（も）って帰（かえ）りましょう。",
            "en": "There are few trash cans on the streets in Japan. Put trash from things you bought at a convenience store in that store’s bins. Take other trash back to your hotel."
        }
    },
    {
        "id": "taxi",
        "title": "タクシー",
        "subtitle": "行（い）き先（さき）を伝（つた）える",
        "titleEn": "Taxi: telling the driver where to go",
        "goal": {
            "ja": "行（い）き先（さき）を言（い）ったり住所（じゅうしょ）を見（み）せたりして、タクシーで行（い）きたい所（ところ）まで行（い）ける。料金（りょうきん）を聞（き）いて払（はら）い、領収書（りょうしゅうしょ）をもらえる。",
            "en": "Take a taxi to where you want to go by saying the destination or showing an address. Ask about the fare, pay, and get a receipt."
        },
        "phrases": [
            {
                "ja": "東京駅（とうきょうえき）までお願（ねが）いします。",
                "en": "To Tokyo Station, please."
            },
            {
                "ja": "ここまでお願（ねが）いします。",
                "en": "Please take me here (showing a map)."
            },
            {
                "ja": "この住所（じゅうしょ）に行（い）ってください。",
                "en": "Please go to this address."
            },
            {
                "ja": "何分（なんぷん）ぐらいかかりますか。",
                "en": "About how many minutes will it take?"
            },
            {
                "ja": "空港（くうこう）までいくらぐらいですか。",
                "en": "About how much is it to the airport?"
            },
            {
                "ja": "四人（よにん）乗（の）れますか。",
                "en": "Can you take four people?"
            },
            {
                "ja": "トランクを開（あ）けてください。",
                "en": "Please open the trunk."
            },
            {
                "ja": "急（いそ）いでいます。",
                "en": "I’m in a hurry."
            },
            {
                "ja": "次（つぎ）の信号（しんごう）を右（みぎ）にお願（ねが）いします。",
                "en": "Please turn right at the next traffic light."
            },
            {
                "ja": "ここで止（と）めてください。",
                "en": "Please stop here."
            },
            {
                "ja": "カードで払（はら）えますか。",
                "en": "Can I pay by card?"
            },
            {
                "ja": "領収書（りょうしゅうしょ）をください。",
                "en": "A receipt, please."
            }
        ],
        "usage": [
            {
                "ja": "行（い）き先（さき）は「〜までお願（ねが）いします」と言（い）います。名前（なまえ）が言（い）いにくい時（とき）は、スマホの地図（ちず）や住所（じゅうしょ）を見（み）せて「ここまでお願（ねが）いします」と言（い）いましょう。",
                "en": "Tell the driver your destination with “… made onegaishimasu.” If the name is hard to say, show a map or the address on your phone and say “koko made onegaishimasu.”"
            },
            {
                "ja": "空（あ）いているタクシーには「空車（くうしゃ）」と出（で）ています。手（て）を上（あ）げると止（と）まってくれます。駅（えき）では、タクシー乗（の）り場（ば）で待（ま）ちましょう。",
                "en": "A free taxi shows the sign “kūsha” (vacant). Raise your hand and it will stop for you. At stations, wait at the taxi stand."
            },
            {
                "ja": "料金（りょうきん）はメーターに出（で）ます。降（お）りる時（とき）に払（はら）います。チップは要（い）りません。",
                "en": "The fare is shown on the meter. You pay when you get out. No tip is needed."
            },
            {
                "ja": "領収書（りょうしゅうしょ）には、タクシーの会社（かいしゃ）の名前（なまえ）と電話番号（でんわばんごう）が書（か）いてあります。忘（わす）れ物（もの）をした時（とき）に役（やく）に立（た）つので、もらっておきましょう。",
                "en": "The receipt shows the taxi company’s name and phone number. It helps if you leave something in the taxi, so it’s a good idea to take one."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "タクシーに乗（の）る",
                    "en": "Getting in a taxi"
                },
                "lines": [
                    {
                        "speaker": "運転手（うんてんしゅ）",
                        "ja": "どちらまでですか。",
                        "en": "Where to?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "この住所（じゅうしょ）までお願（ねが）いします。",
                        "en": "To this address, please."
                    },
                    {
                        "speaker": "運転手（うんてんしゅ）",
                        "ja": "はい。シートベルトをお願（ねが）いします。",
                        "en": "Sure. Please fasten your seat belt."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい。何分（なんぷん）ぐらいかかりますか。",
                        "en": "OK. About how many minutes will it take?"
                    },
                    {
                        "speaker": "運転手（うんてんしゅ）",
                        "ja": "15分（じゅうごふん）ぐらいです。",
                        "en": "About fifteen minutes."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "いくらぐらいですか。",
                        "en": "About how much will it be?"
                    },
                    {
                        "speaker": "運転手（うんてんしゅ）",
                        "ja": "2,000円（にせんえん）ぐらいです。",
                        "en": "About 2,000 yen."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "わかりました。少（すこ）し急（いそ）いでいます。",
                        "en": "I see. I’m in a bit of a hurry."
                    },
                    {
                        "speaker": "運転手（うんてんしゅ）",
                        "ja": "はい、わかりました。",
                        "en": "All right."
                    }
                ]
            },
            {
                "title": {
                    "ja": "降（お）りる時（とき）",
                    "en": "Getting out and paying"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、あのコンビニの前（まえ）で止（と）めてください。",
                        "en": "Excuse me, please stop in front of that convenience store."
                    },
                    {
                        "speaker": "運転手（うんてんしゅ）",
                        "ja": "はい。1,850円（せんはっぴゃくごじゅうえん）です。",
                        "en": "Sure. That’s 1,850 yen."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "カードで払（はら）えますか。",
                        "en": "Can I pay by card?"
                    },
                    {
                        "speaker": "運転手（うんてんしゅ）",
                        "ja": "はい、大丈夫（だいじょうぶ）です。ここにタッチしてください。",
                        "en": "Yes, that’s fine. Please tap it here."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "領収書（りょうしゅうしょ）をください。",
                        "en": "A receipt, please."
                    },
                    {
                        "speaker": "運転手（うんてんしゅ）",
                        "ja": "はい、どうぞ。お忘（わす）れ物（もの）はありませんか。",
                        "en": "Here you are. Do you have all your things?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい、大丈夫（だいじょうぶ）です。ありがとうございました。",
                        "en": "Yes, I have everything. Thank you very much."
                    },
                    {
                        "speaker": "運転手（うんてんしゅ）",
                        "ja": "ありがとうございました。",
                        "en": "Thank you very much."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "東京駅（とうきょうえき）（　　）お願（ねが）いします。",
                "answer": "まで",
                "en": "To Tokyo Station, please."
            },
            {
                "q": "この（　　）に行（い）ってください。",
                "answer": "住所（じゅうしょ）",
                "en": "Please go to this address."
            },
            {
                "q": "何分（なんぷん）ぐらい（　　）か。",
                "answer": "かかります",
                "en": "About how many minutes will it take?"
            },
            {
                "q": "空港（くうこう）まで（　　）ぐらいですか。",
                "answer": "いくら",
                "en": "About how much is it to the airport?"
            },
            {
                "q": "急（いそ）いで（　　）。",
                "answer": "います",
                "en": "I’m in a hurry."
            },
            {
                "q": "次（つぎ）の信号（しんごう）を（　　）にお願（ねが）いします。",
                "answer": "右（みぎ）",
                "en": "Please turn right at the next traffic light."
            },
            {
                "q": "ここで（　　）ください。",
                "answer": "止（と）めて",
                "en": "Please stop here."
            },
            {
                "q": "（　　）をください。",
                "answer": "領収書（りょうしゅうしょ）",
                "en": "A receipt, please."
            }
        ],
        "culture": {
            "ja": "日本（にほん）のタクシーは、後（うし）ろのドアを運転手（うんてんしゅ）が開（あ）けたり閉（し）めたりします。自分（じぶん）でドアを閉（し）めなくても大丈夫（だいじょうぶ）です。降（お）りる時（とき）も、ドアが開（あ）くまで待（ま）ちましょう。",
            "en": "In Japanese taxis, the driver opens and closes the rear door. You don’t need to close it yourself. When you get out, wait for the door to open."
        }
    },
    {
        "id": "sightseeing",
        "title": "観光地（かんこうち）",
        "subtitle": "チケットと写真（しゃしん）",
        "titleEn": "Sightseeing spots: tickets and photos",
        "goal": {
            "ja": "チケットを買（か）って、開（あ）いている時間（じかん）を聞（き）ける。写真（しゃしん）を撮（と）ってもいいか聞（き）いたり、写真（しゃしん）を頼（たの）んだりできる。",
            "en": "Buy tickets and ask about opening hours. Ask whether you may take photos, and ask someone to take your picture."
        },
        "phrases": [
            {
                "ja": "チケットはどこで買（か）いますか。",
                "en": "Where do I buy tickets?"
            },
            {
                "ja": "大人（おとな）二枚（にまい）ください。",
                "en": "Two adult tickets, please."
            },
            {
                "ja": "一人（ひとり）いくらですか。",
                "en": "How much is it per person?"
            },
            {
                "ja": "学生割引（がくせいわりびき）はありますか。",
                "en": "Is there a student discount?"
            },
            {
                "ja": "何時（なんじ）まで開（あ）いていますか。",
                "en": "Until what time is it open?"
            },
            {
                "ja": "休（やす）みは何曜日（なんようび）ですか。",
                "en": "Which day of the week is it closed?"
            },
            {
                "ja": "英語（えいご）のパンフレットはありますか。",
                "en": "Do you have a pamphlet in English?"
            },
            {
                "ja": "写真（しゃしん）を撮（と）ってもいいですか。",
                "en": "May I take photos?"
            },
            {
                "ja": "すみません、写真（しゃしん）を撮（と）ってもらえませんか。",
                "en": "Excuse me, could you take a photo for me?"
            },
            {
                "ja": "ここを押（お）してください。",
                "en": "Please press here."
            },
            {
                "ja": "もう一枚（いちまい）お願（ねが）いします。",
                "en": "One more, please."
            },
            {
                "ja": "コインロッカーはありますか。",
                "en": "Are there coin lockers?"
            }
        ],
        "usage": [
            {
                "ja": "チケットは「大人（おとな）二枚（にまい）」「子（こ）ども一枚（いちまい）」のように言（い）って買（か）います。チケットや紙（かみ）は「一枚（いちまい）、二枚（にまい）、三枚（さんまい）」と数（かぞ）えます。",
                "en": "Buy tickets by saying, for example, “otona nimai” (two adults) or “kodomo ichimai” (one child). Tickets and paper are counted “ichimai, nimai, sanmai.”"
            },
            {
                "ja": "美術館（びじゅつかん）や博物館（はくぶつかん）は、月曜日（げつようび）が休（やす）みの所（ところ）が多（おお）いです。閉（し）まる30分前（さんじゅっぷんまえ）までしか入（はい）れない所（ところ）もあります。",
                "en": "Many museums are closed on Mondays. At some places, you can only go in until 30 minutes before closing."
            },
            {
                "ja": "「撮影禁止（さつえいきんし）」は、写真（しゃしん）を撮（と）ってはいけないという意味（いみ）です。お寺（てら）や美術館（びじゅつかん）の中（なか）は撮（と）れない所（ところ）が多（おお）いので、撮（と）る前（まえ）に聞（き）きましょう。",
                "en": "“Satsuei kinshi” means no photography. Photos are often not allowed inside temples and museums, so ask before you take any."
            },
            {
                "ja": "写真（しゃしん）を頼（たの）む時（とき）は、スマホを渡（わた）して「ここを押（お）してください」と言（い）えば大丈夫（だいじょうぶ）です。撮（と）ってもらったら、「ありがとうございます」と言（い）いましょう。",
                "en": "When you ask someone to take a photo, hand them your phone and say “koko o oshite kudasai.” Afterwards, say “arigatō gozaimasu.”"
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "チケットを買（か）う",
                    "en": "Buying tickets"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、大人（おとな）二枚（にまい）ください。",
                        "en": "Excuse me, two adult tickets, please."
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "はい、2,000円（にせんえん）です。",
                        "en": "Sure, that’s 2,000 yen."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "何時（なんじ）まで開（あ）いていますか。",
                        "en": "Until what time is it open?"
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "5時（ごじ）までです。でも、入（はい）れるのは4時半（よじはん）までです。",
                        "en": "Until five. But you can only go in until 4:30."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "写真（しゃしん）を撮（と）ってもいいですか。",
                        "en": "May I take photos?"
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "庭（にわ）は大丈夫（だいじょうぶ）です。でも、建物（たてもの）の中（なか）は撮影禁止（さつえいきんし）です。",
                        "en": "In the garden, yes. But photography is not allowed inside the buildings."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "わかりました。英語（えいご）のパンフレットはありますか。",
                        "en": "I see. Do you have a pamphlet in English?"
                    },
                    {
                        "speaker": "係員（かかりいん）",
                        "ja": "はい、こちらです。",
                        "en": "Yes, here you are."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ありがとうございます。",
                        "en": "Thank you."
                    }
                ]
            },
            {
                "title": {
                    "ja": "写真（しゃしん）を頼（たの）む",
                    "en": "Asking someone to take a photo"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、写真（しゃしん）を撮（と）ってもらえませんか。",
                        "en": "Excuse me, could you take a photo for me?"
                    },
                    {
                        "speaker": "通行人（つうこうにん）",
                        "ja": "いいですよ。",
                        "en": "Sure."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ここを押（お）してください。後（うし）ろのお寺（てら）も入（い）れてください。",
                        "en": "Please press here. And please get the temple behind me in the picture."
                    },
                    {
                        "speaker": "通行人（つうこうにん）",
                        "ja": "はい、撮（と）りますよ。はい、チーズ。",
                        "en": "OK, here goes. Say cheese!"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "ありがとうございます。もう一枚（いちまい）お願（ねが）いします。",
                        "en": "Thank you. One more, please."
                    },
                    {
                        "speaker": "通行人（つうこうにん）",
                        "ja": "はい。これでいいですか。",
                        "en": "Sure. Is this OK?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい、とてもいいです。ありがとうございました。",
                        "en": "Yes, it’s great. Thank you very much."
                    },
                    {
                        "speaker": "通行人（つうこうにん）",
                        "ja": "いいえ。旅行（りょこう）、楽（たの）しんでくださいね。",
                        "en": "No problem. Enjoy your trip!"
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "大人（おとな）（　　）ください。",
                "answer": "二枚（にまい）",
                "en": "Two adult tickets, please."
            },
            {
                "q": "何時（なんじ）まで（　　）いますか。",
                "answer": "開（あ）いて",
                "en": "Until what time is it open?"
            },
            {
                "q": "休（やす）みは（　　）ですか。",
                "answer": "何曜日（なんようび）",
                "en": "Which day of the week is it closed?"
            },
            {
                "q": "英語（えいご）の（　　）はありますか。",
                "answer": "パンフレット",
                "en": "Do you have a pamphlet in English?"
            },
            {
                "q": "写真（しゃしん）を（　　）もいいですか。",
                "answer": "撮（と）って",
                "en": "May I take photos?"
            },
            {
                "q": "すみません、写真（しゃしん）を撮（と）って（　　）か。",
                "answer": "もらえません",
                "en": "Excuse me, could you take a photo for me?"
            },
            {
                "q": "ここを（　　）ください。",
                "answer": "押（お）して",
                "en": "Please press here."
            },
            {
                "q": "もう（　　）お願（ねが）いします。",
                "answer": "一枚（いちまい）",
                "en": "One more, please."
            }
        ],
        "culture": {
            "ja": "お寺（てら）の建物（たてもの）に入（はい）る時（とき）は、靴（くつ）を脱（ぬ）ぐ所（ところ）が多（おお）いです。入口（いりぐち）に「土足禁止（どそくきんし）」と書（か）いてあったら、靴（くつ）を脱（ぬ）ぎましょう。",
            "en": "At many temples, you take off your shoes before going into the buildings. If the entrance says “dosoku kinshi” (no shoes), take them off."
        }
    },
    {
        "id": "clinic",
        "title": "病院（びょういん）と薬局（やっきょく）",
        "subtitle": "具合（ぐあい）が悪（わる）い時（とき）",
        "titleEn": "Hospital and pharmacy: when you feel sick",
        "goal": {
            "ja": "体（からだ）の具合（ぐあい）を簡単（かんたん）な言葉（ことば）で伝（つた）えて、薬局（やっきょく）で薬（くすり）を買（か）える。アレルギーを伝（つた）えて、薬（くすり）の飲（の）み方（かた）を聞（き）ける。",
            "en": "Describe how you feel in simple words and buy medicine at a pharmacy. Tell the staff about allergies and ask how to take the medicine."
        },
        "phrases": [
            {
                "ja": "熱（ねつ）があります。",
                "en": "I have a fever."
            },
            {
                "ja": "頭（あたま）が痛（いた）いです。",
                "en": "I have a headache."
            },
            {
                "ja": "お腹（なか）が痛（いた）いです。",
                "en": "I have a stomachache."
            },
            {
                "ja": "のどが痛（いた）いです。",
                "en": "I have a sore throat."
            },
            {
                "ja": "気分（きぶん）が悪（わる）いです。",
                "en": "I feel sick."
            },
            {
                "ja": "昨日（きのう）からです。",
                "en": "Since yesterday."
            },
            {
                "ja": "近（ちか）くに病院（びょういん）はありますか。",
                "en": "Is there a hospital nearby?"
            },
            {
                "ja": "英語（えいご）が話（はな）せるお医者（いしゃ）さんはいますか。",
                "en": "Is there a doctor who speaks English?"
            },
            {
                "ja": "風邪（かぜ）の薬（くすり）はありますか。",
                "en": "Do you have cold medicine?"
            },
            {
                "ja": "アレルギーがあります。",
                "en": "I have an allergy."
            },
            {
                "ja": "一日（いちにち）何回（なんかい）飲（の）みますか。",
                "en": "How many times a day should I take it?"
            },
            {
                "ja": "救急車（きゅうきゅうしゃ）を呼（よ）んでください。",
                "en": "Please call an ambulance."
            }
        ],
        "usage": [
            {
                "ja": "痛（いた）い所（ところ）は「〜が痛（いた）いです」で伝（つた）えます。言葉（ことば）がわからない時（とき）は、痛（いた）い所（ところ）を指（ゆび）でさして見（み）せましょう。",
                "en": "Say where it hurts with “… ga itai desu.” If you don’t know the word, point to the place that hurts."
            },
            {
                "ja": "薬局（やっきょく）やドラッグストアでは、風邪（かぜ）や頭（あたま）が痛（いた）い時（とき）の薬（くすり）が買（か）えます。アレルギーがある時（とき）や、ほかの薬（くすり）を飲（の）んでいる時（とき）は、買（か）う前（まえ）に伝（つた）えましょう。",
                "en": "You can buy medicine for colds and headaches at pharmacies and drugstores. If you have allergies or take other medicine, tell the staff before you buy."
            },
            {
                "ja": "薬（くすり）の飲（の）み方（かた）は「一日（いちにち）三回（さんかい）」「食後（しょくご）」のように言（い）われます。「食後（しょくご）」は、ご飯（はん）を食（た）べた後（あと）という意味（いみ）です。",
                "en": "You’ll hear how to take medicine in words like “ichinichi sankai” (three times a day) and “shokugo.” The word “shokugo” means after meals."
            },
            {
                "ja": "病院（びょういん）に行（い）く時（とき）は、パスポートを持（も）って行（い）きましょう。旅行（りょこう）の保険（ほけん）に入（はい）っている人（ひと）は、保険（ほけん）の書類（しょるい）も持（も）って行（い）きましょう。",
                "en": "Take your passport when you go to a hospital. If you have travel insurance, take your insurance papers too."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "薬局（やっきょく）で薬（くすり）を買（か）う",
                    "en": "Buying medicine at a pharmacy"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、頭（あたま）が痛（いた）い時（とき）の薬（くすり）はありますか。",
                        "en": "Excuse me, do you have medicine for headaches?"
                    },
                    {
                        "speaker": "薬剤師（やくざいし）",
                        "ja": "はい、こちらです。アレルギーはありますか。",
                        "en": "Yes, here. Do you have any allergies?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい、あります。スマホのメモを見（み）てください。",
                        "en": "Yes, I do. Please look at the note on my phone."
                    },
                    {
                        "speaker": "薬剤師（やくざいし）",
                        "ja": "わかりました。では、こちらの薬（くすり）がいいですね。",
                        "en": "I see. Then this one would be better."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "一日（いちにち）何回（なんかい）飲（の）みますか。",
                        "en": "How many times a day should I take it?"
                    },
                    {
                        "speaker": "薬剤師（やくざいし）",
                        "ja": "一日（いちにち）三回（さんかい）までです。ご飯（はん）の後（あと）に飲（の）んでください。",
                        "en": "Up to three times a day. Please take it after meals."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "眠（ねむ）くなりますか。",
                        "en": "Will it make me sleepy?"
                    },
                    {
                        "speaker": "薬剤師（やくざいし）",
                        "ja": "少（すこ）し眠（ねむ）くなるかもしれません。",
                        "en": "It may make you a little sleepy."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "わかりました。これをください。",
                        "en": "I see. I’ll take this one."
                    }
                ]
            },
            {
                "title": {
                    "ja": "病院（びょういん）で",
                    "en": "At the doctor’s"
                },
                "lines": [
                    {
                        "speaker": "医者（いしゃ）",
                        "ja": "どうしましたか。",
                        "en": "What seems to be the problem?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "熱（ねつ）があります。のども痛（いた）いです。",
                        "en": "I have a fever. My throat hurts, too."
                    },
                    {
                        "speaker": "医者（いしゃ）",
                        "ja": "いつからですか。",
                        "en": "Since when?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "昨日（きのう）の夜（よる）からです。",
                        "en": "Since last night."
                    },
                    {
                        "speaker": "医者（いしゃ）",
                        "ja": "今（いま）、何（なに）か薬（くすり）を飲（の）んでいますか。",
                        "en": "Are you taking any medicine now?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "いいえ、飲（の）んでいません。",
                        "en": "No, I’m not."
                    },
                    {
                        "speaker": "医者（いしゃ）",
                        "ja": "風邪（かぜ）ですね。この紙（かみ）を持（も）って、薬局（やっきょく）で薬（くすり）をもらってください。",
                        "en": "It’s a cold. Take this paper to a pharmacy to get your medicine."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "わかりました。ありがとうございます。",
                        "en": "I see. Thank you."
                    },
                    {
                        "speaker": "医者（いしゃ）",
                        "ja": "お大事（だいじ）に。",
                        "en": "Take care of yourself."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "（　　）があります。",
                "answer": "熱（ねつ）",
                "en": "I have a fever."
            },
            {
                "q": "頭（あたま）が（　　）です。",
                "answer": "痛（いた）い",
                "en": "I have a headache."
            },
            {
                "q": "気分（きぶん）が（　　）です。",
                "answer": "悪（わる）い",
                "en": "I feel sick."
            },
            {
                "q": "昨日（きのう）（　　）です。",
                "answer": "から",
                "en": "Since yesterday."
            },
            {
                "q": "英語（えいご）が（　　）お医者（いしゃ）さんはいますか。",
                "answer": "話（はな）せる",
                "en": "Is there a doctor who speaks English?"
            },
            {
                "q": "卵（たまご）の（　　）があります。",
                "answer": "アレルギー",
                "en": "I’m allergic to eggs."
            },
            {
                "q": "一日（いちにち）（　　）飲（の）みますか。",
                "answer": "何回（なんかい）",
                "en": "How many times a day should I take it?"
            },
            {
                "q": "救急車（きゅうきゅうしゃ）を（　　）ください。",
                "answer": "呼（よ）んで",
                "en": "Please call an ambulance."
            }
        ],
        "culture": {
            "ja": "日本（にほん）で救急車（きゅうきゅうしゃ）を呼（よ）ぶ時（とき）は、119番（ひゃくじゅうきゅうばん）に電話（でんわ）します。「火事（かじ）ですか、救急（きゅうきゅう）ですか」と聞（き）かれたら、「救急（きゅうきゅう）です」と答（こた）えます。",
            "en": "In Japan, call 119 for an ambulance. If you’re asked “kaji desu ka, kyūkyū desu ka?” (Fire or ambulance?), answer “kyūkyū desu.”"
        }
    },
    {
        "id": "trouble",
        "title": "困（こま）った時（とき）",
        "subtitle": "道（みち）に迷（まよ）う・忘（わす）れ物（もの）",
        "titleEn": "When in trouble: getting lost and lost items",
        "goal": {
            "ja": "道（みち）に迷（まよ）った時（とき）に、助（たす）けを頼（たの）める。なくした物（もの）や忘（わす）れ物（もの）を、交番（こうばん）や駅（えき）で説明（せつめい）できる。",
            "en": "Ask for help when you get lost, and describe a lost or forgotten item at a police box or station."
        },
        "phrases": [
            {
                "ja": "すみません、道（みち）に迷（まよ）いました。",
                "en": "Excuse me, I’m lost."
            },
            {
                "ja": "ここはどこですか。",
                "en": "Where am I?"
            },
            {
                "ja": "ホテルに帰（かえ）りたいです。",
                "en": "I want to get back to my hotel."
            },
            {
                "ja": "助（たす）けてください。",
                "en": "Please help me!"
            },
            {
                "ja": "交番（こうばん）はどこですか。",
                "en": "Where is the police box?"
            },
            {
                "ja": "財布（さいふ）をなくしました。",
                "en": "I lost my wallet."
            },
            {
                "ja": "スマホを落（お）としました。",
                "en": "I dropped my phone somewhere."
            },
            {
                "ja": "電車（でんしゃ）にかばんを忘（わす）れました。",
                "en": "I left my bag on the train."
            },
            {
                "ja": "黒（くろ）くて、小（ちい）さい財布（さいふ）です。",
                "en": "It’s a small black wallet."
            },
            {
                "ja": "中（なか）にパスポートが入（はい）っています。",
                "en": "My passport is inside."
            },
            {
                "ja": "どこでなくしたか、わかりません。",
                "en": "I don’t know where I lost it."
            },
            {
                "ja": "見（み）つかったら、連絡（れんらく）してください。",
                "en": "Please contact me if you find it."
            }
        ],
        "usage": [
            {
                "ja": "道（みち）に迷（まよ）った時（とき）は、まず「すみません」と言（い）ってから、ホテルの名前（なまえ）や地図（ちず）を見（み）せましょう。",
                "en": "When you’re lost, first say “sumimasen,” then show the name of your hotel or a map."
            },
            {
                "ja": "「助（たす）けてください」は、危（あぶ）ない時（とき）や、とても困（こま）った時（とき）に使（つか）う強（つよ）い言葉（ことば）です。道（みち）を聞（き）く時（とき）は「すみません」で大丈夫（だいじょうぶ）です。",
                "en": "“Tasukete kudasai” is a strong phrase for when you are in danger or in serious trouble. To ask the way, “sumimasen” is enough."
            },
            {
                "ja": "交番（こうばん）は、町（まち）の小（ちい）さい警察（けいさつ）です。道（みち）を聞（き）いたり、なくした物（もの）について話（はな）したりできます。",
                "en": "A kōban is a small police box in town. You can ask the way there or report something you lost."
            },
            {
                "ja": "電車（でんしゃ）の忘（わす）れ物（もの）は、駅員（えきいん）さんに伝（つた）えます。乗（の）った電車（でんしゃ）の時間（じかん）と、何号車（なんごうしゃ）かを言（い）えると、見（み）つかりやすいです。",
                "en": "Tell station staff about anything you left on a train. It’s easier to find if you can say what time the train was and which car you were in."
            }
        ],
        "dialogues": [
            {
                "title": {
                    "ja": "道（みち）に迷（まよ）う",
                    "en": "Getting lost"
                },
                "lines": [
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "すみません、道（みち）に迷（まよ）いました。ここはどこですか。",
                        "en": "Excuse me, I’m lost. Where am I?"
                    },
                    {
                        "speaker": "通行人（つうこうにん）",
                        "ja": "ここは上野公園（うえのこうえん）の近（ちか）くですよ。",
                        "en": "You’re near Ueno Park."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "このホテルに帰（かえ）りたいです。",
                        "en": "I want to get back to this hotel."
                    },
                    {
                        "speaker": "通行人（つうこうにん）",
                        "ja": "このホテルは、ここから歩（ある）いて5分（ごふん）ぐらいです。",
                        "en": "This hotel is about a five-minute walk from here."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "どうやって行（い）きますか。",
                        "en": "How do I get there?"
                    },
                    {
                        "speaker": "通行人（つうこうにん）",
                        "ja": "あの信号（しんごう）を左（ひだり）に曲（ま）がって、まっすぐです。",
                        "en": "Turn left at that traffic light, then go straight."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "左（ひだり）ですね。ありがとうございます。",
                        "en": "Left at the light, OK. Thank you."
                    },
                    {
                        "speaker": "通行人（つうこうにん）",
                        "ja": "気（き）をつけてくださいね。",
                        "en": "Take care."
                    }
                ]
            },
            {
                "title": {
                    "ja": "交番（こうばん）で",
                    "en": "At a police box"
                },
                "lines": [
                    {
                        "speaker": "警察官（けいさつかん）",
                        "ja": "どうしましたか。",
                        "en": "What’s wrong?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "財布（さいふ）をなくしました。",
                        "en": "I lost my wallet."
                    },
                    {
                        "speaker": "警察官（けいさつかん）",
                        "ja": "どこでなくしましたか。",
                        "en": "Where did you lose it?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "どこでなくしたか、わかりません。駅（えき）からここまで歩（ある）きました。",
                        "en": "I don’t know where I lost it. I walked here from the station."
                    },
                    {
                        "speaker": "警察官（けいさつかん）",
                        "ja": "どんな財布（さいふ）ですか。",
                        "en": "What kind of wallet is it?"
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "黒（くろ）くて、小（ちい）さい財布（さいふ）です。中（なか）にカードとお金（かね）が入（はい）っています。",
                        "en": "It’s a small black wallet. My cards and money are in it."
                    },
                    {
                        "speaker": "警察官（けいさつかん）",
                        "ja": "わかりました。この紙（かみ）に名前（なまえ）と電話番号（でんわばんごう）を書（か）いてください。",
                        "en": "I see. Please write your name and phone number on this form."
                    },
                    {
                        "speaker": "旅行者（りょこうしゃ）",
                        "ja": "はい。見（み）つかったら、連絡（れんらく）してください。",
                        "en": "OK. Please contact me if you find it."
                    },
                    {
                        "speaker": "警察官（けいさつかん）",
                        "ja": "はい、すぐ連絡（れんらく）します。",
                        "en": "Yes, we’ll contact you right away."
                    }
                ]
            }
        ],
        "blanks": [
            {
                "q": "すみません、道（みち）に（　　）。",
                "answer": "迷（まよ）いました",
                "en": "Excuse me, I’m lost."
            },
            {
                "q": "ここは（　　）ですか。",
                "answer": "どこ",
                "en": "Where am I?"
            },
            {
                "q": "ホテルに（　　）たいです。",
                "answer": "帰（かえ）り",
                "en": "I want to get back to my hotel."
            },
            {
                "q": "（　　）はどこですか。",
                "answer": "交番（こうばん）",
                "en": "Where is the police box?"
            },
            {
                "q": "財布（さいふ）を（　　）。",
                "answer": "なくしました",
                "en": "I lost my wallet."
            },
            {
                "q": "電車（でんしゃ）にかばんを（　　）。",
                "answer": "忘（わす）れました",
                "en": "I left my bag on the train."
            },
            {
                "q": "黒（くろ）くて、（　　）財布（さいふ）です。",
                "answer": "小（ちい）さい",
                "en": "It’s a small black wallet."
            },
            {
                "q": "見（み）つかったら、（　　）してください。",
                "answer": "連絡（れんらく）",
                "en": "Please contact me if you find it."
            }
        ],
        "culture": {
            "ja": "日本（にほん）では、なくした物（もの）が交番（こうばん）や駅（えき）に届（とど）くことがよくあります。なくしても、あきらめないで聞（き）いてみましょう。危（あぶ）ない時（とき）に警察（けいさつ）を呼（よ）ぶ電話番号（でんわばんごう）は110番（ひゃくとおばん）です。",
            "en": "In Japan, lost items are often handed in to police boxes and stations. If you lose something, don’t give up; go and ask. If you are in danger, call the police at 110."
        }
    }
];
