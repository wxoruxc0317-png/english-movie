import type { ExpressionItem, SceneConfig, VisualStyle, VoiceName } from '../types';

export const SAMPLE_EXPRESSIONS: ExpressionItem[] = [
  {
    id: 'expr-1',
    expression: 'Be in charge of',
    meaningKo: '~을 맡고 있다, 책임지다',
    movie: 'Inside Out 2',
  },
  {
    id: 'expr-2',
    expression: "I'm mortified",
    meaningKo: '너무 창피해서 쥐구멍에라도 숨고 싶다',
    movie: 'Inside Out 2',
  },
  {
    id: 'expr-3',
    expression: 'I totally messed up',
    meaningKo: '완전히 망쳐버렸어',
    movie: 'Inside Out 2',
  },
  {
    id: 'expr-4',
    expression: 'Situational awareness',
    meaningKo: '눈치, 상황 파악 능력',
    movie: 'Minari',
  },
  {
    id: 'expr-5',
    expression: 'Want to level up',
    meaningKo: '한 단계 성장하고 싶다',
    movie: 'Inside Out 2',
  },
  {
    id: 'expr-6',
    expression: "I'm confident that",
    meaningKo: '~할 자신이 있다, 확신한다',
    movie: 'Notting Hill',
  },
];

export const DEFAULT_SCENE: SceneConfig = {
  place: 'A lively university baseball stadium during an evening game',
  characters:
    'Minji, a cheerful college student in a soft mint hoodie and denim overalls holding drumsticks, and her encouraging teammate Joon in a navy cap',
  situation:
    'Minji works part-time playing the cheer drums, misses a beat in front of the crowd, reflects on improving, and nails the next game.',
  style: '2d-animation',
  voice: 'Kore',
  authorName: 'Yu taewoo',
};

export const CAFE_SAMPLE_EXPRESSIONS: ExpressionItem[] = [
  {
    id: 'cafe-1',
    expression: 'Get the hang of',
    meaningKo: '~의 요령을 터득하다',
    movie: 'The Intern',
  },
  {
    id: 'cafe-2',
    expression: 'On the tip of my tongue',
    meaningKo: '입안에서 맴돌다 (기억날 듯 말 듯 하다)',
    movie: 'Before Sunrise',
  },
  {
    id: 'cafe-3',
    expression: 'Keep my cool',
    meaningKo: '침착함을 유지하다',
    movie: 'La La Land',
  },
  {
    id: 'cafe-4',
    expression: 'Figure it out',
    meaningKo: '해결책을 찾아내다, 알아내다',
    movie: 'About Time',
  },
  {
    id: 'cafe-5',
    expression: 'Pay off',
    meaningKo: '노력이 결실을 맺다',
    movie: 'Good Will Hunting',
  },
];

export const CAFE_SCENE: SceneConfig = {
  place: 'A warm campus coffee shop during morning rush hour',
  characters:
    'Sora, a friendly college barista wearing a cream cardigan and olive apron, and a polite regular customer carrying study books',
  situation:
    'Sora handles a busy morning espresso order in English, forgets a drink name mid-rush, stays calm, and wins a warm smile.',
  style: 'watercolor',
  voice: 'Zephyr',
  authorName: 'Yu taewoo',
};

export const STYLE_OPTIONS: Array<{
  id: VisualStyle;
  title: string;
  subtitle: string;
  imageUrl: string;
}> = [
  {
    id: '2d-animation',
    title: '2D Animation',
    subtitle: 'Clean ink outlines, cel shading, and expressive motion',
    imageUrl: '/src/assets/images/style_2d_animation_1795580509750.jpg',
  },
  {
    id: 'clay',
    title: 'Clay',
    subtitle: 'Tactile stop-motion clay look with warm studio lighting',
    imageUrl: '/src/assets/images/style_claymation_1795580509740.jpg',
  },
  {
    id: 'watercolor',
    title: 'Watercolor',
    subtitle: 'Soft paper grain, translucent washes, and gentle brushwork',
    imageUrl: '/src/assets/images/style_watercolor_1795580510754.jpg',
  },
  {
    id: 'live-action',
    title: 'Live-Action Style',
    subtitle: 'Cinematic depth, warm bokeh lights, and natural tones',
    imageUrl: '/src/assets/images/style_live_action_1795580511091.jpg',
  },
];

export const VOICE_OPTIONS: Array<{
  id: VoiceName;
  label: string;
  tone: string;
}> = [
  { id: 'Kore', label: 'Warm Storyteller', tone: 'Clear, gentle US English tone' },
  { id: 'Zephyr', label: 'Bright Conversational', tone: 'Lively, friendly student tone' },
  { id: 'Puck', label: 'Upbeat Campus', tone: 'Energetic everyday English pace' },
  { id: 'Charon', label: 'Calm Narrator', tone: 'Grounded, steady storytelling tone' },
  { id: 'Fenrir', label: 'Confident Speaker', tone: 'Expressive, clear pronunciation' },
];

export const SCENE_PRESETS = [
  {
    label: 'Baseball Stadium',
    place: 'A lively university baseball stadium during an evening game',
    characters:
      'Minji, a cheerful college student in a soft mint hoodie and denim overalls holding drumsticks, and her teammate Joon in a navy cap',
    situation:
      'Minji works part-time playing the cheer drums, misses a beat in front of the crowd, reflects, and nails the next game.',
  },
  {
    label: 'Campus Cafe',
    place: 'A cozy university campus coffee shop on a sunny morning',
    characters:
      'Sora, a college student barista in a sage apron and cream sweater, and a friendly customer carrying textbooks',
    situation:
      'Sora handles her first English customer rush, gets flustered over a custom order, adapts quickly, and succeeds.',
  },
  {
    label: 'Library Rooftop',
    place: 'A quiet university library rooftop terrace at golden hour',
    characters:
      'Minho, a student in a warm navy jacket holding a notebook, and his study partner Hana with headphones',
    situation:
      'Minho prepares for an English club presentation, freezes during practice, builds confidence, and delivers smoothly.',
  },
];
