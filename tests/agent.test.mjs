import assert from 'node:assert/strict';
import { decide } from '../lib/agent.ts';
assert.equal(decide('format').tool,'show_guide');
assert.equal(decide('price').tool,'recommend_plan');
assert.equal(decide('unknown').tool,'ask_user','Unknown cause must not trigger an invented diagnosis');
assert.equal(decide('server').tool,'create_support_ticket','Server faults must be escalated, not blamed on a user');
assert.equal(decide('format','not_helpful').tool,'create_support_ticket','Failed help must escalate');
console.log('5 decision safety checks passed');
