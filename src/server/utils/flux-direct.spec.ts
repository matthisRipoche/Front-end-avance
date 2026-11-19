import { decouperSse } from './flux-direct';

const SNAPSHOT = 'event:snapshot\ndata:{"current":null}\n\n';

describe('Découpeur de flux SSE', () => {
  it('lit un événement sans espace après les deux-points (forme de Spring)', () => {
    expect(decouperSse(SNAPSHOT)).toEqual({
      evenements: [{ type: 'snapshot', data: '{"current":null}' }],
      commentaires: 0,
      reste: '',
    });
  });

  it('lit un événement avec espace après les deux-points', () => {
    const { evenements } = decouperSse('event: snapshot\ndata: {"a":1}\n\n');
    expect(evenements).toEqual([{ type: 'snapshot', data: '{"a":1}' }]);
  });

  it('accepte les fins de ligne \\r\\n', () => {
    const { evenements, reste } = decouperSse('event: x\r\ndata: 1\r\n\r\n');
    expect(evenements).toEqual([{ type: 'x', data: '1' }]);
    expect(reste).toBe('');
  });

  it('joint plusieurs lignes data par un retour à la ligne', () => {
    expect(decouperSse('data: a\ndata: b\n\n').evenements).toEqual([{ type: 'message', data: 'a\nb' }]);
  });

  it('renvoie plusieurs événements d’un coup', () => {
    const { evenements } = decouperSse(SNAPSHOT + 'event:autre\ndata:2\n\n');
    expect(evenements.map((e) => e.type)).toEqual(['snapshot', 'autre']);
  });

  it('compte un commentaire seul sans en faire un événement', () => {
    expect(decouperSse(':ping\n\n')).toEqual({ evenements: [], commentaires: 1, reste: '' });
  });

  it('garde dans reste ce qui n’est pas terminé', () => {
    const { evenements, reste } = decouperSse(SNAPSHOT + 'event:snap');
    expect(evenements).toHaveLength(1);
    expect(reste).toBe('event:snap');
  });

  it('donne le même résultat quel que soit l’endroit où le flux est coupé', () => {
    const flux = ':ping\n\n' + SNAPSHOT.replace(/\n/g, '\r\n') + 'event: snapshot\ndata: {"b":2}\n\n';
    for (let coupe = 0; coupe <= flux.length; coupe++) {
      const premier = decouperSse(flux.slice(0, coupe));
      const second = decouperSse(premier.reste + flux.slice(coupe));
      expect([...premier.evenements, ...second.evenements]).toEqual([
        { type: 'snapshot', data: '{"current":null}' },
        { type: 'snapshot', data: '{"b":2}' },
      ]);
      expect(premier.commentaires + second.commentaires).toBe(1);
      expect(second.reste).toBe('');
    }
  });
});
