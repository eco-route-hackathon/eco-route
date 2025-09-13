import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { DateSimMeters } from './DateSimMeters';
import metersStyles from '../styles/components/DateSimMeters.module.css';
import styles from '../styles/components/DateSim.module.css';
import { fetchGeminiDialogue } from '../services/gemini';
import { fetchGeminiScene } from '../services/geminiScene';

// デート成功ポップアップ用スタイル
const popupStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(255,255,255,0.98)',
  border: '2px solid #e57373',
  borderRadius: '1.2rem',
  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
  zIndex: 1000,
  padding: '2.2rem 2.5rem',
  textAlign: 'center',
  minWidth: '260px',
};
const popupTitleStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  color: '#e57373',
  marginBottom: '1.2rem',
  fontWeight: 700,
};
const popupButtonStyle: React.CSSProperties = {
  marginTop: '1.2rem',
  background: 'linear-gradient(90deg, #f06292 0%, #ba68c8 100%)',
  color: '#fff',
  fontSize: '1.1rem',
  fontWeight: 600,
  border: 'none',
  borderRadius: '0.8rem',
  padding: '0.7rem 2.2rem',
  cursor: 'pointer',
};

// 仮の女の子キャラ
const GIRL_NAMES = ['さくら', 'みなみ', 'あかり', 'ゆい', 'りんか'];
const GIRL_PERSONALITIES = ['元気', 'おっとり', '知的', 'ツンデレ', '天然'];

// 仮の街画像（後でGemini生成に差し替え）
const CITY_IMAGES: Record<string, string> = {
  東京: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=600&q=80',
  名古屋港:
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
  大阪港:
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
  大阪: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80',
};

function getRandomGirl() {
  const name = GIRL_NAMES[Math.floor(Math.random() * GIRL_NAMES.length)];
  const personality = GIRL_PERSONALITIES[Math.floor(Math.random() * GIRL_PERSONALITIES.length)];
  return { name, personality };
}

// 選択肢型
type Choice = { id: string; text: string; delta: { affinity: number; airQuality: number } };

