export type ScreenStep = 'expressions' | 'scene' | 'storyboard' | 'video' | 'final';

export interface ExpressionItem {
  id: string;
  expression: string;
  meaningKo: string;
  movie: string;
}

export type VisualStyle = '2d-animation' | 'clay' | 'watercolor' | 'live-action';

export type VoiceName = 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' | 'Charon';

export interface SceneConfig {
  place: string;
  characters: string;
  situation: string;
  style: VisualStyle;
  voice: VoiceName;
  authorName: string;
}

export type OutfitStyle =
  | 'hoodie-overalls'
  | 'cardigan-slacks'
  | 'jacket-jeans'
  | 'sweater-skirt';

export type CharacterAccessory =
  | 'drumsticks'
  | 'coffee-cup'
  | 'notebook'
  | 'headphones'
  | 'microphone'
  | 'none';

export interface CharacterAppearance {
  name: string;
  hairColor: string;
  hairStyle: 'short-bob' | 'ponytail' | 'short-neat' | 'wavy-medium';
  skinTone: string;
  outfitTopColor: string;
  outfitBottomColor: string;
  outfitStyle: OutfitStyle;
  accessory: CharacterAccessory;
}

export interface ScenePalette {
  skyTop: string;
  skyBottom: string;
  backdropAccent: string;
  groundColor: string;
  highlightColor: string;
}

export type EnvironmentType =
  | 'stadium'
  | 'cafe'
  | 'library'
  | 'rooftop'
  | 'campus'
  | 'street';

export interface CharacterBible {
  lead: CharacterAppearance;
  companion?: CharacterAppearance;
  environmentType: EnvironmentType;
  palette: ScenePalette;
}

export type BeatId = 'hook' | 'problem' | 'turn' | 'close';

export interface BeatVisualCue {
  cameraMotion: 'zoom-in' | 'pan-right' | 'pan-left' | 'zoom-out' | 'gentle-bounce';
  timeOfDay: 'morning' | 'afternoon' | 'sunset' | 'evening';
  characterPose:
    | 'playing-drums'
    | 'nervous'
    | 'determined'
    | 'celebrating'
    | 'walking'
    | 'talking'
    | 'studying';
  characterEmotion:
    | 'happy'
    | 'embarrassed'
    | 'focused'
    | 'confident'
    | 'surprised'
    | 'relieved';
  propAction: string;
  lightingMood: 'warm-bright' | 'cool-tense' | 'hopeful-amber' | 'golden-triumph';
  showCompanion: boolean;
  crowdMood: 'none' | 'cheering' | 'gasping' | 'applauding';
}

export interface StoryBeat {
  id: BeatId;
  label: string;
  timeRange: string;
  startSec: number;
  endSec: number;
  sceneDescription: string;
  englishLines: string;
  subtitles: string;
  assignedExpressions: string[];
  visualCue: BeatVisualCue;
}

export interface StoryboardData {
  characterBible: CharacterBible;
  beats: StoryBeat[];
  totalWords: number;
}

