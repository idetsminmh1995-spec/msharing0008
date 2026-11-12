#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const reportSource = await readFile(new URL('../website/assets/render-report.js', import.meta.url), 'utf8');
const gateSource = await readFile(new URL('../website/assets/video-asset-gate.js', import.meta.url), 'utf8');
const context = { window: {}, location: { href: 'https://example.test/video' }, performance, console };
vm.runInNewContext(reportSource, context, { filename: 'render-report.js' });
vm.runInNewContext(gateSource, context, { filename: 'video-asset-gate.js' });
const api = context.window.VideoAssetGate;
const result = { source: 'builtin', key: null, bytes: 0, ms: 24, attempts: 2, reason: 'not-found', seconds: 3, state: 'builtin-ready', fallback: true };
const details = api.outroDetails(result);
assert.deepEqual(JSON.parse(JSON.stringify(details)), { source: 'builtin', key: null, bytes: 0, ms: 24, attempts: 2, reason: 'not-found', duration: 3, state: 'builtin-ready', fallback: true });
const report = context.window.RenderReport.create({ page: 'piano', aspect: '16x9' });
assert.equal(report.outro.state, 'pending');
context.window.RenderReport.setOutro(report, details);
context.window.RenderReport.finish(report, { status: 'ok' });
const roundTrip = JSON.parse(context.window.RenderReport.stringify(report));
assert.deepEqual(roundTrip.outro, JSON.parse(JSON.stringify(details)));
assert.equal(roundTrip.result.status, 'ok');
console.log('outro report tests passed');