export const DateSim: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [route, setRoute] = useState<any>(null);
  const [girl, setGirl] = useState<{ name: string; personality: string } | null>(null);
  // 表示用の名前（例: さくら（荷物））
  const girlDisplayName = girl ? `${girl.name}（荷物）` : '';
  const [sceneIdx, setSceneIdx] = useState(0);
  const [ended, setEnded] = useState(false);
  // パラメータ
  const [affinity, setAffinity] = useState(0); // -100..+100
  const [airQuality, setAirQuality] = useState(80); // 0..100
  const [choices, setChoices] = useState<Choice[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFail, setShowFail] = useState(false);

  // 画面遷移時にルート情報を取得
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const planStr = params.get('plan');
    if (planStr) {
      try {
        setRoute(JSON.parse(planStr));
      } catch {
        // パース失敗時はダミールート
        setRoute({
          legs: [
            { from: '東京', to: '名古屋港', mode: 'truck', distanceKm: 350, timeHours: 5 },
            { from: '名古屋港', to: '大阪港', mode: 'ship', distanceKm: 400, timeHours: 8 },
            { from: '大阪港', to: '大阪', mode: 'truck', distanceKm: 20, timeHours: 0.5 },
          ],
          co2Kg: 120,
          weightKg: 1000,
        });
      }
    } else {
      // planパラメータがない場合もダミールート
      setRoute({
        legs: [
          { from: '東京', to: '名古屋港', mode: 'truck', distanceKm: 350, timeHours: 5 },
          { from: '名古屋港', to: '大阪港', mode: 'ship', distanceKm: 400, timeHours: 8 },
          { from: '大阪港', to: '大阪', mode: 'truck', distanceKm: 20, timeHours: 0.5 },
        ],
        co2Kg: 120,
        weightKg: 1000,
      });
    }
    setGirl(getRandomGirl());
    setSceneIdx(0);
    setEnded(false);
    setAffinity(0);
    setAirQuality(80);
  }, [location.search]);

  // 経由地リスト
  const waypoints =
    route && route.legs ? [route.legs[0].from, ...route.legs.map((l: any) => l.to)] : [];
  const currentCity = waypoints[sceneIdx] || (route && route.legs ? route.legs[0].from : '東京');
  const cityImg = CITY_IMAGES[currentCity] || CITY_IMAGES['東京'];

  // エラー状態管理
  const [sceneError, setSceneError] = useState(false);

  // シーン切り替え時にGeminiからシーン・選択肢を取得
  useEffect(() => {
    let ignore = false;
    async function loadScene() {
      if (!ended && route && girl) {
        const res = await fetchGeminiScene({
          scene: currentCity,
          affinity,
          airQuality,
          girl,
        });
        if (!ignore) {
          setSceneMessage(res.message);
          setChoices(
            res.choices.map((c, idx) => ({
              id: `c${idx + 1}`,
              text: c.text,
              delta: c.delta,
            }))
          );
          setSceneError(
            res.message.startsWith('（エラー') ||
              (res.choices.length === 1 && res.choices[0].text === 'OK')
          );
        }
      }
    }
    loadScene();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIdx, ended, route, girl, currentCity]);

  // シーンメッセージ
  const [sceneMessage, setSceneMessage] = useState('');

  // デート終了時に好感度が60以上ならポップアップ表示
  useEffect(() => {
    if (ended) {
      if (affinity >= 60) {
        setShowSuccess(true);
        setShowFail(false);
      } else {
        setShowFail(true);
        setShowSuccess(false);
      }
    } else {
      setShowSuccess(false);
      setShowFail(false);
    }
  }, [ended, affinity]);

  // 選択肢リアクション用
  const [replying, setReplying] = useState(false);
  const [replyMessage, setReplyMessage] = useState<string | null>(null);

  // 選択肢ごとのダミー返信

  // メッセージ内容（本文のみ。名前はvnNameで表示）
  let message = '';
  if (ended) {
    message = '今日はありがとう！また一緒にお出かけしようね♡';
  } else if (replying && replyMessage) {
    message = replyMessage;
  } else {
    message = sceneMessage;
  }

  // 選択肢選択時
  const handleChoice = async (choice: Choice) => {
    setReplying(true);
    setReplyMessage('...');

    // パラメータ反映
    setAffinity((a) => Math.max(-100, Math.min(100, a + choice.delta.affinity)));
    setAirQuality((q) => Math.max(0, Math.min(100, q + choice.delta.airQuality)));

    // エラー時はテキストを渡さない
    const reply = await fetchGeminiDialogue({
      scene: sceneError ? '' : sceneMessage,
      choice: sceneError ? '' : choice.text,
      affinity,
      airQuality,
      girl: { name: girl?.name || '', personality: girl?.personality || '' },
    });
    setReplyMessage(reply);
  };

  const handleNext = () => {
    setReplying(false);
    setReplyMessage(null);

    if (sceneIdx < waypoints.length - 1) {
      setSceneIdx((idx) => idx + 1);
    } else {
      setEnded(true);
    }
  };
  const handleBackToTitle = () => {
    navigate('/');
  };

  // route/girlが未セットなら準備中画面を返す
  if (!route || !girl) {
    return <div className={metersStyles.metersRoot}>デート準備中...</div>;
  }

  return (
    <div className={styles.dateSimRoot}>
      <div className={styles.cityImageArea}>
        <img src={cityImg} alt={currentCity + 'の風景'} className={styles.cityImage} />
        <div className={styles.cityLabel}>{currentCity} の風景</div>
        {/* 荷物彼女の透過画像を中央に重ねて表示 */}
        <img src="/assets/niomotsu_girlfriend.png" alt="荷物彼女" className={styles.niomotsuGirl} />
      </div>
      {/* VNウィンドウ内の上部にメーターUIを移動 */}
      <div className={styles.vnWindow}>
        <div style={{ width: '100%', marginBottom: '0.7rem' }}>
          <DateSimMeters affinity={affinity} airQuality={airQuality} />
        </div>
        <div className={styles.vnName}>{girlDisplayName}</div>
        <div className={styles.vnMessage}>{message}</div>
        <div className={styles.vnButtons}>
          {!ended && !replying ? (
            choices.map((choice) => (
              <button
                key={choice.id}
                className={styles.nextButton}
                onClick={() => handleChoice(choice)}
              >
                {choice.text}
              </button>
            ))
          ) : !ended && replying ? (
            <button className={styles.nextButton} onClick={handleNext}>
              次へ
            </button>
          ) : (
            <button className={styles.nextButton} onClick={handleBackToTitle}>
              タイトルに戻る
            </button>
          )}
        </div>
      </div>
      {/* デート成功ポップアップ */}
      {showSuccess && (
        <div style={popupStyle}>
          <div style={popupTitleStyle}>デート大成功！</div>
          <div style={{ fontSize: '1.1rem', marginBottom: '1.2rem' }}>
            好感度が高まり、{girlDisplayName}との距離がぐっと近づいた！
            <br />
            また一緒にお出かけしよう！
          </div>
          <button
            style={popupButtonStyle}
            onClick={() => {
              setShowSuccess(false);
              handleBackToTitle();
            }}
          >
            タイトルに戻る
          </button>
        </div>
      )}
      {/* デート失敗ポップアップ */}
      {showFail && (
        <div style={popupStyle}>
          <div style={{ ...popupTitleStyle, color: '#888' }}>デート失敗…</div>
          <div style={{ fontSize: '1.1rem', marginBottom: '1.2rem' }}>
            残念…今回は{girlDisplayName}との距離はあまり縮まらなかったみたい。
            <br />
            またチャレンジしてみよう！
          </div>
          <button
            style={popupButtonStyle}
            onClick={() => {
              setShowFail(false);
              handleBackToTitle();
            }}
          >
            タイトルに戻る
          </button>
        </div>
      )}
    </div>
  );
};
