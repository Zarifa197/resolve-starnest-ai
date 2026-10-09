import { env } from '@resolve/runtime';
export function database(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
export function safeMutation(request:Request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;}
export function storageError(error:unknown){console.error('Resolve storage error',error instanceof Error?error.message:'unknown');return Response.json({error:'Storage is temporarily unavailable. Try again shortly.'},{status:503});}
