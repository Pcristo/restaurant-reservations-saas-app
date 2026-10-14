import { describe, it, expect } from 'bun:test';
import fs from 'fs';
import path from 'path';
import ZarcoFooterExtra, { ZarcoFooterTemplate as ZarcoTemplateExtra } from '../../src/components/extra/ZarcoFooterTemplate';
import ZarcoFooterExtras, { ZarcoFooterTemplate as ZarcoTemplateExtras } from '../../src/components/extras/ZarcoFooterTemplate';

describe('ZarcoFooterTemplate & bun.lock validation', () => {
  it('exports ZarcoFooter from both components/extra and components/extras', () => {
    expect(ZarcoFooterExtra).toBeDefined();
    expect(typeof ZarcoFooterExtra).toBe('function');
    expect(ZarcoTemplateExtra).toBeDefined();
    expect(ZarcoFooterExtras).toBeDefined();
    expect(typeof ZarcoFooterExtras).toBe('function');
    expect(ZarcoTemplateExtras).toBeDefined();
  });

  it('validates that bun.lock is valid, parseable JSON without trailing comma errors', () => {
    const lockfilePath = path.resolve(process.cwd(), 'bun.lock');
    expect(fs.existsSync(lockfilePath)).toBe(true);

    const lockfileContent = fs.readFileSync(lockfilePath, 'utf8');
    let parsed: any;
    expect(() => {
      parsed = JSON.parse(lockfileContent);
    }).not.toThrow();

    expect(parsed).toBeDefined();
    expect(parsed.lockfileVersion).toBeDefined();
    expect(parsed.packages).toBeDefined();
    expect(Object.keys(parsed.packages).length).toBeGreaterThan(100);
  });

  it('verifies ZarcoFooter template integration in MarketingLandingPage and Footer', () => {
    const marketingPageContent = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/MarketingLandingPage.tsx'), 'utf8');
    const restaurantFooterContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Footer.tsx'), 'utf8');

    expect(marketingPageContent).toContain('ZarcoFooter');
    expect(marketingPageContent).toContain('<ZarcoFooter');

    expect(restaurantFooterContent).toContain('ZarcoFooter');
    expect(restaurantFooterContent).toContain('<ZarcoFooter');
  });

  it('uses zarco_logo_1_no_bg.png in ZarcoFooterTemplate, Preloader, and DevelopingApp', () => {
    const extraFooterCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/extra/ZarcoFooterTemplate/zarcoFooter.tsx'), 'utf8');
    const extrasFooterCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/extras/ZarcoFooterTemplate/zarcoFooter.tsx'), 'utf8');
    const preloaderCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Preloader.tsx'), 'utf8');
    const developingAppCode = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/DevelopingApp.tsx'), 'utf8');

    expect(extraFooterCode).toContain('zarco_logo_1_no_bg.png');
    expect(extrasFooterCode).toContain('zarco_logo_1_no_bg.png');
    expect(preloaderCode).toContain('zarco_logo_1_no_bg.png');
    expect(developingAppCode).toContain('zarco_logo_1_no_bg.png');

    expect(fs.existsSync(path.resolve(process.cwd(), 'src/components/extra/ZarcoFooterTemplate/assets/zarco_logo_1_no_bg.png'))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), 'src/components/extras/ZarcoFooterTemplate/assets/zarco_logo_1_no_bg.png'))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), 'src/assets/developer/zarco_logo_1_no_bg.png'))).toBe(true);
  });
});
