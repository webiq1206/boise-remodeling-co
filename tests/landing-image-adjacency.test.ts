import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { CITIES, SERVICES } from '../shared/contentData.ts';
import { getAreaImageSet, getCityServiceImageSet } from '../shared/cityServiceImages.ts';
import { getFeaturedProjectForService } from '../shared/featuredProjects.ts';
import { getFeaturedGalleryProject, getGalleryProjectsFor, getGalleryProjectsForCity } from '../shared/galleryData.ts';
import { imageIdentity, VISUAL_DUPLICATE_GROUPS } from '../shared/imageIdentity.ts';
import { gallerySubject, resolveLandingImages, SUBJECT_ALTERNATES, type LandingImageInput } from '../shared/landingImages.ts';
import { getServiceImageSet } from '../shared/serviceBackgrounds.ts';
import { SERVICE_SCENES } from '../shared/serviceSceneImages.ts';

const PUBLIC = path.join(import.meta.dirname, '..', 'public');

function listImages(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listImages(full));
    else if (/\.(webp|jpe?g)$/i.test(name) && !/-og\.jpe?g$/i.test(name)) out.push(full);
  }
  return out;
}

async function dHash(file: string): Promise<string> {
  const { data } = await sharp(file).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let bits = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] < data[y * 9 + x + 1] ? '1' : '0';
  return bits;
}

const distance = (a: string, b: string) => [...a].reduce((n, bit, i) => n + (bit === b[i] ? 0 : 1), 0);

test('every visual copy of one picture is listed in one identity group', async () => {
  const files = listImages(path.join(PUBLIC, 'images'));
  const hashes = new Map<string, string>();
  for (const file of files) hashes.set('/' + path.relative(PUBLIC, file).split(path.sep).join('/'), await dHash(file));
  const keys = [...hashes.keys()];
  const missing: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      if (distance(hashes.get(keys[i])!, hashes.get(keys[j])!) <= 6 && imageIdentity(keys[i]) !== imageIdentity(keys[j])) {
        missing.push(`${keys[i]} = ${keys[j]}`);
      }
    }
  }
  assert.deepEqual(missing, [], 'add these copies to VISUAL_DUPLICATE_GROUPS');
  for (const group of VISUAL_DUPLICATE_GROUPS) for (const src of group) assert.ok(hashes.has(src), `${src} is listed but missing`);
});

test('subject alternates exist and are not copies of a service render', async () => {
  for (const [subject, list] of Object.entries(SUBJECT_ALTERNATES)) {
    const identities = new Set<string>();
    for (const src of list) {
      assert.ok(statSync(path.join(PUBLIC, src)).isFile(), `${subject}: ${src}`);
      identities.add(imageIdentity(src));
    }
    assert.equal(identities.size, list.length, `${subject} lists one picture twice`);
  }
});

/** The image sequence a landing page renders, top to bottom, as the template builds it. */
function sequence(input: LandingImageInput): { order: string[]; decorative: string[]; proof: string[] } {
  const slots = resolveLandingImages(input);
  const decorative = [slots.breather, slots.process, ...slots.sectionBreathers].filter((s): s is string => Boolean(s));
  const order = [
    input.hero,
    slots.breather,
    ...(input.showcase ?? []),
    slots.process,
    ...slots.sectionBreathers,
    ...slots.proof,
  ].filter((s): s is string => Boolean(s));
  return { order, decorative, proof: slots.proof };
}

function assertNoRepeats(label: string, input: LandingImageInput) {
  const { order, decorative, proof } = sequence(input);
  for (let i = 1; i < order.length; i++) {
    assert.notEqual(imageIdentity(order[i]), imageIdentity(order[i - 1]), `${label}: ${order[i]} sits next to a copy of itself`);
  }
  const fixed = [input.hero, ...(input.showcase ?? [])].filter(Boolean).map((s) => imageIdentity(s!));
  const seen = new Set(fixed);
  for (const src of proof) {
    assert.ok(!seen.has(imageIdentity(src)), `${label}: proof card ${src} repeats a picture already on the page`);
    seen.add(imageIdentity(src));
  }
  for (const src of decorative) {
    assert.ok(!seen.has(imageIdentity(src)), `${label}: decorative ${src} repeats a picture already on the page`);
    seen.add(imageIdentity(src));
  }
  assert.ok(decorative.length >= 2, `${label}: breather and process should both find an image`);
}

test('service pages never show one picture twice', () => {
  for (const service of SERVICES) {
    const images = getServiceImageSet(service.slug);
    const featured = getFeaturedGalleryProject(service.slug);
    const rooms = getFeaturedProjectForService(service.slug);
    assertNoRepeats(`/services/${service.slug}`, {
      hero: SERVICE_SCENES[service.slug]?.src ?? images.hero,
      breather: images.breather,
      process: images.process,
      showcase: [featured?.beforeImageUrl, featured?.afterImageUrl, ...(rooms?.rooms.map((r) => r.src) ?? [])].filter(Boolean) as string[],
      sectionSlots: 3,
      subject: service.slug,
    });
  }
});

test('city-service pages never show one picture twice (the Nampa kitchen band and process photo)', () => {
  for (const service of SERVICES) {
    for (const city of CITIES) {
      const images = getCityServiceImageSet(service.slug, city.slug);
      assertNoRepeats(`/services/${service.slug}/${city.slug}`, {
        hero: images.hero,
        breather: images.breather,
        process: images.process,
        proof: getGalleryProjectsFor(service.slug, city.slug).map((p) => ({ src: p.afterImageUrl, subject: gallerySubject(p.serviceType) })),
        sectionSlots: 3,
        subject: service.slug,
      });
    }
  }
  // The reported defect: before this change both slots resolved to one render.
  const nampa = resolveLandingImages({ ...getCityServiceImageSet('kitchen-remodel', 'nampa'), sectionSlots: 0, subject: 'kitchen-remodel' });
  assert.notEqual(imageIdentity(nampa.breather!), imageIdentity(nampa.process!));
});

test('area pages never show one picture twice', () => {
  for (const city of CITIES) {
    const images = getAreaImageSet(city.slug);
    assertNoRepeats(`/areas/${city.slug}`, {
      hero: images.hero,
      breather: images.breather,
      process: images.process,
      proof: getGalleryProjectsForCity(city.slug).map((p) => ({ src: p.afterImageUrl, subject: gallerySubject(p.serviceType) })),
      sectionSlots: 3,
      subject: 'general',
    });
  }
});
