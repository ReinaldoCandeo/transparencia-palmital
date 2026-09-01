import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db-client';
import { supabaseAdmin } from '@/lib/db-admin';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uptime = process.uptime();
  const startTime = Date.now();

  try {
    // Verifica a data da última sincronização para garantir que o Cron está rodando
    const { data: latestSyncData, error: clientError } = await supabase
      .from('processos_emendas')
      .select('ultima_sincronizacao')
      .order('ultima_sincronizacao', { ascending: false })
      .limit(1)
      .single();

    if (clientError) throw new Error(`Supabase Client Error: ${clientError.message}`);

    const lastSyncDate = latestSyncData?.ultima_sincronizacao ? new Date(latestSyncData.ultima_sincronizacao) : new Date(0);
    const hoursSinceLastSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);

    // Se passou mais de 24 horas sem sync, a aplicação (cron) não está saudável
    if (hoursSinceLastSync > 24) {
      throw new Error(`Stale Data: Última sincronização ocorreu há ${hoursSinceLastSync.toFixed(1)} horas.`);
    }

    // Verifica conexão Supabase Admin (opcional, só para ter certeza que as vars estão configuradas)
    const { error: adminError } = await supabaseAdmin.from('processos_emendas').select('id').limit(1);
    if (adminError) throw new Error(`Supabase Admin Error: ${adminError.message}`);

    const latency = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: uptime,
        latencyMs: latency,
        lastSync: lastSyncDate.toISOString(),
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
