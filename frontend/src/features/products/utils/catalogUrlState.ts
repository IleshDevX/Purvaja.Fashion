import type { ShirtFabric, ShirtFit, ShirtSize, ShirtSortOption } from '../types/product.js';

export const CATALOG_FITS: ShirtFit[] = ['Slim', 'Regular', 'Relaxed'];
export const CATALOG_FABRICS: ShirtFabric[] = ['100% Egyptian Cotton','Pure Linen','Oxford Cotton','Cotton Poplin','Denim','Linen Blend'];
export const CATALOG_SIZES: ShirtSize[] = ['38 (S)','39 (M)','40 (M)','42 (L)','44 (XL)','46 (XXL)'];
export const CATALOG_SORTS: ShirtSortOption[] = ['featured','newest','price-asc','price-desc','rating','discount'];

export interface CatalogUrlDefaults { newArrivals: boolean; deals: boolean }
export interface CatalogUrlState {
  search: string; category?: string; fits: ShirtFit[]; fabrics: ShirtFabric[]; sizes: ShirtSize[];
  inStock: boolean; newArrivals: boolean; deals: boolean; sort: ShirtSortOption; page: number;
}

const list = <T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]) =>
  (params.get(key)?.split(',') ?? []).filter((item): item is T => allowed.includes(item as T));
const flag = (params: URLSearchParams, key: string, fallback=false) => {
  const value=params.get(key); return value==='1'||value==='true' ? true : value==='0'||value==='false' ? false : fallback;
};

export function parseCatalogUrlState(params: URLSearchParams, defaults: CatalogUrlDefaults): CatalogUrlState {
  const rawPage=Number(params.get('page'));
  const rawSort=params.get('sort') as ShirtSortOption | null;
  return {
    search:(params.get('search')??'').trim().slice(0,120),
    category:params.get('category')?.trim().slice(0,120)||undefined,
    fits:list(params,'fit',CATALOG_FITS), fabrics:list(params,'fabric',CATALOG_FABRICS), sizes:list(params,'size',CATALOG_SIZES),
    inStock:flag(params,'inStock'), newArrivals:flag(params,'newArrivals',defaults.newArrivals),
    deals:flag(params,'deals',defaults.deals), sort:rawSort&&CATALOG_SORTS.includes(rawSort)?rawSort:'featured',
    page:Number.isInteger(rawPage)&&rawPage>0?rawPage:1,
  };
}

export function serializeCatalogUrlState(state: CatalogUrlState, defaults: CatalogUrlDefaults): URLSearchParams {
  const params=new URLSearchParams();
  if(state.search)params.set('search',state.search); if(state.category)params.set('category',state.category);
  if(state.fits.length)params.set('fit',state.fits.join(',')); if(state.fabrics.length)params.set('fabric',state.fabrics.join(','));
  if(state.sizes.length)params.set('size',state.sizes.join(',')); if(state.inStock)params.set('inStock','1');
  if(state.newArrivals!==defaults.newArrivals)params.set('newArrivals',state.newArrivals?'1':'0');
  if(state.deals!==defaults.deals)params.set('deals',state.deals?'1':'0');
  if(state.sort!=='featured')params.set('sort',state.sort); if(state.page>1)params.set('page',String(state.page));
  return params;
}
