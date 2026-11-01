/**
 * Third-party tags wait for the visitor (phase 5 performance rule: nothing
 * third-party before interaction except gtag).
 *
 * The Meta Pixel and Microsoft Clarity used to request their network scripts
 * as soon as the page hydrated, competing with the page's own JavaScript on a
 * phone's main thread. Now each tag installs its command stub immediately (so
 * fbq(...) and clarity(...) calls queue from the first moment, exactly as the
 * vendors' own snippets do) and only the network script waits: it is inserted
 * on the first pointerdown, keydown, scroll or touchstart, or
 * THIRD_PARTY_FALLBACK_MS after the window load event, whichever comes first.
 * When the vendor script arrives it drains the queue, so a PageView or Lead
 * fired before it loaded is still sent.
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
