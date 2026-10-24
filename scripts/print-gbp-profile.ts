#!/usr/bin/env npx tsx
/**
 * Print GBP copy-paste blocks for the operator dashboard at business.google.com.
 * Usage: npx tsx scripts/print-gbp-profile.ts [section]
 * Sections: nap | services | products | qa | posts | all (default)
 */

import {
  GBP_ATTRIBUTES,
  GBP_CATEGORIES,
  GBP_DESCRIPTION,
  GBP_LINKS,
  GBP_MESSAGING,
  publicGbpNap,
  GBP_PHOTO_CHECKLIST,
  GBP_POSTS_STARTER,
  GBP_PRODUCTS,
  GBP_QA_SEED,
  GBP_SERVICE_AREAS,
  GBP_SERVICES,
} from '../shared/gbpProfile';

const section = process.argv[2] ?? 'all';

function printNap() {
  console.log('\n=== NAP ===');
  console.log(JSON.stringify(publicGbpNap(), null, 2));
  console.log('\nService areas:');
  GBP_SERVICE_AREAS.forEach((a) => console.log(`  - ${a}`));
  console.log('\nCategories:');
  console.log(`  Primary: ${GBP_CATEGORIES.primary}`);
  GBP_CATEGORIES.secondary.forEach((c, i) => console.log(`  Secondary ${i + 1}: ${c}`));
  console.log('\nDescription:\n');
  console.log(GBP_DESCRIPTION);
  console.log('\nLinks:', GBP_LINKS);
  console.log('\nAttributes:', GBP_ATTRIBUTES);
  console.log('\nMessaging welcome:', GBP_MESSAGING.welcomeMessage);
}

function printServices() {
  console.log('\n=== SERVICES (add in GBP → Edit profile → Services) ===');
  for (const s of GBP_SERVICES) {
    console.log(`\n• ${s.name}`);
    console.log(`  ${s.description}`);
    if (s.startingPrice) console.log(`  Starting price: ${s.startingPrice}`);
  }
}

function printProducts() {
  console.log('\n=== PRODUCTS (GBP → Products) ===');
  let current = '';
  for (const p of GBP_PRODUCTS) {
    if (p.category !== current) {
      current = p.category;
      console.log(`\n--- Category: ${current} ---`);
    }
    console.log(`\n• ${p.name} (${p.price})`);
    console.log(`  URL: ${p.url}`);
    console.log(`  ${p.description}`);
  }
}

function printQa() {
  console.log('\n=== Q&A SEED (post each question, answer as owner) ===');
  GBP_QA_SEED.forEach((entry, i) => {
    console.log(`\nQ${i + 1}: ${entry.question}`);
    console.log(`A: ${entry.answer}`);
  });
}

function printPosts() {
  console.log('\n=== GOOGLE POSTS (weekly) ===');
  for (const post of GBP_POSTS_STARTER) {
    console.log(`\nWeek ${post.week}: ${post.headline}`);
    console.log(`Body: ${post.body}`);
    console.log(`Button: ${post.buttonLabel} → ${post.buttonUrl}`);
    console.log(`Photo: ${post.photoHint}`);
  }
}

function printPhotos() {
  console.log('\n=== PHOTO CHECKLIST ===');
  GBP_PHOTO_CHECKLIST.forEach((p, i) => {
    console.log(`${i + 1}. ${p.type} - ${p.spec} (${p.filename})`);
  });
}

switch (section) {
  case 'nap':
    printNap();
    break;
  case 'services':
    printServices();
    break;
  case 'products':
    printProducts();
    break;
  case 'qa':
    printQa();
    break;
  case 'posts':
    printPosts();
    break;
  case 'photos':
    printPhotos();
    break;
  case 'all':
  default:
    printNap();
    printServices();
    printProducts();
    printQa();
    printPosts();
    printPhotos();
}
