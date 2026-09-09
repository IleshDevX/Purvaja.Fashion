import { describe, expect, it } from 'vitest';
import { parseCatalogUrlState, serializeCatalogUrlState } from './catalogUrlState.js';

describe('catalog URL state', () => {
  it('drops unsupported values and invalid pages', () => {
    const state=parseCatalogUrlState(new URLSearchParams('fit=Slim,Unknown&sort=oops&page=-2&inStock=true'),{newArrivals:false,deals:false});
    expect(state).toMatchObject({fits:['Slim'],sort:'featured',page:1,inStock:true});
  });
  it('round trips filters and explicit overrides for route defaults', () => {
    const defaults={newArrivals:true,deals:false};
    const state=parseCatalogUrlState(new URLSearchParams('newArrivals=0&fabric=Pure+Linen&size=42+%28L%29&page=3'),defaults);
    expect(parseCatalogUrlState(serializeCatalogUrlState(state,defaults),defaults)).toEqual(state);
  });
});
