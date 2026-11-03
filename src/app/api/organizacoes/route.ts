import { mutation } from '../../../lib/auth/runtime.server';
export async function POST(request:Request){return mutation('organization',request);}
