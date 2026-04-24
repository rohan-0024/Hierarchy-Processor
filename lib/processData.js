/**
 * processData.js — Core processing logic for the BFHL challenge.
 * Handles validation, deduplication, graph grouping, cycle detection,
 * tree construction, and summary generation.
 */

const VALID_EDGE_REGEX = /^([A-Z])->([A-Z])$/;

/**
 * Main entry point. Accepts the raw data array and returns the full processed result.
 * @param {string[]} data - Array of node strings like ["A->B", "C->D"]
 * @returns {object} - Processed hierarchies, invalid entries, duplicates, summary
 */
function processData(data) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const seenEdges = new Set();
  const validEdges = []; // { parent, child, raw }

  // --- Step 1: Validate & Deduplicate ---
  for (const rawEntry of data) {
    const trimmed = (typeof rawEntry === 'string') ? rawEntry.trim() : String(rawEntry).trim();

    // Check valid format
    const match = trimmed.match(VALID_EDGE_REGEX);
    if (!match) {
      invalidEntries.push(trimmed);
      continue;
    }

    const parent = match[1];
    const child = match[2];

    // Self-loop is invalid
    if (parent === child) {
      invalidEntries.push(trimmed);
      continue;
    }

    const edgeKey = `${parent}->${child}`;

    // Duplicate check
    if (seenEdges.has(edgeKey)) {
      // Only add to duplicateEdges once
      if (!duplicateEdges.includes(edgeKey)) {
        duplicateEdges.push(edgeKey);
      }
      continue;
    }

    seenEdges.add(edgeKey);
    validEdges.push({ parent, child, raw: edgeKey });
  }

  // --- Step 2: Multi-parent handling & adjacency building ---
  const childHasParent = new Map(); // child -> parent (first parent wins)
  const adjacency = new Map();      // parent -> [children]
  const allNodes = new Set();
  const childNodes = new Set();
  const effectiveEdges = [];

  for (const edge of validEdges) {
    allNodes.add(edge.parent);
    allNodes.add(edge.child);

    // Diamond / multi-parent: first parent wins
    if (childHasParent.has(edge.child)) {
      // Silently discard
      continue;
    }

    childHasParent.set(edge.child, edge.parent);
    childNodes.add(edge.child);

    if (!adjacency.has(edge.parent)) {
      adjacency.set(edge.parent, []);
    }
    adjacency.get(edge.parent).push(edge.child);

    effectiveEdges.push(edge);
  }

  // --- Step 3: Group nodes into connected components (Union-Find) ---
  const parentMap = new Map(); // union-find parent

  function find(x) {
    if (!parentMap.has(x)) parentMap.set(x, x);
    if (parentMap.get(x) !== x) {
      parentMap.set(x, find(parentMap.get(x)));
    }
    return parentMap.get(x);
  }

  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      // Lexicographically smaller becomes root for consistency
      if (ra < rb) {
        parentMap.set(rb, ra);
      } else {
        parentMap.set(ra, rb);
      }
    }
  }

  for (const edge of effectiveEdges) {
    union(edge.parent, edge.child);
  }

  // Group nodes by component
  const components = new Map(); // representative -> Set of nodes
  for (const node of allNodes) {
    const rep = find(node);
    if (!components.has(rep)) {
      components.set(rep, new Set());
    }
    components.get(rep).add(node);
  }

  // --- Step 4: For each component, detect cycles, find root, build tree ---
  const hierarchies = [];

  for (const [, nodeSet] of components) {
    const nodes = Array.from(nodeSet);

    // Find root: a node in this component that never appears as a child
    let roots = nodes.filter(n => !childNodes.has(n));

    let root;
    let isPureCycle = false;

    if (roots.length === 0) {
      // Pure cycle — all nodes are children, use lex smallest
      isPureCycle = true;
      root = nodes.sort()[0];
    } else {
      // Use lex smallest root if multiple (shouldn't happen in valid tree, but safety)
      roots.sort();
      root = roots[0];
    }

    // Build local adjacency for this component
    const localAdj = new Map();
    for (const node of nodes) {
      if (adjacency.has(node)) {
        const children = adjacency.get(node).filter(c => nodeSet.has(c));
        if (children.length > 0) {
          localAdj.set(node, children);
        }
      }
    }

    // Cycle detection via DFS
    const hasCycle = detectCycle(nodes, localAdj, root);

    if (hasCycle || isPureCycle) {
      hierarchies.push({
        root: root,
        tree: {},
        has_cycle: true
      });
    } else {
      // Build nested tree and calculate depth
      const { tree, depth } = buildTree(root, localAdj);
      hierarchies.push({
        root: root,
        tree: tree,
        depth: depth
      });
    }
  }

  // Sort hierarchies: maintain input order based on first appearance of root
  const firstAppearance = new Map();
  for (let i = 0; i < validEdges.length; i++) {
    const edge = validEdges[i];
    if (!firstAppearance.has(edge.parent)) firstAppearance.set(edge.parent, i);
    if (!firstAppearance.has(edge.child)) firstAppearance.set(edge.child, i);
  }

  hierarchies.sort((a, b) => {
    const aIdx = firstAppearance.get(a.root) ?? Infinity;
    const bIdx = firstAppearance.get(b.root) ?? Infinity;
    return aIdx - bIdx;
  });

  // --- Step 5: Summary ---
  const totalTrees = hierarchies.filter(h => !h.has_cycle).length;
  const totalCycles = hierarchies.filter(h => h.has_cycle).length;

  let largestTreeRoot = "";
  let maxDepth = 0;
  for (const h of hierarchies) {
    if (!h.has_cycle && h.depth !== undefined) {
      if (h.depth > maxDepth || (h.depth === maxDepth && (largestTreeRoot === "" || h.root < largestTreeRoot))) {
        maxDepth = h.depth;
        largestTreeRoot = h.root;
      }
    }
  }

  return {
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestTreeRoot
    }
  };
}

/**
 * Detect if a cycle exists in the component using DFS.
 */
function detectCycle(nodes, adjacency, startNode) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  for (const n of nodes) color.set(n, WHITE);

  function dfs(node) {
    color.set(node, GRAY);
    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      if (color.get(neighbor) === GRAY) return true;  // back edge → cycle
      if (color.get(neighbor) === WHITE) {
        if (dfs(neighbor)) return true;
      }
    }
    color.set(node, BLACK);
    return false;
  }

  // Start DFS from all unvisited nodes to handle disconnected parts within the component
  for (const node of nodes) {
    if (color.get(node) === WHITE) {
      if (dfs(node)) return true;
    }
  }
  return false;
}

/**
 * Build a nested tree object and calculate depth via DFS.
 */
function buildTree(root, adjacency) {
  let maxDepth = 0;

  function dfs(node, currentDepth) {
    if (currentDepth > maxDepth) maxDepth = currentDepth;

    const children = adjacency.get(node) || [];
    const subtree = {};
    // Sort children for consistent ordering
    const sortedChildren = [...children].sort();
    for (const child of sortedChildren) {
      subtree[child] = dfs(child, currentDepth + 1);
    }
    return subtree;
  }

  const treeContent = dfs(root, 1);
  const tree = { [root]: treeContent };

  return { tree, depth: maxDepth };
}

module.exports = { processData };
