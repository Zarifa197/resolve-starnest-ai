import {env} from '@resolve/runtime';
import type {RetentionProfile} from './retention-core';
import {analyzeWithGemini} from './retention-gemini';
export async function analyzeRetention(profile:RetentionProfile){return (await analyzeWithGemini(profile,env.GEMINI_API_KEY||'')).diagnosis;}
