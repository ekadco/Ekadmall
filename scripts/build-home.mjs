import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function buildHome(snapshot) {
  if (!/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(snapshot.captured_at || '')) throw new Error('Invalid snapshot capture date');
  const template = await readFile('scripts/home.template.html','utf8');
  await writeFile('index.html', template.replaceAll('__CAPTURED_AT__', snapshot.captured_at), 'utf8');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await buildHome(JSON.parse(await readFile('offline/snapshot.json','utf8')));
