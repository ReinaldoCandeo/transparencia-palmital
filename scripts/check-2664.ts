import * as dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
import { obterHashPorNumeroInterno, obterDetalheInterno } from '../src/lib/onedoc';

async function run() {
  const hash = await obterHashPorNumeroInterno('2664', '2026');
  console.log('Hash:', hash);
  if (hash) {
    const detalhe = await obterDetalheInterno(hash);
    console.log('Detalhe:', detalhe);
  }
}

run();
