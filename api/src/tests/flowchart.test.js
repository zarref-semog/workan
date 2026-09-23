import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFlowchart } from '../../../web/src/utils/flowchart.js';

const steps = [
  { _id: 'a', name: 'Entrada', order: 0, nextStepIds: ['b', 'c'] },
  { _id: 'b', name: 'Análise', order: 1, nextStepIds: ['a', 'c'] },
  { _id: 'c', name: 'Fim', order: 2, nextStepIds: [] },
];

test('reference topology keeps branches, lateral exchanges and merges independent of step order', () => {
  const links = { a: ['b'], b: ['c', 'd', 'e'], c: ['b', 'f', 'g'], d: ['e'], e: ['b', 'd', 'h'], f: ['i'], g: ['i'], h: ['i'], i: [] };
  const input = Object.entries(links).map(([id, nextStepIds], order) => ({ _id: id, order, nextStepIds }));
  const graph = buildFlowchart(input);
  const shuffled = buildFlowchart([...input].reverse().map((step, order) => ({ ...step, order, nextStepIds: [...step.nextStepIds].reverse() })));
  const positions = (flow) => Object.fromEntries([...flow.nodes].sort((a, b) => a.step._id.localeCompare(b.step._id)).map((node) => [node.step._id, [node.x, node.y]]));
  assert.deepEqual(positions(graph), positions(shuffled));
  const node = Object.fromEntries(graph.nodes.map((item) => [item.step._id, item]));
  assert.ok(node.a.y < node.b.y);
  assert.ok(node.b.y < node.c.y);
  assert.equal(node.c.y, node.d.y);
  assert.equal(node.d.y, node.e.y);
  assert.equal(node.f.y, node.g.y);
  assert.equal(node.g.y, node.h.y);
  assert.ok(node.i.y > node.h.y);
  for (const [from, side] of [['c', 'left'], ['e', 'right']]) {
    const edge = graph.edges.find((item) => item.source._id === from && item.target._id === 'b');
    assert.equal(edge.points[0].x, node[from].x + (side === 'right' ? node[from].width : 0));
  }
});

test('a convergence follows the longest branch even when reached first through a shortcut', () => {
  const links = { a: ['b', 'c'], b: ['f'], c: ['d'], d: ['e'], e: ['f'], f: [] };
  const graph = buildFlowchart(Object.entries(links).map(([id, nextStepIds], order) => ({ _id: id, order, nextStepIds })));
  const nodes = Object.fromEntries(graph.nodes.map((node) => [node.step._id, node]));
  assert.ok(nodes.f.y > nodes.e.y);
  assert.ok(nodes.e.y > nodes.d.y);
});

test('flowchart includes branches and returns without inventing sequential links', () => {
  const graph = buildFlowchart(steps);
  assert.deepEqual(graph.edges.map(({ source, target }) => `${source._id}-${target._id}`), ['a-b', 'a-c', 'b-a', 'b-c']);
  assert.equal(graph.nodes[2].nextIds.length, 0);
  assert.equal(new Set(graph.edges.map((edge) => edge.path)).size, 4);
  assert.equal(graph.hiddenConnections, 0);
});

test('filtering hides connections without marking their sources as terminal', () => {
  const graph = buildFlowchart(steps, [steps[0], steps[2]]);
  assert.deepEqual(graph.edges.map(({ source, target }) => `${source._id}-${target._id}`), ['a-c']);
  assert.equal(graph.hiddenConnections, 1);
  assert.deepEqual(graph.nodes[0].nextIds, ['b', 'c']);
});

test('unconfigured steps use the same sequential fallback as card movement', () => {
  const legacy = steps.map(({ nextStepIds, ...step }) => step);
  const graph = buildFlowchart(legacy, [...legacy].reverse());
  assert.deepEqual(graph.nodes.map(({ step }) => step._id), ['a', 'b', 'c']);
  assert.deepEqual(graph.edges.map(({ source, target }) => `${source._id}-${target._id}`), ['a-b', 'b-c']);
});

test('empty and disconnected flows remain renderable', () => {
  assert.equal(buildFlowchart([]).nodes.length, 0);
  const graph = buildFlowchart(steps.map((step) => ({ ...step, nextStepIds: [] })));
  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.edges.length, 0);
  assert.ok(graph.width > 0 && graph.height > 0);
});

test('tree branches sit side by side below their parent', () => {
  const graph = buildFlowchart(steps);
  const [parent, left, right] = graph.nodes;
  assert.equal(left.y, right.y);
  assert.ok(parent.y < left.y);
  assert.ok(left.x + left.width < right.x);
  assert.equal(parent.x, (left.x + right.x) / 2);
});

