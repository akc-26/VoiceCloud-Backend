import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('White-label presentation foundation', () => {
  it('provides one shared branding configuration and required replaceable assets', () => {
    const source = read('shared/branding/index.ts');
    expect(source).toContain("const BRAND_NAME = 'VoiceCloud';");
    expect(source).toContain('products:');
    expect(source).toContain('colors:');
    expect(source).toContain('assets:');

    for (const asset of [
      'logo-mark.svg',
      'logo-horizontal.svg',
      'favicon.svg',
      'app-icon.svg',
    ]) {
      expect(
        fs.existsSync(path.join(root, 'shared/branding/public/brand', asset)),
      ).toBe(true);
    }
  });

  it('makes every web build consume the same shared brand asset directory', () => {
    for (const app of ['admin', 'creator', 'website']) {
      const vite = read(`${app}/vite.config.ts`);
      expect(vite).toContain(
        "publicDir: path.resolve(__dirname, '../shared/branding/public')",
      );
      expect(vite).toContain("'@shared/branding'");
    }
  });

  it('keeps customer-facing web source free of roadmap/development labels', () => {
    const discardedDevelopmentToolLabel = new RegExp(
      ['AI', 'Studio'].join('\\s+'),
      'i',
    );
    const forbidden = [
      /VC-PH/i,
      /WP08/i,
      /Phase\s+\d+/i,
      /Authentication Entry/i,
      /Foundation Ready/i,
      discardedDevelopmentToolLabel,
    ];

    for (const app of ['admin/src', 'creator/src', 'website/src']) {
      const walk = (directory: string) => {
        for (const entry of fs.readdirSync(directory, {
          withFileTypes: true,
        })) {
          const absolute = path.join(directory, entry.name);
          if (entry.isDirectory()) {
            walk(absolute);
            continue;
          }
          if (!/\.(ts|tsx|css)$/.test(entry.name)) continue;
          const text = fs.readFileSync(absolute, 'utf8');
          for (const pattern of forbidden) {
            expect(text).not.toMatch(pattern);
          }
        }
      };
      walk(path.join(root, app));
    }
  });
});
