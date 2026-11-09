import assert from 'node:assert/strict';
import test from 'node:test';
import { scope } from '../src/common/auth';

test('scope refuses a query without tenant_id', () => {
  assert.throws(() => scope(''), /TENANT_ID_REQUIRED/);
  assert.deepEqual(scope('tenant-1', { status: 'lead' }), {
    status: 'lead',
    tenantId: 'tenant-1',
  });
});