import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const ASSET_BASE_URL = import.meta.env.BASE_URL;
const BACKGROUND_VIDEO_URL = `${ASSET_BASE_URL}bg-no-rabbit.mp4?v=20260528-higgsfield`;
const BACKGROUND_POSTER_URL = `${ASSET_BASE_URL}bg-poster.jpg?v=20260528-higgsfield`;
const LOGO_URL = `${ASSET_BASE_URL}logo500.png`;
const RABBIT_SPRITE_URL = `${ASSET_BASE_URL}rabbit-eye-sprite.png?v=30fps-continuous-04-3`;

const SPRITE_COLS = 20;
const SPRITE_ROWS = 15;
const SPRITE_FRAME_COUNT = 293;
const FRAME_EASING = 0.18;
const NAV_ITEMS = ['Videos', 'Ads', 'Contest', 'Game', 'Tools'];
const CENTER_RADIUS = 0.18;
const CONTROL_ZONE = {
  centerX: 0.52,
  centerY: 0.5,
  radius: 0.58,
};
const DIRECTION_FRAMES = {
  topLeft: 225,
  topRight: 180,
  bottomLeft: 54,
  bottomRight: 135,
  center: 0,
} as const;
const FRAME_ANCHORS = [
  { angle: 135, frame: DIRECTION_FRAMES.bottomLeft },
  { angle: 45, frame: DIRECTION_FRAMES.bottomRight },
  { angle: -45, frame: DIRECTION_FRAMES.topRight },
  { angle: -135, frame: DIRECTION_FRAMES.topLeft },
  { angle: -225, frame: DIRECTION_FRAMES.bottomLeft + SPRITE_FRAME_COUNT },
] as const;

type ScrubState = {
  targetFrame: number;
  displayFrame: number;
  lastRenderedFrame: number;
  frameId: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFrameFromLocalDirection(dx: number, dy: number) {
  const distanceFromCenter = Math.hypot(dx, dy);

  if (distanceFromCenter <= CENTER_RADIUS) {
    return DIRECTION_FRAMES.center;
  }

  let angle = Math.atan2(dy, dx) * (180 / Math.PI);

  while (angle > FRAME_ANCHORS[0].angle) {
    angle -= 360;
  }

  while (angle < FRAME_ANCHORS[FRAME_ANCHORS.length - 1].angle) {
    angle += 360;
  }

  for (let index = 0; index < FRAME_ANCHORS.length - 1; index += 1) {
    const start = FRAME_ANCHORS[index];
    const end = FRAME_ANCHORS[index + 1];

    if (angle <= start.angle && angle >= end.angle) {
      const progress = (start.angle - angle) / (start.angle - end.angle);
      return normalizeFrame(start.frame + (end.frame - start.frame) * progress);
    }
  }

  return DIRECTION_FRAMES.center;
}

type PointerPosition = {
  clientX: number;
  clientY: number;
};

function getControlZoneFrame(event: PointerPosition, rect: DOMRect) {
  const centerX = rect.left + rect.width * CONTROL_ZONE.centerX;
  const centerY = rect.top + rect.height * CONTROL_ZONE.centerY;
  const radius = Math.min(rect.width, rect.height) * CONTROL_ZONE.radius;
  const dx = (event.clientX - centerX) / radius;
  const dy = (event.clientY - centerY) / radius;

  if (dx * dx + dy * dy > 1) {
    return DIRECTION_FRAMES.center;
  }

  return getFrameFromLocalDirection(clamp(dx, -1, 1), clamp(dy, -1, 1));
}

function getSpritePosition(frame: number) {
  const col = frame % SPRITE_COLS;
  const row = Math.floor(frame / SPRITE_COLS);
  const x = (col / (SPRITE_COLS - 1)) * 100;
  const y = (row / (SPRITE_ROWS - 1)) * 100;

  return `${x}% ${y}%`;
}

function normalizeFrame(frame: number) {
  return (frame + SPRITE_FRAME_COUNT) % SPRITE_FRAME_COUNT;
}

function getShortestFrameDelta(currentFrame: number, targetFrame: number) {
  let delta = targetFrame - currentFrame;

  if (delta > SPRITE_FRAME_COUNT / 2) {
    delta -= SPRITE_FRAME_COUNT;
  }

  if (delta < -SPRITE_FRAME_COUNT / 2) {
    delta += SPRITE_FRAME_COUNT;
  }

  return delta;
}

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <a href="#" aria-label="KanaWorks_AI home" className="inline-flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14">
          <img src={LOGO_URL} alt="KanaWorks_AI" className="h-full w-full object-contain" draggable={false} />
        </a>

        <div className="absolute left-1/2 hidden -translate-x-1/2 rounded-full bg-gray-900 px-2 py-1.5 md:flex">
          {NAV_ITEMS.map((item, index) => (
            <a
              href="#"
              key={item}
              className={
                index === 0
                  ? 'rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-900'
                  : 'rounded-full px-4 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:text-white'
              }
            >
              {item}
            </a>
          ))}
        </div>

        <a
          href="#"
          className="hidden items-center gap-2 rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 md:flex"
        >
          <span className="h-2 w-2 rounded-full bg-green-400" aria-hidden="true" />
          Contact Us
        </a>

        <button
          type="button"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className={`inline-flex h-9 w-9 items-center justify-center focus:outline-none md:hidden ${isOpen ? 'text-gray-900' : 'text-white'}`}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {isOpen && (
        <div className="fixed left-0 right-0 top-0 z-40 flex flex-col gap-1 bg-white px-5 pb-6 pt-16 shadow-lg md:hidden">
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setIsOpen(false)}
              className="border-b border-gray-100 py-3 text-left text-base font-medium text-gray-800 transition-colors hover:text-gray-500 focus:outline-none"
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-4 inline-flex items-center justify-center gap-2 self-center rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none"
          >
            <span className="h-2 w-2 rounded-full bg-green-400" aria-hidden="true" />
            Contact Us
          </button>
        </div>
      )}
    </>
  );
}

