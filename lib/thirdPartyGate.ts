/**
 * When third-party network scripts load.
 *
 * Owner decision (2026-11-01): the split is by what the tag is for.
 *
 * - Microsoft Clarity (and HubSpot, on the sites that run it) waits for the
 *   visitor: its network script is inserted on the first pointerdown, keydown,
 *   scroll or touchstart, or THIRD_PARTY_FALLBACK_MS after the window load
 *   event, whichever comes first (afterInteraction below).
 * - The Meta Pixel loads fbevents.js at the window load event, with no
 *   interaction wait and no 5 second wait (afterWindowLoad below). Paid-ad
 *   landing page views matter more than the small blocking-time saving: behind
 *   the gate, a visitor who left within 5 seconds without touching the page
 *   sent no PageView, so Meta under-counted Landing Page Views.
 *
 * Either way each tag installs its command stub immediately (so fbq(...) and
 * clarity(...) calls queue from the first moment, exactly as the vendors' own
 * snippets do) and only the network script is timed. When the vendor script
 * arrives it drains the queue, so a PageView or Lead fired before it loaded is
 * still sent.
 *
 * The gate is a tiny inline script installed beforeInteractive, so an
 * interaction that happens before hydration still opens it. Clarity masking
 * (lib/clarityMask.ts) is unaffected: it stamps fields from the first paint,
 * before Clarity can record anything.
 */
export const THIRD_PARTY_GATE = '__p5AfterInteraction';
export const THIRD_PARTY_INTERACTION_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
/** Never less than 5 seconds after load (the plan's floor). */
export const THIRD_PARTY_FALLBACK_MS = 5000;

/** Inline script for the root layout, strategy beforeInteractive. */
export function thirdPartyGateScript(): string {
  return `(function(w,d){
  if(w.${THIRD_PARTY_GATE})return;
  var queue=[],open=false,timer,events=${JSON.stringify(THIRD_PARTY_INTERACTION_EVENTS)},opts={capture:true,passive:true};
  function run(fn){try{fn()}catch(e){}}
  function release(){
    if(open)return;open=true;clearTimeout(timer);
    for(var i=0;i<events.length;i++)w.removeEventListener(events[i],release,opts);
    while(queue.length)run(queue.shift());
  }
  for(var i=0;i<events.length;i++)w.addEventListener(events[i],release,opts);
  function arm(){timer=setTimeout(release,${THIRD_PARTY_FALLBACK_MS})}
  if(d.readyState==="complete")arm();else w.addEventListener("load",arm,{once:true});
  w.${THIRD_PARTY_GATE}=function(fn){if(open)run(fn);else queue.push(fn)};
})(window,document);`;
}

/**
 * Wrap a loader (the part of a vendor snippet that inserts its network
 * script) so it runs through the gate. If the gate is somehow missing the
 * loader runs at once, which is the old behaviour, so tracking never breaks.
 */
export function afterInteraction(loader: string): string {
  return `(window.${THIRD_PARTY_GATE}||function(f){f()})(function(){${loader}});`;
}

/**
 * Wrap a loader so it runs at the window load event (at once if the page has
 * already loaded). No interaction wait and no fallback timer: the Meta Pixel
 * uses this so a paid-ad visitor who never touches the page still sends a
 * PageView, while fbevents.js still stays off the critical rendering path.
 */
export function afterWindowLoad(loader: string): string {
  return `(function(w,d,f){if(d.readyState==="complete")f();else w.addEventListener("load",f,{once:true})})(window,document,function(){${loader}});`;
}
