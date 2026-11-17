import StyleDictionary from 'style-dictionary';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const dictionary = new StyleDictionary({ usesDtcg: true, source: ['tokens/inspector.json'], platforms: { css: { transformGroup: 'css', prefix: 'om', files: [{ destination: 'inspector-tokens.css', format: 'css/variables', options: { showFileHeader: false, selector: '.panel' } }] } } });
const [{ output }] = await dictionary.formatPlatform('css');
const path = 'src/generated/inspector-tokens.css';
if (process.argv.includes('--check')) {
  if (await readFile(path, 'utf8') !== output) throw new Error('Run npm run tokens');
} else {
  await mkdir('src/generated', { recursive: true });
  await writeFile(path, output);
}
