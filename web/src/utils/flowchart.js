import { allowedNextStepIds } from './stepValidation.js';

export function buildFlowchart(steps, visibleSteps = steps) {
  const ordered = [...visibleSteps].sort((a, b) => a.order - b.order);
  const nodes = ordered.map((step) => ({
    step, x: 0, y: 0, width: 280, height: 100,
    nextIds: allowedNextStepIds(step, steps), children: [], depth: 0,
  }));
  const byId = new Map(nodes.map((node) => [String(node.step._id), node]));
  const stable = (a, b) => String(a.step._id).localeCompare(String(b.step._id));
  const topologyNodes = [...nodes].sort(stable);
  const incoming = new Set(nodes.flatMap((node) => node.nextIds));
  const visited = new Set();
  const roots = [];

  // A spanning forest lays out branches without duplicating shared destinations.
  // Cycles and extra connections are rendered separately below.
  for (const root of [...topologyNodes.filter((node) => !incoming.has(String(node.step._id))), ...topologyNodes]) {
    if (visited.has(root)) continue;
    roots.push(root);
    visited.add(root);
    const queue = [root];
    for (let index = 0; index < queue.length; index++) {
      const parent = queue[index];
      for (const child of [...new Set(parent.nextIds)].map((id) => byId.get(id)).filter(Boolean).sort(stable)) {
        if (!child || visited.has(child)) continue;
        visited.add(child);
        child.depth = parent.depth + 1;
        parent.children.push(child);
        queue.push(child);
      }
    }
  }

  // Keep lateral links and feedback out of the ranking constraints. A merge
  // belongs below all its forward predecessors, even when one branch is longer.
  const reaches = (start, destination) => {
    const seen = new Set();
    const pending = [start];
    while (pending.length) {
      const node = pending.pop();
      if (node === destination) return true;
      if (seen.has(node)) continue;
      seen.add(node);
      pending.push(...node.nextIds.map((id) => byId.get(id)).filter(Boolean));
    }
    return false;
  };
  const forward = nodes.flatMap((source) => source.nextIds.map((id) => byId.get(id))
    .filter((target) => target && (target.depth > source.depth ||
      (target.depth <= source.depth && !reaches(target, source) &&
        !nodes.some((parent) => parent.nextIds.includes(String(source.step._id)) && parent.nextIds.includes(String(target.step._id))))))
    .map((target) => ({ source, target })));
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (const { source, target } of forward) {
      if (target.depth > source.depth) continue;
      target.depth = source.depth + 1;
      changed = true;
    }
    if (!changed) break;
  }

  // Each leaf receives its own slot; parents sit centered above their children.
  const rowMargin = 40;
  const columnGap = 80;
  let cursor = 32;
  const position = (node) => {
    node.y = rowMargin + node.depth * (100 + rowMargin * 2);
    if (!node.children.length) {
      node.x = cursor;
      cursor += node.width + columnGap;
      return;
    }
    node.children.forEach(position);
    node.x = (node.children[0].x + node.children.at(-1).x) / 2;
  };
  roots.forEach(position);

  // Reorder each rank by its connected neighbors, not the board's step order.
  // Alternating sweeps also align shared destinations with their predecessors.
  const rows = [...new Set(nodes.map((node) => node.depth))].sort((a, b) => a - b)
    .map((depth) => nodes.filter((node) => node.depth === depth));
  for (let pass = 0; pass < 8; pass++) {
    const down = pass % 2 === 0;
    for (const row of down ? rows : [...rows].reverse()) {
      const desired = new Map(row.map((node) => {
        const neighbors = forward.filter((edge) => (down ? edge.target : edge.source) === node)
          .map((edge) => down ? edge.source : edge.target);
        return [node, neighbors.length ? neighbors.reduce((sum, other) => sum + other.x, 0) / neighbors.length : node.x];
      }));
      row.sort((a, b) => desired.get(a) - desired.get(b) || a.x - b.x || stable(a, b));
      let end = -Infinity;
      for (const node of row) {
        node.x = Math.max(desired.get(node), end);
        end = node.x + node.width + columnGap;
      }
      const shift = row.reduce((sum, node) => sum + node.x - desired.get(node), 0) / row.length;
      row.forEach((node) => { node.x -= shift; });
    }
  }
  const left = Math.min(32, ...nodes.map((node) => node.x));
  nodes.forEach((node) => { node.x += 48 - left; });

  const right = Math.max(312, ...nodes.map((node) => node.x + node.width));
  const connections = [];
  let hiddenConnections = 0;
  for (const source of nodes) {
    for (const targetId of new Set(source.nextIds)) {
      const target = byId.get(targetId);
      if (!target) { hiddenConnections++; continue; }
      const tree = target.depth > source.depth;
      const neighbors = source.y === target.y && source !== target && !nodes.some((node) =>
        node !== source && node !== target && node.y === source.y &&
        node.x > Math.min(source.x, target.x) && node.x < Math.max(source.x, target.x));
      const forward = target.x > source.x;
      const returnSide = source.x < target.x ? 'left' : 'right';
      connections.push({
        source, target, kind: tree ? 'tree' : neighbors ? 'neighbor' : 'outer',
        sourceSide: tree ? 'bottom' : neighbors ? (forward ? 'right' : 'left') : returnSide,
        targetSide: tree ? 'top' : neighbors ? (forward ? 'left' : 'right') : returnSide,
      });
    }
  }

  // Allocate a separate port for every endpoint, including incoming and outgoing
  // links on the same side. Arrow tips terminate exactly on the node border.
  const ports = new Map();
  for (const connection of connections) {
    for (const end of ['source', 'target']) {
      const node = connection[end];
      const side = connection[`${end}Side`];
      const key = `${node.step._id}:${side}`;
      if (!ports.has(key)) ports.set(key, []);
      ports.get(key).push({ connection, end, node, side });
    }
  }
  for (const endpoints of ports.values()) {
    endpoints.sort((a, b) => {
      const otherA = a.connection[a.end === 'source' ? 'target' : 'source'];
      const otherB = b.connection[b.end === 'source' ? 'target' : 'source'];
      return (a.side === 'top' || a.side === 'bottom' ? otherA.x - otherB.x : otherA.y - otherB.y) ||
        stable(otherA, otherB) || a.end.localeCompare(b.end);
    });
    endpoints.forEach(({ connection, end, node, side }, index) => {
      const horizontal = side === 'top' || side === 'bottom';
      const length = horizontal ? node.width : node.height;
      const offset = 18 + (length - 36) * (index + 1) / (endpoints.length + 1);
      connection[`${end}Port`] = horizontal
        ? { x: node.x + offset, y: node.y + (side === 'bottom' ? node.height : 0) }
        : { x: node.x + (side === 'right' ? node.width : 0), y: node.y + offset };
    });
  }

  const usedSegments = [];
  const simplify = (points) => {
    const result = [];
    for (const point of points) {
      const last = result.at(-1);
      if (last && point.x === last.x && point.y === last.y) continue;
      const previous = result.at(-2);
      if (previous && ((previous.x === last.x && last.x === point.x && (last.y - previous.y) * (point.y - last.y) >= 0) ||
        (previous.y === last.y && last.y === point.y && (last.x - previous.x) * (point.x - last.x) >= 0))) result.pop();
      result.push(point);
    }
    return result;
  };
  const segments = (points) => points.slice(1).map((end, index) => {
    const start = points[index];
    const vertical = start.x === end.x;
    return { vertical, fixed: vertical ? start.x : start.y,
      min: Math.min(vertical ? start.y : start.x, vertical ? end.y : end.x),
      max: Math.max(vertical ? start.y : start.x, vertical ? end.y : end.x) };
  });
  const clear = (parts) => parts.every((part) => !nodes.some((node) => part.vertical
    ? part.fixed > node.x && part.fixed < node.x + node.width && Math.max(part.min, node.y) < Math.min(part.max, node.y + node.height)
    : part.fixed > node.y && part.fixed < node.y + node.height && Math.max(part.min, node.x) < Math.min(part.max, node.x + node.width)));
  const stub = (point, side) => ({ x: point.x + (side === 'right' ? 12 : side === 'left' ? -12 : 0),
    y: point.y + (side === 'bottom' ? 12 : side === 'top' ? -12 : 0) });
  const edges = connections.map((connection, index) => {
    const { source, target, sourcePort: start, targetPort: end } = connection;
    const a = stub(start, connection.sourceSide);
    const b = stub(end, connection.targetSide);
    const offset = 16 + (index % 4) * 4;
    const xs = new Set([a.x, b.x, (a.x + b.x) / 2, ...nodes.flatMap((node) => [node.x - offset, node.x + node.width + offset])]);
    const ys = new Set([a.y, b.y, (a.y + b.y) / 2, ...nodes.flatMap((node) => [node.y - offset, node.y + node.height + offset])]);
    let best;
    const consider = (middle) => {
      const points = simplify([start, a, ...middle, b, end]);
      const parts = segments(points);
      if (!clear(parts)) return;
      const overlap = parts.reduce((total, part) => total + usedSegments.reduce((sum, used) => sum +
        (used.vertical === part.vertical && used.fixed === part.fixed ? Math.max(0, Math.min(used.max, part.max) - Math.max(used.min, part.min)) : 0), 0), 0);
      const score = parts.reduce((sum, part) => sum + part.max - part.min, 0) + parts.length * 16 + overlap * 1000;
      if (!best || score < best.score) best = { points, parts, score };
    };
    // Prefer straight paths and local elbows; only detour when nodes obstruct them.
    for (const x of xs) consider([{ x, y: a.y }, { x, y: b.y }]);
    for (const y of ys) consider([{ x: a.x, y }, { x: b.x, y }]);
    for (const x of xs) for (const y of ys) {
      consider([{ x, y: a.y }, { x, y }, { x: b.x, y }]);
      consider([{ x: a.x, y }, { x, y }, { x, y: b.y }]);
    }
    // An outer corridor remains available for unusually dense return paths.
    if (!best) {
      const x = right + 32 + index * 12;
      consider([{ x: a.x, y: source.y + source.height + 20 }, { x, y: source.y + source.height + 20 },
        { x, y: target.y - 20 }, { x: b.x, y: target.y - 20 }]);
    }
    const points = best.points;
    usedSegments.push(...best.parts);
    const path = points.map((point, pointIndex) => `${pointIndex ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
    return { source: source.step, target: target.step, path, points };
  });
  const minX = Math.min(0, ...edges.flatMap((edge) => edge.points.map((point) => point.x - 16)));
  if (minX < 0) {
    nodes.forEach((node) => { node.x -= minX; });
    edges.forEach((edge) => {
      edge.points = edge.points.map((point) => ({ ...point, x: point.x - minX }));
      edge.path = edge.points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
    });
  }
  const maxX = Math.max(right - minX, ...edges.flatMap((edge) => edge.points.map((point) => point.x)));
  return {
    nodes, edges, hiddenConnections,
    width: maxX + 40,
    height: Math.max(200, ...nodes.map((node) => node.y + node.height + rowMargin), ...edges.flatMap((edge) => edge.points.map((point) => point.y + rowMargin))),
  };
}
