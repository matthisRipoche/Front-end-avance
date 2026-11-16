import { vi } from 'vitest';

import { API_URL_PAR_DEFAUT, springUrl } from './spring';

afterEach(() => vi.unstubAllEnvs());

describe('springUrl', () => {
  it('vise l’API locale sans variable d’environnement', () => {
    vi.stubEnv('NITRO_API_URL', '');
    expect(springUrl('/api/auth/me')).toBe(`${API_URL_PAR_DEFAUT}/api/auth/me`);
  });

  it('suit NITRO_API_URL en production', () => {
    vi.stubEnv('NITRO_API_URL', 'https://celeste.example.com');
    expect(springUrl('/api/summary')).toBe('https://celeste.example.com/api/summary');
  });

  it('ne double ni n’oublie la barre oblique', () => {
    vi.stubEnv('NITRO_API_URL', 'https://celeste.example.com/');
    expect(springUrl('/api/faces')).toBe('https://celeste.example.com/api/faces');
    expect(springUrl('api/faces')).toBe('https://celeste.example.com/api/faces');
  });
});
