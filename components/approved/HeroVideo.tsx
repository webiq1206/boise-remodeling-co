'use client';

import { useEffect, useRef, useState } from 'react';

const MEDIA = '/media/remodeling';
const DESKTOP_VIDEO = `${MEDIA}/boise-remodeling-co-background-1080p.mp4`;
const MOBILE_VIDEO = `${MEDIA}/boise-remodeling-co-background-720p.mp4`;
const POSTER = `${MEDIA}/boise-remodeling-co-poster.jpg`;

/** Decorative motion never blocks the poster, copy or request link. */
export function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState<string>();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)');
    const update = () => {
      setVisible(false);
      setSource(mobile.matches ? MOBILE_VIDEO : DESKTOP_VIDEO);
    };
    update();
    mobile.addEventListener('change', update);
    return () => mobile.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element || !source) return;
    let active = true;
    element.muted = true;
    element.load();
    // Autoplay remains subject to the browser's playback restrictions.
    element.play().catch(() => { if (active) setVisible(false); });
    return () => { active = false; element.pause(); };
  }, [source]);

  return (
      <div className="fam-hero-media" aria-hidden="true">
        <picture>
          <img src={POSTER} alt="" width="1920" height="1080"
            className="fam-hero-img" fetchPriority="high" loading="eager" />
        </picture>
        <video ref={video} id="remodeling-hero-video" src={source} poster={POSTER} autoPlay muted loop playsInline preload="none" controls={false}
          className="remodeling-hero-video" data-visible={visible} tabIndex={-1} disablePictureInPicture
          onPlaying={() => setVisible(true)}
          onError={() => setVisible(false)} />
      </div>
  );
}
