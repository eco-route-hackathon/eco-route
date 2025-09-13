import axios from 'axios';

export async function fetchGeminiScene({
  scene,
  affinity,
  airQuality,
  girl,
}: {
  scene: string;
  affinity: number;
  airQuality: number;
  girl: { name: string; personality: string };
}): Promise<{
  message: string;
  choices: { text: string; delta: { affinity: number; airQuality: number } }[];
}> {
  try {
    const res = await axios.post('/api/gemini-dialogue', {
      scene,
      affinity,
      airQuality,
      girl,
      mode: 'scene', // シーン生成モード
    });
    return res.data;
  } catch (e) {
    return {
      message: '（エラー）うまく取得できませんでした。',
      choices: [{ text: 'OK', delta: { affinity: 0, airQuality: 0 } }],
    };
  }
}
