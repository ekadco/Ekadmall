import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = 'offline/data';
const collections = ['products', 'calendars', 'posts', 'pages'];
const taxonomies = ['brands', 'categories', 'tags', 'calendar_categories', 'post_categories', 'post_tags', 'media'];
const writeJson = async (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8');

export async function splitSnapshot(snapshot) {
  if (!snapshot.captured_at) throw new Error('Snapshot has no captured_at');
  await mkdir(out, { recursive: true });
  const manifest = { captured_at: snapshot.captured_at, source: snapshot.source, counts: snapshot.counts, missing_media_ids: snapshot.missing_media_ids, collections: {}, taxonomies: {} };
  for (const type of collections) {
    const items = snapshot[type];
    if (!Array.isArray(items)) throw new Error(`Missing collection: ${type}`);
    await mkdir(join(out, type), { recursive: true });
    const entries = [];
    const ids = new Set();
    for (const item of items) {
      if (!Number.isSafeInteger(item.id) || ids.has(item.id)) throw new Error(`Invalid or duplicate ${type} ID: ${item.id}`);
      ids.add(item.id);
      const file = `${type}/${item.id}.json`;
      await writeJson(join(out, file), { captured_at: snapshot.captured_at, source: snapshot.source, item });
      entries.push({ id: item.id, title: item.title?.rendered ?? '', link: item.link, modified: item.modified, file, product_brand: item.product_brand, product_cat: item.product_cat, product_tag: item.product_tag, 'calendar-category': item['calendar-category'], categories: item.categories, tags: item.tags });
    }
    const index = `${type}-index.json`;
    await writeJson(join(out, index), { captured_at: snapshot.captured_at, count: entries.length, items: entries });
    manifest.collections[type] = { count: entries.length, index };
  }
  for (const type of taxonomies) {
    if (!Array.isArray(snapshot[type])) throw new Error(`Missing taxonomy: ${type}`);
    const file = `${type}.json`;
    await writeJson(join(out, file), { captured_at: snapshot.captured_at, count: snapshot[type].length, items: snapshot[type] });
    manifest.taxonomies[type] = { count: snapshot[type].length, file };
  }
  await writeJson(join(out, 'manifest.json'), manifest);
  return manifest;
}

if (process.argv?.[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const snapshot = JSON.parse(await readFile('offline/snapshot.json', 'utf8'));
  const result = await splitSnapshot(snapshot);
  console.log(JSON.stringify({ captured_at: result.captured_at, counts: result.counts }));
}
