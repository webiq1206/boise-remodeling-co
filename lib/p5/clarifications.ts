import type {ScopeAnswers,ScopeExtraction} from './scope.ts';
import type {ScopeInstructions} from './instructions.ts';

export interface InstructionAnswer {id:string;question:string;answer:string}
export interface InstructionPrompt {id:string;question:string;detail?:string;values?:string[]}
export const questionKey=(text:string)=>text.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const serviceQuestion=(text:string)=>/which .*services|what .*remodel.*service|company.s scope|typical .*services|offered.*services|services.*offered|residential remodel|boise .*estimate|requested subset/i.test(text);
const RESPONSIBILITY_CHOICES=['Labor only','Materials only','Labor and materials'] as const;

const questionParts=(raw:string)=>raw.match(/[^?]+\??/g)||[];
const normalizeQuestionPart=(part:string)=>part.replace(/\s+/g,' ').trim();

/** One question per card, including older extractions that stored paragraphs. */
export function instructionPrompts(extraction:ScopeExtraction|null,answers:ScopeAnswers):InstructionPrompt[]{
  const result:InstructionPrompt[]=[];
  for(const raw of extraction?.instructions?.questions||[]){
    for(const part of questionParts(raw)){
      const full=normalizeQuestionPart(part);if(!full)continue;
      // Filter each question separately so a legacy paragraph cannot lose a real scope decision.
      if(serviceQuestion(full))continue;
      const id=questionKey(full);
      if(result.some(q=>q.id===id))continue;
      const question=full.length<=240?full:'What should we include for this part of your project?';
      const values=/labor.only/i.test(full)&&/materials.only/i.test(full)?['Labor only','Materials only','Labor and materials']:
        /include or exclude|include.*or.*exclude/i.test(full)?['Include it','Exclude it']:undefined;
      result.push({id,question,...(question!==full?{detail:full}:{}),values});
    }
  }
  return result;
}

/** Only the three exact responsibility choices have a deterministic meaning. */
export function exactResponsibilityChoice(value:string):{laborOnly:boolean;materialsOnly:boolean}|null{
  if(value==='Labor only')return {laborOnly:true,materialsOnly:false};
  if(value==='Materials only')return {laborOnly:false,materialsOnly:true};
  if(value==='Labor and materials')return {laborOnly:false,materialsOnly:false};
  return null;
}

const SCOPED_RESPONSIBILITY_MARKER=/\b(?:kitchen|bath(?:room)?|cabinet(?:ry|s)?|trim|floor(?:ing)?|first|second|third|fourth|upper|lower|main|garage|building|wing|unit|room|bedroom|addition|adu|new construction|scope item|trade|component|section|phase|area|part|fixture|vanity|countertop|tile|plumbing|electrical|mechanical|structural|roof|door|window)\b/i;
const PROJECT_WIDE_RESPONSIBILITY_MARKER=/\b(?:project[- ]wide|whole project|entire project|overall project|for (?:the )?project|project responsibility|scope as a whole|overall scope)\b/i;

/** Local flags apply only to an unscoped canonical question or an explicit
 * project-wide question. A question that names a trade, building, floor or
 * component still needs provider interpretation before any global flag moves. */
export function isResponsibilityPrompt(prompt:InstructionPrompt){
  if(!(prompt.values?.length===RESPONSIBILITY_CHOICES.length
    && RESPONSIBILITY_CHOICES.every((choice,index)=>prompt.values?.[index]===choice)))return false;
  const text=(prompt.detail||prompt.question).replace(/\s+/g,' ').trim();
  const canonical=text.replace(/[?.!]+$/,'').toLowerCase();
  const exactCanonical=canonical==='labor only or materials only'
    ||canonical==='labor only, materials only, or labor and materials';
  if(SCOPED_RESPONSIBILITY_MARKER.test(text))return false;
  return exactCanonical||PROJECT_WIDE_RESPONSIBILITY_MARKER.test(text);
}

/** Remove one answered question while retaining unrelated clauses in a legacy
 * paragraph. Duplicate copies are removed together so retries cannot revive it. */
export function removeInstructionPrompt(instructions:ScopeInstructions,id:string):ScopeInstructions{
  const questions:string[]=[];
  for(const raw of instructions.questions){
    const remaining=questionParts(raw)
      .filter(part=>questionKey(normalizeQuestionPart(part))!==id)
      .map(normalizeQuestionPart)
      .filter(Boolean);
    if(remaining.length)questions.push(remaining.join(' '));
  }
  return {...instructions,questions:[...new Set(questions)]};
}

/** Answers remain scope data for the pricing audit, with original pages intact. */
export function clarificationContext(extraction:ScopeExtraction,question:string,answer:string){
  return JSON.stringify({
    task:'Resolve only this answered scope question using the answer below. Return the complete updated instructions, preserving every unrelated inclusion, exclusion, responsibility, building and floor. Remove this question when answered. Never ask it again because a page was not reuploaded. This is a clarification of a document review already completed. Do not produce page records, takeoffs, or unreadable-file notes. If the answer is insufficient, return one short, specific follow-up explaining the missing decision.',
    previousInstructions:extraction.instructions,question,answer,
  });
}
