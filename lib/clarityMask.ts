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

function isMasked(node: MaskableNode | null | undefined): boolean {
  return node?.getAttribute?.(CLARITY_MASK_ATTRIBUTE) === CLARITY_MASK_VALUE;
}

function hasMaskedAncestor(node: MaskableNode): boolean {
  let parent = node.parentElement;
  while (parent) {
    if (isMasked(parent)) return true;
    parent = parent.parentElement ?? null;
  }
  return false;
}

function stamp(node: MaskableNode): void {
  node.setAttribute?.(CLARITY_MASK_ATTRIBUTE, CLARITY_MASK_VALUE);
}

/**
 * Stamp every form, input, textarea, and select under root, including root.
 * A checkbox, radio, range, or button with no masked ancestor also stamps
 * its parent, which is where the visible label sits.
 */
export function applyClarityMask(root: MaskableNode | null | undefined): void {
  if (!root) return;
  if (root.nodeType === 1 && typeof root.matches === "function" && root.matches(CLARITY_FIELD_SELECTOR)) {
    stamp(root);
  }
  const matched = typeof root.querySelectorAll === "function" ? root.querySelectorAll(CLARITY_FIELD_SELECTOR) : [];
  for (const node of matched) stamp(node);

  const inputs: MaskableNode[] = [];
  if (root.nodeType === 1 && typeof root.matches === "function" && root.matches("input")) inputs.push(root);
  if (typeof root.querySelectorAll === "function") {
    for (const node of root.querySelectorAll("input")) inputs.push(node);
  }
  for (const input of inputs) {
    const type = (input.getAttribute?.("type") || "").toLowerCase();
    if (!PARENT_MASK_INPUT_TYPES.has(type)) continue;
    if (hasMaskedAncestor(input)) continue;
    if (input.parentElement) stamp(input.parentElement);
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
      return !!(node && node.getAttribute && node.getAttribute(ATTR)===VALUE);
    }
    function maskedAncestor(node){
      var parent=node.parentElement;
      while(parent){
        if(masked(parent)) return true;
        parent=parent.parentElement;
      }
      return false;
    }
    function mask(root){
      if(!root) return;
      if(root.nodeType===1 && root.matches && root.matches(SELECTOR)) root.setAttribute(ATTR, VALUE);
      if(root.querySelectorAll){
        var nodes=root.querySelectorAll(SELECTOR);
        for(var i=0;i<nodes.length;i++) nodes[i].setAttribute(ATTR, VALUE);
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
        if(input.parentElement) input.parentElement.setAttribute(ATTR, VALUE);
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
