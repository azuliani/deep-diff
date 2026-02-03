/**
 * Generates test fixtures for benchmarking deep-diff.
 */

export function generateFlatObject(size) {
  const obj = {};
  for (let i = 0; i < size; i++) {
    obj[`key${i}`] = `value${i}`;
  }
  return obj;
}

export function generateNestedObject(depth, breadth) {
  if (depth === 0) {
    return { value: Math.random() };
  }
  const obj = {};
  for (let i = 0; i < breadth; i++) {
    obj[`child${i}`] = generateNestedObject(depth - 1, breadth);
  }
  return obj;
}

export function generateArray(size) {
  return Array.from({ length: size }, (_, i) => ({
    id: i,
    name: `item${i}`,
    active: i % 2 === 0,
  }));
}

export function generateMixedObject(size) {
  const obj = {
    id: 1,
    name: 'test',
    active: true,
    count: 42,
    ratio: 3.14159,
    created: new Date('2024-01-01'),
    pattern: /test-\d+/g,
    tags: ['a', 'b', 'c'],
    metadata: { nested: { deep: { value: 'found' } } },
    items: [],
  };
  for (let i = 0; i < size; i++) {
    obj.items.push({
      id: i,
      value: `item-${i}`,
      score: Math.random() * 100,
    });
  }
  return obj;
}

export function generateUserRecord() {
  return {
    id: crypto.randomUUID(),
    email: 'user@example.com',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'USA',
      },
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          push: false,
          sms: true,
        },
        language: 'en',
      },
    },
    permissions: ['read', 'write', 'delete'],
    sessions: [
      { id: 's1', created: new Date(), ip: '192.168.1.1' },
      { id: 's2', created: new Date(), ip: '10.0.0.1' },
    ],
    metadata: {
      created: new Date('2023-01-01'),
      updated: new Date('2024-01-01'),
      version: 5,
    },
  };
}

export function generateConfig() {
  return {
    server: {
      host: 'localhost',
      port: 3000,
      ssl: {
        enabled: true,
        cert: '/path/to/cert.pem',
        key: '/path/to/key.pem',
      },
      cors: {
        origins: ['http://localhost:3000', 'https://example.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        headers: ['Content-Type', 'Authorization'],
      },
    },
    database: {
      host: 'localhost',
      port: 5432,
      name: 'myapp',
      pool: { min: 2, max: 10 },
      ssl: false,
    },
    cache: {
      enabled: true,
      ttl: 3600,
      prefix: 'app:',
    },
    logging: {
      level: 'info',
      format: 'json',
      outputs: ['console', 'file'],
    },
  };
}

export function generateObjectWithDates(size) {
  const obj = {
    created: new Date('2020-01-01T00:00:00.000Z'),
    updated: new Date('2024-01-15T12:30:00.000Z'),
    items: [],
  };
  for (let i = 0; i < size; i++) {
    obj.items.push({
      id: i,
      name: `item-${i}`,
      timestamp: new Date(Date.now() - i * 86400000),
    });
  }
  return obj;
}

export function generateEventLog(size) {
  const events = [];
  const baseTime = new Date('2024-01-01T00:00:00.000Z').getTime();
  for (let i = 0; i < size; i++) {
    events.push({
      id: `evt-${i}`,
      type: ['click', 'view', 'purchase', 'login'][i % 4],
      timestamp: new Date(baseTime + i * 3600000),
      data: {
        userId: `user-${i % 10}`,
        value: Math.random() * 100,
      },
    });
  }
  return { events };
}

export function generateSchedule() {
  return {
    meetings: [
      {
        id: 'm1',
        title: 'Standup',
        start: new Date('2024-01-15T09:00:00.000Z'),
        end: new Date('2024-01-15T09:30:00.000Z'),
        recurring: true,
      },
      {
        id: 'm2',
        title: 'Sprint Planning',
        start: new Date('2024-01-15T14:00:00.000Z'),
        end: new Date('2024-01-15T16:00:00.000Z'),
        recurring: false,
      },
    ],
    deadlines: [
      { task: 'Feature A', due: new Date('2024-01-20T23:59:59.000Z') },
      { task: 'Feature B', due: new Date('2024-01-25T23:59:59.000Z') },
      { task: 'Release', due: new Date('2024-01-31T23:59:59.000Z') },
    ],
    lastSync: new Date('2024-01-15T08:00:00.000Z'),
  };
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function mutate(obj, changeRatio = 0.1) {
  const result = clone(obj);
  const keys = Object.keys(result);
  const numChanges = Math.max(1, Math.floor(keys.length * changeRatio));

  for (let i = 0; i < numChanges; i++) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    if (typeof result[key] === 'string') {
      result[key] = result[key] + '_modified';
    } else if (typeof result[key] === 'number') {
      result[key] = result[key] + 1;
    } else if (typeof result[key] === 'boolean') {
      result[key] = !result[key];
    }
  }
  return result;
}
