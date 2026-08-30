import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'node-html-parser';
import { urlFor, hreflangBlock, applyHead } from '../build/head.js';

test('urlFor maps pages to language URLs', () => {
  assert.equal(urlFor('index.html', 'fi'), 'https://siilisaari.fi/');
  assert.equal(urlFor('index.html', 'sv'), 'https://siilisaari.fi/sv/');
  assert.equal(urlFor('siilinhoito.html', 'fi'), 'https://siilisaari.fi/siilinhoito.html');
  assert.equal(urlFor('siilinhoito.html', 'en'), 'https://siilisaari.fi/en/siilinhoito.html');
});

test('hreflangBlock is reciprocal and has x-default on Finnish', () => {
  const block = hreflangBlock('siilin-pesa.html');
  assert.match(block, /hreflang="fi" href="https:\/\/siilisaari\.fi\/siilin-pesa\.html"/);
  assert.match(block, /hreflang="sv" href="https:\/\/siilisaari\.fi\/sv\/siilin-pesa\.html"/);
  assert.match(block, /hreflang="en" href="https:\/\/siilisaari\.fi\/en\/siilin-pesa\.html"/);
  assert.match(block, /hreflang="x-default" href="https:\/\/siilisaari\.fi\/siilin-pesa\.html"/);
});

test('applyHead sets lang, title, description, canonical and hreflang', () => {
  const root = parse(`<html lang="fi"><head>
    <title>Vanha</title>
    <meta name="description" content="vanha">
    <link rel="canonical" href="https://siilisaari.fi/siilinhoito.html">
  </head><body></body></html>`);
  applyHead(root, {
    lang: 'sv', page: 'siilinhoito.html',
    title: 'Skötselguide', description: 'Guide på svenska'
  });
  assert.equal(root.querySelector('html').getAttribute('lang'), 'sv');
  assert.equal(root.querySelector('title').text, 'Skötselguide');
  assert.equal(root.querySelector('meta[name="description"]').getAttribute('content'), 'Guide på svenska');
  assert.equal(
    root.querySelector('link[rel="canonical"]').getAttribute('href'),
    'https://siilisaari.fi/sv/siilinhoito.html'
  );
  assert.equal(root.querySelectorAll('link[rel="alternate"]').length, 4);
});

test('applyHead translates og tags when given them', () => {
  const root = parse(`<html lang="fi"><head>
    <title>t</title><meta name="description" content="d">
    <link rel="canonical" href="x">
    <meta property="og:title" content="vanha">
    <meta property="og:locale" content="fi_FI">
  </head><body></body></html>`);
  applyHead(root, {
    lang: 'en', page: 'siilinhoito.html', title: 't2', description: 'd2',
    og: { 'og:title': 'Hoglet care guide' }
  });
  assert.equal(root.querySelector('meta[property="og:title"]').getAttribute('content'), 'Hoglet care guide');
  assert.equal(root.querySelector('meta[property="og:locale"]').getAttribute('content'), 'en_GB');
});
