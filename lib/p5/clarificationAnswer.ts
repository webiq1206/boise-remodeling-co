import {analyzeBatch} from './extraction';
import {clarificationContext,exactResponsibilityChoice,instructionPrompts,isResponsibilityPrompt,questionKey,removeInstructionPrompt,type InstructionAnswer} from './clarifications';
import {DraftError} from './store';
import {SCOPE_TEXT_LIMIT,type ScopeAnswers,type ScopeExtraction} from './scope';

export async function resolveInstructionAnswer(extraction:ScopeExtraction|null,answers:ScopeAnswers,raw:unknown,prior:InstructionAnswer[]=[],request=fetch){
  const value=raw as {id?:unknown;answer?:unknown};
  if(typeof value?.id!=='string'||typeof value.answer!=='string'||!value.answer.trim()||value.answer.length>SCOPE_TEXT_LIMIT)throw new DraftError('Enter an answer to continue.');
  const prompt=instructionPrompts(extraction,answers).find(q=>q.id===value.id);
  const answer=value.answer.trim();
  // Retries can arrive with either the already-updated extraction or a stale
  // copy that still contains the answered prompt. Return the prior result
  // without invoking a provider or appending a duplicate history record.
  if(prior.some(p=>p.id===value.id&&p.answer===answer))return {extraction,answers,history:prior};
  if(!prompt||!extraction){
    throw new DraftError('This question has changed. Refresh your saved project to continue.',409);
  }
  const question=prompt.detail||prompt.question;
  const responsibility=exactResponsibilityChoice(answer);
  if(responsibility&&isResponsibilityPrompt(prompt)&&extraction.instructions){
    const instructions=removeInstructionPrompt({...extraction.instructions},prompt.id);
    instructions.laborOnly=responsibility.laborOnly;
    instructions.materialsOnly=responsibility.materialsOnly;
    const combined=[answers.estimatingInstructions,`Question: ${question}\nAnswer: ${answer}`].filter(Boolean).join('\n\n');
    if(combined.length>SCOPE_TEXT_LIMIT)throw new DraftError('Upload the additional scope notes as a document to preserve them in full.');
    const record={id:prompt.id,question,answer};
    return {
      extraction:{...extraction,instructions},
      answers:{...answers,estimatingInstructions:combined},
      history:[...prior,record],
    };
  }
  const result=await analyzeBatch(clarificationContext(extraction,question,answer),[],answers,request,60000);
  if(!result.extraction.instructions)throw new DraftError('Your answer is still here. We could not save its scope update. Please retry.',503);
  const instructions=result.extraction.instructions;
  const repeated=instructions.questions.find(q=>questionKey(q)===prompt.id);
  if(repeated)throw new DraftError('Please make the scope decision explicit, such as what to include or exclude. Your answer is saved in this tab.');
  // Preserve other unanswered questions even if a provider omitted them.
  instructions.questions=[...new Set([...instructionPrompts(extraction,answers).filter(q=>q.id!==prompt.id).map(q=>q.detail||q.question),...instructions.questions])];
  const record={id:prompt.id,question,answer};
  const combined=[answers.estimatingInstructions,`Question: ${question}\nAnswer: ${answer}`].filter(Boolean).join('\n\n');
  if(combined.length>SCOPE_TEXT_LIMIT)throw new DraftError('Upload the additional scope notes as a document to preserve them in full.');
  return {extraction:{...extraction,instructions},answers:{...answers,estimatingInstructions:combined},history:[...prior,record]};
}
