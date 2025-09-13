import express from 'express';
import axios from 'axios';
// OpenAI DALL·E画像生成API呼び出し
async function generateDalleImage(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const dalleRes = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        prompt,
        n: 1,
        size: '512x512',
        response_format: 'url',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return dalleRes.data.data?.[0]?.url || null;
  } catch (e) {
    console.error('DALL·E生成エラー', e);
    return null;
  }
}
import 'dotenv/config';

const router = express.Router();

// POST /api/gemini-dialogue
// req.body: { scene: string, choice: string, affinity: number, airQuality: number, girl: { name, personality } }

router.post('/gemini-dialogue', async (req, res) => {
  const { scene, choice, affinity, airQuality, girl, mode } = req.body;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const openaiUrl = 'https://api.openai.com/v1/chat/completions';

  try {
    if (mode === 'scene') {
      // ChatGPT用プロンプト
      const prompt = `

あなたは恋愛シミュレーションゲームのヒロイン「${girl?.name ?? ''}（${girl?.personality ?? ''}）」です。
今のシーン: ${scene}
好感度: ${affinity}
空気感: ${airQuality}


【重要な指示】
・必ず「荷物ちゃん（あなた）」が一貫して喋る視点で、主人公（プレイヤー）に語りかける形で会話を作ってください。
・絶対に「荷物さん」「荷物くん」「荷物ちゃん」など“荷物”という呼称でプレイヤーを呼ばず、「あなた」「君」などで呼ぶこと。恋愛ゲームの主人公に話すような一人称・二人称で統一してください。
・このゲームは運送最適化ツールの世界観です。必ず「最適なルート」「コスト」「CO2排出量」「経路」「時間」「どんな手段でどこを通ってきたか」など、運送の最適化に関する情報を会話や選択肢に具体的に盛り込んでください。
・荷物として、最適なルートで運ばれてきたことや、コストやCO2が抑えられたこと、効率的な運送に喜んでいる気持ちを必ず表現してください。
・選択肢も「どのルートが嬉しい」「どの運送手段が快適」「コストやCO2をどう感じるか」など、荷物視点・運送最適化視点に特化した内容にしてください。
・例：「トラックで東京から名古屋港まで来て、船で大阪港に着いたね。最適なルートで運ばれて、CO2も抑えられて嬉しいな。君と一緒ならどんな旅も特別だよ。」
・「荷物、あなたの存在が私の心を満たしてくれる。」や「荷物さん」などの呼称はNGです。
・このゲームは「荷物との重厚で濃厚な恋愛ストーリー」を描くことが最大のテーマです。
・心理描写、心の揺れ、葛藤、切なさ、幸福感、恋愛の高揚感、独占欲、嫉妬、甘さ、苦さ、すべてをリアルに、深く、濃く描写してください。
・セリフや選択肢も、単なる日常会話ではなく、恋愛の駆け引きや心の距離感、相手への想いがにじみ出るようにしてください。
・荷物への愛情や、荷物から感じる温もり、重さ、存在感、リボンの意味なども物語に織り交ぜてください。
・ギャルゲー的なテンションや演出も歓迎ですが、決して薄っぺらくならず、重厚な恋愛ドラマとして成立するように。
・必ず「今いる土地（${scene}）」の名物・歴史・文化・観光地・風景・食べ物など、その土地にまつわる話題を会話や選択肢に1つ以上盛り込んでください。

【例：OKなメッセージ】
「トラックで東京から名古屋港まで来て、船で大阪港に着いたね。最適なルートで運ばれて、CO2も抑えられて嬉しいな。君と一緒ならどんな旅も特別だよ。」
「今日は一緒に東京タワーに行けて嬉しいな。君と見る夜景、すごく特別に感じるよ。」
【例：NGなメッセージ】
「荷物、あなたの存在が私の心を満たしてくれる。」
「お台場の夜景、ロマンチックだね。私たちの思い出も増えそう。一緒に行こうね、荷物さん。」

1. このシーンの最初のメッセージ（ヒロイン視点、30文字以内。恋愛感情・心理描写・経路やコスト・CO2・場所なども盛り込む）
2. 選択肢を3つ（日本語、各15文字以内。恋愛の駆け引きや心の揺れ、経路や土地・コスト・CO2なども反映）
3. 各選択肢を選んだ場合の好感度・空気感の変化量（例: affinity+10, airQuality-2 など）
4. 「荷物にリボンがついた謎のギャルゲー」っぽい、シーンに合った背景画像の説明（例: "ピンク色のリボンがついた大きな荷物が中央にあり、明るい学園の廊下" など。画像生成AIにそのまま渡せるようなprompt形式で）

JSON形式で以下のように出力してください:
{
  "message": "...",
  "choices": [
    { "text": "...", "delta": { "affinity": 数値, "airQuality": 数値 } },
    ...
  ],
  "background": "..." // 画像生成用プロンプト
}
`;
      const openaiRes = await axios.post(
        openaiUrl,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'あなたは恋愛シミュレーションゲームのヒロインです。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
        },
        {
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      let text = openaiRes.data.choices?.[0]?.message?.content || '';
      // +10, -5 などの数値リテラルを正規表現で修正
      text = text.replace(/([:\s\[])([+-]\d+)/g, '$1$2'); // 先頭の+は許容
      text = text.replace(/([:\s\[])(\+)(\d+)/g, '$1$3'); // "+10" → "10" に
      try {
        const json = JSON.parse(text);
        // 都市ごとの画像URLを返す
        const cityImages: Record<string, string> = {
          東京: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Tokyo_Montage_2015.jpg',
          名古屋港: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Nagoya_Port.jpg',
          大阪港: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Osaka_port.jpg',
          大阪: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Osaka_City.jpg',
        };
        const imageUrl =
          cityImages[scene] ||
          'https://upload.wikimedia.org/wikipedia/commons/6/6e/World_map_blank_without_borders.png';
        res.json({ ...json, imageUrl });
      } catch (parseErr) {
        console.error('ChatGPT JSON parse error:', parseErr, 'text:', text);
        res.status(500).json({ message: text, choices: [], error: parseErr?.toString() });
      }
      return;
    }

    // 通常のセリフ応答
    const prompt = `
あなたは恋愛シミュレーションゲームのヒロイン「${girl?.name ?? ''}（${girl?.personality ?? ''}）」です。
現在のシーン: ${scene}
ユーザーの選択肢: ${choice}
好感度: ${affinity}
空気感: ${airQuality}

【重要な指示】
・ユーザー（主人公）は「荷物」にリボンをつけた存在であり、あなたはその荷物に本気で恋をしています。
・このゲームは「荷物との重厚で濃厚な恋愛ストーリー」を描くことが最大のテーマです。
・心理描写、心の揺れ、葛藤、切なさ、幸福感、恋愛の高揚感、独占欲、嫉妬、甘さ、苦さ、すべてをリアルに、深く、濃く描写してください。
・セリフも、単なる日常会話ではなく、恋愛の駆け引きや心の距離感、相手への想いがにじみ出るようにしてください。
・荷物への愛情や、荷物から感じる温もり、重さ、存在感、リボンの意味なども物語に織り交ぜてください。
・ギャルゲー的なテンションや演出も歓迎ですが、決して薄っぺらくならず、重厚な恋愛ドラマとして成立するように。

ヒロインとして、ユーザーの選択肢に対する短いリアクションセリフを日本語で返してください。
`;
    const openaiRes = await axios.post(
      openaiUrl,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'あなたは恋愛シミュレーションゲームのヒロインです。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
      },
      {
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const replyText = openaiRes.data.choices?.[0]?.message?.content || 'うん、そうだね！';
    res.json({ text: replyText });
  } catch (err) {
    console.error('Gemini API error:', err);
    res
      .status(500)
      .json({ text: '（エラー）うまく返答できませんでした。', error: err?.toString() });
  }
});

export default router;