function App() {
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const rabbitSpriteRef = useRef<HTMLDivElement | null>(null);
  const scrubRef = useRef<ScrubState>({
    targetFrame: DIRECTION_FRAMES.center,
    displayFrame: DIRECTION_FRAMES.center,
    lastRenderedFrame: -1,
    frameId: 0,
  });

  useEffect(() => {
    const video = backgroundVideoRef.current;

    if (!video) {
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    const playVideo = () => {
      const playPromise = video.play();

      if (playPromise) {
        playPromise.catch(() => undefined);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        playVideo();
      }
    };

    if (video.readyState >= 2) {
      playVideo();
    } else {
      video.addEventListener('loadeddata', playVideo, { once: true });
      video.addEventListener('canplay', playVideo, { once: true });
    }

    window.addEventListener('pointerdown', playVideo, { passive: true });
    window.addEventListener('touchstart', playVideo, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      video.removeEventListener('loadeddata', playVideo);
      video.removeEventListener('canplay', playVideo);
      window.removeEventListener('pointerdown', playVideo);
      window.removeEventListener('touchstart', playVideo);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const sprite = rabbitSpriteRef.current;

    if (!sprite) {
      return;
    }

    const scrub = scrubRef.current;

    const handlePointerMove = (event: PointerEvent) => {
      scrub.targetFrame = getControlZoneFrame(event, sprite.getBoundingClientRect());
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];

      if (touch) {
        scrub.targetFrame = getControlZoneFrame(touch, sprite.getBoundingClientRect());
      }
    };

    const handlePointerLeave = () => {
      scrub.targetFrame = DIRECTION_FRAMES.center;
    };

    const animate = () => {
      const delta = getShortestFrameDelta(scrub.displayFrame, scrub.targetFrame);
      scrub.displayFrame = normalizeFrame(scrub.displayFrame + delta * FRAME_EASING);
      const frame = Math.round(scrub.displayFrame) % SPRITE_FRAME_COUNT;

      if (frame !== scrub.lastRenderedFrame) {
        scrub.lastRenderedFrame = frame;
        sprite.style.backgroundPosition = getSpritePosition(frame);
      }

      scrub.frameId = window.requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);
    sprite.style.backgroundPosition = getSpritePosition(DIRECTION_FRAMES.center);
    scrub.frameId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
      window.cancelAnimationFrame(scrub.frameId);
    };
  }, []);

  return (
    <section className="relative h-screen h-[100svh] w-full overflow-hidden bg-background">
      <video
        ref={backgroundVideoRef}
        className="absolute inset-0 h-full w-full object-cover object-[24%_50%] sm:object-[8%_50%] md:object-left"
        src={BACKGROUND_VIDEO_URL}
        poster={BACKGROUND_POSTER_URL}
        muted
        playsInline
        preload="auto"
        autoPlay
        loop
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute bottom-[7svh] -left-[12vw] z-[1] aspect-[29/27] w-[70vw] max-w-[320px] sm:bottom-[6vh] sm:-left-[12vw] sm:w-[92vw] sm:max-w-[560px] md:bottom-[5vh] md:left-[3vw] md:w-[40vw] lg:bottom-[4vh] lg:w-[34vw] xl:w-[32vw]"
      >
        <div className="absolute bottom-[17%] left-[22%] z-0 h-[7%] w-[46%] rounded-full bg-black/35 blur-[10px] md:hidden" />
        <div
          ref={rabbitSpriteRef}
          data-rabbit-sprite
          className="relative z-10 h-full w-full bg-no-repeat will-change-[background-position]"
          style={{
            backgroundImage: `url(${RABBIT_SPRITE_URL})`,
            backgroundPosition: getSpritePosition(DIRECTION_FRAMES.center),
            backgroundSize: `${SPRITE_COLS * 100}% ${SPRITE_ROWS * 100}%`,
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[2] bg-black/5" />

      <Navbar />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex flex-1 items-end justify-center px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-5 sm:pb-16 md:pb-20 lg:pb-24">
          <div className="w-full max-w-[920px] text-center">
            <h1 className="-rotate-2 transform-gpu font-brush text-[54px] uppercase leading-[0.86] text-white [text-shadow:0_6px_18px_rgba(0,0,0,0.55)] sm:text-[92px] sm:leading-[0.82] md:text-[122px] lg:text-[150px]">
              Dreams
              <br />
              In Motion
            </h1>
            <div className="mt-3 flex items-center justify-center gap-3 sm:mt-4 sm:gap-4 md:gap-6">
              <span className="h-1 w-11 rounded-full bg-[#F4DA25] shadow-[0_0_12px_rgba(244,218,37,0.45)] sm:w-24 md:w-28" />
              <p className="text-[15px] font-extrabold uppercase tracking-[0.14em] text-[#FFF3AF] [text-shadow:0_3px_12px_rgba(0,0,0,0.65)] sm:text-[24px] sm:tracking-[0.18em] md:text-[30px]">
                Tokyo AI Visuals
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default App;
