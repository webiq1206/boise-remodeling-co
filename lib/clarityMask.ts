export const CLARITY_MASK_ATTRIBUTE = "data-clarity-mask";
export const CLARITY_MASK_VALUE = "True";
export const CLARITY_FIELD_SELECTOR = "input, textarea, select";

type MaskableNode = {
  nodeType?: number;
  matches?: (selector: string) => boolean;
  querySelectorAll?: (selector: string) => Iterable<MaskableNode>;
  setAttribute?: (name: string, value: string) => void;
};

/** Stamp every input, textarea, and select under root, including root itself. */
export function applyClarityMask(root: MaskableNode | null | undefined): void {
  if (!root) return;
  if (
    root.nodeType === 1 &&
    typeof root.matches === "function" &&
    root.matches(CLARITY_FIELD_SELECTOR) &&
    typeof root.setAttribute === "function"
  ) {
    root.setAttribute(CLARITY_MASK_ATTRIBUTE, CLARITY_MASK_VALUE);
  }
  if (typeof root.querySelectorAll !== "function") return;
  for (const node of root.querySelectorAll(CLARITY_FIELD_SELECTOR)) {
    node.setAttribute?.(CLARITY_MASK_ATTRIBUTE, CLARITY_MASK_VALUE);
  }
}

/**
 * Install the mask before Clarity records. New estimator and intake fields
 * are stamped as they are added, so a shared component does not have to
 * carry the attribute itself.
 */
export function clarityFieldMaskScript(): string {
  return `(function(){
    var ATTR=${JSON.stringify(CLARITY_MASK_ATTRIBUTE)};
    var VALUE=${JSON.stringify(CLARITY_MASK_VALUE)};
    var SELECTOR=${JSON.stringify(CLARITY_FIELD_SELECTOR)};
    function mask(root){
      if(!root) return;
      if(root.nodeType===1 && root.matches && root.matches(SELECTOR)) root.setAttribute(ATTR, VALUE);
      if(!root.querySelectorAll) return;
      var nodes=root.querySelectorAll(SELECTOR);
      for(var i=0;i<nodes.length;i++) nodes[i].setAttribute(ATTR, VALUE);
    }
    function start(){
      mask(document);
      if(typeof MutationObserver!=="function" || !document.documentElement) return;
      new MutationObserver(function(records){
        for(var i=0;i<records.length;i++){
          var added=records[i].addedNodes;
          for(var j=0;j<added.length;j++){
            if(added[j] && added[j].nodeType===1) mask(added[j]);
          }
        }
      }).observe(document.documentElement,{childList:true,subtree:true});
    }
    if(document.documentElement) start();
    else document.addEventListener("DOMContentLoaded", start);
  })();`;
}
