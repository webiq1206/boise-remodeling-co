"use client";
import {P5Estimator} from './P5Estimator';
export interface EstimateCalculatorProps {sectionId?:string|null;inModal?:boolean;fitViewport?:boolean;viewportFit?:boolean;onBookVisit?:()=>void;onExit?:()=>void;startStep?:'project'|'size'|'layout'|'style'|'result'|'contact';headingAs?:'h1'|'h2';featured?:boolean}
/**
 * The project estimator on a page. A standalone page (/estimate) mounts the
 * conversational app frame beneath the site header; an embedded section
 * (homepage) shows the estimator card, which expands to the same frame once
 * the visitor starts.
 */
export function EstimateCalculator({sectionId="calculator",inModal=false,fitViewport=false,viewportFit=false,headingAs,onExit}:EstimateCalculatorProps={}){
  const standalone=fitViewport||viewportFit||inModal;
  if(standalone)return <section id={sectionId||undefined} style={{minWidth:0}}><P5Estimator layout="page" headingAs={headingAs||'h1'} onExit={onExit}/></section>;
  return <section id={sectionId||undefined} style={{padding:'36px 0',minWidth:0}}><div style={{padding:'0 16px'}}><P5Estimator layout="embedded" headingAs={headingAs||'h2'}/></div></section>;
}