test('neighbor connections use facing sides and returns use lateral ports', () => {
  const graph = buildFlowchart(steps);
  const [parent, left, right] = graph.nodes;
  const neighbor = graph.edges.find((edge) => edge.source._id === 'b' && edge.target._id === 'c');
  assert.equal(neighbor.points[0].x, left.x + left.width);
  assert.equal(neighbor.points.at(-1).x, right.x);
  const returning = graph.edges.find((edge) => edge.source._id === 'b' && edge.target._id === 'a');
  assert.equal(returning.points[0].x, left.x);
  assert.equal(returning.points.at(-1).x, parent.x);
  assert.ok(returning.points.at(-1).y > parent.y);
  assert.ok(returning.points.at(-1).y < parent.y + parent.height);
});

test('shared destinations, cycles and disconnected trees retain unique nodes', () => {
  const graph = buildFlowchart([
    { _id: 'a', order: 0, nextStepIds: ['b', 'c'] },
    { _id: 'b', order: 1, nextStepIds: ['d'] },
    { _id: 'c', order: 2, nextStepIds: ['d'] },
    { _id: 'd', order: 3, nextStepIds: ['a'] },
    { _id: 'e', order: 4, nextStepIds: [] },
  ]);
  assert.equal(graph.nodes.length, 5);
  assert.equal(graph.edges.length, 5);
  for (const node of graph.nodes) {
    assert.ok(node.x >= 0 && node.y >= 0);
    assert.ok(node.x + node.width < graph.width);
    assert.ok(node.y + node.height < graph.height);
  }
});

test('sequential connections are straight and row spacing stays compact', () => {
  const sequence = Array.from({ length: 10 }, (_, index) => ({
    _id: String(index), order: index, nextStepIds: index < 9 ? [String(index + 1)] : [],
  }));
  const graph = buildFlowchart(sequence);
  for (const edge of graph.edges) {
    assert.equal(edge.points.length, 2);
    assert.equal(edge.points[0].x, edge.points[1].x);
    assert.equal(edge.points[1].y - edge.points[0].y, 80);
  }
  assert.ok(graph.width < 400);
  assert.ok(graph.height < 1900);
});

test('branching returns have separate ports and tracks, with arrow tips on borders', () => {
  const graph = buildFlowchart([
    { _id: 'a', order: 0, nextStepIds: ['b'] },
    { _id: 'b', order: 1, nextStepIds: ['c'] },
    { _id: 'c', order: 2, nextStepIds: ['d', 'e', 'f'] },
    { _id: 'd', order: 3, nextStepIds: ['e', 'b', 'f'] },
    { _id: 'e', order: 4, nextStepIds: ['b', 'f'] },
    { _id: 'f', order: 5, nextStepIds: ['g'] },
    { _id: 'g', order: 6, nextStepIds: [] },
  ]);
  const endpoints = new Set();
  const segments = [];
  for (const edge of graph.edges) {
    for (const [id, point] of [[edge.source._id, edge.points[0]], [edge.target._id, edge.points.at(-1)]]) {
      const node = graph.nodes.find((item) => item.step._id === id);
      assert.ok((point.x === node.x || point.x === node.x + node.width) && point.y > node.y && point.y < node.y + node.height ||
        (point.y === node.y || point.y === node.y + node.height) && point.x > node.x && point.x < node.x + node.width);
      const key = `${id}:${point.x}:${point.y}`;
      assert.ok(!endpoints.has(key), 'Every connection has a distinct endpoint');
      endpoints.add(key);
    }
    edge.points.slice(1).forEach((end, index) => {
      const start = edge.points[index];
      if (start.x === end.x && start.y === end.y) return;
      const vertical = start.x === end.x;
      const fixed = vertical ? start.x : start.y;
      const min = Math.min(vertical ? start.y : start.x, vertical ? end.y : end.x);
      const max = Math.max(vertical ? start.y : start.x, vertical ? end.y : end.x);
      assert.ok(!segments.some((segment) => segment.vertical === vertical && segment.fixed === fixed && Math.max(min, segment.min) < Math.min(max, segment.max)), 'Connections must not share line segments');
      for (const node of graph.nodes) {
        const crosses = vertical
          ? fixed > node.x && fixed < node.x + node.width && Math.max(min, node.y) < Math.min(max, node.y + node.height)
          : fixed > node.y && fixed < node.y + node.height && Math.max(min, node.x) < Math.min(max, node.x + node.width);
        assert.equal(crosses, false, 'Connections must not cross node interiors');
      }
      segments.push({ vertical, fixed, min, max });
    });
  }
});
