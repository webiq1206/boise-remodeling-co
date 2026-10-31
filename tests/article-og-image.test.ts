import assert from 'node:assert/strict';
import test from 'node:test';
import { BRAND_PAGE_IMAGE, withBrandPageMetadata } from '../lib/brand-page-metadata.ts';
import { generateMetadata as blogMetadata } from '../app/blog/[slug]/page.tsx';
import { generateMetadata as guideMetadata } from '../app/guides/[slug]/page.tsx';
import { BLOG_POSTS } from '../shared/blogContent.ts';
import { GUIDE_PAGES } from '../shared/guideContent.ts';

const ogUrl = (meta: any) => String(meta.openGraph.images[0].url ?? meta.openGraph.images[0]);

test('blog posts and guides share their own image, not the brand card', async () => {
  for (const post of BLOG_POSTS) {
    const meta = await blogMetadata({ params: Promise.resolve({ slug: post.slug }) });
    assert.notEqual(ogUrl(meta), BRAND_PAGE_IMAGE, post.slug);
    assert.notEqual(String((meta.twitter as any).images[0]), BRAND_PAGE_IMAGE, post.slug);
  }
  for (const guide of GUIDE_PAGES) {
    const meta = await guideMetadata({ params: Promise.resolve({ slug: guide.slug }) });
    assert.notEqual(ogUrl(meta), BRAND_PAGE_IMAGE, guide.slug);
  }
});

test('an article without its own image, and every other page, keep the brand card', () => {
  const article = withBrandPageMetadata({ title: 'A post', alternates: { canonical: '/blog/a-post' }, openGraph: { type: 'article' } }, '/blog/[slug]');
  assert.equal(ogUrl(article), BRAND_PAGE_IMAGE);
  const hub = withBrandPageMetadata({ title: 'Hub', alternates: { canonical: '/blog/category/kitchen-remodeling' }, openGraph: { images: ['https://boiseremodeling.co/x.webp'] } }, '/blog/category/[hubSlug]');
  assert.equal(ogUrl(hub), BRAND_PAGE_IMAGE);
  const service = withBrandPageMetadata({ title: 'Kitchen', alternates: { canonical: '/services/kitchen-remodel' }, openGraph: { images: ['https://boiseremodeling.co/k.webp'] } }, '/services/[slug]');
  assert.equal(ogUrl(service), BRAND_PAGE_IMAGE);
});
