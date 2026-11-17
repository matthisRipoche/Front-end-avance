import { memoriserFuseau } from './fuseau';

/** Faux document : `cookie` renvoie la chaîne de départ, chaque écriture est relevée. */
const fauxDocument = (cookies = '', protocole = 'http:') => {
  const ecritures: string[] = [];
  const doc = {
    location: { protocol: protocole },
    get cookie() {
      return cookies;
    },
    set cookie(valeur: string) {
      ecritures.push(valeur);
    },
  } as unknown as Document;
  return { doc, ecritures };
};

const fuseauDuNavigateur = (timeZone: string) =>
  vi
    .spyOn(Intl, 'DateTimeFormat')
    .mockReturnValue({ resolvedOptions: () => ({ timeZone }) } as Intl.DateTimeFormat);

describe('memoriserFuseau', () => {
  afterEach(() => vi.restoreAllMocks());

  it('écrit le cookie tz quand il est absent, sans Secure en http', () => {
    fuseauDuNavigateur('America/Argentina/Buenos_Aires');
    const { doc, ecritures } = fauxDocument('XSRF-TOKEN=abc');

    memoriserFuseau(doc);

    expect(ecritures).toEqual([
      'tz=America%2FArgentina%2FBuenos_Aires; Path=/; Max-Age=31536000; SameSite=Lax',
    ]);
  });

  it('ajoute Secure en https', () => {
    fuseauDuNavigateur('Europe/Paris');
    const { doc, ecritures } = fauxDocument('', 'https:');

    memoriserFuseau(doc);

    expect(ecritures).toEqual(['tz=Europe%2FParis; Path=/; Max-Age=31536000; SameSite=Lax; Secure']);
  });

  it('ne réécrit pas un cookie identique', () => {
    fuseauDuNavigateur('Europe/Paris');
    const { doc, ecritures } = fauxDocument('XSRF-TOKEN=abc; tz=Europe%2FParis');

    memoriserFuseau(doc);

    expect(ecritures).toEqual([]);
  });

  it('réécrit un cookie qui diffère', () => {
    fuseauDuNavigateur('Asia/Tokyo');
    const { doc, ecritures } = fauxDocument('tz=Europe%2FParis');

    memoriserFuseau(doc);

    expect(ecritures).toEqual(['tz=Asia%2FTokyo; Path=/; Max-Age=31536000; SameSite=Lax']);
  });

  it.each(['+02:00', '-05:00', ''])('n’écrit rien pour le fuseau « %s »', (fuseau) => {
    fuseauDuNavigateur(fuseau);
    const { doc, ecritures } = fauxDocument();

    memoriserFuseau(doc);

    expect(ecritures).toEqual([]);
  });

  it('ne lève pas si Intl échoue', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new RangeError('fuseau inconnu');
    });
    const { doc, ecritures } = fauxDocument();

    expect(() => memoriserFuseau(doc)).not.toThrow();
    expect(ecritures).toEqual([]);
  });
});
