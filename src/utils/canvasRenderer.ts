import type {
  CharacterAppearance,
  CharacterBible,
  StoryBeat,
  VisualStyle,
} from '../types';
import { buildTimedSubtitles } from './textHelpers';

const W = 1280;
const H = 720;

interface RenderParams {
  ctx: CanvasRenderingContext2D;
  timeSec: number;
  beat: StoryBeat;
  bible: CharacterBible;
  style: VisualStyle;
  audioDurationSec?: number;
  mouthOpenness: number;
  authorName: string;
}

function quantizeTime(t: number, style: VisualStyle): number {
  if (style === 'clay') {
    // Tactile stop-motion 10fps cadence
    return Math.floor(t * 10) / 10;
  }
  return t;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function applyStyleStroke(
  ctx: CanvasRenderingContext2D,
  style: VisualStyle,
  lineWidth = 3
) {
  if (style === '2d-animation') {
    ctx.strokeStyle = '#242A36';
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  } else if (style === 'watercolor') {
    ctx.strokeStyle = 'rgba(62, 58, 52, 0.55)';
    ctx.lineWidth = Math.max(1.5, lineWidth * 0.65);
    ctx.stroke();
  } else if (style === 'clay') {
    ctx.strokeStyle = 'rgba(40, 34, 28, 0.14)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(20, 24, 30, 0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function fillStyledShape(
  ctx: CanvasRenderingContext2D,
  style: VisualStyle,
  baseColor: string,
  cx: number,
  cy: number,
  radius: number
) {
  if (style === 'clay') {
    const grad = ctx.createRadialGradient(
      cx - radius * 0.3,
      cy - radius * 0.35,
      radius * 0.1,
      cx,
      cy,
      radius * 1.15
    );
    grad.addColorStop(0, '#FFFFFF44');
    grad.addColorStop(0.45, baseColor);
    grad.addColorStop(1, '#00000033');
    ctx.fillStyle = baseColor;
    ctx.fill();
    ctx.fillStyle = grad;
    ctx.fill();
  } else if (style === 'watercolor') {
    ctx.save();
    ctx.globalAlpha *= 0.86;
    ctx.fillStyle = baseColor;
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = baseColor;
    ctx.fill();
  }
}

function drawSkyAndAtmosphere(
  ctx: CanvasRenderingContext2D,
  bible: CharacterBible,
  beat: StoryBeat,
  style: VisualStyle,
  t: number
) {
  const { palette } = bible;
  const mood = beat.visualCue.lightingMood;
  const tod = beat.visualCue.timeOfDay;

  let top = palette.skyTop || '#BFD7EA';
  let bottom = palette.skyBottom || '#F2EDE4';

  if (tod === 'evening' || mood === 'cool-tense') {
    top = '#485B78';
    bottom = '#A3B4C8';
  } else if (tod === 'sunset' || mood === 'golden-triumph') {
    top = '#6A83A6';
    bottom = '#F4D5A6';
  } else if (mood === 'hopeful-amber') {
    top = '#8DA8C5';
    bottom = '#F7E7C8';
  }

  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.72);
  skyGrad.addColorStop(0, top);
  skyGrad.addColorStop(1, bottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  if (style === 'watercolor') {
    // Soft translucent pigment clouds on paper
    ctx.save();
    for (let i = 0; i < 6; i++) {
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = i % 2 === 0 ? bottom : top;
      const wx = ((i * 250 + t * 8) % (W + 240)) - 120;
      const wy = 90 + (i % 3) * 65;
      ctx.beginPath();
      ctx.ellipse(wx, wy, 190, 75, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (style === 'live-action') {
    // Soft atmospheric bokeh orbs
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const bx = ((i * 173 + t * 12) % (W + 80)) - 40;
      const by = 85 + ((i * 97) % 240);
      const r = 24 + (i % 4) * 14;
      const g = ctx.createRadialGradient(bx, by, 2, bx, by, r);
      g.addColorStop(0, 'rgba(255, 244, 214, 0.36)');
      g.addColorStop(1, 'rgba(255, 244, 214, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Soft drifting clouds
  ctx.save();
  ctx.globalAlpha = style === 'watercolor' ? 0.35 : 0.65;
  ctx.fillStyle = '#FFFFFF';
  for (let c = 0; c < 3; c++) {
    const cx = ((c * 430 + t * 14) % (W + 260)) - 130;
    const cy = 95 + c * 42;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 85, 28, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 35, cy + 8, 52, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 42, cy + 10, 56, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnvironment(
  ctx: CanvasRenderingContext2D,
  bible: CharacterBible,
  beat: StoryBeat,
  style: VisualStyle,
  t: number
) {
  const env = bible.environmentType;
  const { palette } = bible;
  const groundColor = palette.groundColor || '#DCE2D8';
  const accent = palette.backdropAccent || '#708499';

  if (env === 'stadium') {
    // Distant green field
    ctx.fillStyle = '#8FB48E';
    ctx.fillRect(0, 355, W, 195);

    // Tiered stadium bleachers behind character
    ctx.fillStyle = '#C9CFD6';
    drawRoundedRect(ctx, -40, 260, W + 80, 175, 16);
    ctx.fill();
    applyStyleStroke(ctx, style, 2);

    for (let row = 0; row < 5; row++) {
      const ry = 278 + row * 28;
      ctx.strokeStyle = 'rgba(65, 78, 95, 0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(W, ry);
      ctx.stroke();

      // Crowd silhouettes reacting to crowdMood
      const mood = beat.visualCue.crowdMood;
      for (let col = 0; col < 22; col++) {
        const px = 38 + col * 58 + (row % 2) * 24;
        let bounce = 0;
        if (mood === 'cheering' || mood === 'applauding') {
          bounce = Math.abs(Math.sin(t * 6 + col * 0.7 + row)) * -10;
        } else if (mood === 'gasping') {
          bounce = Math.sin(t * 3 + col) * 2;
        }
        ctx.fillStyle =
          col % 3 === 0 ? accent : col % 2 === 0 ? '#8798AB' : '#9AA9B8';
        ctx.beginPath();
        ctx.arc(px, ry - 8 + bounce, 9, 0, Math.PI * 2);
        ctx.fill();
        drawRoundedRect(ctx, px - 10, ry + 1 + bounce, 20, 16, 6);
        ctx.fill();
      }
    }

    // Stadium floodlight towers
    for (const lx of [165, 1085]) {
      ctx.fillStyle = '#6C7A89';
      ctx.fillRect(lx - 5, 125, 10, 145);
      ctx.fillStyle = '#4B5663';
      drawRoundedRect(ctx, lx - 36, 98, 72, 34, 8);
      ctx.fill();
      for (let b = -1; b <= 1; b++) {
        ctx.fillStyle = '#FFF6D1';
        ctx.beginPath();
        ctx.arc(lx + b * 20, 115, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Foreground wooden/concrete cheer stage
    ctx.fillStyle = groundColor;
    ctx.fillRect(0, 495, W, H - 495);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 495);
    ctx.lineTo(W, 495);
    ctx.stroke();
  } else if (env === 'cafe') {
    // Cozy warm cafe interior wall
    ctx.fillStyle = '#EFE9DE';
    ctx.fillRect(0, 110, W, 395);

    // Arched window showing campus trees
    ctx.fillStyle = '#C8DCE8';
    drawRoundedRect(ctx, 130, 150, 290, 235, 135);
    ctx.fill();
    applyStyleStroke(ctx, style, 3);

    // Hanging pendant lights
    for (const px of [440, 840]) {
      ctx.strokeStyle = '#5B5046';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, 140);
      ctx.stroke();
      ctx.fillStyle = '#E6B88A';
      ctx.beginPath();
      ctx.arc(px, 160, 34, Math.PI, 0);
      ctx.fill();
      applyStyleStroke(ctx, style, 2);
    }

    // Bookshelf / menu board
    ctx.fillStyle = '#D9CBB8';
    drawRoundedRect(ctx, 790, 180, 330, 210, 14);
    ctx.fill();
    applyStyleStroke(ctx, style, 2);

    // Wooden counter & floor
    ctx.fillStyle = groundColor || '#C8AC8E';
    ctx.fillRect(0, 490, W, H - 490);
    ctx.fillStyle = '#B89574';
    drawRoundedRect(ctx, 70, 455, W - 140, 48, 10);
    ctx.fill();
    applyStyleStroke(ctx, style, 2);
  } else if (env === 'library') {
    ctx.fillStyle = '#EAE6DC';
    ctx.fillRect(0, 80, W, 420);

    // Tall arched library windows
    for (const wx of [150, 860]) {
      ctx.fillStyle = '#D6E4EE';
      drawRoundedRect(ctx, wx, 120, 250, 280, 120);
      ctx.fill();
      applyStyleStroke(ctx, style, 2.5);
    }

    // Bookshelves
    ctx.fillStyle = '#B89B7A';
    drawRoundedRect(ctx, 470, 160, 330, 320, 10);
    ctx.fill();
    applyStyleStroke(ctx, style, 2.5);
    for (let s = 0; s < 4; s++) {
      const sy = 200 + s * 68;
      ctx.fillStyle = '#8F7458';
      ctx.fillRect(482, sy, 306, 10);
      for (let b = 0; b < 11; b++) {
        ctx.fillStyle = ['#7B96AB', '#90AC98', '#C69D7E', '#B38484'][b % 4];
        ctx.fillRect(492 + b * 26, sy - 42, 20, 42);
      }
    }

    ctx.fillStyle = groundColor || '#D7C8B2';
    ctx.fillRect(0, 495, W, H - 495);
  } else if (env === 'rooftop') {
    // Distant skyline silhouettes
    ctx.fillStyle = '#9BAAB8';
    for (let i = 0; i < 12; i++) {
      const bw = 95;
      const bh = 90 + ((i * 53) % 130);
      ctx.fillRect(i * 110, 440 - bh, bw, bh);
    }
    // Brick parapet wall
    ctx.fillStyle = '#B98C78';
    ctx.fillRect(0, 425, W, 85);
    applyStyleStroke(ctx, style, 2);

    // String lights across top
    ctx.strokeStyle = '#4A4E57';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.quadraticCurveTo(W / 2, 210, W, 115);
    ctx.stroke();
    for (let i = 1; i <= 9; i++) {
      const p = i / 10;
      const lx = p * W;
      const ly =
        (1 - p) * (1 - p) * 120 +
        2 * (1 - p) * p * 210 +
        p * p * 115;
      ctx.fillStyle = '#FFE9A8';
      ctx.beginPath();
      ctx.arc(lx, ly + 8, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = groundColor || '#C7BEB2';
    ctx.fillRect(0, 498, W, H - 498);
  } else {
    // Campus / street scene
    ctx.fillStyle = '#B5C4B1';
    ctx.beginPath();
    ctx.ellipse(240, 470, 380, 120, 0, Math.PI, 0);
    ctx.ellipse(980, 480, 440, 140, 0, Math.PI, 0);
    ctx.fill();

    // Academic building
    ctx.fillStyle = '#D1A58C';
    drawRoundedRect(ctx, 760, 195, 380, 295, 10);
    ctx.fill();
    applyStyleStroke(ctx, style, 2.5);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        ctx.fillStyle = '#DCE8F2';
        drawRoundedRect(ctx, 795 + c * 82, 235 + r * 85, 52, 58, 6);
        ctx.fill();
      }
    }

    // Swaying campus trees
    const sway = Math.sin(t * 1.4) * 5;
    for (const tx of [185, 330]) {
      ctx.fillStyle = '#8B6F5C';
      ctx.fillRect(tx - 10, 330, 20, 165);
      ctx.fillStyle = '#92B59A';
      ctx.beginPath();
      ctx.arc(tx + sway, 300, 68, 0, Math.PI * 2);
      ctx.fill();
      applyStyleStroke(ctx, style, 2);
    }

    ctx.fillStyle = groundColor || '#D9D7CE';
    ctx.fillRect(0, 495, W, H - 495);
  }
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  char: CharacterAppearance,
  style: VisualStyle,
  x: number,
  y: number,
  scale: number,
  pose: StoryBeat['visualCue']['characterPose'],
  emotion: StoryBeat['visualCue']['characterEmotion'],
  mouthOpen: number,
  t: number,
  isCompanion = false
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const breathe =
    pose === 'playing-drums'
      ? Math.sin(t * 9) * 3
      : pose === 'celebrating'
      ? Math.abs(Math.sin(t * 6)) * -12
      : Math.sin(t * 2.5) * 2.5;

  // Ground shadow
  ctx.fillStyle = 'rgba(20, 28, 38, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, 150, 62, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, breathe);

  // Legs / bottom outfit
  const bottomCol = char.outfitBottomColor || '#4A5D75';
  const topCol = char.outfitTopColor || '#8FB9AA';
  const skinCol = char.skinTone || '#F3CFB6';
  const hairCol = char.hairColor || '#2C2623';

  for (const lx of [-20, 20]) {
    drawRoundedRect(ctx, lx - 12, 74, 24, 72, 10);
    fillStyledShape(ctx, style, bottomCol, lx, 110, 24);
    applyStyleStroke(ctx, style, 2.5);

    // Shoes
    drawRoundedRect(ctx, lx - 15, 134, 32, 16, 8);
    fillStyledShape(ctx, style, '#353C47', lx, 142, 14);
    applyStyleStroke(ctx, style, 2);
  }

  // Back hair for long/ponytail
  if (char.hairStyle === 'ponytail' || char.hairStyle === 'wavy-medium') {
    ctx.beginPath();
    ctx.ellipse(0, -56, 46, 52, 0, 0, Math.PI * 2);
    fillStyledShape(ctx, style, hairCol, 0, -56, 46);
    applyStyleStroke(ctx, style, 2.5);
  }

  // Torso / top outfit
  drawRoundedRect(ctx, -40, -14, 80, 96, 26);
  fillStyledShape(ctx, style, topCol, 0, 32, 54);
  applyStyleStroke(ctx, style, 2.8);

  if (char.outfitStyle === 'hoodie-overalls') {
    // Overall bib & straps
    drawRoundedRect(ctx, -28, 20, 56, 60, 12);
    fillStyledShape(ctx, style, bottomCol, 0, 48, 36);
    applyStyleStroke(ctx, style, 2);
    ctx.fillStyle = bottomCol;
    ctx.fillRect(-26, -12, 10, 34);
    ctx.fillRect(16, -12, 10, 34);
  }

  // Arms based on pose
  const leftSwing =
    pose === 'playing-drums'
      ? Math.sin(t * 11) * 0.45 - 0.5
      : pose === 'celebrating'
      ? -2.3 + Math.sin(t * 7) * 0.2
      : pose === 'determined'
      ? -0.7
      : pose === 'nervous'
      ? 0.25
      : Math.sin(t * 2.5) * 0.08;

  const rightSwing =
    pose === 'playing-drums'
      ? Math.cos(t * 11) * 0.45 - 0.5
      : pose === 'celebrating'
      ? -2.3 - Math.sin(t * 7) * 0.2
      : pose === 'determined'
      ? -0.7
      : pose === 'nervous'
      ? -0.25
      : -Math.sin(t * 2.5) * 0.08;

  for (const [side, angle] of [
    [-1, leftSwing],
    [1, rightSwing],
  ] as const) {
    ctx.save();
    ctx.translate(side * 42, 4);
    ctx.rotate(side * angle);
    drawRoundedRect(ctx, -11, 0, 22, 58, 11);
    fillStyledShape(ctx, style, topCol, 0, 28, 24);
    applyStyleStroke(ctx, style, 2.5);

    // Hand
    ctx.beginPath();
    ctx.arc(0, 60, 11, 0, Math.PI * 2);
    fillStyledShape(ctx, style, skinCol, 0, 60, 11);
    applyStyleStroke(ctx, style, 2);

    // Accessory in hand
    if (!isCompanion && char.accessory === 'drumsticks') {
      ctx.strokeStyle = '#D9B382';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(0, 60);
      ctx.lineTo(side * -14, 98);
      ctx.stroke();
      ctx.fillStyle = '#F5EDE0';
      ctx.beginPath();
      ctx.arc(side * -14, 98, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (!isCompanion && char.accessory === 'notebook' && side === 1) {
      drawRoundedRect(ctx, -16, 48, 30, 36, 4);
      fillStyledShape(ctx, style, '#F7F3E9', 0, 66, 20);
      applyStyleStroke(ctx, style, 2);
    } else if (!isCompanion && char.accessory === 'coffee-cup' && side === 1) {
      drawRoundedRect(ctx, -10, 48, 22, 26, 4);
      fillStyledShape(ctx, style, '#FFFFFF', 0, 61, 14);
      applyStyleStroke(ctx, style, 2);
    }
    ctx.restore();
  }

  // Head
  ctx.beginPath();
  ctx.arc(0, -56, 42, 0, Math.PI * 2);
  fillStyledShape(ctx, style, skinCol, 0, -56, 42);
  applyStyleStroke(ctx, style, 2.8);

  // Cheeks blush (stronger if embarrassed or happy)
  ctx.fillStyle =
    emotion === 'embarrassed'
      ? 'rgba(235, 118, 118, 0.45)'
      : 'rgba(235, 145, 145, 0.25)';
  ctx.beginPath();
  ctx.ellipse(-21, -44, 8, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(21, -44, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Front hair bangs
  ctx.beginPath();
  ctx.arc(0, -64, 43, Math.PI, 0);
  ctx.quadraticCurveTo(20, -56, 0, -68);
  ctx.quadraticCurveTo(-20, -56, -43, -64);
  fillStyledShape(ctx, style, hairCol, 0, -76, 36);
  applyStyleStroke(ctx, style, 2.2);

  // Eyes (blinking periodically)
  const blink = Math.sin(t * 1.9) > 0.96;
  for (const ex of [-14, 14]) {
    if (blink || emotion === 'happy' && pose === 'celebrating') {
      ctx.strokeStyle = '#242A36';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ex, -54, 6, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#242A36';
      ctx.beginPath();
      ctx.ellipse(ex, -56, 4.5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ex - 1.5, -58, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Eyebrows based on emotion
  ctx.strokeStyle = hairCol;
  ctx.lineWidth = 2.6;
  const browTilt =
    emotion === 'embarrassed' || emotion === 'surprised'
      ? -3
      : emotion === 'confident' || emotion === 'focused'
      ? 2.5
      : 0;
  ctx.beginPath();
  ctx.moveTo(-21, -69 + browTilt);
  ctx.lineTo(-8, -69 - browTilt);
  ctx.moveTo(8, -69 - browTilt);
  ctx.lineTo(21, -69 + browTilt);
  ctx.stroke();

  // Animated lip-synced mouth
  const talkH = isCompanion ? 0 : mouthOpen * 9;
  ctx.fillStyle = '#C96868';
  ctx.strokeStyle = '#242A36';
  ctx.lineWidth = 2.2;
  if (talkH > 1.5) {
    ctx.beginPath();
    ctx.ellipse(0, -37, 7, 2 + talkH * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (emotion === 'embarrassed' || emotion === 'surprised') {
    ctx.beginPath();
    ctx.moveTo(-8, -36);
    ctx.quadraticCurveTo(-4, -40, 0, -36);
    ctx.quadraticCurveTo(4, -32, 8, -36);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, -40, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  // Nervous sweat drop
  if (!isCompanion && (emotion === 'embarrassed' || pose === 'nervous')) {
    const dropY = -75 + ((t * 25) % 18);
    ctx.fillStyle = '#9ED2F6';
    ctx.beginPath();
    ctx.moveTo(34, dropY - 8);
    ctx.quadraticCurveTo(41, dropY + 2, 34, dropY + 5);
    ctx.quadraticCurveTo(27, dropY + 2, 34, dropY - 8);
    ctx.fill();
  }

  // Drum prop in front of character if drumsticks accessory
  if (!isCompanion && char.accessory === 'drumsticks') {
    ctx.save();
    ctx.translate(0, 68);
    drawRoundedRect(ctx, -46, -18, 92, 46, 10);
    fillStyledShape(ctx, style, '#D96B52', 0, 4, 46);
    applyStyleStroke(ctx, style, 2.5);
    ctx.fillStyle = '#F7F4EB';
    ctx.beginPath();
    ctx.ellipse(0, -18, 46, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    applyStyleStroke(ctx, style, 2);
    ctx.restore();
  }

  ctx.restore();
}

function drawFloatingAccents(
  ctx: CanvasRenderingContext2D,
  beat: StoryBeat,
  bible: CharacterBible,
  t: number
) {
  const pose = beat.visualCue.characterPose;
  const mood = beat.visualCue.lightingMood;

  if (
    bible.lead.accessory === 'drumsticks' &&
    (pose === 'playing-drums' || pose === 'celebrating')
  ) {
    // Soft floating musical notes
    ctx.save();
    ctx.fillStyle = bible.palette.highlightColor || '#3D5A80';
    ctx.font = 'bold 28px sans-serif';
    for (let i = 0; i < 3; i++) {
      const ny = 290 - ((t * 45 + i * 40) % 110);
      const nx = 460 + i * 165 + Math.sin(t * 3 + i) * 14;
      ctx.globalAlpha = 0.75 - ((290 - ny) / 140) * 0.6;
      ctx.fillText(i % 2 === 0 ? '♪' : '♫', nx, ny);
    }
    ctx.restore();
  }

  if (mood === 'golden-triumph' || pose === 'celebrating') {
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const sx = 240 + i * 160 + Math.sin(t * 2 + i) * 20;
      const sy = 160 + ((i * 55 + t * 18) % 120);
      ctx.globalAlpha = 0.45 + Math.sin(t * 4 + i) * 0.25;
      ctx.fillStyle = '#FFF3B0';
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawBurnedInSubtitles(
  ctx: CanvasRenderingContext2D,
  lines: string[]
) {
  if (lines.length === 0) return;

  // Subtle dark bottom gradient scrim for guaranteed 4.5:1+ contrast on white text
  const scrim = ctx.createLinearGradient(0, H - 175, 0, H);
  scrim.addColorStop(0, 'rgba(15, 23, 42, 0)');
  scrim.addColorStop(0.55, 'rgba(15, 23, 42, 0.55)');
  scrim.addColorStop(1, 'rgba(15, 23, 42, 0.78)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H - 175, W, 175);

  ctx.save();
  ctx.font = '700 34px "Plus Jakarta Sans", "DM Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const visibleLines = lines.slice(0, 2);
  const baseY = visibleLines.length === 2 ? H - 88 : H - 64;
  const lineHeight = 44;

  visibleLines.forEach((line, idx) => {
    const ly = baseY + idx * lineHeight;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.lineWidth = 8;
    ctx.strokeText(line, W / 2, ly);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(line, W / 2, ly);
  });
  ctx.restore();
}

export function renderStoryFrame({
  ctx,
  timeSec,
  beat,
  bible,
  style,
  audioDurationSec,
  mouthOpenness,
  authorName,
}: RenderParams) {
  const t = quantizeTime(timeSec, style);
  const beatDur = Math.max(1, beat.endSec - beat.startSec);
  const progress = Math.min(1, Math.max(0, (t - beat.startSec) / beatDur));

  ctx.clearRect(0, 0, W, H);

  // Camera transform per beat visualCue
  ctx.save();
  const motion = beat.visualCue.cameraMotion;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  if (motion === 'zoom-in') {
    scale = 1 + progress * 0.06;
  } else if (motion === 'zoom-out') {
    scale = 1.06 - progress * 0.06;
  } else if (motion === 'pan-right') {
    scale = 1.05;
    offsetX = (0.5 - progress) * 28;
  } else if (motion === 'pan-left') {
    scale = 1.05;
    offsetX = (progress - 0.5) * 28;
  } else {
    scale = 1.02;
    offsetY = Math.sin(t * 3) * 4;
  }

  ctx.translate(W / 2 + offsetX, H / 2 + offsetY);
  ctx.scale(scale, scale);
  ctx.translate(-W / 2, -H / 2);

  drawSkyAndAtmosphere(ctx, bible, beat, style, t);
  drawEnvironment(ctx, bible, beat, style, t);

  // Companion character (if visible in this beat)
  if (bible.companion && beat.visualCue.showCompanion) {
    drawCharacter(
      ctx,
      bible.companion,
      style,
      W * 0.67,
      440,
      0.92,
      'talking',
      beat.visualCue.characterEmotion === 'embarrassed' ? 'surprised' : 'happy',
      0,
      t + 0.6,
      true
    );
  }

  // Lead character (consistent across all 4 beats)
  const leadX = bible.companion && beat.visualCue.showCompanion ? W * 0.42 : W * 0.5;
  drawCharacter(
    ctx,
    bible.lead,
    style,
    leadX,
    438,
    1.08,
    beat.visualCue.characterPose,
    beat.visualCue.characterEmotion,
    mouthOpenness,
    t,
    false
  );

  drawFloatingAccents(ctx, beat, bible, t);

  ctx.restore();

  // Style finishing pass
  if (style === 'live-action') {
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(18, 22, 30, 0.24)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  } else if (style === 'watercolor') {
    // Subtle paper border frame
    ctx.strokeStyle = 'rgba(247, 245, 240, 0.65)';
    ctx.lineWidth = 22;
    ctx.strokeRect(0, 0, W, H);
  }

  // Burned-in word-for-word English subtitles
  const chunks = buildTimedSubtitles(
    beat.subtitles || beat.englishLines,
    beat.startSec,
    beat.endSec,
    audioDurationSec
  );
  const activeChunk =
    chunks.find((c) => timeSec >= c.startSec && timeSec <= c.endSec) ||
    chunks[chunks.length - 1];

  if (activeChunk) {
    drawBurnedInSubtitles(ctx, activeChunk.lines);
  }

  // Gentle closing credit in the final 1.4 seconds
  if (timeSec >= 28.6) {
    const creditAlpha = Math.min(1, (timeSec - 28.6) / 0.6);
    ctx.save();
    ctx.globalAlpha = creditAlpha * 0.92;
    ctx.fillStyle = 'rgba(24, 30, 38, 0.78)';
    drawRoundedRect(ctx, W / 2 - 270, 26, 540, 42, 21);
    ctx.fill();
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '600 18px "Plus Jakarta Sans", "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `Made with Google AI Studio · Script by ${authorName || 'Yu taewoo'}`,
      W / 2,
      47
    );
    ctx.restore();
  }
}
