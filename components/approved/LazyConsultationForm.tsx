'use client';
import dynamic from 'next/dynamic';
import {Suspense,type ComponentProps} from 'react';
import type {ConsultationForm as Form} from '@/components/ConsultationForm';

const Lazy=dynamic(()=>import('@/components/ConsultationForm').then(m=>m.ConsultationForm));

/**
 * ConsultationForm, loaded after the page instead of with it. For the homepage's
 * closed "Prefer the longer form" disclosure: the form still renders on the
 * server and mounts on load, so its progress report and recovery prompt behave
 * as before, but it loads and hydrates after the rest of the page instead of
 * inside the page's first hydration task, and a prefetch of the homepage from
 * another page no longer evaluates it. Keep it to content that is not visible
 * on load: React streams a boundary like this one after the page shell.
 */
export function ConsultationForm(props:ComponentProps<typeof Form>){
 return <Suspense fallback={null}><Lazy {...props}/></Suspense>;
}
