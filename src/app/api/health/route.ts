import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db-client';
import { supabaseAdmin } from '@/lib/db-admin';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uptime = process.uptime();
  const startTime = Date.now();

  try {
    // Verifica conexão básica do Supabase (Client)
    const { error: clientError } = await supabase.from('processos_emendas').select('id').limit(1);
    if (clientError) throw new Error(`Supabase Client Error: ${clientError.message}`);

    // Verifica conexão Supabase Admin (se tiver chaves)
    const { error: adminError } = await supabaseAdmin.from('processos_emendas').select('id').limit(1);
    if (adminError) throw new Error(`Supabase Admin Error: ${adminError.message}`);

    const latency = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: uptime,
        latencyMs: latency,
        system: {
          freemem: os.freemem(),
          totalmem: os.totalmem(),
          loadavg: os.loadavg(),
        },
        services: {
          database: 'up',
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message || 'Unknown error',
        services: {
          database: 'down',
        }
      },
      { status: 503 }
    );
  }
}
