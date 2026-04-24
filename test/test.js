/**
 * test.js — Verify processData against the challenge's expected output.
 */
const { processData } = require('../lib/processData');

const input = [
  "A->B", "A->C", "B->D", "C->E", "E->F",
  "X->Y", "Y->Z", "Z->X",
  "P->Q", "Q->R",
  "G->H", "G->H", "G->I",
  "hello", "1->2", "A->"
];

const result = processData(input);

console.log('=== FULL RESULT ===');
console.log(JSON.stringify(result, null, 2));

// Assertions
let pass = 0, fail = 0;

function assert(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`✅ PASS: ${name}`);
    pass++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Expected: ${e}`);
    console.log(`   Actual:   ${a}`);
    fail++;
  }
}

assert('invalid_entries', result.invalid_entries, ["hello", "1->2", "A->"]);
assert('duplicate_edges', result.duplicate_edges, ["G->H"]);
assert('summary.total_trees', result.summary.total_trees, 3);
assert('summary.total_cycles', result.summary.total_cycles, 1);
assert('summary.largest_tree_root', result.summary.largest_tree_root, "A");

// Check hierarchy count
assert('hierarchies count', result.hierarchies.length, 4);

// Check hierarchy A
const hA = result.hierarchies.find(h => h.root === 'A');
assert('A is non-cyclic', hA.has_cycle, undefined);
assert('A depth', hA.depth, 4);
assert('A tree', hA.tree, { "A": { "B": { "D": {} }, "C": { "E": { "F": {} } } } });

// Check hierarchy X (cycle)
const hX = result.hierarchies.find(h => h.root === 'X');
assert('X has_cycle', hX.has_cycle, true);
assert('X tree is empty', hX.tree, {});

// Check hierarchy P
const hP = result.hierarchies.find(h => h.root === 'P');
assert('P depth', hP.depth, 3);
assert('P tree', hP.tree, { "P": { "Q": { "R": {} } } });

// Check hierarchy G
const hG = result.hierarchies.find(h => h.root === 'G');
assert('G depth', hG.depth, 2);
assert('G tree', hG.tree, { "G": { "H": {}, "I": {} } });

console.log(`\n=== ${pass} passed, ${fail} failed ===`);

// Edge cases
console.log('\n=== EDGE CASE TESTS ===');

// Empty array
const r1 = processData([]);
assert('empty input: no hierarchies', r1.hierarchies.length, 0);

// Whitespace trimming
const r2 = processData([" A->B "]);
assert('whitespace trim: valid edge', r2.hierarchies.length, 1);
assert('whitespace trim: no invalids', r2.invalid_entries.length, 0);

// Self-loop
const r3 = processData(["A->A"]);
assert('self-loop: invalid', r3.invalid_entries, ["A->A"]);

// All duplicates
const r4 = processData(["A->B", "A->B", "A->B"]);
assert('all dupes: one hierarchy', r4.hierarchies.length, 1);
assert('all dupes: duplicate_edges', r4.duplicate_edges, ["A->B"]);

// Multi-parent (diamond)
const r5 = processData(["A->D", "B->D"]);
assert('diamond: 2 components (D has 1 parent, B isolated)', r5.hierarchies.length, 2);

console.log(`\nFinal: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
