import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('staff rendering (Phase 9)', () => {
  test('renderStaff draws exactly numLines <line> elements', () => {
    const g5 = NE.computeStaffGeometry(5);
    const svg5 = NE.renderStaff(g5, { x: 0, y: 10, width: 20, color: '#000000', lineThickness: 0.13 });
    assert.equal((svg5.match(/<line/g) || []).length, 5);

    const g1 = NE.computeStaffGeometry(1);
    const svg1 = NE.renderStaff(g1, { x: 0, y: 10, width: 20, color: '#000000', lineThickness: 0.13 });
    assert.equal((svg1.match(/<line/g) || []).length, 1);
  });

  test('renderStaff positions lines relative to the given bottom-line y', () => {
    const g = NE.computeStaffGeometry(5);
    const svg = NE.renderStaff(g, { x: 0, y: 20, width: 20, color: '#000000', lineThickness: 0.13 });
    // Bottom line should sit exactly at y=20 (the option's y, + geometry's 0 offset).
    assert.match(svg, /y1="20"/);
    // Top line should sit at y=20-4=16.
    assert.match(svg, /y1="16"/);
  });

  test('renderStaff uses the given color and thickness for every line', () => {
    const g = NE.computeStaffGeometry(3);
    const svg = NE.renderStaff(g, { x: 0, y: 0, width: 10, color: '#ff0000', lineThickness: 0.2 });
    const lineCount = (svg.match(/<line/g) || []).length;
    const coloredCount = (svg.match(/stroke="#ff0000"/g) || []).length;
    const thicknessCount = (svg.match(/stroke-width="0\.2"/g) || []).length;
    assert.equal(coloredCount, lineCount);
    assert.equal(thicknessCount, lineCount);
  });
});
