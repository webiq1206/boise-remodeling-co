export const CLARITY_MASK_ATTRIBUTE = "data-clarity-mask";
export const CLARITY_MASK_VALUE = "True";
/** Forms are included so echoed text and address suggestions inside them are covered. */
export const CLARITY_FIELD_SELECTOR = "form,input,textarea,select";

const PARENT_MASK_INPUT_TYPES = new Set(["checkbox", "radio", "range", "button"]);

type MaskableNode = {
  nodeType?: number;
  matches?: (selector: string) => boolean;
  querySelectorAll?: (selector: string) => Iterable<MaskableNode>;
  setAttribute?: (name: string, value: string) => void;
  getAttribute?: (name: string) => string | null;
  parentElement?: MaskableNode | null;
};

/** Any casing of "true" counts: forms render "true", the script writes "True". */
function isMasked(node: MaskableNode | null | undefined): boolean {
  return (node?.getAttribute?.(CLARITY_MASK_ATTRIBUTE) ?? "").toLowerCase() === "true";
}

function hasMaskedAncestor(node: MaskableNode): boolean {
  let parent = node.parentElement;
  while (parent) {
    if (isMasked(parent)) return true;
    parent = parent.parentElement ?? null;
  }
  return false;
}

/**
 * An element that already carries a mask is left exactly as rendered. Rewriting
 * a server-rendered "true" to "True" before React hydrated was a hydration
 * attribute mismatch on every page with the consultation form.
 */
function stamp(node: MaskableNode): void {
  if (isMasked(node)) return;
  node.setAttribute?.(CLARITY_MASK_ATTRIBUTE, CLARITY_MASK_VALUE);
}

/**
 * An aria-hidden mirror field (Radix renders a hidden native select beside its
 * custom control) inside an already-masked ancestor is covered by that
 * ancestor, because Clarity masks every descendant of a masked element.
 * Stamping it anyway changed server-rendered HTML before React hydrated, which
 * React reports as a hydration attribute mismatch on every page with a select.
 */
function isCoveredMirror(node: MaskableNode): boolean {
  return node.getAttribute?.("aria-hidden") === "true" && hasMaskedAncestor(node);
}

/**
 * Stamp every form, input, textarea, and select under root, including root.
 * A checkbox, radio, range, or button with no masked ancestor also stamps
 * its parent, which is where the visible label sits.
 */
export function applyClarityMask(root: MaskableNode | null | undefined): void {
  if (!root) return;
  if (root.nodeType === 1 && typeof root.matches === "function" && root.matches(CLARITY_FIELD_SELECTOR)) {
    if (!isCoveredMirror(root)) stamp(root);
  }
  const matched = typeof root.querySelectorAll === "function" ? root.querySelectorAll(CLARITY_FIELD_SELECTOR) : [];
  for (const node of matched) if (!isCoveredMirror(node)) stamp(node);

  const inputs: MaskableNode[] = [];
  if (root.nodeType === 1 && typeof root.matches === "function" && root.matches("input")) inputs.push(root);
  if (typeof root.querySelectorAll === "function") {
    for (const node of root.querySelectorAll("input")) inputs.push(node);
  }
  for (const input of inputs) {
    const type = (input.getAttribute?.("type") || "").toLowerCase();
    if (!PARENT_MASK_INPUT_TYPES.has(type)) continue;
    if (hasMaskedAncestor(input)) continue;
    if (input.parentElement && !input.parentElement.matches?.("body,html")) stamp(input.parentElement);
  }
}

/**
 * Install the mask before Clarity records. The first pass covers the
 * document. Each mutation passes only the added element, not the document.
 */
export function clarityFieldMaskScript(): string {
  return `(function(){
    var ATTR=${JSON.stringify(CLARITY_MASK_ATTRIBUTE)};
    var VALUE=${JSON.stringify(CLARITY_MASK_VALUE)};
    var SELECTOR=${JSON.stringify(CLARITY_FIELD_SELECTOR)};
    var PARENT_TYPES={"checkbox":1,"radio":1,"range":1,"button":1};
    function masked(node){
      return !!(node && node.getAttribute && String(node.getAttribute(ATTR)||"").toLowerCase()==="true");
    }
    function stamp(node){
      if(!masked(node)) node.setAttribute(ATTR, VALUE);
    }
    function maskedAncestor(node){
      var parent=node.parentElement;
      while(parent){
        if(masked(parent)) return true;
        parent=parent.parentElement;
      }
      return false;
    }
    function coveredMirror(node){
      return node.getAttribute && node.getAttribute("aria-hidden")==="true" && maskedAncestor(node);
    }
    function mask(root){
      if(!root) return;
      if(root.nodeType===1 && root.matches && root.matches(SELECTOR) && !coveredMirror(root)) stamp(root);
      if(root.querySelectorAll){
        var nodes=root.querySelectorAll(SELECTOR);
        for(var i=0;i<nodes.length;i++) if(!coveredMirror(nodes[i])) stamp(nodes[i]);
      }
      var inputs=[];
      if(root.matches && root.matches("input")) inputs.push(root);
      if(root.querySelectorAll){
        var found=root.querySelectorAll("input");
        for(var j=0;j<found.length;j++) inputs.push(found[j]);
      }
      for(var k=0;k<inputs.length;k++){
        var input=inputs[k];
        var type=(input.getAttribute("type")||"").toLowerCase();
        if(!PARENT_TYPES[type]) continue;
        if(maskedAncestor(input)) continue;
        if(input.parentElement && !input.parentElement.matches("body,html")) stamp(input.parentElement);
      }
    }
    function start(){
      mask(document);
      if(typeof MutationObserver!=="function" || !document.documentElement) return;
      new MutationObserver(function(records){
        for(var i=0;i<records.length;i++){
          var added=records[i].addedNodes;
          for(var n=0;n<added.length;n++){
            if(added[n] && added[n].nodeType===1) mask(added[n]);
          }
        }
      }).observe(document.documentElement,{childList:true,subtree:true});
    }
    if(document.documentElement) start();
    else document.addEventListener("DOMContentLoaded", start);
  })();`;
}
