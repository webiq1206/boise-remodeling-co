'use client';

import { useEffect, useRef, useState } from 'react';

const MEDIA = '/media/remodeling';
const DESKTOP_VIDEO = `${MEDIA}/boise-remodeling-co-background-1080p.mp4`;
const MOBILE_VIDEO = `${MEDIA}/boise-remodeling-co-background-720p.mp4`;
const POSTER = `${MEDIA}/boise-remodeling-co-poster.jpg`;

/** Decorative motion never blocks the poster, copy or request link. */
export function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [source, setSource] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = window.matchMedia('(max-width: 767px)');
    const update = () => {
      video.current?.pause();
      setPlaying(false);
      setHasPlayed(false);
      setFailed(false);
      // No video URL or request until the visitor's motion preference is known.
      setSource(motion.matches ? undefined : mobile.matches ? MOBILE_VIDEO : DESKTOP_VIDEO);
    };
    update();
    motion.addEventListener('change', update);
    mobile.addEventListener('change', update);
    return () => {
      motion.removeEventListener('change', update);
      mobile.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.load();
    if (source && !userPaused.current) {
      element.play().catch(() => setPlaying(false));
    }
    return () => element.pause();
  }, [source]);

  const toggle = () => {
    const element = video.current;
    if (!element) return;
    if (element.paused) {
      userPaused.current = false;
      element.play().catch(() => setPlaying(false));
    } else {
      userPaused.current = true;
      element.pause();
    }
  };

  return (
    <>
      <div className="fam-hero-media" aria-hidden="true">
        <picture>
          <img src={POSTER} alt="" width="1920" height="1080"
            className="fam-hero-img" fetchPriority="high" loading="eager" />
        </picture>
        <video ref={video} id="remodeling-hero-video" src={source} poster={POSTER} muted loop playsInline preload="none"
          className="remodeling-hero-video" data-visible={hasPlayed && !failed} tabIndex={-1} disablePictureInPicture
          onPlaying={() => { setPlaying(true); setHasPlayed(true); }} onPause={() => setPlaying(false)}
          onError={() => { setFailed(true); setPlaying(false); }} />
      </div>
      {source && !failed ? (
        <button type="button" className="remodeling-hero-video-toggle" aria-controls="remodeling-hero-video"
          onClick={toggle} aria-label={playing ? 'Pause background video' : 'Play background video'}>
          <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>
          {playing ? 'Pause video' : 'Play video'}
        </button>
      ) : null}
    </>
  );
}
