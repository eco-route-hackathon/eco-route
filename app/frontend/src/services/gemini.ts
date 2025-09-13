import axios from 'axios';

export async function fetchGeminiDialogue({
  scene,
  choice,
  affinity,
  airQuality,
  girl,
}: {
  scene: string;
  choice: string;
  affinity: number;
  airQuality: number;
  girl: { name: string; personality: string };
}): Promise<string> {
  try {
    const res = await axios.post('/api/gemini-dialogue', {
      scene,
      choice,
      affinity,
      airQuality,
      girl,
    });
    return res.data.text || '...';
  } catch (e) {
    return '（エラー）うまく返答できませんでした。';
  }
}
