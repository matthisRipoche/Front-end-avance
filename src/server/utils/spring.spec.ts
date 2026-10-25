import { vi } from 'vitest';

import { springUrl } from './spring';

const config = { apiUrl: 'http://localhost:5000' };
vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: () => config }));

describe('springUrl', () => {
  it('ajoute la route à l’adresse configurée', () => {
    config.apiUrl = 'http://localhost:5000';
    expect(springUrl('/api/auth/me')).toBe('http://localhost:5000/api/auth/me');
  });

  it('suit la configuration de production', () => {
    config.apiUrl = 'https://celeste.example.com';
    expect(springUrl('/api/summary')).toBe('https://celeste.example.com/api/summary');
  });

  it('ne double ni n’oublie la barre oblique', () => {
    config.apiUrl = 'https://celeste.example.com/';
    expect(springUrl('/api/faces')).toBe('https://celeste.example.com/api/faces');
    expect(springUrl('api/faces')).toBe('https://celeste.example.com/api/faces');
  });
});
